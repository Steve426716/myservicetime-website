// MyServiceTime — the "Get the app" page (get.html): phone + iPad pictures, and a QR code of the website
// to open it on a phone or share it. The QR code is drawn here, on the device; nothing is sent anywhere.

/** The public address of MyServiceTime: config.js → siteUrl, or this site's own address. */
function getSiteUrl() {
  const cfg = (window.DAILYTIME_CONFIG || {}).siteUrl || "";
  if (cfg) return cfg;
  return location.origin + location.pathname.replace(/get\.html$/, "");
}

/** The QR code as an SVG (dark squares on white), with the logo in the middle. */
function getQrSvg(text) {
  const qr = qrcode(0, "H"); // "H": still readable with the logo covering the middle
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount(), q = 4, size = n + q * 2;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  const logo = Math.round(n * 0.22), lx = (size - logo) / 2;
  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR code" shape-rendering="crispEdges">
    <rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="#1f1b3a"/>
    <rect x="${lx - 0.6}" y="${lx - 0.6}" width="${logo + 1.2}" height="${logo + 1.2}" rx="1.2" fill="#fff"/>
    <image href="icons/logo.svg" x="${lx}" y="${lx}" width="${logo}" height="${logo}"/></svg>`;
}

const $g = (id) => document.getElementById(id);

function paintGetPage() {
  applyStaticText();
  document.title = `${t("getNav")} · MyServiceTime`;
  const url = getSiteUrl();
  $g("gLink").textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  try { $g("gQr").innerHTML = getQrSvg(url); } catch { $g("gQr").textContent = t("shareNoQr"); }
  $g("gMsg").textContent = "";
}

async function getShare() {
  const url = getSiteUrl();
  if (navigator.share) {
    try { await navigator.share({ title: "MyServiceTime", text: t("shareText"), url }); return; }
    catch (e) { if (e?.name === "AbortError") return; }
  }
  getCopy();
}
async function getCopy() {
  try { await navigator.clipboard.writeText(getSiteUrl()); $g("gMsg").textContent = t("shareCopied"); }
  catch { $g("gMsg").textContent = getSiteUrl(); }
}

// ---------- Open MyServiceTime / Download the app ----------
const G_CFG = window.DAILYTIME_CONFIG || {};
const UA = navigator.userAgent;
const IS_ANDROID = /Android/i.test(UA);
const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const PLAY_URL = G_CFG.playStoreUrl || "";
const APPLE_URL = G_CFG.appStoreId ? `https://apps.apple.com/app/id${G_CFG.appStoreId}` : "";
const APP_PAGE = new URL("./#app", location.href).href; // MyServiceTime in the browser

/** "Open MyServiceTime": on Android (Chrome, Samsung Internet…) the MyServiceTime app itself when it is on the
 *  phone; when it isn't — and on every other device — MyServiceTime opens here in the browser. */
function openAppHref() {
  if (!IS_ANDROID || /Firefox/i.test(UA)) return APP_PAGE;
  return "intent://open#Intent;scheme=myservicetime;package=com.myservicetime.app;S.browser_fallback_url=" +
    encodeURIComponent(APP_PAGE) + ";end";
}
document.querySelectorAll("[data-open-app]").forEach((a) => { a.href = openAppHref(); });

// the browser's own "Install app" (Android, computers): MyServiceTime on the home screen, like a store app
let gInstallPrompt = null;
addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); gInstallPrompt = e; });
addEventListener("appinstalled", () => { gInstallPrompt = null; $g("gDlMsg").textContent = t("getInstalledMsg"); });

/** "Download the app": the store page when the app is published there; otherwise the browser's install window;
 *  otherwise the steps to put it on the home screen. */
async function getDownload() {
  const store = IS_ANDROID ? PLAY_URL : IS_IOS ? APPLE_URL : "";
  if (store) { location.href = store; return; }
  if (gInstallPrompt) {
    const p = gInstallPrompt; gInstallPrompt = null;
    try { await p.prompt(); const r = await p.userChoice; if (r?.outcome === "accepted") $g("gDlMsg").textContent = t("getInstalledMsg"); return; } catch {}
  }
  const card = $g("gInstall");
  card.scrollIntoView({ behavior: "smooth", block: "start" });
  card.classList.remove("g-flash"); void card.offsetWidth; card.classList.add("g-flash");
}

/** The Google Play / App Store buttons: the store page, or "Coming soon" until the app is published there. */
function paintStores() {
  for (const [id, url] of [["gPlay", PLAY_URL], ["gApple", APPLE_URL]]) {
    const a = $g(id);
    if (url) { a.href = url; a.classList.remove("soon"); a.removeAttribute("aria-disabled"); }
    else { a.removeAttribute("href"); a.classList.add("soon"); a.setAttribute("aria-disabled", "true"); }
  }
}
paintStores();
$g("gDownload").addEventListener("click", getDownload);

// the language menu (the same 20 languages as the app)
const sel = $g("gLang");
sel.innerHTML = Object.entries(LANGS).map(([code, l]) => `<option value="${code}">${l.name}</option>`).join("");
sel.value = lang;
sel.addEventListener("change", () => setLang(sel.value, paintGetPage));
$g("gShare").addEventListener("click", getShare);
$g("gShare2").addEventListener("click", getShare);
$g("gCopy").addEventListener("click", getCopy);
paintGetPage();
