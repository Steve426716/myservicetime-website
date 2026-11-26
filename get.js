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

// the language menu (the same 20 languages as the app)
const sel = $g("gLang");
sel.innerHTML = Object.entries(LANGS).map(([code, l]) => `<option value="${code}">${l.name}</option>`).join("");
sel.value = lang;
sel.addEventListener("change", () => setLang(sel.value, paintGetPage));
$g("gShare").addEventListener("click", getShare);
$g("gShare2").addEventListener("click", getShare);
$g("gCopy").addEventListener("click", getCopy);
paintGetPage();
