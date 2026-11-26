// MyServiceTime — "Moments": take a picture (or choose photos) to save a good moment, with a few words and the day.
// Photos are made smaller (so they don't fill the phone), ENCRYPTED with the person's own data key, and kept in
// this device's database (IndexedDB). They are not uploaded to the cloud. In the demo they only live on the page.
// Loaded before app.js (functions only); app.js calls initMoments().

const Moments = (() => {
  const DB_NAME = "mst-moments", STORE = "moments";
  const FULL_MAX = 1600, THUMB_MAX = 360; // pixels on the longest side
  let list = [];        // [{ id, date, caption, createdAt, thumb (data URL) }] — newest first
  let demoFull = {};    // the demo keeps full pictures in memory only
  let editing = null;   // { id?, full: Blob|null, thumb, isNew }
  const owner = () => store.user?.id || "demo";

  // ---------- the device database ----------
  let dbPromise = null;
  function db() {
    if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const s = req.result.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("owner", "owner");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const s = t.objectStore(STORE);
      const out = fn(s);
      t.oncomplete = () => resolve(out?.result ?? out);
      t.onerror = () => reject(t.error);
    });
  }

  // ---------- encryption (same key as the rest of the person's data) ----------
  const canStore = () => !store.demo && !!store._dek;
  async function seal(obj, fullBytes) {
    return {
      meta: await encryptText(store._dek, JSON.stringify(obj)),
      full: fullBytes ? await encryptBytes(store._dek, fullBytes) : null,
    };
  }

  // ---------- pictures: smaller and turned the right way up ----------
  async function shrink(file, max, quality) {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", quality));
  }
  const blobToDataUrl = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });

  // ---------- load / save ----------
  async function load() {
    list = [];
    if (!canStore()) { render(); return; }
    try {
      const rows = await tx("readonly", (s) => s.index("owner").getAll(owner()));
      for (const row of rows || []) {
        try { list.push({ id: row.id, ...JSON.parse(await decryptText(store._dek, row.meta)) }); } catch { /* another key: skip */ }
      }
    } catch (e) { console.warn("moments", e); }
    sortList();
    render();
  }
  const sortList = () => list.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.createdAt - a.createdAt);

  async function saveMoment({ id, date, caption, thumb, full }) {
    const isNew = !id;
    id = id || crypto.randomUUID();
    const old = list.find((m) => m.id === id);
    const item = { id, date, caption, thumb, createdAt: old?.createdAt || Date.now() };
    if (canStore()) {
      let fullBox = null;
      if (full) fullBox = (await seal({}, new Uint8Array(await full.arrayBuffer()))).full;
      else if (!isNew) fullBox = (await tx("readonly", (s) => s.get(id)))?.full || null; // keep the old picture
      const { meta } = await seal({ date, caption, thumb, createdAt: item.createdAt });
      await tx("readwrite", (s) => s.put({ id, owner: owner(), meta, full: fullBox }));
    } else if (full) {
      demoFull[id] = full;
    }
    list = list.filter((m) => m.id !== id).concat([item]);
    sortList();
    render();
  }

  async function removeMoment(id) {
    if (canStore()) await tx("readwrite", (s) => s.delete(id));
    delete demoFull[id];
    list = list.filter((m) => m.id !== id);
    render();
  }

  async function fullPicture(id) {
    if (demoFull[id]) return URL.createObjectURL(demoFull[id]);
    if (!canStore()) return null;
    const row = await tx("readonly", (s) => s.get(id));
    if (!row?.full) return null;
    const bytes = await decryptBytes(store._dek, row.full);
    return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
  }

  // ---------- screen ----------
  /** Moments is a Supporter extra (the demo shows it, so people can see what it is). */
  const locked = () => !store.demo && !(typeof accentUnlocked === "function" && accentUnlocked());
  function render() {
    const grid = $("momGrid");
    if (!grid) return;
    $("momLock").hidden = !locked();
    $("momOpen").hidden = locked();
    $("momCount").textContent = list.length ? String(list.length) : "";
    $("momCount").hidden = !list.length || locked(); // no empty pill
    $("momEmpty").hidden = list.length > 0;
    grid.innerHTML = list.map((m) => `<button type="button" class="mom-item" data-mom="${m.id}">
        <img src="${m.thumb}" alt="" loading="lazy" />
        <span class="mom-cap">${m.caption ? esc(m.caption) : ""}<small>${m.date ? esc(fmtDate(new Date(`${m.date}T12:00`).getTime())) : ""}</small></span>
      </button>`).join("");
  }

  let viewUrl = null;
  async function openEditor({ id = null, full = null, thumb = "" }) {
    const m = id ? list.find((x) => x.id === id) : null;
    editing = { id, full, thumb: thumb || m?.thumb || "" };
    $("momTitle").textContent = t(id ? "moments" : "momNew").replace(/^📸\s*/, "");
    $("momCaption").value = m?.caption || "";
    $("momDate").value = m?.date || todayKey();
    $("momDelete").hidden = !id;
    $("momShare").hidden = !id || !navigator.share;
    $("momMsg").textContent = "";
    if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; }
    $("momImg").src = editing.thumb;
    $("momModal").hidden = false;
    if (full) { viewUrl = URL.createObjectURL(full); $("momImg").src = viewUrl; }
    else if (id) { const u = await fullPicture(id); if (u && editing?.id === id) { viewUrl = u; $("momImg").src = u; } }
  }
  function closeEditor() {
    $("momModal").hidden = true;
    editing = null;
    if (viewUrl) { URL.revokeObjectURL(viewUrl); viewUrl = null; }
  }

  async function onFiles(files) {
    const pics = [...(files || [])].filter((f) => f.type.startsWith("image/"));
    if (!pics.length) return;
    try {
      if (pics.length === 1) {
        const full = await shrink(pics[0], FULL_MAX, 0.82);
        const thumb = await blobToDataUrl(await shrink(pics[0], THUMB_MAX, 0.75));
        return openEditor({ full, thumb });
      }
      for (const f of pics) { // several photos at once: saved right away, with today's date
        const full = await shrink(f, FULL_MAX, 0.82);
        const thumb = await blobToDataUrl(await shrink(f, THUMB_MAX, 0.75));
        await saveMoment({ date: todayKey(), caption: "", thumb, full });
      }
      showToast(`${t("momSaved")} (${pics.length})`);
    } catch (e) {
      console.warn(e);
      showToast(t("momError"));
    }
  }

  return {
    list: () => list,
    load,
    render,
    open: (id) => openEditor({ id }),
    init() {
      $("momLockBtn").addEventListener("click", () => { if (typeof openSupport === "function") openSupport(); });
      $("momCamera").addEventListener("change", (e) => { if (!locked()) onFiles(e.target.files); e.target.value = ""; });
      $("momPickInput").addEventListener("change", (e) => { if (!locked()) onFiles(e.target.files); e.target.value = ""; });
      $("momGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-mom]"); if (b) openEditor({ id: b.dataset.mom }); });
      $("momClose").addEventListener("click", closeEditor);
      $("momModal").addEventListener("mousedown", (e) => { if (e.target === $("momModal")) closeEditor(); });
      $("momForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!editing) return;
        $("momMsg").textContent = t("working");
        try {
          await saveMoment({ id: editing.id, date: $("momDate").value || todayKey(), caption: $("momCaption").value.trim().slice(0, 300), thumb: editing.thumb, full: editing.full });
          closeEditor();
          showToast(t("momSaved"));
        } catch (err) { console.warn(err); $("momMsg").textContent = t("momError"); }
      });
      $("momDelete").addEventListener("click", async () => {
        if (!editing?.id || !confirm(t("momDeleteAsk"))) return;
        await removeMoment(editing.id);
        closeEditor();
      });
      $("momShare").addEventListener("click", async () => {
        if (!editing?.id) return;
        try {
          const u = viewUrl || await fullPicture(editing.id);
          const blob = await (await fetch(u)).blob();
          const file = new File([blob], `moment-${$("momDate").value}.jpg`, { type: "image/jpeg" });
          const data = { text: $("momCaption").value || "MyServiceTime" };
          if (navigator.canShare?.({ files: [file] })) data.files = [file];
          await navigator.share(data);
        } catch { /* closed the share window */ }
      });
      load();
    },
  };
})();

function initMoments() { Moments.init(); }
