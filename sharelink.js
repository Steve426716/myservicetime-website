// ---------- "Share MyServiceTime": a QR code of the app's link, plus Share and Copy ----------
// The QR code is drawn on the device (vendor/qrcode.js, loaded the first time); nothing is sent anywhere.

/** The public link to MyServiceTime: config.js → siteUrl, or (on the website) this site's own address. "" if unknown. */
function appShareUrl() {
  const cfg = (window.DAILYTIME_CONFIG || {}).siteUrl || "";
  if (cfg) return cfg;
  const native = window.Capacitor?.isNativePlatform?.();
  if (!native && /^https?:$/.test(location.protocol)) return location.origin + location.pathname.replace(/index\.html$/, "");
  return ""; // the phone apps need siteUrl (set once the website is online)
}

let qrLib = null;
function loadQrLib() {
  if (typeof qrcode === "function") return Promise.resolve();
  if (!qrLib) qrLib = loadScript(`vendor/qrcode.js?v=${APP_VERSION}`);
  return qrLib;
}

/** The QR code as an SVG (dark squares on white), with a white space in the middle for the logo. */
function qrSvg(text) {
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

async function openShareApp() {
  const url = appShareUrl();
  if (!url) return;
  $("shareModal").hidden = false;
  document.body.classList.add("sp-open");
  $("shLink").textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  $("shMsg").textContent = "";
  $("shQr").innerHTML = "";
  try {
    await loadQrLib();
    $("shQr").innerHTML = qrSvg(url);
  } catch {
    $("shQr").textContent = t("shareNoQr");
  }
}
function closeShareApp() {
  $("shareModal").hidden = true;
  document.body.classList.remove("sp-open");
}

async function shareAppLink() {
  const url = appShareUrl();
  const text = t("shareText");
  try {
    const SH = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Share;
    if (SH) return await SH.share({ title: "MyServiceTime", text, url });
    if (navigator.share) return await navigator.share({ title: "MyServiceTime", text, url });
  } catch (e) {
    if (e && e.name === "AbortError") return; // closed the share sheet
  }
  copyAppLink();
}
async function copyAppLink() {
  const url = appShareUrl();
  try { await navigator.clipboard.writeText(url); }
  catch {
    const ta = document.createElement("textarea");
    ta.value = url; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
  $("shMsg").textContent = t("shareCopied");
}

function initShareApp() {
  // the Settings / More lists show "Share MyServiceTime" only when there is a link to share
  document.querySelectorAll('[data-more="shareapp"]').forEach((b) => { b.closest("li").hidden = !appShareUrl(); });
  $("shClose").addEventListener("click", closeShareApp);
  $("shareModal").addEventListener("click", (e) => { if (e.target === $("shareModal")) closeShareApp(); });
  $("shShare").addEventListener("click", shareAppLink);
  $("shCopy").addEventListener("click", copyAppLink);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("shareModal").hidden) closeShareApp(); });
}
initShareApp();
