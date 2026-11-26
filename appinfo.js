// MyServiceTime — Settings → "App info" (version, this device, the room it takes on this device, credits), and the Privacy Policy / Terms of Service
// shown inside the app (a window with ✕), so nobody gets stuck on a page without a way back (iPhone has no Back button).
// Loaded with the app (after whatsnew.js).

// (The free tools' licenses travel with their files in vendor/; the map and the weather show their own credit lines.)

// ---------- how much room MyServiceTime takes on this device ----------
const aiBytes = (str) => new Blob([str]).size;
function aiSize(bytes) {
  const mb = bytes / 1048576;
  const fmt = (n, unit, d) => new Intl.NumberFormat(uiLocale(), { style: "unit", unit, unitDisplay: "short", maximumFractionDigits: d }).format(n);
  return mb >= 1 ? fmt(mb, "megabyte", 1) : fmt(Math.max(1, Math.round(bytes / 1024)), "kilobyte", 0);
}
/** { data, photos, files, total } in bytes: the person's data, Moments photos, and (website) the files kept for offline. */
async function aiMeasure() {
  let data = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("dailytime.")) data += aiBytes(k) + aiBytes(localStorage.getItem(k) || "");
  }
  let photos = 0, files = 0;
  try {
    const e = await navigator.storage?.estimate?.();
    if (e?.usageDetails) { photos = e.usageDetails.indexedDB || 0; files = (e.usageDetails.caches || 0) + (e.usageDetails.serviceWorkerRegistrations || 0); }
    else if (e?.usage) photos = e.usage; // (browsers without the details: everything in one)
  } catch {}
  return { data, photos, files, total: data + photos + files };
}

function openAppInfo() {
  document.getElementById("aiModal")?.remove();
  const p = window.Capacitor?.getPlatform?.() || "web";
  const kind = t(p === "ios" ? "aiKindIos" : p === "android" ? "aiKindAndroid" : "aiKindWeb");
  const last = typeof WHATS_NEW !== "undefined" && WHATS_NEW[0]
    ? new Date(`${WHATS_NEW[0].date}T12:00`).toLocaleDateString(uiLocale(), { year: "numeric", month: "long", day: "numeric" }) : "";
  const row = (k, v, id = "") => `<div class="ai-row"${id ? ` id="${id}"` : ""}><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`;
  const wrap = document.createElement("div");
  wrap.id = "aiModal";
  wrap.className = "sp-overlay wn-overlay";
  wrap.innerHTML = `<div class="sp-sheet ai-sheet" role="dialog" aria-modal="true" aria-labelledby="aiTitleH">
      <button type="button" class="icon-btn sp-close" data-ai="close" aria-label="${esc(t("wnClose"))}">✕</button>
      <div class="ai-top"><img src="icons/logo.svg?v=${APP_VERSION}" alt="" /><h2 id="aiTitleH">MyServiceTime</h2>
        <p class="muted">${esc(t("aiVersion", { v: APP_VERSION }))}</p></div>
      <div class="ai-box">
        ${last ? row(t("aiUpdated"), last) : ""}
        ${row(t("aiDevice"), kind)}
      </div>
      <h3 class="ai-h">${esc(t("aiStorage"))}</h3>
      <div class="ai-box" id="aiStore">
        ${row(t("aiData"), t("aiMeasuring"), "aiSData")}
        ${row(t("aiPhotos"), t("aiMeasuring"), "aiSPhotos")}
        ${p === "web" ? row(t("aiFiles"), t("aiMeasuring"), "aiSFiles") : ""}
        <div class="ai-row ai-total" id="aiSTotal"><span>${esc(t("aiTotal"))}</span><strong>${esc(t("aiMeasuring"))}</strong></div>
      </div>
      ${p !== "web" ? `<p class="ai-note">${esc(t("aiAppItself"))}</p>` : ""}
      <p class="ai-copy">© ${new Date().getFullYear()} MyServiceTime</p>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add("sp-open");
  aiMeasure().then((m) => {
    const set = (id, v) => { const el = document.querySelector(`#${id} strong`); if (el) el.textContent = aiSize(v); };
    set("aiSData", m.data); set("aiSPhotos", m.photos); set("aiSFiles", m.files);
    set("aiSTotal", p === "web" ? m.total : m.data + m.photos);
  });
  const close = () => { wrap.remove(); document.body.classList.remove("sp-open"); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap || e.target.closest('[data-ai="close"]')) close();
  });
}

/** The Privacy Policy or the Terms of Service, inside the app (with ✕). */
function openLegal(which) {
  document.getElementById("legalModal")?.remove();
  const title = t(which === "terms" ? "legalTerms" : "legalPrivacy");
  const wrap = document.createElement("div");
  wrap.id = "legalModal";
  wrap.className = "legal-overlay";
  wrap.innerHTML = `<div class="legal-frame" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="legal-head"><strong>${esc(title)}</strong>
        <button type="button" class="icon-btn" data-legal="close" aria-label="${esc(t("wnClose"))}">✕</button></div>
      <iframe src="${which === "terms" ? "terms" : "privacy"}.html?v=${APP_VERSION}" title="${esc(title)}"></iframe>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add("sp-open");
  const frame = wrap.querySelector("iframe");
  frame.addEventListener("load", () => { // inside the app: the page's own top bar (with its links) isn't needed
    try { frame.contentDocument.querySelector(".legal-top")?.remove(); } catch {}
  });
  const close = () => { wrap.remove(); if (!document.getElementById("aiModal")) document.body.classList.remove("sp-open"); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-legal]")) close(); });
}
