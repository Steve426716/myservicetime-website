// MyServiceTime — the notifications list (the ✨ button at the top of the app, on every page).
// (Not a bell: the bell means reminders everywhere in MyServiceTime.)
//
// What shows there, newest first:
//  • welcome    — once, when MyServiceTime is first set up on a device
//  • update     — MyServiceTime was updated (opens "What's new")
//  • ready      — a newer version is out (website: refresh; phone apps: the store page)
//  • reminder   — every reminder that went off (appointments, tasks, to-dos, events, my reminders)
// Each notification shows for 24 hours, then disappears from the list (and from the ✨ number).
// They're still remembered for 30 days (up to 60), so the same one doesn't come back.
// The list is kept with the person's data (encrypted, like everything else).
// Loaded with the app (after whatsnew.js); app.js calls addNotice() for reminders.

const NT_KEY = "dailytime.notices";
const NT_MAX = 60, NT_DAYS = 30;
const NT_SHOW_HOURS = 24; // how long a notification stays in the list

function noticesLoad() {
  try { return JSON.parse(store.getItem(NT_KEY) || "[]"); } catch { return []; }
}
function noticesSave(list) {
  const cutoff = Date.now() - NT_DAYS * 864e5;
  store.setItem(NT_KEY, JSON.stringify(list.filter((n) => n.at >= cutoff).slice(0, NT_MAX)));
  paintBell();
}
/** Adds a notification (once per id). kind: welcome | update | ready | reminder. */
function addNotice({ id, kind, title = "", text = "", ref = "", v = "" }) {
  if (typeof store === "undefined" || !store.user) return;
  const list = noticesLoad();
  if (list.some((n) => n.id === id)) return;
  list.unshift({ id, kind, title, text, ref, v, at: Date.now(), read: false });
  noticesSave(list);
}
/** What the list shows: the last 24 hours only. */
const noticesShown = () => noticesLoad().filter((n) => n.at >= Date.now() - NT_SHOW_HOURS * 3600e3);
const unreadCount = () => noticesShown().filter((n) => !n.read).length;

function paintBell() {
  const b = document.getElementById("bellBtn");
  if (!b) return;
  const n = unreadCount();
  const badge = b.querySelector(".bell-count");
  badge.textContent = n > 9 ? "9+" : String(n);
  badge.hidden = n === 0;
  b.setAttribute("aria-label", n ? `${t("ntTitle")} (${n})` : t("ntTitle"));
  b.title = t("ntTitle");
}

// ---------- what each kind says (in the person's language, at the time it is read) ----------
const NT_ICON = { welcome: "👋", update: "✨", ready: "⬇️", reminder: "🔔" };
function noticeWords(n) {
  if (n.kind === "welcome") return [t("ntWelcomeTitle"), t("ntWelcomeText")];
  if (n.kind === "update") return [t("ntUpdateTitle"), t("ntUpdateText", { v: n.v })];
  if (n.kind === "ready") {
    const app = (window.Capacitor?.getPlatform?.() || "web") !== "web";
    return [t("ntReadyTitle"), app ? t("ntReadyApp", { v: n.v, store: window.Capacitor.getPlatform() === "ios" ? "App Store" : "Google Play" }) : t("ntReadyWeb", { v: n.v })];
  }
  return [n.title, n.text];
}
function ntAgo(at) {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return t("ntNow");
  const rtf = new Intl.RelativeTimeFormat(uiLocale(), { numeric: "auto" });
  if (s < 3600) return rtf.format(-Math.round(s / 60), "minute");
  if (s < 86400) return rtf.format(-Math.round(s / 3600), "hour");
  if (s < 7 * 86400) return rtf.format(-Math.round(s / 86400), "day");
  return new Date(at).toLocaleDateString(uiLocale(), { month: "short", day: "numeric" });
}

// ---------- one notification, open to read ----------
let ntReading = null; // the id of the notification being read, or null (the list)
/** The button under an open notification: [label, what it does], or null. */
function noticeAction(n) {
  const app = (window.Capacitor?.getPlatform?.() || "web") !== "web";
  if (n.kind === "update" && typeof openWhatsNew === "function") return [t("wnTitle"), () => openWhatsNew()];
  if (n.kind === "ready") {
    if (!app) return [t("wnRefresh"), () => location.reload()];
    if (typeof wnStoreUrl === "function" && wnStoreUrl()) return [t("wnUpdateBtn"), () => wnOpen(wnStoreUrl())];
    return null;
  }
  if (n.kind === "reminder" && n.ref && typeof appts !== "undefined" && appts.some((a) => a.id === n.ref) && typeof goToTool === "function")
    return [t("ntOpenAppt"), () => goToTool("#listCard")];
  return null;
}
function renderNoticeRead(n) {
  const box = document.getElementById("ntPanel");
  const [title, text] = noticeWords(n);
  const ic = NT_ICON[n.kind] || "🔔";
  const act = noticeAction(n);
  const when = new Date(n.at).toLocaleString(uiLocale(), { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
  box.innerHTML = `<div class="nt-head"><button type="button" class="icon-btn nt-back" data-nt-back aria-label="${esc(t("alBack"))}" title="${esc(t("alBack"))}">‹</button>
      <h2 id="ntTitleH">${esc(t("ntTitle"))}</h2>
      <button type="button" class="icon-btn nt-x" data-nt-close aria-label="${esc(t("wnClose"))}">✕</button></div>
    <article class="nt-read">
      <span class="nt-read-ic" data-ic="${ic}">${ic}</span>
      <h3>${esc(title)}</h3>
      <p class="nt-read-when">${esc(when)}</p>
      ${text ? `<p class="nt-read-text">${esc(text)}</p>` : ""}
      ${act ? `<button type="button" class="btn btn-primary nt-read-btn" data-nt-act>${esc(act[0])}</button>` : ""}
    </article>`;
  if (typeof applyIcons === "function") applyIcons(box);
}

// ---------- the list ----------
function renderNotices() {
  const box = document.getElementById("ntPanel");
  if (!box) return;
  if (ntReading) { const n = noticesLoad().find((x) => x.id === ntReading); if (n) return renderNoticeRead(n); ntReading = null; }
  const list = noticesShown();
  const items = list.map((n) => {
    const [title, text] = noticeWords(n);
    const ic = NT_ICON[n.kind] || "🔔";
    return `<li><button type="button" class="nt-item${n.read ? "" : " unread"}" data-nt="${esc(n.id)}">
      <span class="nt-ic" data-ic="${ic}">${ic}</span>
      <span class="nt-body"><strong>${esc(title)}</strong>${text ? `<span>${esc(text)}</span>` : ""}<small>${esc(ntAgo(n.at))}</small></span>
      ${n.read ? "" : '<span class="nt-dot" aria-hidden="true"></span>'}
    </button></li>`;
  }).join("");
  box.innerHTML = `<div class="nt-head"><h2 id="ntTitleH">${esc(t("ntTitle"))}</h2>
      ${list.some((n) => !n.read) ? `<button type="button" class="link-btn" data-nt-all>${esc(t("ntMarkAll"))}</button>` : ""}
      <button type="button" class="icon-btn nt-x" data-nt-close aria-label="${esc(t("wnClose"))}">✕</button></div>
    ${list.length ? `<ul class="nt-list">${items}</ul>` : `<p class="nt-empty"><span data-ic="📥">📥</span>${esc(t("ntEmpty"))}</p>`}`;
}
function openNotices() {
  const p = document.getElementById("ntPanel");
  const wrap = document.getElementById("ntWrap");
  if (!wrap.hidden) return closeNotices();
  ntReading = null;
  renderNotices();
  wrap.hidden = false;
  document.getElementById("bellBtn").setAttribute("aria-expanded", "true");
  p.focus({ preventScroll: true });
}
function closeNotices() {
  document.getElementById("ntWrap").hidden = true;
  document.getElementById("bellBtn").setAttribute("aria-expanded", "false");
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#bellBtn")) return openNotices();
  const wrap = document.getElementById("ntWrap");
  if (!wrap || wrap.hidden) return;
  if (e.target === wrap || e.target.closest("[data-nt-close]")) return closeNotices();
  if (e.target.closest("[data-nt-all]")) {
    noticesSave(noticesLoad().map((n) => ({ ...n, read: true })));
    return renderNotices();
  }
  if (e.target.closest("[data-nt-back]")) { ntReading = null; return renderNotices(); }
  if (e.target.closest("[data-nt-act]")) { // the button under an open notification
    const n = noticesLoad().find((x) => x.id === ntReading);
    const act = n && noticeAction(n);
    closeNotices();
    if (act) act[1]();
    return;
  }
  const item = e.target.closest("[data-nt]");
  if (!item) return;
  const list = noticesLoad();
  const n = list.find((x) => x.id === item.dataset.nt);
  if (!n) return;
  n.read = true;     // opening it = read
  noticesSave(list);
  ntReading = n.id;  // open it, to read
  renderNotices();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || document.getElementById("ntWrap")?.hidden) return;
  if (ntReading) { ntReading = null; return renderNotices(); } // Esc: back to the list first
  closeNotices();
});

/** When the app opens: the welcome (first time on this device), "updated", and the bell's number. */
function noticesAfterStart() {
  if (!store.getItem(NT_KEY)) addNotice({ id: "welcome", kind: "welcome" });
  if (typeof wnUnseen === "function" && wnUnseen()) addNotice({ id: `update:${wnNewest()}`, kind: "update", v: APP_VERSION });
  paintBell();
}
/** A newer version online (whatsnew.js): one notice per version. */
function noticeNewVersion(v) { addNotice({ id: `ready:${v}`, kind: "ready", v }); }
setInterval(() => { // "5 minutes ago" stays right, and a notification older than 24 hours leaves the list and the ✨ number
  if (!document.getElementById("ntWrap")?.hidden) renderNotices();
  if (typeof store !== "undefined" && store.user) paintBell();
}, 60000);
