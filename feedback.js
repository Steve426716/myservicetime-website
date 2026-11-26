// MyServiceTime — "Send feedback": people tell the owner what works, what doesn't and what they'd like.
// A rating (1–5 stars), what it's about, a message, and (optional) an email for a reply. It is saved in the
// "feedback" table on Supabase (not encrypted, so the owner can read it in the dashboard → Table editor →
// feedback). If it can't be sent right now (offline, the demo, the cloud not set up yet), it waits on this
// device and is sent the next time the person is signed in and online.
// Loaded before app.js (functions only); app.js calls initFeedback().

const FB_OUTBOX = "dailytime.feedbackOutbox"; // waiting to be sent (this device only)
let fbRating = 0;

function openFeedback() {
  fbRating = 0;
  paintStars();
  $("fbKind").value = "idea";
  $("fbMsg").value = "";
  const p = typeof loadProfile === "function" ? loadProfile() : {};
  $("fbEmail").value = p.contactEmail || (store.demo ? "" : store.user?.email || "");
  $("fbNote").textContent = "";
  $("fbNote").className = "addr-msg";
  $("fbSend").disabled = false;
  $("feedbackModal").hidden = false;
  setTimeout(() => $("fbMsg").focus(), 60);
}
const closeFeedback = () => { $("feedbackModal").hidden = true; };

function paintStars() {
  document.querySelectorAll("#fbStars [data-star]").forEach((b) => {
    const on = Number(b.dataset.star) <= fbRating;
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(Number(b.dataset.star) === fbRating));
  });
}

/** Facts that help fix problems: app version, language, screen and browser (nothing personal). */
function deviceInfo() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "other";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "other";
  return `${os} · ${browser} · ${innerWidth}×${innerHeight}${matchMedia("(display-mode: standalone)").matches ? " · installed" : ""}`;
}

async function sendFeedbackRow(row) {
  if (store.demo || !sb || !store.user?.id) throw new Error("not now");
  const { error } = await sb.from("feedback").insert(store.local ? row : { ...row, user_id: store.user.id }); // no account: sent without one
  if (error) throw error;
}

const loadOutbox = () => { try { return JSON.parse(localStorage.getItem(FB_OUTBOX)) || []; } catch { return []; } };
const saveOutbox = (list) => { if (list.length) localStorage.setItem(FB_OUTBOX, JSON.stringify(list.slice(-20))); else localStorage.removeItem(FB_OUTBOX); };

/** Sends what was waiting on this device (called when the app opens and when the connection comes back). */
async function flushFeedback() {
  const list = loadOutbox();
  if (!list.length || store.demo || !sb || !store.user?.id) return;
  const left = [];
  for (const row of list) { try { await sendFeedbackRow(row); } catch { left.push(row); } }
  saveOutbox(left);
}

async function submitFeedback(e) {
  e.preventDefault();
  const message = $("fbMsg").value.trim().slice(0, 4000);
  if (!message) { $("fbNote").textContent = t("fbNeedMsg"); $("fbNote").className = "addr-msg err"; return $("fbMsg").focus(); }
  const email = $("fbEmail").value.trim().slice(0, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $("fbNote").textContent = t("badEmail"); $("fbNote").className = "addr-msg err"; return $("fbEmail").focus(); }
  const row = {
    rating: fbRating || null,
    kind: $("fbKind").value,
    message,
    contact_email: email || null,
    app_version: typeof APP_VERSION !== "undefined" ? APP_VERSION : "",
    lang,
    device: deviceInfo(),
    created_at: new Date().toISOString(),
  };
  $("fbSend").disabled = true;
  $("fbNote").textContent = t("working");
  $("fbNote").className = "addr-msg";
  let sent = true;
  try { await sendFeedbackRow(row); } catch { sent = false; saveOutbox([...loadOutbox(), row]); }
  $("fbNote").textContent = t(sent ? "fbThanks" : "fbQueued");
  $("fbNote").className = "addr-msg ok";
  setTimeout(closeFeedback, 1800);
}

function initFeedback() {
  $("feedbackForm").addEventListener("submit", submitFeedback);
  $("fbClose").addEventListener("click", closeFeedback);
  $("feedbackModal").addEventListener("mousedown", (e) => { if (e.target === $("feedbackModal")) closeFeedback(); });
  $("fbStars").addEventListener("click", (e) => {
    const b = e.target.closest("[data-star]");
    if (!b) return;
    fbRating = Number(b.dataset.star) === fbRating ? 0 : Number(b.dataset.star); // tap the same star again to clear
    paintStars();
  });
  $("setFeedback").addEventListener("click", openFeedback);
  window.addEventListener("online", flushFeedback);
  setTimeout(flushFeedback, 4000); // anything that waited on this device
}
