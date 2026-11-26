// MyServiceTime — personal accounts with online sync (Supabase) and end-to-end encryption.
//
// HOW PRIVACY WORKS
//  • Each person signs in with email + password (Supabase Auth).
//  • All their data (appointments, contacts, notes, time tracker, settings) is ONE encrypted "vault".
//  • A random data key (AES-256-GCM) encrypts the vault. That data key is itself encrypted ("wrapped")
//    with a key made from the person's password (PBKDF2-SHA256, 310 000 rounds).
//  • Only scrambled text is uploaded. The server, and anyone who can see the database, cannot read it.
//  • Changing the password only re-wraps the data key, so every device keeps working.
//  • If someone resets a forgotten password by email, their data stays locked with the OLD password:
//    they type the old one once to move the data over — or start over with an empty account.
//
// HOW SYNC WORKS
//  • A copy of the vault (still encrypted) is kept on the device, so the app opens instantly and works offline.
//  • Changes upload a moment after they're made; other devices pull them on open, on focus and every minute.
//  • If two devices changed things at the same time, each part (appointments, contacts, notes…) keeps
//    the most recent change.

const CFG = window.DAILYTIME_CONFIG || {};
// Raise this (and the ?v= numbers in index.html) when you publish an update, so browsers fetch the new files.
const APP_VERSION = "306";
const PBKDF2_ROUNDS = 310000;
const KEEP_KEY = "dailytime.keep";
const dekKey = (uid) => `dailytime.dek.${uid}`;
const cacheKey = (uid) => `dailytime.cache.${uid}`;
const OLD_KEYS = ["dailytime.users", "dailytime.session"]; // from the device-only version
// "Use it on this device only": free, no account. The data is kept (encrypted) on this device only.
const LOCAL_KEY = "dailytime.local";
const MOVE_KEY = "dailytime.localMovePending"; // this device's data went into an account, but the Cloud hasn't saved it yet
const LOCAL_ID = "local";

// ---------- the App Store / Google Play version ----------
// Inside the store apps nothing is sold or priced (Apple's and Google's rules): no prices, no "subscribe",
// no free-week bar, no account creation. The cloud is a separate service people sign in to.
// Store builds (Capacitor) are detected by themselves; for testing in a browser: ?storeapp=1 (and ?storeapp=0 to undo).
(() => {
  const q = new URLSearchParams(location.search).get("storeapp");
  if (q === "1") localStorage.setItem("dailytime.storeApp", "1");
  if (q === "0") localStorage.removeItem("dailytime.storeApp");
})();
const STORE_APP = !!(window.Capacitor?.isNativePlatform?.() || localStorage.getItem("dailytime.storeApp") === "1");
document.documentElement.classList.toggle("store-app", STORE_APP);

// ---------- small helpers ----------
const bytesToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const authEl = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- crypto ----------
async function passwordKey(password, saltB64, rounds) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64ToBytes(saltB64), iterations: rounds, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}
async function encryptBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: bytesToB64(iv), data: bytesToB64(data) };
}
async function decryptBytes(key, box) {
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(box.iv) }, key, b64ToBytes(box.data)));
}
const encryptText = (key, text) => encryptBytes(key, new TextEncoder().encode(text));
const decryptText = async (key, box) => new TextDecoder().decode(await decryptBytes(key, box));
const importDek = (raw) => crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
const newSalt = () => bytesToB64(crypto.getRandomValues(new Uint8Array(16)));

/** Wraps the data key with a password. Returns the fields stored on the server. */
async function wrapDek(dekRaw, password) {
  const salt = newSalt();
  const kek = await passwordKey(password, salt, PBKDF2_ROUNDS);
  return { salt, rounds: PBKDF2_ROUNDS, wrapped_key: JSON.stringify(await encryptBytes(kek, dekRaw)) };
}
/** Opens the data key with a password. Throws if the password is wrong. */
async function unwrapDek(row, password) {
  const kek = await passwordKey(password, row.salt, row.rounds);
  return decryptBytes(kek, JSON.parse(row.wrapped_key));
}

// ---------- server ----------
let sb = null;
const configured = () => !!(window.DAILYTIME_MOCK_SERVER || (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase));

async function fetchVault(uid) {
  const { data, error } = await sb.from("vaults").select("*").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data;
}

// ---------- the signed-in person's storage (same shape as localStorage) ----------
const store = {
  user: null,          // { id, email, name }
  version: 0,          // server version this copy is based on
  _dek: null,
  _dekRaw: null,
  _data: {},
  _changed: {},        // parts changed here since the last upload
  _cacheWrites: Promise.resolve(),
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
  setItem(k, v) { this._data[k] = String(v); this._touch(k); },
  removeItem(k) { delete this._data[k]; this._touch(k); },
  _touch(k) {
    if (this.demo) return; // demo: changes live only on this page and vanish when it closes
    if (this.local) return saveCache(); // this device only: saved here, nothing is uploaded
    this._changed[k] = Date.now();
    saveCache();
    scheduleSync(1500);
  },
};

function saveCache() {
  const snapshot = { data: JSON.stringify(store._data), version: store.version, changed: { ...store._changed } };
  const uid = store.user.id, dek = store._dek;
  store._cacheWrites = store._cacheWrites.then(async () => {
    const box = await encryptText(dek, snapshot.data);
    localStorage.setItem(cacheKey(uid), JSON.stringify({ ...box, version: snapshot.version, changed: snapshot.changed, user: store.user }));
  }).catch(() => {});
}
async function loadCache(uid, dek) {
  const raw = localStorage.getItem(cacheKey(uid));
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { data: JSON.parse(await decryptText(dek, c)), version: c.version || 0, changed: c.changed || {}, user: c.user };
}

/** Keeps the data key on this device so the person isn't asked for the password on every visit. */
function rememberDek(uid, dekRaw, keep) {
  localStorage.setItem(KEEP_KEY, keep ? "1" : "0");
  sessionStorage.removeItem(dekKey(uid));
  localStorage.removeItem(dekKey(uid));
  (keep ? localStorage : sessionStorage).setItem(dekKey(uid), bytesToB64(dekRaw));
}
function savedDek(uid) {
  const b64 = sessionStorage.getItem(dekKey(uid)) || localStorage.getItem(dekKey(uid));
  return b64 ? b64ToBytes(b64) : null;
}
function forgetDevice(uid) {
  if (!uid) return;
  sessionStorage.removeItem(dekKey(uid));
  localStorage.removeItem(dekKey(uid));
  localStorage.removeItem(cacheKey(uid));
}

async function useVault(user, dekRaw, data, version, changed = {}) {
  store.user = user;
  store._dekRaw = dekRaw;
  store._dek = await importDek(dekRaw);
  store._data = data;
  store.version = version;
  store._changed = changed;
}

// ---------- sync ----------
let syncTimer = null, syncing = false, syncAgain = false, remoteChangePending = false;

function scheduleSync(delay = 0) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, delay);
}

function setSyncStatus(state) {
  const el = authEl("syncStatus");
  if (!el) return;
  el.dataset.state = state;
  el.textContent = t({ synced: "synced", syncing: "syncing", offline: "offline", error: "syncError" }[state]);
}

async function syncNow() {
  if (!store.user || !sb || store.demo || store.local) return;
  if (syncing) { syncAgain = true; return; }
  syncing = true;
  setSyncStatus("syncing");
  let gotRemote = false;
  try {
    const row = await fetchVault(store.user.id);
    if (!row) return accountGone(); // the account was deleted (e.g. from another phone)

    // 1. Someone (another device) saved a newer version: merge it in.
    if (row.version > store.version) {
      const remote = JSON.parse(await decryptText(store._dek, row));
      const merged = { ...remote };
      for (const k of Object.keys(store._changed)) {   // parts changed here win (they're newer)
        if (Object.prototype.hasOwnProperty.call(store._data, k)) merged[k] = store._data[k];
        else delete merged[k];
      }
      gotRemote = JSON.stringify(merged) !== JSON.stringify(store._data);
      store._data = merged;
      store.version = row.version;
      saveCache();
    }

    // 2. Upload what changed here. "version = mine" makes sure nobody saved in between.
    if (Object.keys(store._changed).length) {
      const sentChanges = { ...store._changed };
      const box = await encryptText(store._dek, JSON.stringify(store._data));
      const { data: saved, error } = await sb.from("vaults")
        .update({ iv: box.iv, data: box.data, version: store.version + 1, updated_at: new Date().toISOString() })
        .eq("user_id", store.user.id).eq("version", store.version).select("version");
      if (error) throw error;
      if (!saved || !saved.length) {
        // Nothing saved: either another device saved first, or the server refused (no active subscription).
        const now = await fetchVault(store.user.id);
        if (now && now.version === store.version) {
          syncing = false;
          return enterApp({ recheck: true }); // shows the subscribe page if the subscription ended
        }
        syncAgain = true;  // another device saved first — go round again to merge
      } else {
        store.version = saved[0].version;
        for (const [k, at] of Object.entries(sentChanges)) if (store._changed[k] === at) delete store._changed[k];
        saveCache();
        localMoveSaved(); // the Cloud has it now
      }
    }
    setSyncStatus(Object.keys(store._changed).length ? "syncing" : "synced");
  } catch (err) {
    if (/not signed in|user not found|invalid claim|refresh token/i.test(String(err?.message || ""))) return accountGone();
    setSyncStatus(navigator.onLine === false ? "offline" : "error");
    if (!syncAgain) scheduleSync(30000); // try again later
  } finally {
    syncing = false;
    if (gotRemote) onRemoteChange();
    if (syncAgain) { syncAgain = false; scheduleSync(300); }
  }
}

/** The app keeps data in memory, so it reloads to show changes made on another device. */
function onRemoteChange() {
  if (!window.__appStarted) return;
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const dialogOpen = [...document.querySelectorAll(".alarm")].some((el) => !el.hidden);
  if (!typing && !dialogOpen) { reloadSoon(); return; }
  remoteChangePending = true;
  authEl("remoteBanner").hidden = false;
}
async function reloadSoon() {
  await store._cacheWrites;
  location.reload();
}

// ---------- screens ----------
let mode = "signin";

function authMsg(text, kind = "err") {
  authEl("authMsg").textContent = text;
  authEl("authMsg").className = `addr-msg ${kind}`;
}
function setBusy(busy) {
  document.querySelectorAll("#authScreen button, #authScreen input").forEach((el) => { el.disabled = busy; });
  if (busy) authMsg(t("working"), "");
}

const MODES = {
  choose:  { title: "chooseTitle",   submit: null,          pwLabel: "password",         link: null },
  signin:  { title: "signIn",        submit: "signIn",      pwLabel: "password",         link: "noAccount" },
  signup:  { title: "createAccount", submit: "createAccount", pwLabel: "password",       link: "haveAccount" },
  forgot:  { title: "forgotPw",      submit: "sendReset",   pwLabel: "password",         link: "backToSignIn" },
  unlock:  { title: "unlockTitle",   submit: "unlock",      pwLabel: "password",         link: "notYou" },
  recover: { title: "setNewPw",      submit: "save",        pwLabel: "newPassword",      link: "notYou" },
  oldpw:   { title: "oldPwTitle",    submit: "unlock",      pwLabel: "previousPassword", link: "notYou" },
};

// Screens a visitor may close to go back to the home page.
const CLOSABLE = ["choose", "signin", "signup", "forgot"];
function closeAuth() {
  if (!CLOSABLE.includes(mode)) return;
  if (window.__appStarted && mode === "choose") return finishAccountAsk(); // asked after the profile: carry on
  // someone using the app on this device only, who looked at the cloud sign-in: back to their app
  if (localStorage.getItem(LOCAL_KEY) === "1" && !window.__appStarted) return startLocal();
  if (STORE_APP) return mode === "choose" ? undefined : showMode("choose"); // no home page in the store apps
  authEl("authScreen").hidden = true;
  if (location.hash === "#signin" || location.hash === "#signup") history.replaceState(null, "", location.pathname + location.search);
}

function showMode(m, message = "", kind = "ok") {
  mode = m;
  if (typeof paintPayMode === "function") paintPayMode(); // the phone app: may it sell here (country known now)?
  const cfg = MODES[m];
  authEl("authTitle").textContent = t(cfg.title);
  authEl("authSubmit").hidden = !cfg.submit; // "Do you have an account?" has its own two buttons
  authEl("authSubmit").textContent = cfg.submit ? t(cfg.submit) : "";
  authEl("authSwitch").hidden = !cfg.link || (STORE_APP && m === "signin" && !canPayHere()); // store apps: "create an account" only where they can pay
  authEl("authSwitch").textContent = cfg.link ? t(cfg.link) : "";
  // signing in needs only the email you signed up with and your password
  authEl("aEmailLabel").textContent = t(m === "signin" ? "emailSignedUp" : "emailLogin");
  authEl("aPwLabel").textContent = t(cfg.pwLabel);
  document.querySelectorAll("#authForm [data-modes]").forEach((el) => {
    el.hidden = !el.dataset.modes.split(" ").includes(m);
  });
  authEl("aName").required = m === "signup";
  authEl("aCountry").required = m === "signup";
  if (m === "signup") fillCountrySelect(authEl("aCountry"), authEl("aCountry").value || guessCountry());
  if (m === "signup") prefillSignupFromProfile();
  authEl("aEmail").required = ["signin", "signup", "forgot"].includes(m);
  authEl("aPassword").required = !["forgot", "choose"].includes(m);
  authEl("aConfirm").required = m === "signup" || m === "recover";
  authEl("aPassword").autocomplete = ["signup", "recover"].includes(m) ? "new-password" : "current-password";
  authEl("aPassword").value = "";
  authEl("aConfirm").value = "";
  if (m === "unlock") authEl("unlockHint").textContent = t("unlockHint", { email: store.user?.email || "" });
  authEl("aKeep").checked = localStorage.getItem(KEEP_KEY) === "1";
  authEl("authClose").hidden = !CLOSABLE.includes(m) || (STORE_APP && m === "choose" && localStorage.getItem(LOCAL_KEY) !== "1");
  authMsg(message, message ? kind : "");
  authEl("authScreen").hidden = false;
  document.body.classList.add("locked");
  if (!configured()) { // no server yet: explain, and keep the form switched off
    if (m !== "choose") authMsg(t("setupNeeded"), "err");
    document.querySelectorAll("#authForm input, #authSubmit, #forgotLink").forEach((el) => { el.disabled = true; });
  }
  setTimeout(() => (m === "choose" ? authEl("chooseYes") : m === "signup" ? authEl("aName") : ["signin", "forgot"].includes(m) ? authEl("aEmail") : authEl("aPassword")).focus(), 50);
}

/** Turns Supabase error messages into friendly, translated ones. */
function friendlyError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) return t("wrongLogin");
  if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already exists")) return t("emailTaken");
  if (msg.includes("not confirmed")) return t("notConfirmed");
  if (msg.includes("invalid") && msg.includes("email")) return t("badEmail");
  if (msg.includes("rate limit") || msg.includes("too many")) return t("tooMany");
  if (msg.includes("password") && (msg.includes("6") || msg.includes("short") || msg.includes("weak"))) return t("pwShort");
  if (msg.includes("fetch") || msg.includes("network")) return t("offline");
  return t("authError");
}

const userFrom = (u) => ({ id: u.id, email: u.email, name: u.user_metadata?.name || "", createdAt: u.created_at || null });

// ---------- actions ----------
async function handleSubmit(e) {
  e.preventDefault();
  const email = authEl("aEmail").value.trim();
  const password = authEl("aPassword").value;
  const keep = authEl("aKeep").checked;

  if ((mode === "signup" || mode === "recover")) {
    if (password.length < 6) return authMsg(t("pwShort"));
    if (password !== authEl("aConfirm").value) return authMsg(t("pwMismatch"));
  }
  if (mode === "signup") {
    if (!authEl("aCountry").value) return authMsg(t("countryNeeded"));
    sessionStorage.setItem(PENDING_COUNTRY_KEY, authEl("aCountry").value); // saved in the profile once the account is open
  }

  setBusy(true);
  try {
    if (mode === "signup") {
      const name = authEl("aName").value.trim();
      const { data, error } = await sb.auth.signUp({
        email, password, options: { data: { name }, emailRedirectTo: location.origin + location.pathname },
      });
      if (error) throw error;
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error("already registered");
      if (!data.session) { setBusy(false); return showMode("signin", t("checkEmail")); } // email confirmation is on
      await openAfterSignIn(userFrom(data.user), password, keep);
    } else if (mode === "signin") {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await openAfterSignIn(userFrom(data.user), password, keep);
    } else if (mode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      setBusy(false);
      showMode("signin", t("resetSent"));
    } else if (mode === "unlock") {
      const row = await fetchVault(store.user.id);
      let dekRaw;
      try { dekRaw = await unwrapDek(row, password); } catch { setBusy(false); return authMsg(t("wrongPassword")); }
      await openVault(store.user, dekRaw, row, keep);
    } else if (mode === "recover") {
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      const row = await fetchVault(store.user.id);
      if (!row) return await createVault(store.user, password, keep);
      try {
        const dekRaw = await unwrapDek(row, password); // only works if they reused the old password
        await openVault(store.user, dekRaw, row, keep);
      } catch {
        pendingNewPassword = password;
        setBusy(false);
        showMode("oldpw");
        authMsg(t("oldPwNeeded"), "");
      }
    } else if (mode === "oldpw") {
      const row = await fetchVault(store.user.id);
      let dekRaw;
      try { dekRaw = await unwrapDek(row, password); } catch { setBusy(false); return authMsg(t("wrongPassword")); }
      // move the data to the new password
      await rewrap(dekRaw, pendingNewPassword);
      pendingNewPassword = null;
      await openVault(store.user, dekRaw, row, keep);
    }
  } catch (err) {
    setBusy(false);
    authMsg(friendlyError(err));
  }
}
let pendingNewPassword = null;

/** After email + password are accepted: open (or create) this person's vault. */
async function openAfterSignIn(user, password, keep) {
  store.user = user;
  const row = await fetchVault(user.id);
  if (!row) return createVault(user, password, keep);
  let dekRaw;
  try {
    dekRaw = await unwrapDek(row, password);
  } catch {
    // Signed in with a new password (reset by email) but the data is still locked with the old one.
    pendingNewPassword = password;
    setBusy(false);
    showMode("oldpw");
    return authMsg(t("oldPwNeeded"), "");
  }
  await openVault(user, dekRaw, row, keep);
}

async function createVault(user, password, keep) {
  const dekRaw = crypto.getRandomValues(new Uint8Array(32));
  const dek = await importDek(dekRaw);
  const box = await encryptText(dek, "{}");
  const row = { user_id: user.id, ...(await wrapDek(dekRaw, password)), iv: box.iv, data: box.data, version: 1 };
  const { error } = await sb.from("vaults").insert(row);
  if (error) throw error;
  await openVault(user, dekRaw, row, keep);
}

async function openVault(user, dekRaw, row, keep) {
  const dek = await importDek(dekRaw);
  let data = JSON.parse(await decryptText(dek, row));
  // coming from "this device only": everything saved on this device moves into the account
  const local = await localDataToMove();
  const changed = {};
  if (local) {
    data = mergeData(data, local);
    for (const k of Object.keys(local)) changed[k] = Date.now();
  }
  await useVault(user, dekRaw, data, row.version, changed);
  rememberDek(user.id, dekRaw, keep);
  saveCache();
  if (local) await finishLocalMove();
  await enterApp();
}

// ---------- this device only (free, no account) ----------
async function startLocal() {
  if (window.__appStarted) return;
  localStorage.setItem(LOCAL_KEY, "1");
  if (/^#(cloud|signin|signup)$/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  store.local = true;
  let dekRaw = savedDek(LOCAL_ID), cached = null;
  if (dekRaw) { try { cached = await loadCache(LOCAL_ID, await importDek(dekRaw)); } catch {} }
  if (!dekRaw) dekRaw = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(dekKey(LOCAL_ID), bytesToB64(dekRaw));
  await useVault(cached?.user || { id: LOCAL_ID, email: "", name: "" }, dekRaw, cached?.data || {}, 0, {});
  saveCache();
  authEl("authScreen").hidden = true;
  startApp();
}

/** "☁️ Cloud": sign in or create an account; what is on this device goes along. */
async function goCloud() {
  await store._cacheWrites;
  history.replaceState(null, "", location.pathname + location.search + "#cloud");
  location.reload();
}

// ---------- phone apps, first open: "Set up your profile" first, then "Do you have an account?" ----------
const ASK_AFTER_KEY = "dailytime.askAccountAfterSetup"; // the question is still to come, after the profile
const ASKED_KEY = "dailytime.accountAsked";             // asked once already on this device
/** myservicetime.app/about: the website (front page), whoever opens it. Not in the phone apps. */
const SITE_PAGE = !STORE_APP && /\/about\/?$/.test(location.pathname);
/** The website = the "Get the app" page (get.html): its "Open MyServiceTime" comes back here and starts the setup. */
function showWebsite() {
  location.replace("get.html" + location.search.replace(/[?&]?(mock|storeapp=\d)\b/g, "").replace(/^&/, "?"));
}
/** "Start free": the first-open setup (About you, country), then "Do you have an account?". */
function startFirstOpen() {
  localStorage.setItem(ASK_AFTER_KEY, "1");
  return startLocal();
}

/** Called when the profile is done: shows "Do you have an account?" over the app (once). */
function askAccountAfterSetup() {
  if (localStorage.getItem(ASK_AFTER_KEY) !== "1") return false;
  localStorage.removeItem(ASK_AFTER_KEY);
  localStorage.setItem(ASKED_KEY, "1");
  showMode("choose");
  authEl("authScreen").hidden = false;
  return true;
}
/** "Use it on this device only" (or ✕) there: carry on into the app — the welcome, then the tour. */
function finishAccountAsk() {
  authEl("authScreen").hidden = true;
  document.body.classList.remove("locked"); // (the account screens hide the app behind them; it shows again now)
  if (typeof setupSteps !== "undefined") setupSteps = null; // the next question (the publisher status) is a new full page
  if (typeof nextOpeningStep === "function") nextOpeningStep();
}
/** Sign in / the demo from inside the app: open it fresh (what was typed in the profile is kept on this device). */
async function appToAuth(hash) {
  await store._cacheWrites;
  history.replaceState(null, "", location.pathname + location.search + hash);
  location.reload();
}

/** Back from the first setup step: not using the app on this device after all. */
function leaveLocal() {
  localStorage.removeItem(LOCAL_KEY);
  forgetDevice(LOCAL_ID);
  sessionStorage.removeItem("dailytime.askedAccount");
  location.reload();
}

/** Creating an account after "Set up your profile": the name and country they already gave are filled in. */
async function prefillSignupFromProfile() {
  if (localStorage.getItem(LOCAL_KEY) !== "1") return;
  const dekRaw = savedDek(LOCAL_ID);
  if (!dekRaw) return;
  try {
    const cached = await loadCache(LOCAL_ID, await importDek(dekRaw));
    let prof = {};
    try { prof = JSON.parse(cached?.data?.["dailytime.profile"] || "{}"); } catch {}
    if (!authEl("aName").value && cached?.user?.name) authEl("aName").value = cached.user.name;
    if (prof.country) fillCountrySelect(authEl("aCountry"), prof.country);
  } catch {}
}

/** What this device kept while used without an account (null if nothing). */
async function localDataToMove() {
  if (localStorage.getItem(LOCAL_KEY) !== "1" && localStorage.getItem(MOVE_KEY) !== "1") return null;
  const dekRaw = savedDek(LOCAL_ID);
  if (!dekRaw) return null;
  try { return (await loadCache(LOCAL_ID, await importDek(dekRaw)))?.data || null; } catch { return null; }
}
async function finishLocalMove() {
  await store._cacheWrites; // the account's copy on this device is written first
  localStorage.removeItem(LOCAL_KEY);
  // keep this device's copy (and bring it in again at the next sign-in) until the Cloud has saved it
  localStorage.setItem(MOVE_KEY, "1");
  if (location.hash === "#cloud") history.replaceState(null, "", location.pathname + location.search);
}
/** The Cloud saved this account's data: the old "this device only" copy is no longer needed. */
function localMoveSaved() {
  if (localStorage.getItem(MOVE_KEY) !== "1") return;
  localStorage.removeItem(MOVE_KEY);
  forgetDevice(LOCAL_ID);
}

/** Puts this device's data together with the account's: lists are joined (nothing is lost), the rest keeps the account's. */
function mergeData(cloud, local) {
  const sameItem = (a, b) => (a?.id && b?.id ? a.id === b.id : JSON.stringify(a) === JSON.stringify(b));
  const join = (c, l) => {
    if (Array.isArray(c) && Array.isArray(l)) return [...c, ...l.filter((x) => !c.some((y) => sameItem(x, y)))];
    if (c && l && typeof c === "object" && typeof l === "object") {
      const out = { ...l, ...c };
      for (const k of Object.keys(c)) if (k in l) out[k] = join(c[k], l[k]);
      return out;
    }
    return c;
  };
  const out = { ...cloud };
  for (const [k, lv] of Object.entries(local)) {
    const cv = cloud[k];
    if (cv == null || cv === "") { out[k] = lv; continue; }
    if (cv === lv) continue;
    let c, l;
    try { c = JSON.parse(cv); l = JSON.parse(lv); } catch { c = l = undefined; }
    if (c && l && typeof c === "object" && typeof l === "object") out[k] = JSON.stringify(join(c, l));
    else if (c === undefined && lv) out[k] = `${cv}\n\n${lv}`; // plain text (Quick Notes): keep both
  }
  return out;
}

/** Re-locks the data key with a (new) password. Allowed even without a subscription. */
async function rewrap(dekRaw, password) {
  const w = await wrapDek(dekRaw, password);
  const { error } = await sb.rpc("rewrap_vault", { new_salt: w.salt, new_rounds: w.rounds, new_wrapped_key: w.wrapped_key });
  if (error) throw error;
}

async function startOver() {
  if (!confirm(t("startOverConfirm"))) return;
  setBusy(true);
  try {
    const dekRaw = crypto.getRandomValues(new Uint8Array(32));
    const box = await encryptText(await importDek(dekRaw), "{}");
    const w = await wrapDek(dekRaw, pendingNewPassword);
    const { data: version, error } = await sb.rpc("reset_vault", {
      new_salt: w.salt, new_rounds: w.rounds, new_wrapped_key: w.wrapped_key, new_iv: box.iv, new_data: box.data,
    });
    if (error) throw error;
    pendingNewPassword = null;
    await openVault(store.user, dekRaw, { ...w, iv: box.iv, data: box.data, version }, authEl("aKeep").checked);
  } catch (err) {
    setBusy(false);
    authMsg(friendlyError(err));
  }
}

/** The account no longer exists (deleted elsewhere): forget it on this device and show the home page. */
async function accountGone() {
  forgetDevice(store.user?.id);
  try { await sb.auth.signOut(); } catch {}
  location.reload();
}

async function signOut() {
  const uid = store.user?.id;
  // this device stops receiving this person's reminder alerts (important on shared phones)
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    if (sub) {
      if (sb) await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {}
  await store._cacheWrites;
  forgetDevice(uid);
  try { await sb.auth.signOut(); } catch {}
  location.reload();
}

async function deleteAccount() {
  if (!confirm(t("deleteAccountConfirm"))) return;
  try {
    // the server function also stops the subscription, so nobody is charged after leaving
    const { data, error } = await sb.functions.invoke("delete-account", { body: {} });
    if (error || !data?.deleted) throw error || new Error("delete failed");
    localStorage.removeItem(subKey(store.user.id));
    await signOut();
  } catch (err) {
    alert(friendlyError(err));
  }
}

// ---------- change password (while signed in) ----------
function pwMsg(text, kind = "err") {
  authEl("pwMsg").textContent = text;
  authEl("pwMsg").className = `addr-msg ${kind}`;
}
async function changePassword(e) {
  e.preventDefault();
  const current = authEl("pwCurrent").value, next = authEl("pwNew").value;
  if (next.length < 6) return pwMsg(t("pwShort"));
  if (next !== authEl("pwConfirm").value) return pwMsg(t("pwMismatch"));
  pwMsg(t("working"), "");
  try {
    const row = await fetchVault(store.user.id);
    try { await unwrapDek(row, current); } catch { return pwMsg(t("wrongPassword")); }
    const { error } = await sb.auth.updateUser({ password: next });
    if (error) throw error;
    await rewrap(store._dekRaw, next);
    pwMsg(t("pwChanged"), "ok");
    setTimeout(() => { authEl("pwModal").hidden = true; }, 1200);
  } catch (err) {
    pwMsg(friendlyError(err));
  }
}

// ---------- subscription (US$0.98 / month through Stripe) ----------
const subKey = (uid) => `dailytime.sub.${uid}`;
// "success" or "cancel" when coming back from Stripe's payment page
let checkoutReturn = new URLSearchParams(location.search).get("checkout");
const PAID = ["active", "trialing", "past_due"];
const GRACE_MS = 3 * 24 * 60 * 60 * 1000; // matches has_active_subscription() on the server

function isActive(sub) {
  if (!sub || !PAID.includes(sub.status)) return false;
  return !sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now() - GRACE_MS;
}

async function fetchSubscription() {
  const { data, error } = await sb.from("subscriptions")
    .select("*").eq("user_id", store.user.id).maybeSingle(); // status, current_period_end, cancel_at_period_end, currency, store
  if (error) throw error;
  return data;
}

/** Opens the app if this person has paid; otherwise shows the subscribe page. */
async function enterApp({ recheck = false } = {}) {
  let sub;
  try {
    sub = await fetchSubscription();
    localStorage.setItem(subKey(store.user.id), JSON.stringify(sub));
  } catch {
    // offline: trust what we knew last time (the server still refuses to save if it has ended)
    sub = JSON.parse(localStorage.getItem(subKey(store.user.id)) || "null");
  }
  store.subscription = sub;
  if (checkoutReturn === "success") { checkoutReturn = null; return finishCheckout(); }
  if (isActive(sub) || inFreeWeek()) {
    checkoutReturn = null;
    authEl("paywall").hidden = true;
    return startApp();
  }
  if (recheck && !window.__appStarted) return;
  const canceled = checkoutReturn === "cancel";
  checkoutReturn = null;
  showPaywall(canceled ? "payCanceled" : sub && sub.status !== "none" ? "subExpired" : "");
}

function payMsg(text, kind = "") {
  authEl("pwPayMsg").textContent = text;
  authEl("pwPayMsg").className = `addr-msg ${kind}`;
}

function showPaywall(messageKey = "", { dismissible = false } = {}) {
  if (STORE_APP && !canPayHere()) return showCloudOff();
  paintPayMode();
  document.body.classList.add("locked");
  authEl("authScreen").hidden = true;
  authEl("paywall").hidden = false;
  authEl("pwHello").textContent = t("paywallHello", { name: store.user.name || store.user.email });
  authEl("pwSubscribe").disabled = false;
  authEl("pwLater").hidden = !dismissible;          // "Not now" — only when the paywall can be closed
  // the app itself is free: when the Cloud isn't active, people can keep everything on this device
  authEl("pwLocal").hidden = dismissible;
  authEl("pwLocal").disabled = false;
  authEl("pwLocal").className = "btn btn-ghost auth-submit";
  if (!messageKey && inFreeWeek() && freeWeekEnds() - Date.now() > 2 * 864e5) {
    // subscribing now: the first payment only happens when the free week ends
    payMsg(t("trialNoCharge", { date: new Date(freeWeekEnds()).toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" }) }), "ok");
  } else {
    payMsg(messageKey ? t(messageKey) : "", ["subExpired", "payCanceled", "trialEnded"].includes(messageKey) ? "err" : "");
  }
  renderPrices();
  authEl("paywall").classList.add("sp-pay");
  const last = sessionStorage.getItem("dailytime.supportGo") === "1";
  authEl("paywall").classList.toggle("sp-last-step", last);
  authEl("pwTitle").textContent = t(last ? "spAccountReady" : "paywallTitle");
  if (last && !messageKey && sessionStorage.getItem("dailytime.supportAuto") !== "1" && (!STORE_APP || payMode() === "link")) {
    sessionStorage.setItem("dailytime.supportAuto", "1"); // only once: if they come back without paying, the button is there
    setTimeout(() => subscribe(), 300);
  }
  if (typeof renderSupport === "function") renderSupport();
}

/** Store apps: this account's cloud isn't active. Keep everything on this device, or sign out. (No prices, no links to buy.) */
function showCloudOff() {
  document.body.classList.add("locked");
  authEl("authScreen").hidden = true;
  authEl("paywall").hidden = false;
  authEl("paywall").classList.add("cloud-off");
  authEl("pwHello").textContent = t("paywallHello", { name: store.user.name || store.user.email });
  authEl("pwTitle").textContent = t("cloudOffTitle");
  payMsg(t("cloudOffText"), "");
  authEl("pwLocal").disabled = false;
  authEl("pwLocal").hidden = false;
  authEl("pwLocal").className = "btn btn-primary auth-submit";
}

/** Copies this account's data onto the device ("this device only") and signs out of the Cloud. */
async function cloudToLocal() {
  authEl("pwLocal").disabled = true;
  const dekRaw = crypto.getRandomValues(new Uint8Array(32));
  const box = await encryptText(await importDek(dekRaw), JSON.stringify(store._data));
  localStorage.setItem(dekKey(LOCAL_ID), bytesToB64(dekRaw));
  localStorage.setItem(cacheKey(LOCAL_ID), JSON.stringify({ ...box, version: 0, changed: {}, user: { id: LOCAL_ID, email: "", name: store.user.name || "" } }));
  localStorage.setItem(LOCAL_KEY, "1");
  forgetDevice(store.user.id);
  try { await sb.auth.signOut(); } catch {}
  location.reload();
}

/** Stripe's secure page for the yearly amount picked in the Supporter part (US$9.98 … US$180.98 a year). */
/** Is the Supporter popup on screen (rather than the plan page)? */
const spOpenNow = () => typeof spSay === "function" && !!document.getElementById("supportModal") && !document.getElementById("supportModal").hidden;
async function subscribe(amount) {
  if (typeof amount !== "number") amount = typeof spPick !== "undefined" ? spPick : 998;
  authEl("pwSubscribe").disabled = true;
  if (spOpenNow()) { spBusyNow = true; spSay(t("working")); }
  payMsg(t("working"), "ok");
  try {
    const { data, error } = await sb.functions.invoke("create-checkout", {
      body: { returnUrl: STORE_APP ? appReturnUrl() : location.origin + location.pathname, locale: lang, plan: "yearly", amount },
    });
    if (error) throw error;
    if (data?.already) return enterApp();
    if (!data?.url) throw new Error("no url");
    if (STORE_APP) { // US phone app: pay on the website, then come back — the app checks by itself
      payAwaiting = true;
      authEl("pwSubscribe").disabled = false;
      if (spOpenNow()) { spBusyNow = false; spSay(t("spPayWeb"), "ok"); }
      payMsg(t("spPayWeb"), "ok");
      return openOutside(data.url);
    }
    await store._cacheWrites;
    location.href = data.url; // Stripe's secure payment page (in the person's currency)
  } catch (err) {
    // the server's reason, shown small after the message (helps fix a setup problem; never a secret)
    let why = "";
    try { const body = await err?.context?.json?.(); why = body?.detail || body?.error || ""; } catch {}
    if (why) console.warn("Payment page:", why);
    const msg = t("payError") + (why ? ` (${String(why).slice(0, 160)})` : "");
    authEl("pwSubscribe").disabled = false;
    if (spOpenNow()) { spBusyNow = false; spSay(msg, "err"); }
    payMsg(msg, "err");
  }
}

async function manageSubscription() {
  if (STORE_APP) {
    const s = store.subscription;
    if (isActive(s) && (s.store === "app_store" || s.store === "play_store")) return manageInStore(s);
    if (payMode() !== "link") return; // (the button isn't shown there)
  }
  // not subscribed yet (free week): show the subscribe page instead of Stripe's page
  if (!isActive(store.subscription)) return window.__appStarted ? openSupport() : showPaywall("", { dismissible: inFreeWeek() });
  try {
    const { data, error } = await sb.functions.invoke("billing-portal", {
      body: { returnUrl: STORE_APP ? appReturnUrl() : location.origin + location.pathname, locale: lang },
    });
    if (error || !data?.url) throw error || new Error("no url");
    if (STORE_APP) return openOutside(data.url);
    await store._cacheWrites;
    location.href = data.url;
  } catch {
    alert(t("payError"));
  }
}

/** Back from Stripe after paying: wait for Stripe to confirm the subscription, then open the app. */
async function finishCheckout() {
  showPaywall();
  authEl("pwSubscribe").disabled = true;
  payMsg(t("activating"), "ok");
  for (let i = 0; i < 30; i++) {
    try {
      const sub = await fetchSubscription();
      if (isActive(sub)) {
        localStorage.setItem(subKey(store.user.id), JSON.stringify(sub));
        store.subscription = sub; // the extras (colors, icons, appearance) open right away
        sessionStorage.removeItem("dailytime.supportGo"); // paid: the "One last step" page is done
        sessionStorage.removeItem("dailytime.supportAuto");
        authEl("paywall").hidden = true;
        return startApp();
      }
    } catch {}
    await sleep(2000);
  }
  authEl("pwSubscribe").disabled = false;
  payMsg(t("activatingSlow"), "err");
}

/** Website only: the background helper keeps the app's files, so it opens instantly and works offline. */
function registerOfflineHelper() {
  if (!("serviceWorker" in navigator) || window.Capacitor?.isNativePlatform?.()) return;
  if (location.protocol !== "https:" && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (new URLSearchParams(location.search).has("mock")) return; // the test server: always fresh files
  navigator.serviceWorker.register(`sw.js?v=${APP_VERSION}`).catch(() => {});
}

function cleanCheckoutFromUrl() {
  const search = location.search.replace(/([?&])checkout=[^&]*&?/, "$1").replace(/[?&]$/, "");
  history.replaceState(null, "", location.pathname + search + location.hash);
}

// ---------- free first week ----------
const FREE_DAYS = 0; // no free Cloud week: the Cloud starts when it is paid for (the app itself is free)
const freeWeekEnds = () => (store.user?.createdAt ? new Date(store.user.createdAt).getTime() + FREE_DAYS * 864e5 : 0);
const inFreeWeek = () => Date.now() < freeWeekEnds();

/** The "Free week: N days left — Subscribe" bar at the top of the app. */
function renderTrialBar() {
  const bar = authEl("trialBanner");
  if (!bar) return;
  const show = !STORE_APP && !store.demo && !store.local && !isActive(store.subscription) && inFreeWeek();
  bar.hidden = !show;
  if (!show) return;
  const daysLeft = Math.max(1, Math.ceil((freeWeekEnds() - Date.now()) / 864e5));
  authEl("trialText").textContent = daysLeft <= 1 ? t("trialLastDay") : t("trialBanner", { n: daysLeft });
  bar.classList.toggle("urgent", daysLeft <= 2);
}

function closePaywallForNow() {
  authEl("paywall").hidden = true;
  if (window.__appStarted) document.body.classList.remove("locked");
}

// ---------- local price on the home page and subscribe page ----------
// Stripe shows the exact price in the person's currency at checkout. Here we show a friendly estimate.
const REGION_CURRENCY = Object.fromEntries((
  "US:USD CA:CAD MX:MXN GT:GTQ HN:HNL CR:CRC PA:USD DO:DOP HT:HTG JM:JMD TT:TTD BS:BSD BB:BBD BZ:BZD BM:BMD KY:KYD " +
  "AG:XCD DM:XCD GD:XCD KN:XCD LC:XCD VC:XCD AW:AWG BR:BRL BO:BOB CO:COP CL:CLP PY:PYG PE:PEN UY:UYU GY:GYD AR:ARS " +
  "EC:USD SV:USD VE:USD NI:NIO CU:CUP PR:USD FK:FKP GB:GBP IE:EUR FR:EUR DE:EUR ES:EUR IT:EUR PT:EUR NL:EUR BE:EUR " +
  "LU:EUR AT:EUR FI:EUR GR:EUR CY:EUR MT:EUR SK:EUR SI:EUR EE:EUR LV:EUR LT:EUR HR:EUR MC:EUR SM:EUR VA:EUR AD:EUR " +
  "ME:EUR CH:CHF NO:NOK SE:SEK DK:DKK IS:ISK PL:PLN CZ:CZK HU:HUF RO:RON BG:BGN RS:RSD BA:BAM MK:MKD AL:ALL MD:MDL " +
  "UA:UAH GI:GIP TR:TRY RU:RUB BY:BYN GE:GEL AM:AMD AZ:AZN KZ:KZT KG:KGS TJ:TJS UZ:UZS IL:ILS AE:AED SA:SAR QA:QAR " +
  "KW:KWD BH:BHD OM:OMR JO:JOD LB:LBP EG:EGP YE:YER AF:AFN PK:PKR IN:INR BD:BDT LK:LKR NP:NPR MV:MVR CN:CNY HK:HKD " +
  "MO:MOP TW:TWD JP:JPY KR:KRW MN:MNT SG:SGD MY:MYR ID:IDR TH:THB VN:VND PH:PHP KH:KHR BN:BND AU:AUD NZ:NZD PF:XPF " +
  "NC:XPF WF:XPF FJ:FJD MA:MAD DZ:DZD TN:TND NG:NGN GH:GHS KE:KES TZ:TZS UG:UGX RW:RWF BI:BIF ET:ETB ZA:ZAR NA:NAD " +
  "BW:BWP ZM:ZMW MZ:MZN AO:AOA MG:MGA MU:MUR SN:XOF CI:XOF ML:XOF BF:XOF NE:XOF TG:XOF BJ:XOF GW:XOF CM:XAF GA:XAF " +
  "TD:XAF CF:XAF CG:XAF GQ:XAF CD:CDF GN:GNF GM:GMD LR:LRD SL:SLE CV:CVE ST:STN DJ:DJF SH:SHP SO:SOS SD:SDG"
).split(" ").map((p) => p.split(":")));

function guessRegion() {
  for (const tag of navigator.languages || [navigator.language]) {
    try {
      const region = new Intl.Locale(tag).region;
      if (region) return region;
    } catch {}
  }
  try { return new Intl.Locale(navigator.language || "en").maximize().region; } catch { return "US"; }
}

async function usdRates() {
  const cached = JSON.parse(localStorage.getItem("dailytime.fx") || "null");
  if (cached && Date.now() - cached.at < 12 * 3600 * 1000) return cached.rates;
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await res.json();
  if (data.result !== "success") throw new Error("rates");
  localStorage.setItem("dailytime.fx", JSON.stringify({ at: Date.now(), rates: data.rates }));
  return data.rates;
}

// The two plans. Yearly = US$9.99 (12 × 0.98 = 11.76, so about 15% less).
// Supporters choose a yearly amount, from US$9.98 (see supporter.js). Shown here: the lowest one.
const PLANS = {
  monthly: { usd: 0.98, per: "perMonth", local: "priceLocal" },
  yearly:  { usd: 9.98, per: "perYear",  local: "priceLocalYear" },
};
let selectedPlan = "yearly";
const usdText = (n) => "US$" + n.toLocaleString(uiLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function showLocalPrice(el, plan) {
  if (!el) return;
  el.textContent = "";
  const currency = REGION_CURRENCY[guessRegion()] || "USD";
  if (currency === "USD") return;
  try {
    const rate = (await usdRates())[currency];
    if (!rate || plan !== PLANS[selectedPlan]) return; // plan changed while loading
    const amount = new Intl.NumberFormat(uiLocale(), { style: "currency", currency }).format(plan.usd * rate);
    el.textContent = t(plan.local, { amount });
  } catch {}
}

/** Fills every price card (home page + subscribe page) for the chosen plan. */
function renderPrices() {
  const plan = PLANS[selectedPlan];
  document.querySelectorAll(".price-block").forEach((block) => {
    block.querySelectorAll("[data-plan]").forEach((b) => {
      b.classList.toggle("on", b.dataset.plan === selectedPlan);
      b.setAttribute("aria-pressed", b.dataset.plan === selectedPlan);
    });
    block.querySelector(".pp-amount").textContent = selectedPlan === "yearly" ? t("priceFrom", { amount: usdText(plan.usd) }) : usdText(plan.usd);
    block.querySelector(".pp-per").textContent = t(plan.per);
    block.querySelector(".price-equiv").textContent = selectedPlan === "yearly" ? t("yearlyEquiv", { amount: usdText(Math.round(plan.usd / 12 * 100) / 100) }) : "";
    showLocalPrice(block.querySelector(".price-local"), plan);
  });
  authEl("pwSubscribe").textContent = t(selectedPlan === "yearly" ? "subscribeYearly" : "subscribe");
}

function choosePlan(plan) {
  selectedPlan = "yearly"; // (yearly only now: the monthly/yearly switch is hidden)
  sessionStorage.setItem("dailytime.plan", selectedPlan); // remembered through sign-up
  renderPrices();
}

// ---------- start the app once the vault is open (and paid for) ----------
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // scripts added together still run in the order they were added
    s.onload = resolve;
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

/** Loads several scripts at the same time (faster), and runs them in order. */
function loadScriptsInOrder(names) {
  return Promise.all(names.map((n) => loadScript(`${n}?v=${APP_VERSION}`)));
}

async function startApp() {
  if (window.__appStarted) return;
  // remove a used password-reset code from the address bar
  if (/type=recovery|access_token|[?&]code=/.test(location.hash + location.search)) {
    history.replaceState(null, "", location.pathname + location.search.replace(/([?&])code=[^&]*&?/, "$1").replace(/[?&]$/, ""));
  }
  authEl("authScreen").hidden = true;
  document.body.classList.remove("locked");
  authEl("acctName").textContent = `👤 ${store.user.name || store.user.email}`;
  // demo: the "this is a demo" bar, no sync badge, and an account menu with only "Profile picture"
  authEl("demoBanner").hidden = !store.demo;
  authEl("syncStatus").hidden = !!(store.demo || store.local);
  for (const id of ["acctEmail", "acctSub", "acctPw", "acctDel"]) authEl(id).hidden = !!(store.demo || store.local); // Log out stays (in the demo it leaves the demo)
  document.body.classList.toggle("local-mode", !!store.local); // this device only: no Log out, a "☁️ Cloud" item instead
  authEl("acctEmail").textContent = store.user.email;
  // (country.js is already loaded with the sign-up form). All are fetched together and run in this order; app.js last.
  await loadScriptsInOrder(["avatar.js", "contacts.js", "tasks.js", "planner.js", "events.js", "timecal.js", "localnotify.js", "notify.js",
    "reminders.js", "map.js", "suggest.js", "moments.js", "territories.js", "weather.js", "pages.js", "publisher.js", "aboutme.js", "feedback.js", "toolhub.js",
    "tour-text.js", "tour.js", "app.js", "sharelink.js", "whatsnew.js", "notices.js", "appinfo.js"]);
  window.__appStarted = true;
  registerOfflineHelper();
  paintPayMode();
  if (typeof paintThemeControls === "function") paintThemeControls(); // Supporter extras (colors, icons, text size) only with the Cloud
  spAfterStart(); // back from a tip: the thank-you
  if (typeof noticesAfterStart === "function") noticesAfterStart(); // 🔔 welcome / "updated" in the notifications
  if (typeof wnAfterStart === "function") wnAfterStart(); // "What's new" after an update; a newer version online
  renderTrialBar();
  scheduleSync(0);
}

// ---------- demo: try everything without an account ----------
// Opens the real app with sample data. Nothing is saved anywhere; closing or leaving the page forgets it.
function demoData() {
  const pad = (n) => String(n).padStart(2, "0");
  const day = (offset) => {
    const d = new Date(Date.now() + offset * 864e5);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const id = () => crypto.randomUUID();
  const now = Date.now();
  const marie = id(), paul = id(), leo = id();
  const rem = { dayBefore: true, hourBefore: true, atTime: true };
  const contacts = [
    { id: marie, name: "Marie Joseph", phone: "+509 3456 7890", email: "marie@example.com", address: "Port-au-Prince, Haiti", lat: 18.5944, lon: -72.3074, relation: "family", notes: "", createdAt: now },
    { id: paul, name: "Dr. Paul", phone: "+1 555 0100", email: "", address: "Miami, Florida, USA", lat: 25.7617, lon: -80.1918, relation: "doctor", notes: "", createdAt: now },
    { id: leo, name: "Leo", phone: "+1 555 0123", email: "", address: "Montréal, Québec, Canada", lat: 45.5019, lon: -73.5674, relation: "family", notes: "", createdAt: now },
  ];
  const appts = [
    { id: id(), title: t("mockAppt1"), type: "Appointment", date: day(1), time: "10:00", email: "", address: "Miami, Florida, USA", lat: 25.79, lon: -80.22,
      contactId: paul, assigneeId: null, notes: "", reminders: rem, fired: {}, snoozeUntil: null, startedAt: null, durations: [],
      noteLog: [{ id: id(), text: t("demoApptNote"), at: now - 3600e3 }] },
    { id: id(), title: t("mockAppt2"), type: "Visit", date: day(3), time: "15:30", email: "marie@example.com", address: "Pétion-Ville, Haiti", lat: 18.5125, lon: -72.2853,
      contactId: marie, assigneeId: leo, notes: "", reminders: rem, fired: {}, snoozeUntil: null, startedAt: null, durations: [], noteLog: [] },
  ];
  const tasks = [
    { id: id(), title: t("demoTask1"), dueDate: day(1), dueTime: "18:00", priority: "high", assigneeId: leo, notes: "",
      reminders: { dayBefore: true, hourBefore: false, atTime: true }, done: false, doneAt: null, fired: {}, createdAt: now },
    { id: id(), title: t("demoTask2"), dueDate: day(-1), dueTime: "", priority: "normal", assigneeId: null, notes: "",
      reminders: { dayBefore: true, hourBefore: false, atTime: true }, done: false, doneAt: null, fired: {}, createdAt: now },
    { id: id(), title: t("demoTask3"), dueDate: day(-2), dueTime: "", priority: "low", assigneeId: null, notes: "",
      reminders: { dayBefore: false, hourBefore: false, atTime: false }, done: true, doneAt: now - 864e5, fired: {}, createdAt: now },
  ];
  const study = t("mockTracker").replace(/^⏱\s*/, "");
  const past = [];
  for (const [daysAgo, minutes] of [[3, 120], [5, 90], [8, 150], [10, 180], [12, 120], [15, 200], [17, 160], [22, 240], [24, 180], [29, 150], [31, 200]]) {
    const start = now - daysAgo * 864e5;
    past.push({ id: id(), name: study, note: daysAgo === 3 ? t("demoSessionNote") : "", start, end: start + minutes * 60e3, ms: minutes * 60e3 });
  }
  const tracker = {
    running: null,
    log: [...past,
      { id: id(), name: t("mockTracker").replace(/^⏱\s*/, ""), start: now - 3 * 3600e3, end: now - 3 * 3600e3 + 85 * 60e3, ms: 85 * 60e3 },
      { id: id(), name: t("demoActivity"), start: now - 3600e3, end: now - 3600e3 + 40 * 60e3, ms: 40 * 60e3 },
    ],
  };
  const todos = [
    { id: id(), text: t("demoTodo1"), date: day(0), time: "10:00", done: false, doneAt: null, fired: {}, createdAt: now },
    { id: id(), text: t("demoTodo2"), date: day(0), time: "", done: true, doneAt: now - 3600e3, fired: {}, createdAt: now },
    { id: id(), text: t("demoTodo3"), date: day(0), time: "", done: false, doneAt: null, fired: {}, createdAt: now },
    { id: id(), text: t("demoTodo4"), date: day(2), time: "", done: false, doneAt: null, fired: {}, createdAt: now },
    { id: id(), text: t("demoTodo5"), date: "", time: "", done: false, doneAt: null, fired: {}, createdAt: now },
  ];
  const evRem = { weekBefore: true, dayBefore: true, atStart: true };
  const events = [
    { id: id(), kind: "co_visit", title: "", startDate: day(9), endDate: day(14), time: "19:00", repeat: "none", address: "Brooklyn, New York, USA", lat: 40.6782, lon: -73.9442, notes: "", reminders: evRem, fired: {}, createdAt: now },
    { id: id(), kind: "convention", title: "", startDate: day(45), endDate: day(47), time: "09:20", repeat: "none", address: "Paris, France", lat: 48.8566, lon: 2.3522, notes: "", reminders: evRem, fired: {}, createdAt: now },
    { id: id(), kind: "memorial", title: "", startDate: day(130), endDate: "", time: "19:30", repeat: "none", address: "", notes: "", reminders: evRem, fired: {}, createdAt: now },
  ];
  return {
    "dailytime.events": JSON.stringify(events),
    "dailytime.todos": JSON.stringify(todos),
    "dailytime.contacts": JSON.stringify(contacts),
    "dailytime.appointments": JSON.stringify(appts),
    "dailytime.tasks": JSON.stringify(tasks),
    "dailytime.tracker": JSON.stringify(tracker),
    "dailytime.quickNotes": `${t("demoNote")}\n📍 ${t("mockAddr")}`,
    "dailytime.territories": JSON.stringify([
      { id: id(), number: "12", name: "Park Slope North", out: day(-20), done: "", notes: "", link: "", pin: null, thumb: "", createdAt: now,
        area: [[40.6785, -73.9811], [40.6812, -73.9735], [40.6768, -73.9702], [40.6741, -73.9779]] },
      { id: id(), number: "7", name: "Prospect Heights", out: day(-75), done: day(-12), notes: "", link: "", pin: { lat: 40.6775, lng: -73.9692 }, area: [], thumb: "", createdAt: now },
    ]),
  };
}

function startDemo() {
  if (window.__appStarted) return;
  store.demo = true;
  store.user = { id: "demo", email: "", name: t("demoName") };
  store._data = demoData();
  store._changed = {};
  history.replaceState(null, "", location.pathname + location.search + "#demo");
  window.scrollTo(0, 0);
  startApp();
}

function leaveDemo(hash) {
  // the demo's data was never saved, so leaving simply forgets it
  history.replaceState(null, "", location.pathname + location.search + hash);
  location.reload();
}

// ---------- password boxes: an eye to show or hide what you typed ----------
const EYE_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_SHUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.5 17.5 0 0 1-3.2 4.1M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function addPasswordEyes(root = document) {
  root.querySelectorAll('input[type="password"]:not([data-eye])').forEach((input) => {
    input.dataset.eye = "1";
    const wrap = document.createElement("span");
    wrap.className = "pw-wrap";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pw-eye";
    const paint = () => {
      const shown = input.type === "text";
      btn.innerHTML = shown ? EYE_SHUT : EYE_OPEN;
      btn.setAttribute("aria-label", t(shown ? "pwHide" : "pwShow"));
      btn.title = t(shown ? "pwHide" : "pwShow");
      btn.setAttribute("aria-pressed", String(shown));
    };
    btn.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      paint();
      input.focus({ preventScroll: true });
    });
    wrap.appendChild(btn);
    paint();
    // forms that empty the box also hide it again
    input.form?.addEventListener("reset", () => { input.type = "password"; paint(); });
  });
}
// tapping anywhere on a date box opens its calendar (not only the small icon)
document.addEventListener("click", (e) => {
  const d = e.target.closest('input[type="date"], input[type="month"], input[type="time"]');
  if (!d || d.disabled || typeof d.showPicker !== "function") return;
  // the little calendar icon opens it by itself: opening it a second time would close it again
  const r = d.getBoundingClientRect();
  const rtl = getComputedStyle(d).direction === "rtl";
  const onIcon = rtl ? e.clientX < r.left + 44 : e.clientX > r.right - 44;
  if (onIcon) return;
  try { d.showPicker(); } catch {}
});

// ---------- boot ----------
(async function boot() {
  OLD_KEYS.forEach((k) => localStorage.removeItem(k));
  Object.keys(localStorage).filter((k) => k.startsWith("dailytime.vault.")).forEach((k) => localStorage.removeItem(k));

  // home page language menu
  authEl("authLang").innerHTML = Object.entries(LANGS).map(([code, l]) => `<option value="${code}">${l.name}</option>`).join("");
  authEl("authLang").value = lang;
  authEl("authLang").addEventListener("change", () => {
    setLang(authEl("authLang").value, () => { if (!authEl("authScreen").hidden) showMode(mode); });
  });
  applyStaticText();
  addPasswordEyes();

  // home page buttons: "Sign in" / "Get started"
  // the website's buttons: "Start free" begins the setup, "I already have an account" signs in
  document.querySelectorAll("[data-open]").forEach((btn) => btn.addEventListener("click", () => {
    const want = btn.dataset.open;
    if (SITE_PAGE) { location.href = "./" + (want === "signin" ? "#signin" : "#app"); return; } // from /about: into the app
    if (btn.closest("#landing") && (want === "choose" || want === "signup")) return startFirstOpen();
    showMode(want);
  }));
  // "Try the demo" asks "Do you have an account?" first; "Just try the demo" there opens it
  document.querySelectorAll("[data-demo]").forEach((btn) => btn.addEventListener("click", () => showMode("choose")));
  // (the demo was removed from the app: no button opens it any more)
  authEl("chooseLocal").addEventListener("click", () => (window.__appStarted ? finishAccountAsk() : startLocal()));
  authEl("pwLocal").addEventListener("click", cloudToLocal);
  authEl("demoExit").addEventListener("click", () => leaveDemo(""));
  authEl("demoCreate").addEventListener("click", () => openSupport()); // the Supporter popup first, then the account
  if (/^#(demo|app|start)$/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search); // the website's "Open MyServiceTime" (and old demo links): open the app normally
  // used on this device only (no account): open it straight away — unless they asked for the cloud
  const localNow = localStorage.getItem(LOCAL_KEY) === "1" && !/^#(cloud|signin|signup)$/.test(location.hash);
  authEl("authClose").addEventListener("click", closeAuth);
  authEl("authScreen").addEventListener("mousedown", (e) => { if (e.target === authEl("authScreen")) closeAuth(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !authEl("authScreen").hidden) closeAuth(); });

  authEl("authForm").addEventListener("submit", handleSubmit);
  authEl("authSwitch").addEventListener("click", () => {
    if (mode === "signin") openSupport(); // "Create an account": the Supporter popup first
    else if (mode === "signup" || mode === "forgot") showMode("signin");
    else signOut(); // "Not you? Sign out"
  });
  authEl("forgotLink").addEventListener("click", () => showMode("forgot"));
  authEl("chooseYes").addEventListener("click", () => (window.__appStarted ? appToAuth("#signin") : showMode("signin")));
  authEl("chooseNo").addEventListener("click", () => openSupport()); // the Supporter popup first, then the account
  authEl("authBack").addEventListener("click", () => showMode("choose"));
  authEl("startOverBtn").addEventListener("click", startOver);
  authEl("acctOut").addEventListener("click", signOut);
  authEl("acctDel").addEventListener("click", deleteAccount);
  authEl("acctPw").addEventListener("click", () => {
    authEl("pwForm").reset();
    pwMsg("", "");
    authEl("pwModal").hidden = false;
    authEl("pwCurrent").focus();
  });
  authEl("pwForm").addEventListener("submit", changePassword);
  authEl("pwCancel").addEventListener("click", () => { authEl("pwModal").hidden = true; });
  authEl("remoteBanner").addEventListener("click", reloadSoon);
  authEl("syncStatus").addEventListener("click", () => scheduleSync(0));
  authEl("pwSubscribe").addEventListener("click", () => subscribe()); // (not the click itself as the amount)
  authEl("pwLater").addEventListener("click", closePaywallForNow);
  authEl("trialSubscribe").addEventListener("click", () => showPaywall("", { dismissible: true }));
  authEl("pwSignOut").addEventListener("click", signOut);
  authEl("acctSub").addEventListener("click", manageSubscription);

  // prices (monthly / yearly) with an estimate in the visitor's own currency
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".plan-toggle [data-plan]");
    if (b) choosePlan(b.dataset.plan);
  });
  renderPrices();
  authEl("authLang").addEventListener("change", renderPrices);
  if (checkoutReturn) cleanCheckoutFromUrl();

  // Visitors see the home page; a link ending in #signin or #signup opens that form directly.
  paintPayMode();
  if (STORE_APP && !canPayHere() && location.hash === "#signup") history.replaceState(null, "", location.pathname + location.search + "#signin");
  const openFromLink = () => {
    if (SITE_PAGE) return showWebsite();
    if (localNow) return startLocal();
    if (location.hash === "#cloud") return showMode("choose"); // "☁️ Cloud" from the app: sign in or create an account
    if (location.hash === "#signin" || location.hash === "#signup") return showMode(location.hash.slice(1));
    // the very first time (phone apps and website): "Set up your profile" first; "Do you have an account?" comes after it
    // (in a browser, theme.js has already shown the website; its "Open MyServiceTime" comes back here)
    if (!localStorage.getItem(ASKED_KEY)) return startFirstOpen();
    // first thing when the app opens: "Do you have an account?" (once per visit; closing it shows the home page)
    if (STORE_APP || !sessionStorage.getItem("dailytime.askedAccount")) {
      sessionStorage.setItem("dailytime.askedAccount", "1");
      showMode("choose");
    }
  };
  if (SITE_PAGE) return showWebsite(); // myservicetime.app/about: the website, even for people already using the app
  if (!configured()) return openFromLink(); // the form explains that setup is needed
  sb = window.DAILYTIME_MOCK_SERVER || window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);

  // Coming back from a "reset password" email link
  let recovering = /type=recovery/.test(location.hash);
  sb.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session?.user) {
      recovering = true;
      store.user = userFrom(session.user);
      showMode("recover");
    }
  });

  // keep data in step with other devices
  window.addEventListener("online", () => scheduleSync(0));
  window.addEventListener("offline", () => setSyncStatus("offline"));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleSync(0); });
  setInterval(() => { if (!document.hidden) scheduleSync(0); }, 60000);
  document.addEventListener("focusout", () => {
    if (remoteChangePending) setTimeout(() => { if (!document.activeElement || document.activeElement === document.body) reloadSoon(); }, 400);
  });

  let session = null;
  try { session = (await sb.auth.getSession()).data.session; } catch {}
  await sleep(50);           // let a password-recovery event arrive first
  if (recovering) return;    // the "set a new password" screen is showing
  if (!session) return openFromLink(); // not signed in: show the home page

  const user = userFrom(session.user);
  store.user = user;
  const dekRaw = savedDek(user.id);
  if (!dekRaw) return showMode("unlock");

  try {
    // Open from this device's copy first (instant, works offline), then sync.
    const dek = await importDek(dekRaw);
    const cached = await loadCache(user.id, dek);
    if (cached) {
      await useVault(user, dekRaw, cached.data, cached.version, cached.changed);
      return enterApp();
    }
    const row = await fetchVault(user.id);
    if (!row) return showMode("unlock");
    await openVault(user, dekRaw, row, localStorage.getItem(KEEP_KEY) === "1");
  } catch {
    forgetDevice(user.id);
    showMode("unlock");
  }
})();
