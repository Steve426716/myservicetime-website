// MyServiceTime — reminders when the app is closed.
// Loaded before app.js (functions only; app.js calls initNotify()).
//
// When someone taps "Start Reminders":
//  1. the browser asks to allow notifications,
//  2. this device registers to receive MyServiceTime alerts (Web Push),
//  3. the TIMES of upcoming reminders are sent to the server — never titles, places or names.
// The server then sends "⏰ You have a reminder" at those times, even if MyServiceTime is closed.

const VAPID_PUBLIC = (window.DAILYTIME_CONFIG || {}).vapidPublicKey || "";
const pushSupported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isInstalled = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let swRegistration = null;
let uploadTimer = null;
let lastUploaded = null;

const b64urlToBytes = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

function showNotifyHint(key, kind = "") {
  const el = $("notifyHint");
  if (!key) { el.hidden = true; return; }
  el.textContent = t(key);
  el.className = `notify-hint ${kind}`;
  el.hidden = false;
}

async function registerWorker() {
  if (!("serviceWorker" in navigator)) return null;
  if (!swRegistration) swRegistration = await navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`);
  await navigator.serviceWorker.ready;
  return swRegistration;
}

/** Called when reminders are switched ON. Returns true if alerts will reach this device when closed. */
async function enableBackgroundReminders() {
  if (NativeNotify.available) return NativeNotify.enable(); // store app: notifications scheduled on the phone itself
  // website: reminders show as the browser's notifications, so ask once (this always follows a tap)
  if ("Notification" in window && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch {}
  }
  if ("Notification" in window && Notification.permission === "denied") showNotifyHint("notifyDenied", "warn");
  if (store.demo || store.local) return false; // the demo (and this-device-only use) rings inside the app only
  if (isIOS && !isInstalled()) { showNotifyHint("iosInstall", "warn"); return false; }
  if (!pushSupported) { showNotifyHint("pushUnsupported", "warn"); return false; }
  if (!VAPID_PUBLIC || typeof sb === "undefined" || !sb) return false; // server not set up yet: in-app alarms only
  try {
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") { showNotifyHint("notifyDenied", "warn"); return false; }
    const reg = await registerWorker();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(VAPID_PUBLIC) });
    const j = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({
      endpoint: j.endpoint, user_id: store.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, lang,
    });
    if (error) throw error;
    showNotifyHint("notifyOn", "ok");
    setTimeout(() => showNotifyHint(""), 8000);
    uploadReminderTimes(0);
    return true;
  } catch (e) {
    console.warn("notifications not available", e);
    showNotifyHint("pushFailed", "warn");
    return false;
  }
}

/** Called when reminders are switched OFF: the server forgets this person's reminder times. */
function disableBackgroundReminders() {
  NativeNotify.syncSoon(0); // store app: removes the scheduled phone notifications
  showNotifyHint("");
  uploadReminderTimes(0);
}

/** Every upcoming moment an alert should ring (same rules as the in-app alarm). */
function upcomingReminderTimes() {
  if (!started) return [];
  const now = Date.now();
  const times = new Set();
  for (const item of [...appts.map((a) => [a, reminderPoints(a)]), ...tasks.map((x) => [x, taskReminderPoints(x)]), ...todos.map((x) => [x, todoReminderPoints(x)]), ...events.map((x) => [x, eventReminderPoints(x)]), ...myReminders.map((x) => [x, myReminderPoints(x)])]) {
    const [obj, points] = item;
    for (const p of points) {
      if (p.at > now && !(obj.fired || {})[p.key]) times.add(new Date(Math.ceil(p.at / 60000) * 60000).toISOString());
    }
  }
  return [...times].sort().slice(0, 300);
}

/** Sends the reminder times to the server (a moment after changes, and only if they changed). */
function uploadReminderTimes(delay = 2000) {
  NativeNotify.syncSoon(); // store app: the phone's own notifications follow every change
  clearTimeout(uploadTimer);
  uploadTimer = setTimeout(async () => {
    if (typeof sb === "undefined" || !sb || !VAPID_PUBLIC || store.demo || store.local) return;
    const times = upcomingReminderTimes();
    const key = JSON.stringify(times);
    if (key === lastUploaded) return;
    try {
      const { error } = await sb.rpc("replace_reminders", { fire_times: times });
      if (!error) lastUploaded = key;
    } catch { /* offline: tried again on the next change or start */ }
  }, delay);
}

function initNotify() {
  // the background helper tells an open app that a reminder arrived → ring now
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "reminder") { checkReminders(); render(); }
    });
    registerWorker().catch(() => {});
  }
  if (started && NativeNotify.available) NativeNotify.syncSoon(1500); // keeps the next weeks scheduled
  if (started) {
    // keep this device registered and the times up to date (e.g. after changes on another device)
    if (pushSupported && Notification.permission === "granted") enableBackgroundReminders();
    else if (isIOS && !isInstalled()) showNotifyHint("iosInstall", "warn");
    uploadReminderTimes(1000);
  }
}
