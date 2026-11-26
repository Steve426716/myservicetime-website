// MyServiceTime — Territories: the territory cards a publisher is given (number, name / area, the day it was given and
// the day it was completed, notes), each with an optional map:
//   • Scan the card's QR code  — a picture of the card's QR code; the map link inside it is read (BarcodeDetector,
//                                or jsQR from vendor/jsQR.js, loaded only then)
//   • Enter map link           — paste the link
//   • Pin on map               — tap where the territory is
//   • Outline the area         — tap around it, point by point
//   • Photo of the card        — kept ENCRYPTED on this device only (like Moments); a small preview goes with the data
// The territories are saved with the rest of the person's data (encrypted, synced with the Cloud).
// Loaded before app.js (functions only); app.js calls initTerritories().

const TR_KEY = "dailytime.territories";
const TR_DB = "mst-territory-photos";
let territories = [];
let trEdit = null;            // the territory being edited (a copy)
const trDemoPhotos = {};      // the demo keeps card photos in memory only

function loadTerritories() {
  try { territories = JSON.parse(store.getItem(TR_KEY) || "[]"); } catch { territories = []; }
}
function saveTerritories() {
  store.setItem(TR_KEY, JSON.stringify(territories));
  renderTerritories();
}
const trById = (id) => territories.find((x) => x.id === id);
const trLabel = (x) => x.name || (x.number ? `${t("trTitleOne")} ${x.number}` : t("trTitleOne"));
const trDay = (k) => (k ? fmtDate(new Date(`${k}T12:00`).getTime()) : "");

// ---------- the card photo: encrypted, on this device ----------
let trDbPromise = null;
function trDb() {
  if (!trDbPromise) trDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TR_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return trDbPromise;
}
async function trTx(mode, fn) {
  const d = await trDb();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("photos", mode);
    const out = fn(tx.objectStore("photos"));
    tx.oncomplete = () => resolve(out?.result ?? out);
    tx.onerror = () => reject(tx.error);
  });
}
const trCanStore = () => !store.demo && !!store._dek;
async function trPutPhoto(id, blob) {
  if (!trCanStore()) { trDemoPhotos[id] = blob; return; }
  const box = await encryptBytes(store._dek, new Uint8Array(await blob.arrayBuffer()));
  await trTx("readwrite", (s) => s.put({ id, owner: store.user?.id || "", box }));
}
async function trGetPhoto(id) {
  if (trDemoPhotos[id]) return URL.createObjectURL(trDemoPhotos[id]);
  if (!trCanStore()) return null;
  try {
    const row = await trTx("readonly", (s) => s.get(id));
    if (!row?.box) return null;
    return URL.createObjectURL(new Blob([await decryptBytes(store._dek, row.box)], { type: "image/jpeg" }));
  } catch { return null; }
}
async function trDelPhoto(id) {
  delete trDemoPhotos[id];
  if (trCanStore()) { try { await trTx("readwrite", (s) => s.delete(id)); } catch {} }
}
/** A picture made smaller (and turned the right way up), as a JPEG. */
async function trShrink(file, max, quality) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((resolve) => c.toBlob(resolve, "image/jpeg", quality));
}
const trDataUrl = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });

// ---------- the QR code on the card ----------
let jsQRLoading = null;
function loadJsQR() {
  if (window.jsQR) return Promise.resolve();
  if (!jsQRLoading) jsQRLoading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `vendor/jsQR.js?v=${APP_VERSION}`;
    s.onload = resolve;
    s.onerror = () => { jsQRLoading = null; reject(new Error("jsQR")); };
    document.head.appendChild(s);
  });
  return jsQRLoading;
}
/** The text inside the QR code in this picture, or "" if none is found. */
async function trReadQR(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if ("BarcodeDetector" in window) {
      try {
        const hit = (await new BarcodeDetector({ formats: ["qr_code"] }).detect(bmp))[0];
        if (hit?.rawValue) return hit.rawValue;
      } catch {}
    }
    await loadJsQR();
    for (const max of [1400, 900, 2200]) { // a few sizes: small codes need more pixels, big photos fewer
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * scale);
      c.height = Math.round(bmp.height * scale);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.drawImage(bmp, 0, 0, c.width, c.height);
      const img = g.getImageData(0, 0, c.width, c.height);
      const code = window.jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) return code.data;
    }
    return "";
  } finally { bmp.close?.(); }
}
const trIsLink = (s) => /^https?:\/\/\S+$/i.test((s || "").trim());

// ---------- the list (Tools → Territories) ----------
const TR_CHIP = { link: "🔗", pin: "📍", area: "✏️", photo: "📸" };
function renderTerritories() {
  const box = $("trList");
  if (!box) return;
  const list = territories.slice().sort((a, b) =>
    (!!a.done - !!b.done) || (b.out || "").localeCompare(a.out || "") || String(a.number || "").localeCompare(String(b.number || ""), undefined, { numeric: true }));
  $("trCount").textContent = territories.length ? String(territories.length) : "";
  $("trEmpty").hidden = territories.length > 0;
  box.innerHTML = list.map((x) => {
    const chips = [x.link && "link", x.pin && "pin", x.area?.length >= 3 && "area", (x.thumb || x.hasPhoto) && "photo"].filter(Boolean)
      .map((k) => `<span class="tr-chip" data-ic="${TR_CHIP[k]}" title="${esc(t({ link: "trHasLink", pin: "trHasPin", area: "trHasAreaShort", photo: "trHasPhoto" }[k]))}">${TR_CHIP[k]}</span>`).join("");
    const when = x.done ? t("trFinished", { date: trDay(x.done) }) : x.out ? t("trSince", { date: trDay(x.out) }) : "";
    return `<li><button type="button" class="tr-item${x.done ? " done" : ""}" data-tr="${esc(x.id)}">
      <span class="tr-num">${esc(x.number || "#")}</span>
      <span class="tr-body"><strong>${esc(trLabel(x))}</strong>${when ? `<small>${esc(when)}</small>` : ""}${chips ? `<span class="tr-chips">${chips}</span>` : ""}</span>
      ${x.thumb ? `<img class="tr-thumb" src="${x.thumb}" alt="" />` : ""}
    </button></li>`;
  }).join("");
}

// ---------- add / edit ----------
function openTerritory(id = null) {
  const x = id ? trById(id) : null;
  trEdit = x ? JSON.parse(JSON.stringify(x)) : { id: null, number: "", name: "", out: todayKey(), done: "", notes: "", link: "", pin: null, area: [], thumb: "" };
  trEdit.newPhoto = null;
  trEdit.dropPhoto = false;
  document.getElementById("trModal")?.remove();
  const wrap = document.createElement("div");
  wrap.id = "trModal";
  wrap.className = "alarm";
  const opt = (k, ic, label) => `<button type="button" class="tr-opt" data-tro="${k}"><span class="tr-opt-ic" data-ic="${ic}">${ic}</span><span>${esc(t(label))}</span></button>`;
  wrap.innerHTML = `<form class="alarm-box modal-box tr-box" id="trForm" role="dialog" aria-modal="true" aria-labelledby="trTitleH" novalidate>
      <div class="modal-head"><h2 id="trTitleH" data-icon="🏘️">${esc(x ? trLabel(x) : t("trNew"))}</h2>
        <button type="button" class="auth-close" data-trx="close" aria-label="${esc(t("cancel"))}">✕</button></div>
      <div class="tr-fields">
        <label class="tr-f-num"><span>${esc(t("trNumber"))}</span><input id="trNumber" maxlength="20" placeholder="${esc(t("trNumberPh"))}" value="${esc(trEdit.number)}" /></label>
        <label class="tr-f-name"><span>${esc(t("trName"))}</span><input id="trName" maxlength="80" placeholder="${esc(t("trNamePh"))}" value="${esc(trEdit.name)}" /></label>
        <label><span>${esc(t("trOut"))}</span><input type="date" id="trOut" value="${esc(trEdit.out || "")}" /></label>
        <label><span>${esc(t("trDone"))} <em class="muted">${esc(t("optional"))}</em></span><input type="date" id="trDoneDate" value="${esc(trEdit.done || "")}" /></label>
        <label class="tr-f-notes"><span>${esc(t("trNotes"))}</span><textarea id="trNotes" rows="3" maxlength="2000" placeholder="${esc(t("trNotesPh"))}">${esc(trEdit.notes || "")}</textarea></label>
      </div>
      <h3 class="tr-map-h">${esc(t("trMap"))}</h3>
      <div class="tr-opts">
        ${opt("scan", "🔳", "trScan")}${opt("link", "🔗", "trLink")}${opt("pin", "📍", "trPin")}${opt("area", "✏️", "trArea")}${opt("photo", "📸", "trPhoto")}
      </div>
      <input type="file" id="trScanInput" accept="image/*" capture="environment" hidden />
      <input type="file" id="trPhotoInput" accept="image/*" capture="environment" hidden />
      <div class="tr-linkbox" id="trLinkBox" hidden>
        <input type="url" id="trLinkInput" inputmode="url" placeholder="${esc(t("trLinkPh"))}" />
        <button type="button" class="btn btn-primary small" data-trx="linkok">${esc(t("save"))}</button>
      </div>
      <p class="addr-msg" id="trMsg" role="status"></p>
      <div class="tr-have" id="trHave"></div>
      <div class="tr-mini" id="trMini" hidden></div>
      <div class="tr-actions">
        ${x ? `<button type="button" class="btn danger" data-trx="delete">${esc(t("delete"))}</button>` : ""}
        <span class="spacer"></span>
        <button type="button" class="btn btn-ghost" data-trx="close">${esc(t("cancel"))}</button>
        <button type="submit" class="btn btn-primary">${esc(t("save"))}</button>
      </div>
    </form>`;
  document.body.appendChild(wrap);
  paintTrHave();
  setTimeout(() => (x ? null : $("trNumber").focus()), 60);
}
function trMsg(text, kind = "") { const m = $("trMsg"); if (m) { m.textContent = text; m.className = `addr-msg ${kind}`; } }
function closeTerritory() { document.getElementById("trModal")?.remove(); trMiniMap?.remove(); trMiniMap = null; trEdit = null; }

/** Under the five buttons: what this territory's map already has, with Open / Change / Remove. */
async function paintTrHave() {
  const box = $("trHave");
  if (!box || !trEdit) return;
  const row = (ic, text, btns) => `<div class="tr-have-row"><span class="tr-opt-ic" data-ic="${ic}">${ic}</span><span class="tr-have-txt">${esc(text)}</span>
    <span class="tr-have-btns">${btns.map(([k, l]) => `<button type="button" class="link-btn" data-trx="${k}">${esc(t(l))}</button>`).join("")}</span></div>`;
  const rows = [];
  if (trEdit.link) rows.push(row("🔗", t("trHasLink"), [["openlink", "trOpen"], ["dellink", "trRemove"]]));
  if (trEdit.pin) rows.push(row("📍", t("trHasPin"), [["go", "trGo"], ["pin", "trChange"], ["delpin", "trRemove"]]));
  if (trEdit.area?.length >= 3) rows.push(row("✏️", t("trHasArea", { n: trEdit.area.length }), [["area", "trChange"], ["delarea", "trRemove"]]));
  const hasPhoto = !trEdit.dropPhoto && (trEdit.newPhoto || trEdit.thumb);
  if (hasPhoto) rows.push(`<div class="tr-have-row"><img class="tr-have-img" src="${trEdit.thumbNew || trEdit.thumb}" alt="" />
    <span class="tr-have-txt">${esc(t("trHasPhoto"))}</span><span class="tr-have-btns">
    <button type="button" class="link-btn" data-trx="viewphoto">${esc(t("trView"))}</button>
    <button type="button" class="link-btn" data-trx="delphoto">${esc(t("trRemove"))}</button></span></div>`);
  box.innerHTML = rows.join("");
  paintTrMini();
}

// ---------- a small map preview in the editor (pin / outline) ----------
let trMiniMap = null;
async function paintTrMini() {
  const el = $("trMini");
  if (!el || !trEdit) return;
  const has = trEdit.pin || trEdit.area?.length >= 3;
  el.hidden = !has;
  trMiniMap?.remove(); trMiniMap = null;
  if (!has) return;
  try { await loadLeaflet(); } catch { el.hidden = true; return; }
  if (!$("trMini") || !trEdit) return;
  trMiniMap = window.L.map(el, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, tap: false });
  trTiles(trMiniMap);
  const layers = trShapes(trEdit).addTo(trMiniMap);
  trFit(trMiniMap, layers);
  setTimeout(() => trMiniMap?.invalidateSize(), 50);
}
function trTiles(m) {
  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(m);
}
const trColor = () => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#5b4bf0";
function trShapes(x) {
  const g = window.L.featureGroup();
  if (x.area?.length >= 3) window.L.polygon(x.area, { color: trColor(), weight: 3, fillOpacity: 0.18 }).addTo(g);
  if (x.pin) window.L.marker([x.pin.lat, x.pin.lng]).addTo(g);
  return g;
}
function trFit(m, layers) {
  const b = layers.getBounds();
  if (b.isValid()) m.fitBounds(b.pad(0.25), { maxZoom: 17 });
}

// ---------- the big map: pin or outline ----------
let trPick = null; // { mode, map, pin, points, layers }
async function openTrMap(mode) {
  document.getElementById("trMapWrap")?.remove();
  const wrap = document.createElement("div");
  wrap.id = "trMapWrap";
  wrap.className = "tr-map-wrap";
  wrap.innerHTML = `<div class="tr-map-box" role="dialog" aria-modal="true">
      <div class="tr-map-head"><div><strong>${esc(t(mode === "pin" ? "trPin" : "trArea"))}</strong><p>${esc(t(mode === "pin" ? "trPinHint" : "trAreaHint"))}</p></div>
        <button type="button" class="icon-btn tr-map-x" data-trm="cancel" aria-label="${esc(t("cancel"))}">✕</button></div>
      <div id="trMapEl" class="tr-map-el"></div>
      <div class="tr-map-tools">
        <button type="button" class="btn btn-ghost small" data-trm="me"><span data-ic="🧭">🧭</span> ${esc(t("trMyPlace"))}</button>
        ${mode === "area" ? `<button type="button" class="btn btn-ghost small" data-trm="undo">${esc(t("trUndo"))}</button>
        <button type="button" class="btn btn-ghost small" data-trm="clear">${esc(t("trClear"))}</button>` : ""}
        <span class="spacer"></span>
        <button type="button" class="btn btn-primary" data-trm="ok">${esc(t("trDoneBtn"))}</button>
      </div>
      <p class="addr-msg" id="trMapMsg"></p>
    </div>`;
  document.body.appendChild(wrap);
  try { await loadLeaflet(); } catch { $("trMapMsg").textContent = t("trMapFail"); $("trMapMsg").className = "addr-msg err"; return; }
  const m = window.L.map("trMapEl", { zoomControl: true });
  trTiles(m);
  trPick = { mode, map: m, pin: trEdit.pin ? { ...trEdit.pin } : null, points: (trEdit.area || []).map((p) => [...p]), layers: window.L.featureGroup().addTo(m) };
  // where to start: this territory, else where the Map tool was, else the person's country, else the world
  const start = trShapes({ pin: trPick.pin, area: trPick.points });
  if (start.getLayers().length) trFit(m, start);
  else if (typeof mapView !== "undefined" && mapView) m.setView(mapView.getCenter(), Math.max(13, mapView.getZoom()));
  else {
    const cb = typeof myCountryBox === "function" ? myCountryBox() : null;
    if (cb?.bbox) m.fitBounds([[cb.bbox[1], cb.bbox[0]], [cb.bbox[3], cb.bbox[2]]]);
    else m.setView([20, 0], 2);
  }
  m.on("click", (e) => {
    const p = { lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) };
    if (trPick.mode === "pin") trPick.pin = p;
    else trPick.points.push([p.lat, p.lng]);
    drawTrPick();
  });
  drawTrPick();
  setTimeout(() => m.invalidateSize(), 60);
}
function drawTrPick() {
  if (!trPick) return;
  const L = window.L, g = trPick.layers;
  g.clearLayers();
  if (trPick.mode === "pin" && trPick.pin) L.marker([trPick.pin.lat, trPick.pin.lng]).addTo(g);
  if (trPick.mode === "area" && trPick.points.length) {
    const col = trColor();
    if (trPick.points.length >= 3) L.polygon(trPick.points, { color: col, weight: 3, fillOpacity: 0.18 }).addTo(g);
    else L.polyline(trPick.points, { color: col, weight: 3 }).addTo(g);
    trPick.points.forEach((p) => L.circleMarker(p, { radius: 6, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1 }).addTo(g));
  }
}
function closeTrMap() { trPick?.map.remove(); trPick = null; document.getElementById("trMapWrap")?.remove(); }

// ---------- taps ----------
document.addEventListener("click", async (e) => {
  const item = e.target.closest("[data-tr]");
  if (item) return openTerritory(item.dataset.tr);
  if (e.target.closest("#trAddBtn")) return openTerritory();

  const m = e.target.closest("#trMapWrap [data-trm]");
  if (m && trPick) {
    const a = m.dataset.trm;
    if (a === "cancel") return closeTrMap();
    if (a === "undo") { trPick.points.pop(); return drawTrPick(); }
    if (a === "clear") { trPick.points = []; return drawTrPick(); }
    if (a === "me") {
      navigator.geolocation?.getCurrentPosition((pos) => trPick?.map.setView([pos.coords.latitude, pos.coords.longitude], 17),
        () => { $("trMapMsg").textContent = t("trNoLocation"); $("trMapMsg").className = "addr-msg err"; }, { enableHighAccuracy: true, timeout: 10000 });
      return;
    }
    if (a === "ok") {
      if (trPick.mode === "pin") {
        if (!trPick.pin) { $("trMapMsg").textContent = t("trPinHint"); $("trMapMsg").className = "addr-msg err"; return; }
        trEdit.pin = trPick.pin;
      } else {
        if (trPick.points.length < 3) { $("trMapMsg").textContent = t("trAreaHint"); $("trMapMsg").className = "addr-msg err"; return; }
        trEdit.area = trPick.points;
      }
      closeTrMap();
      trMsg("");
      return paintTrHave();
    }
    return;
  }

  if (e.target.closest("#trModal") && e.target.id === "trModal") return closeTerritory();
  const o = e.target.closest("#trModal [data-tro]");
  if (o && trEdit) {
    const k = o.dataset.tro;
    if (k === "scan") return $("trScanInput").click();
    if (k === "photo") return $("trPhotoInput").click();
    if (k === "link") { $("trLinkBox").hidden = false; $("trLinkInput").value = trEdit.link || ""; return $("trLinkInput").focus(); }
    if (k === "pin" || k === "area") return openTrMap(k);
  }
  const b = e.target.closest("#trModal [data-trx]");
  if (!b || !trEdit) return;
  const a = b.dataset.trx;
  if (a === "close") return closeTerritory();
  if (a === "linkok") {
    const v = $("trLinkInput").value.trim();
    if (!trIsLink(v)) { trMsg(t("trLinkBad"), "err"); return $("trLinkInput").focus(); }
    trEdit.link = v; $("trLinkBox").hidden = true; trMsg(""); return paintTrHave();
  }
  if (a === "openlink" && trEdit.link) return typeof openOutside === "function" ? openOutside(trEdit.link) : window.open(trEdit.link, "_blank", "noopener");
  if (a === "go" && trEdit.pin) return window.open(navUrl(`${trEdit.pin.lat},${trEdit.pin.lng}`), "_blank", "noopener");
  if (a === "pin" || a === "area") return openTrMap(a);
  if (a === "dellink") { trEdit.link = ""; return paintTrHave(); }
  if (a === "delpin") { trEdit.pin = null; return paintTrHave(); }
  if (a === "delarea") { trEdit.area = []; return paintTrHave(); }
  if (a === "delphoto") { trEdit.dropPhoto = true; trEdit.newPhoto = null; trEdit.thumbNew = ""; return paintTrHave(); }
  if (a === "viewphoto") {
    const url = trEdit.newPhoto ? URL.createObjectURL(trEdit.newPhoto) : trEdit.id ? await trGetPhoto(trEdit.id) : null;
    return trShowPhoto(url || trEdit.thumbNew || trEdit.thumb);
  }
  if (a === "delete") {
    const x = trById(trEdit.id);
    if (!x || !(await askSure(t("trDelSure", { name: trLabel(x) })))) return;
    territories = territories.filter((y) => y.id !== x.id);
    await trDelPhoto(x.id);
    saveTerritories();
    closeTerritory();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (document.getElementById("trPhotoView")) return document.getElementById("trPhotoView").remove();
  if (document.getElementById("trMapWrap")) return closeTrMap();
  if (document.getElementById("trModal") && !document.getElementById("sureModal")) closeTerritory();
});

function trShowPhoto(src) {
  if (!src) return;
  document.getElementById("trPhotoView")?.remove();
  const v = document.createElement("div");
  v.id = "trPhotoView";
  v.className = "tr-photo-view";
  v.innerHTML = `<img src="${src}" alt="" /><button type="button" class="icon-btn" aria-label="${esc(t("wnClose"))}">✕</button>`;
  v.addEventListener("click", () => v.remove());
  document.body.appendChild(v);
}

// ---------- the two pictures: the QR code, and the card ----------
document.addEventListener("change", async (e) => {
  if (!trEdit) return;
  const file = e.target.files?.[0];
  if (e.target.id === "trScanInput" && file) {
    e.target.value = "";
    trMsg(t("working"));
    try {
      const text = (await trReadQR(file)).trim();
      if (!text) return trMsg(t("trScanNone"), "err");
      if (trIsLink(text)) { trEdit.link = text; trMsg(t("trScanOk"), "ok"); }
      else { trEdit.notes = [trEdit.notes, text].filter(Boolean).join("\n"); $("trNotes").value = trEdit.notes; trMsg(t("trScanText"), "ok"); }
      paintTrHave();
    } catch { trMsg(t("trScanNone"), "err"); }
  }
  if (e.target.id === "trPhotoInput" && file) {
    e.target.value = "";
    trMsg(t("working"));
    try {
      trEdit.newPhoto = await trShrink(file, 1600, 0.82);
      trEdit.thumbNew = await trDataUrl(await trShrink(file, 240, 0.7));
      trEdit.dropPhoto = false;
      trMsg("");
      paintTrHave();
    } catch { trMsg(t("payError"), "err"); }
  }
});

// ---------- save ----------
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "trForm" || !trEdit) return;
  e.preventDefault();
  const number = $("trNumber").value.trim(), name = $("trName").value.trim();
  if (!number && !name) { trMsg(t("trNeedNumber"), "err"); return $("trNumber").focus(); }
  const id = trEdit.id || crypto.randomUUID();
  const x = {
    id, number, name, out: $("trOut").value || "", done: $("trDoneDate").value || "", notes: $("trNotes").value.trim(),
    link: trEdit.link || "", pin: trEdit.pin || null, area: trEdit.area?.length >= 3 ? trEdit.area : [],
    thumb: trEdit.dropPhoto ? "" : trEdit.thumbNew || trEdit.thumb || "", createdAt: trById(id)?.createdAt || Date.now(),
  };
  try {
    if (trEdit.dropPhoto) await trDelPhoto(id);
    if (trEdit.newPhoto) await trPutPhoto(id, trEdit.newPhoto);
  } catch {}
  territories = territories.filter((y) => y.id !== id).concat([x]);
  saveTerritories();
  closeTerritory();
});

function initTerritories() {
  loadTerritories();
  renderTerritories();
}
