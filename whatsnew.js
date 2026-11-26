// MyServiceTime — "What's new" (every update, in plain words), "a new version is ready", and "Rate MyServiceTime".
//
//  • WHATS_NEW lists the updates, newest first. Each item is a text key in i18n.js ("wn230a" …), so it shows in the
//    person's language. Add an entry here (and its texts in i18n.js) with every update people should know about.
//  • version.json (next to index.html) holds the newest version number. The website checks it and offers "Refresh";
//    the phone apps check the website's copy (config.js → siteUrl) and offer "Update" (the store page).
//  • Rate: the phone apps open the store page (where people can always rate), and ask once by themselves with the
//    store's own rating window after MyServiceTime was used on 7 different days. The website shows the store links
//    (config.js → playStoreUrl / appStoreId), or "coming soon" until the apps are in the stores.
// Loaded with the app (after app.js).

const WHATS_NEW = [
  { v: "306", date: "2026-11-25", items: ["wn306a"] },
  { v: "269", date: "2026-11-21", items: ["wn269a", "wn269b"] },
  { v: "255", date: "2026-11-20", items: ["wn255a", "wn255b"] },
  { v: "244", date: "2026-11-20", items: ["wn244a", "wn241a", "wn232a", "wn230a", "wn230b", "wn230c", "wn235a", "wn236a"] },
  { v: "228", date: "2026-11-19", items: ["wn228a", "wn228b", "wn228c", "wn228d"] },
];
const WN_SEEN_KEY = "dailytime.wnSeen";      // the newest update the person has looked at
const WN_DAYS_KEY = "dailytime.useDays";     // days MyServiceTime was opened (for the one-time rating question)
const WN_ASKED_KEY = "dailytime.rateAsked";  // the store's rating window was shown once
const ANDROID_ID = "com.myservicetime.app";
let wnLatest = null;                          // the newest version found online (null = unknown / this one)

const wnCfg = () => window.DAILYTIME_CONFIG || {};
const wnNative = () => window.Capacitor?.getPlatform?.() || "web";
const wnNewest = () => WHATS_NEW[0]?.v || APP_VERSION;
const wnUnseen = () => Number(localStorage.getItem(WN_SEEN_KEY) || 0) < Number(wnNewest());
const wnUpdateReady = () => !!wnLatest && Number(wnLatest) > Number(APP_VERSION);

/** The store page of MyServiceTime (to rate it, or to update it). "" when not known yet. */
function wnStoreUrl(platform = wnNative()) {
  const c = wnCfg();
  if (platform === "ios") return c.appStoreId ? `itms-apps://apps.apple.com/app/id${c.appStoreId}?action=write-review` : "";
  if (platform === "android") return c.playStoreUrl || `market://details?id=${ANDROID_ID}`;
  return "";
}
function wnOpen(url) {
  if (typeof openOutside === "function") return openOutside(url);
  window.open(url, "_blank", "noopener");
}

// ---------- the "What's new" window ----------
function openWhatsNew() {
  localStorage.setItem(WN_SEEN_KEY, wnNewest());
  if (typeof noticesLoad === "function") { const l = noticesLoad(); let ch = false; for (const n of l) if (n.kind === "update" && !n.read) { n.read = true; ch = true; } if (ch) noticesSave(l); }
  paintWnRow();
  document.getElementById("wnModal")?.remove();
  const fmt = (d) => new Date(`${d}T12:00`).toLocaleDateString(uiLocale(), { year: "numeric", month: "long", day: "numeric" });
  const store = wnNative() !== "web";
  const status = wnUpdateReady()
    ? `<div class="wn-update"><p>${esc(t(store ? "wnUpdateApp" : "wnUpdateWeb", { store: wnNative() === "ios" ? "App Store" : "Google Play" }))}</p>
        <button type="button" class="btn btn-primary" data-wn="${store ? "store" : "reload"}">${esc(t(store ? "wnUpdateBtn" : "wnRefresh"))}</button></div>`
    : `<p class="wn-latest">✓ ${esc(t("wnLatest"))}</p>`;
  const releases = WHATS_NEW.map((r, i) => `<section class="wn-rel">
      <h3>${esc(fmt(r.date))}${i === 0 ? ` <span class="wn-badge">${esc(t("wnNew"))}</span>` : ""}</h3>
      <ul>${r.items.map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>
    </section>`).join("");
  const wrap = document.createElement("div");
  wrap.id = "wnModal";
  wrap.className = "sp-overlay wn-overlay";
  wrap.innerHTML = `<div class="sp-sheet wn-sheet" role="dialog" aria-modal="true" aria-labelledby="wnTitle">
      <button type="button" class="icon-btn sp-close" data-wn="close" aria-label="${esc(t("wnClose"))}">✕</button>
      <div class="wn-head"><span class="wn-ic" data-ic="✨">✨</span><div><h2 id="wnTitle">${esc(t("wnTitle"))}</h2>
        <p class="muted small-text">${esc(t("wnVersion", { v: APP_VERSION }))}</p></div></div>
      ${status}
      ${releases}
      <button type="button" class="btn btn-ghost wn-done" data-wn="close">${esc(t("wnClose"))}</button>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add("sp-open");
  const close = () => { wrap.remove(); document.body.classList.remove("sp-open"); document.removeEventListener("keydown", onKey); };
  const onKey = (e) => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  wrap.addEventListener("click", (e) => {
    if (e.target === wrap) return close();
    const b = e.target.closest("[data-wn]");
    if (!b) return;
    if (b.dataset.wn === "close") close();
    else if (b.dataset.wn === "reload") location.reload();
    else if (b.dataset.wn === "store") { const u = wnStoreUrl(); if (u) wnOpen(u); }
  });
}

/** Settings → "What's new": a "New" mark after an update (or when a newer version is out). */
function paintWnRow() {
  const tag = document.getElementById("setWnState");
  if (tag) tag.textContent = wnUnseen() || wnUpdateReady() ? t("wnNew") : "";
  tag?.classList.toggle("wn-dot", wnUnseen() || wnUpdateReady());
}

// ---------- after an update / a newer version online ----------
function wnAfterStart() {
  if (localStorage.getItem(WN_SEEN_KEY) == null) localStorage.setItem(WN_SEEN_KEY, wnNewest()); // a new install: nothing to announce
  paintWnRow();
  wnCheckOnline();
  wnCountDay();
}
async function wnCheckOnline() {
  const site = (wnCfg().siteUrl || "").replace(/\/+$/, "");
  const url = wnNative() === "web" ? "version.json" : site ? `${site}/version.json` : "";
  if (!url || !navigator.onLine) return;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return;
    const latest = String((await r.json()).version || "");
    if (!latest || latest === wnLatest) return;
    wnLatest = latest;
    paintWnRow();
    if (wnUpdateReady() && typeof noticeNewVersion === "function") noticeNewVersion(latest); // 🔔
    if (wnUpdateReady() && wnNative() === "web" && typeof showToast === "function") {
      showToast(t("wnUpdateWeb") + " " + t("wnRefresh"), 9000);
      const toast = [...document.querySelectorAll(".toast")].pop();
      if (toast) { toast.classList.add("toast-link"); toast.addEventListener("click", () => location.reload(), { once: true }); }
    }
  } catch {}
}
setInterval(() => { if (!document.hidden) wnCheckOnline(); }, 6 * 3600 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden && window.__appStarted) wnCheckOnline(); });

// ---------- Rate MyServiceTime ----------
function openRate() {
  const p = wnNative();
  if (p !== "web") { // the phone apps: the store page, where people can always rate
    const u = wnStoreUrl(p);
    if (u) return wnOpen(u);
    window.Capacitor?.Plugins?.InAppReview?.requestReview?.().catch(() => {});
    return;
  }
  // the website: both stores
  document.getElementById("rateModal")?.remove();
  const c = wnCfg();
  const links = [
    c.playStoreUrl ? `<a class="btn btn-primary rate-btn" href="${esc(c.playStoreUrl)}" target="_blank" rel="noopener">${esc(t("rateGoogle"))}</a>` : "",
    c.appStoreId ? `<a class="btn btn-primary rate-btn" href="https://apps.apple.com/app/id${esc(c.appStoreId)}?action=write-review" target="_blank" rel="noopener">${esc(t("rateApple"))}</a>` : "",
  ].join("");
  const wrap = document.createElement("div");
  wrap.id = "rateModal";
  wrap.className = "sp-overlay wn-overlay";
  wrap.innerHTML = `<div class="sp-sheet rate-sheet" role="dialog" aria-modal="true" aria-labelledby="rateTitle">
      <div class="rate-stars" aria-hidden="true">★★★★★</div>
      <h2 id="rateTitle">${esc(t("rateTitle"))}</h2>
      <p>${esc(t("rateText"))}</p>
      ${links || `<p class="rate-soon">${esc(t("rateSoon"))}</p>`}
      <button type="button" class="link-btn" data-rate="close">${esc(t("wnClose"))}</button>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-rate]")) wrap.remove(); });
}
/** The phone apps ask once, with the store's own rating window, after 7 different days of use. */
function wnCountDay() {
  if (wnNative() === "web" || (typeof store !== "undefined" && store.demo) || localStorage.getItem(WN_ASKED_KEY)) return;
  const today = new Date().toISOString().slice(0, 10);
  let days = [];
  try { days = JSON.parse(localStorage.getItem(WN_DAYS_KEY) || "[]"); } catch {}
  if (!days.includes(today)) days.push(today);
  localStorage.setItem(WN_DAYS_KEY, JSON.stringify(days.slice(-30)));
  if (days.length < 7) return;
  localStorage.setItem(WN_ASKED_KEY, today);
  setTimeout(() => window.Capacitor?.Plugins?.InAppReview?.requestReview?.().catch(() => {}), 4000);
}
