// MyServiceTime — App lock. The person chooses whether to lock the app, and then HOW it unlocks:
// either Face ID / fingerprint, or a passcode (4 or 6 digits). They can switch between the two anytime.
// It is asked when MyServiceTime opens on this device and when coming back to it after a while.
//
//  • It is set per device (Settings → Security), free for everyone. Nothing about it leaves the device.
//  • The passcode itself is never kept: only a salted PBKDF2 fingerprint of it, to check what is typed.
//  • Face ID / fingerprint: the phone apps use the phone's own check (Capacitor plugin "BiometricAuthNative"),
//    which falls back to the phone's own screen lock (PIN / pattern) when the face or finger isn't recognized;
//    the website uses the browser's built-in device check (Face ID / Touch ID / Windows Hello, through WebAuthn).
//  • Can't get in: with a Cloud account, sign in again (the data is in the Cloud); on this device only,
//    the only way back in is to erase MyServiceTime on this device (a lock that can be skipped protects nothing).
// theme.js already hid the page (html.app-locked) before it was drawn. Loaded after the translations.

const LOCK_KEY = "dailytime.lock";             // { method: "bio" | "code", len, salt, hash, cred, after } — this device only
const LOCK_LEFT_KEY = "dailytime.lock.left";   // when the app was last left (to lock again after a while)
const LOCK_FAIL_KEY = "dailytime.lock.fails";  // { n, until } wrong tries, and the wait after too many
const LOCK_GRACE = 15;                         // seconds away that never lock (a photo picker, a quick look elsewhere)

const lockCfg = () => { try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "null"); } catch { return null; } };
const lockSaveCfg = (c) => (c ? localStorage.setItem(LOCK_KEY, JSON.stringify(c)) : localStorage.removeItem(LOCK_KEY));
/** How this device unlocks: "bio", "code", or null (no lock). Older settings: a passcode, with Face ID added on top. */
const lockMethod = (cfg = lockCfg()) => (cfg?.method === "bio" || cfg?.method === "code" ? cfg.method : cfg?.hash ? (cfg.bio ? "bio" : "code") : null);
const lockIsDemo = () => typeof store !== "undefined" && !!store.demo; // (not the page address: "#demo" no longer skips the lock)
const lockOn = () => !!lockMethod() && !lockIsDemo();
const lockEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- the passcode's fingerprint ----------
const lockB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const lockUnB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const lockRandom = (n) => crypto.getRandomValues(new Uint8Array(n));
async function lockHash(pin, salt) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: lockUnB64(salt), iterations: 150000, hash: "SHA-256" }, key, 256);
  return lockB64(bits);
}

// ---------- Face ID / fingerprint ----------
const lockBioNative = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.BiometricAuthNative : null);
let lockBioScreenLock = false; // a phone with a screen lock but no fingerprint/face saved for apps: its screen lock does the check
async function lockBioAvailable() {
  const B = lockBioNative();
  lockBioScreenLock = false;
  if (B) {
    try {
      const r = await B.checkBiometry();
      if (r.isAvailable) return true;
      if (r.deviceIsSecure) { lockBioScreenLock = true; return true; }
      return false;
    } catch { return false; }
  }
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; }
}
/** Choosing it: the phone checks the face / finger once; the website makes a key that only this device's check opens. */
async function lockBioEnroll() {
  if (lockBioNative()) { await lockBioCheck(); return "native"; }
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: lockRandom(32), rp: { name: "MyServiceTime" },
    user: { id: lockRandom(16), name: "MyServiceTime", displayName: "MyServiceTime" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" },
    timeout: 60000,
  } });
  return lockB64(cred.rawId);
}
async function lockBioCheck() {
  const B = lockBioNative();
  if (B) { // if the face / finger isn't recognized, the phone offers its own PIN / pattern / passcode
    await B.internalAuthenticate({ reason: t("alBioReason"), cancelTitle: t("cancel"), allowDeviceCredential: true,
      androidTitle: "MyServiceTime", androidSubtitle: t("alBioReason"), androidConfirmationRequired: false });
    return;
  }
  const cfg = lockCfg();
  await navigator.credentials.get({ publicKey: {
    challenge: lockRandom(32), userVerification: "required", timeout: 60000,
    allowCredentials: [{ type: "public-key", id: lockUnB64(cfg.cred), transports: ["internal"] }],
  } });
}
/** What to tell the person when Face ID / fingerprint didn't go through (the phone's own reason, in its language). */
function lockBioErrText(e) {
  console.warn("App lock: Face ID / fingerprint failed", e?.code, e?.message);
  const why = String(e?.message || "").trim();
  if (!why || /not (available|enrolled)|no biometric/i.test(why)) return t("alBioNone");
  return `${t("alBioFail")} ${why}${e?.code ? ` (${e.code})` : ""}`;
}
/** "Is it really you?" before changing the lock: with whatever unlocks it now. */
async function lockVerify(done) {
  if (lockMethod() !== "bio") return lockShow("verify", done);
  try { await lockBioCheck(); done(true); } catch { done(false); }
}

// ---------- the lock screen ----------
let lk = { mode: "", entry: "", first: "", len: 4, msg: "", bad: false, forgot: false, done: null, busy: false, bioOk: null, bioScreen: false };
const lockShowing = () => !!document.getElementById("lockScreen") && !document.getElementById("lockScreen").hidden;
const lockBioUnlock = () => lk.mode === "unlock" && lockMethod() === "bio";

/** mode: "unlock" (the app opens), "choose" (turning the lock on: Face ID / fingerprint or a passcode),
 *  "new" (choose a passcode, typed twice), "verify" (the current passcode, to change settings). */
function lockShow(mode, done = null) {
  let el = document.getElementById("lockScreen");
  if (!el) {
    el = document.createElement("div");
    el.id = "lockScreen";
    el.className = "lk-screen";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    document.body.appendChild(el);
  }
  const cfg = lockCfg();
  lk = { mode, entry: "", first: "", len: cfg?.len || 4, msg: "", bad: false, forgot: false, done, busy: false, bioOk: null, bioScreen: false };
  el.hidden = false;
  document.documentElement.classList.toggle("app-locked", mode === "unlock");
  lockRender();
  if (mode === "choose") lockBioAvailable().then((ok) => { lk.bioOk = ok; lk.bioScreen = lockBioScreenLock; if (lk.mode === "choose") lockRender(); });
  if (lockBioUnlock() && lockBioNative()) setTimeout(lockTryBio, 350); // the phone asks for the face / finger right away
}
function lockHide() {
  const el = document.getElementById("lockScreen");
  if (el) el.hidden = true;
  document.documentElement.classList.remove("app-locked");
  localStorage.setItem(LOCK_LEFT_KEY, String(Date.now()));
}

const LK_BIO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 15.5a3.5 3.5 0 0 0 5 0"/></svg>';
const LK_CODE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="18" cy="5" r="1.4"/><circle cx="6" cy="11" r="1.4"/><circle cx="12" cy="11" r="1.4"/><circle cx="18" cy="11" r="1.4"/><circle cx="6" cy="17" r="1.4"/><circle cx="12" cy="17" r="1.4"/><circle cx="18" cy="17" r="1.4"/><circle cx="12" cy="22" r="1.1"/></svg>';
const LK_DEL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="M17 9l-5 6M12 9l5 6"/></svg>';

/** The two ways to unlock, as two big choices (the lock screen's "choose" step and Settings → Security). */
function lockOptionsHtml(current, bioOk, attr) {
  const opt = (m, icon, label) => {
    const off = m === "bio" && bioOk !== true && current !== "bio";
    return `<button type="button" class="al-opt${current === m ? " on" : ""}" ${attr}="${m}" role="radio" aria-checked="${current === m}"${off ? " disabled" : ""}>
      <span class="al-opt-ic">${icon}</span><span class="al-opt-label">${lockEsc(label)}</span></button>`;
  };
  return `<div class="al-opts" role="radiogroup">${opt("bio", LK_BIO_ICON, t("alBioSet"))}${opt("code", LK_CODE_ICON, t("alChange"))}</div>`;
}
const lockSetupPlugin = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.DeviceSettings : null);
const lockSetupBtn = (bioOk) => (bioOk === false && lockSetupPlugin()?.openBiometricSettings
  ? `<button type="button" class="btn btn-primary al-setup" data-al-setup>${LK_BIO_ICON}<span>${lockEsc(t("alBioSetup"))}</span></button>` : "");
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-al-setup]")) return;
  lockSetupPlugin()?.openBiometricSettings?.().catch(() => lockToast(t("alBioNeedPhone")));
});
// back from the phone's settings: check again, so the choice turns on by itself once a fingerprint is saved
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (lockShowing() && lk.mode === "choose") lockBioAvailable().then((ok) => { lk.bioOk = ok; lk.bioScreen = lockBioScreenLock; if (lk.mode === "choose") lockRender(); });
  if ($lk("secModal") && !$lk("secModal").hidden) paintLockSettings();
});
const lockBioHintKey = (bioOk, screenLock) => (bioOk === false ? (window.Capacitor?.isNativePlatform?.() ? "alBioNeedPhone" : "alBioNeedComputer") : screenLock ? "alBioPhoneLock" : "");

function lockRender() {
  const el = document.getElementById("lockScreen");
  if (!el) return;
  const local = localStorage.getItem("dailytime.local") === "1";
  const head = `<img class="lk-logo" src="icons/logo.svg" alt="" />`;
  if (lk.forgot) {
    el.innerHTML = `<div class="lk-card">${head}
      <h1 class="lk-title">${lockEsc(t(lockMethod() === "bio" ? "alCantUnlock" : "alForgot"))}</h1>
      <p class="lk-text">${lockEsc(t(local ? "alForgotLocal" : "alForgotCloud"))}</p>
      <button type="button" class="btn ${local ? "danger lk-erase" : "btn-primary"} lk-wide" data-lk="${local ? "erase" : "signin"}">${lockEsc(t(local ? "alForgotLocalBtn" : "alForgotCloudBtn"))}</button>
      <button type="button" class="link-btn lk-link" data-lk="back">${lockEsc(t("alBack"))}</button>
    </div>`;
    return;
  }
  if (lk.mode === "choose") { // turning the lock on: how should it unlock?
    const hint = lockBioHintKey(lk.bioOk, lk.bioScreen);
    el.innerHTML = `<div class="lk-card">${head}
      <h1 class="lk-title">${lockEsc(t("alChooseTitle"))}</h1>
      <p class="lk-text">${lockEsc(t("alChooseHint"))}</p>
      <div class="lk-choose${lk.busy ? " off" : ""}">${lockOptionsHtml("", lk.bioOk, "data-lkm")}</div>
      ${hint ? `<p class="lk-hint lk-bio-hint">${lockEsc(t(hint))}</p>` : ""}
      ${lockSetupBtn(lk.bioOk)}
      <p class="lk-msg${lk.bad ? " bad" : ""}" role="status">${lockEsc(lk.msg || "")}</p>
      <button type="button" class="link-btn lk-link" data-lk="cancel">${lockEsc(t("cancel"))}</button>
    </div>`;
    return;
  }
  if (lockBioUnlock()) { // Face ID / fingerprint: one big button (the phone asks by itself too)
    el.innerHTML = `<div class="lk-card">${head}
      <h1 class="lk-title">${lockEsc(t("alTitle"))}</h1>
      <p class="lk-text">${lockEsc(t("alBioLockText"))}</p>
      <button type="button" class="lk-bio-big" data-lk="bio">${LK_BIO_ICON}<span>${lockEsc(t("alBioBtn"))}</span></button>
      <p class="lk-msg" role="status">${lockEsc(lk.msg || "")}</p>
      <button type="button" class="link-btn lk-link" data-lk="forgot">${lockEsc(t("alCantUnlock"))}</button>
    </div>`;
    return;
  }
  const wait = lockWaitLeft();
  const sub = lk.mode === "unlock" ? "alEnter" : lk.mode === "verify" ? "alCurrent" : lk.first ? "alAgain" : "alNew";
  const msg = wait ? t("alWait", { s: wait }) : lk.msg;
  const dots = Array.from({ length: lk.len }, (_, i) => `<i class="${i < lk.entry.length ? "on" : ""}"></i>`).join("");
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => `<button type="button" class="lk-key" data-lk="d" data-d="${d}">${d}</button>`).join("");
  el.innerHTML = `<div class="lk-card">${head}
    <h1 class="lk-title">${lockEsc(lk.mode === "unlock" ? t("alTitle") : t("alSet"))}</h1>
    <p class="lk-text">${lockEsc(t(sub))}</p>
    ${lk.mode === "new" && !lk.first ? `<p class="lk-hint">${lockEsc(t("alNewHint", { n: lk.len }))}</p>` : ""}
    <div class="lk-dots${lk.bad ? " shake" : ""}" aria-hidden="true">${dots}</div>
    <p class="lk-msg${lk.bad || wait ? " bad" : ""}" role="status">${lockEsc(msg || "")}</p>
    <div class="lk-pad${wait || lk.busy ? " off" : ""}">${keys}<span class="lk-key lk-key-none" aria-hidden="true"></span><button type="button" class="lk-key" data-lk="d" data-d="0">0</button>
      <button type="button" class="lk-key lk-key-ic" data-lk="del" aria-label="${lockEsc(t("alDelete"))}" title="${lockEsc(t("alDelete"))}">${LK_DEL_ICON}</button></div>
    ${lk.mode === "unlock" ? `<button type="button" class="link-btn lk-link" data-lk="forgot">${lockEsc(t("alForgot"))}</button>` : ""}
    ${lk.mode === "new" && !lk.first ? `<button type="button" class="link-btn lk-link" data-lk="len">${lockEsc(t(lk.len === 4 ? "alUse6" : "alUse4"))}</button>` : ""}
    ${lk.mode !== "unlock" ? `<button type="button" class="link-btn lk-link" data-lk="cancel">${lockEsc(t("cancel"))}</button>` : ""}
  </div>`;
  if (wait) setTimeout(() => { if (lockShowing() && !lk.forgot) lockRender(); }, 1000);
}

// too many wrong tries: a wait that grows (30 s, 60 s, 2 min, … up to 5 min)
function lockFails() { try { return JSON.parse(localStorage.getItem(LOCK_FAIL_KEY) || "null") || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } }
function lockWaitLeft() { return Math.max(0, Math.ceil((lockFails().until - Date.now()) / 1000)); }
function lockFailed() {
  const f = lockFails();
  f.n += 1;
  if (f.n % 5 === 0) f.until = Date.now() + Math.min(300, 30 * 2 ** (f.n / 5 - 1)) * 1000;
  localStorage.setItem(LOCK_FAIL_KEY, JSON.stringify(f));
}

async function lockDigit(d) {
  if (lk.mode === "choose" || lockBioUnlock()) return;
  if (lk.busy || lockWaitLeft() || lk.entry.length >= lk.len) return;
  lk.entry += d; lk.bad = false; lk.msg = "";
  lockRender();
  if (lk.entry.length < lk.len) return;
  lk.busy = true;
  const code = lk.entry;
  const cfg = lockCfg();
  if (lk.mode === "new") { // the passcode becomes the way to unlock (Face ID / fingerprint is no longer used)
    if (!lk.first) { lk.first = code; lk.entry = ""; lk.busy = false; return lockRender(); }
    if (code !== lk.first) { lk.first = ""; lk.entry = ""; lk.busy = false; lk.bad = true; lk.msg = t("alMismatch"); return lockRender(); }
    const salt = lockB64(lockRandom(16));
    lockSaveCfg({ method: "code", after: cfg?.after ?? 60, len: lk.len, salt, hash: await lockHash(code, salt) });
    return lockFinish(true);
  }
  const ok = cfg?.hash && (await lockHash(code, cfg.salt)) === cfg.hash;
  lk.busy = false;
  if (!ok) {
    lockFailed();
    lk.entry = ""; lk.bad = true; lk.msg = t("alWrong");
    if (navigator.vibrate) navigator.vibrate(120);
    return lockRender();
  }
  localStorage.removeItem(LOCK_FAIL_KEY);
  lockFinish(true);
}
function lockFinish(ok) {
  const done = lk.done;
  lockHide();
  if (typeof done === "function") done(ok);
}
async function lockTryBio() {
  if (!lockShowing() || lk.mode !== "unlock" || lk.busy) return;
  lk.busy = true;
  try {
    await lockBioCheck();
    localStorage.removeItem(LOCK_FAIL_KEY);
    lk.busy = false;
    lockFinish(true);
  } catch (e) { // cancelled or not recognized: the big button asks again
    lk.busy = false;
    if (!/cancel/i.test(`${e?.code} ${e?.message}`)) { lk.msg = lockBioErrText(e); lockRender(); }
  }
}
/** The "choose" step: Face ID / fingerprint is checked once right away; a passcode is typed twice. */
async function lockChoose(m) {
  if (lk.busy) return;
  if (m === "code") { lk.mode = "new"; lk.len = 4; lk.msg = ""; lk.bad = false; return lockRender(); }
  lk.busy = true; lk.msg = ""; lk.bad = false; lockRender();
  try {
    const cred = await lockBioEnroll();
    lockSaveCfg({ method: "bio", after: lockCfg()?.after ?? 60, cred });
    lk.busy = false;
    lockFinish(true);
  } catch (e) {
    lk.busy = false; lk.bad = true; lk.msg = lockBioErrText(e);
    lockRender();
  }
}

document.addEventListener("click", async (e) => {
  const c = e.target.closest("#lockScreen [data-lkm]");
  if (c) return lockChoose(c.dataset.lkm);
  const b = e.target.closest("#lockScreen [data-lk]");
  if (!b) return;
  const a = b.dataset.lk;
  if (a === "d") lockDigit(b.dataset.d);
  else if (a === "del") { lk.entry = lk.entry.slice(0, -1); lockRender(); }
  else if (a === "bio") lockTryBio();
  else if (a === "len") { lk.len = lk.len === 4 ? 6 : 4; lk.entry = ""; lockRender(); }
  else if (a === "cancel") lockFinish(false);
  else if (a === "forgot") { lk.forgot = true; lockRender(); }
  else if (a === "back") { lk.forgot = false; lockRender(); }
  else if (a === "signin") { // a Cloud account: sign in again with the MyServiceTime password; the lock is turned off
    lockSaveCfg(null);
    localStorage.removeItem(LOCK_FAIL_KEY);
    lockHide();
    if (typeof signOut === "function" && typeof store !== "undefined" && store.user) return signOut();
    location.hash = "#signin"; location.reload();
  } else if (a === "erase") { // this device only: erase MyServiceTime here (asked once more)
    if (typeof askSure === "function" && !(await askSure(t("alEraseSure")))) return;
    Object.keys(localStorage).filter((k) => k.startsWith("dailytime.")).forEach((k) => localStorage.removeItem(k));
    try { for (const db of (await indexedDB.databases?.()) || []) indexedDB.deleteDatabase(db.name); } catch {}
    location.replace(location.pathname);
  }
});
document.addEventListener("keydown", (e) => { // a computer's keyboard works too
  if (!lockShowing() || lk.forgot || document.getElementById("sureModal")) return;
  if (e.key === "Escape" && lk.mode !== "unlock") return lockFinish(false);
  if (lk.mode === "choose" || lockBioUnlock()) return;
  if (/^[0-9]$/.test(e.key)) { e.preventDefault(); lockDigit(e.key); }
  else if (e.key === "Backspace") { e.preventDefault(); lk.entry = lk.entry.slice(0, -1); lockRender(); }
});

// ---------- when to lock: opening the app, and coming back after the chosen time ----------
function lockNow() { if (lockOn() && !lockShowing()) lockShow("unlock"); }
document.addEventListener("visibilitychange", () => {
  if (!lockOn() || lockShowing()) return;
  if (document.hidden) { localStorage.setItem(LOCK_LEFT_KEY, String(Date.now())); return; }
  const left = Number(localStorage.getItem(LOCK_LEFT_KEY)) || 0;
  const after = Math.max(LOCK_GRACE, Number(lockCfg()?.after ?? 60));
  if (left && Date.now() - left >= after * 1000) lockNow();
});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lockNow); else lockNow();

// ---------- Settings → Security ----------
async function paintLockSettings() {
  const on = $lk("alOn");
  if (!on) return;
  const cfg = lockCfg();
  const m = lockMethod(cfg);
  const demo = typeof store !== "undefined" && !!store.demo;
  $lk("setSecurityHead").hidden = $lk("setSecurity").hidden = demo; // the demo keeps nothing, so no lock there
  const row = document.querySelector('[data-more="security"]');
  if (row) row.closest("li").hidden = demo;
  if ($lk("setSecState")) $lk("setSecState").textContent = t(m ? "alOnLabel" : "alOffLabel"); // "On" / "Off" on the Settings row
  on.checked = !!m;
  $lk("alMethodRow").hidden = $lk("alAfterRow").hidden = !m;
  $lk("alChangeRow").hidden = m !== "code"; // "Change passcode" only when the passcode is what unlocks it
  $lk("alAfter").value = String(cfg?.after ?? 60);
  if (!m) return;
  const bio = await lockBioAvailable();
  $lk("alMethods").innerHTML = lockOptionsHtml(m, bio, "data-alm");
  const hint = $lk("alBioHint");
  const key = m === "bio" || !bio ? lockBioHintKey(bio, lockBioScreenLock) : "";
  hint.hidden = !key;
  hint.textContent = key ? t(key) : "";
  $lk("alBioSetupWrap").innerHTML = lockSetupBtn(bio);
}
const $lk = (id) => document.getElementById(id);

/** Settings → "Security" row: the App lock settings, in their own window. */
function openSecurity() {
  paintLockSettings();
  $lk("secModal").hidden = false;
  document.body.classList.add("sp-open");
}
function closeSecurity() {
  $lk("secModal").hidden = true;
  document.body.classList.remove("sp-open");
}
document.addEventListener("click", (e) => {
  const m = $lk("secModal");
  if (m && !m.hidden && (e.target === m || e.target.closest("#secClose"))) closeSecurity();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$lk("secModal")?.hidden && !lockShowing()) closeSecurity(); });
function lockToast(text) {
  if (typeof showToast === "function") return showToast(text);
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

document.addEventListener("change", async (e) => {
  const id = e.target.id;
  if (id === "alOn") {
    const want = e.target.checked;
    e.target.checked = !want; // nothing changes until it's set up (or, to turn it off, until it's really you)
    if (want) lockShow("choose", (ok) => { if (ok) { localStorage.setItem(LOCK_LEFT_KEY, String(Date.now())); lockToast(t("alIsOn")); } paintLockSettings(); });
    else lockVerify((ok) => { if (ok) { lockSaveCfg(null); lockToast(t("alIsOff")); } paintLockSettings(); });
  } else if (id === "alAfter") {
    const cfg = lockCfg();
    if (cfg) lockSaveCfg({ ...cfg, after: Number(e.target.value) });
  }
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#alChange")) return lockShow("verify", (ok) => { if (ok) lockShow("new", (done) => { if (done) lockToast(t("alIsOn")); paintLockSettings(); }); });
  const opt = e.target.closest("#alMethods [data-alm]");
  if (!opt || opt.disabled) return;
  const want = opt.dataset.alm;
  if (want === lockMethod()) return;
  // switching: first "is it really you?" with the current way, then set up the new one
  lockVerify(async (ok) => {
    if (!ok) return paintLockSettings();
    if (want === "code") return lockShow("new", (done) => { if (done) lockToast(t("alNowCode")); paintLockSettings(); });
    try {
      const cred = await lockBioEnroll();
      lockSaveCfg({ method: "bio", after: lockCfg()?.after ?? 60, cred });
      lockToast(t("alNowBio"));
    } catch (e) { lockToast(lockBioErrText(e)); }
    paintLockSettings();
  });
});
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paintLockSettings); else paintLockSettings();
