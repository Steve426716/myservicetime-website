// MyServiceTime — paying for the Supporter plan inside the phone apps (Google Play / App Store versions).
//
//  • In the United States: the same yearly prices as the website. "Become a Supporter" opens MyServiceTime's secure
//    Stripe page on the website (US store rules allow this link). Back in the app, it unlocks by itself.
//  • In every other country: Google Play / Apple In-App Purchase (the stores require their own payment there),
//    through RevenueCat (keys in config.js). The prices come from the store, in the person's own currency.
//    Until those keys are filled in, the phone apps outside the US sell nothing (only "sign in", as before).
//  • The website itself is not changed: it always pays with Stripe.
//
// Testing in a browser: ?storeapp=1 (phone app look) and ?iap=mock (a pretend store, nothing is charged).
// Loaded before auth.js (functions only).

const SP_ENTITLEMENT = "supporter";                 // the RevenueCat "entitlement" a Supporter plan unlocks
const PAY_COUNTRY_KEY = "dailytime.payCountry";     // the person's country, remembered for before the app opens
const iapMock = /[?&]iap=mock\b/.test(location.search) || localStorage.getItem("dailytime.iapMock") === "1";
if (/[?&]iap=mock\b/.test(location.search)) localStorage.setItem("dailytime.iapMock", "1");

const nativePlatform = () => window.Capacitor?.getPlatform?.() || "web"; // "android" | "ios" | "web"
const storeName = () => (nativePlatform() === "ios" ? "App Store" : "Google Play");
function iapKey() {
  const c = window.DAILYTIME_CONFIG || {};
  return nativePlatform() === "ios" ? c.revenuecatIosKey || "" : nativePlatform() === "android" ? c.revenuecatAndroidKey || "" : "";
}
const iapPlugin = () => (iapMock ? IAP_MOCK : window.Capacitor?.Plugins?.Purchases);
const iapAvailable = () => iapMock || (!!iapKey() && !!iapPlugin());

/** The person's country: the profile's, or (before the app opens) the last one known, or the phone's region. */
function payCountry() {
  let c = "";
  try { if (window.__appStarted && typeof myCountry === "function" && !store.demo) c = myCountry(); } catch {}
  if (c) localStorage.setItem(PAY_COUNTRY_KEY, c);
  return c || localStorage.getItem(PAY_COUNTRY_KEY) || (typeof guessCountry === "function" ? guessCountry() : "") || "";
}

/** How the Supporter plan is paid here: "web" (the website, Stripe), "link" (phone app in the US: the website's
 *  Stripe page), "store" (phone app elsewhere: Google Play / Apple), "none" (phone app, store payments not set up). */
function payMode() {
  if (!(typeof STORE_APP !== "undefined" && STORE_APP)) return "web";
  if (payCountry() === "US") return "link";
  return iapAvailable() ? "store" : "none";
}
const canPayHere = () => payMode() !== "none";
/** html.store-pay: the phone app may show prices (the parts marked "paid-only" come back). */
function paintPayMode() {
  document.documentElement.classList.toggle("store-pay", typeof STORE_APP !== "undefined" && STORE_APP && canPayHere());
  // "No, create a Cloud account": its "from US$9.98/year" only where the prices are the website's
  const sub = document.querySelector('#chooseNo [data-i18n^="chooseNoSub"]');
  const k = payMode() === "store" ? "chooseNoSubStore" : "chooseNoSub";
  if (sub && sub.dataset.i18n !== k) { sub.dataset.i18n = k; if (typeof t === "function") sub.textContent = t(k); }
}

// ---------- the website's Stripe page, from the phone app (US) ----------
let payAwaiting = false; // the website's payment page is open: check again when the person comes back

/** Where Stripe sends people back after paying from the phone app: the website's "Thank you, back to the app" page. */
function appReturnUrl() {
  const site = ((window.DAILYTIME_CONFIG || {}).siteUrl || "").replace(/\/+$/, "");
  return site ? `${site}/paid.html` : location.origin + location.pathname;
}
/** Opens a page in the phone's browser (outside the app). */
async function openOutside(url) {
  const B = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Browser;
  if (B) { try { await B.open({ url, presentationStyle: "fullscreen" }); return; } catch {} }
  window.open(url, "_blank", "noopener");
}
/** Back in the app after the website's payment page: has the payment arrived? */
function payCameBack() {
  if (!payAwaiting) return;
  payAwaiting = false;
  if (typeof finishCheckout === "function") finishCheckout({ fromApp: true });
}
document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(payCameBack, 600); });
window.Capacitor?.Plugins?.Browser?.addListener?.("browserFinished", () => setTimeout(payCameBack, 300));
window.Capacitor?.Plugins?.App?.addListener?.("appUrlOpen", (e) => { // myservicetime://paid from the website's thank-you page
  try { window.Capacitor.Plugins.Browser?.close?.(); } catch {}
  if (/paid/.test(e?.url || "")) { payAwaiting = true; setTimeout(payCameBack, 300); }
});

// ---------- Google Play / App Store (other countries) ----------
let iapState = "idle";  // idle | loading | ready | error
let iapPackages = [];   // [{ id, priceString, price, pkg }] cheapest first
let iapPickId = "";
let iapUser = "";

async function iapStart() {
  if (iapState === "loading" || iapState === "ready") return;
  iapState = "loading";
  try {
    const P = iapPlugin();
    await P.configure({ apiKey: iapKey() || "mock" });
    await iapLogIn();
    const offerings = await P.getOfferings();
    const list = (offerings?.current || offerings?.offerings?.current)?.availablePackages || [];
    iapPackages = list.map((pkg) => ({ id: pkg.identifier, priceString: pkg.product?.priceString || "", price: pkg.product?.price || 0, pkg }))
      .sort((a, b) => a.price - b.price);
    if (!iapPackages.length) throw new Error("no packages");
    if (!iapPackages.some((p) => p.id === iapPickId)) iapPickId = iapPackages[0].id;
    iapState = "ready";
  } catch (e) {
    console.warn("store prices", e);
    iapState = "error";
  }
  if (typeof renderSupport === "function") renderSupport();
}
/** Purchases belong to the MyServiceTime account (so the Cloud opens on every device signed in to it). */
async function iapLogIn() {
  const uid = store.user && !store.local && !store.demo ? store.user.id : "";
  if (!uid || uid === iapUser) return;
  try { await iapPlugin().logIn({ appUserID: uid }); iapUser = uid; } catch (e) { console.warn("store sign-in", e); }
}
const iapActive = (info) => !!(info?.customerInfo || info)?.entitlements?.active?.[SP_ENTITLEMENT];

/** "Become a Supporter" with the store: the store's own payment sheet, then wait for the server to confirm. */
async function iapBuy() {
  const p = iapPackages.find((x) => x.id === iapPickId);
  if (!p) return;
  spBusyNow = true; spSay(t("working"));
  try {
    await iapLogIn();
    const res = await iapPlugin().purchasePackage({ aPackage: p.pkg });
    if (!iapActive(res)) throw new Error("not active");
    spBusyNow = false; spSay("");
    closeSupport();
    finishCheckout({ fromApp: true });
  } catch (e) {
    spBusyNow = false;
    if (e?.userCancelled || e?.code === "1" || e?.code === 1 || /cancel/i.test(e?.message || "")) return spSay("");
    spSay(t("payError"), "err");
  }
}
/** "Restore purchases" (asked for by Apple): a Supporter plan bought before, on this store account. */
async function iapRestore() {
  spBusyNow = true; spSay(t("working"));
  try {
    await iapLogIn();
    const res = await iapPlugin().restorePurchases();
    spBusyNow = false;
    if (!iapActive(res)) return spSay(t("iapNothing"), "err");
    spSay(t("iapRestored"), "ok");
    closeSupport();
    finishCheckout({ fromApp: true });
  } catch {
    spBusyNow = false; spSay(t("payError"), "err");
  }
}

/** The price part of the Supporter box, when paying through the store. */
function iapSupporterHtml() {
  if (iapState === "idle") setTimeout(iapStart, 0);
  if (iapState !== "ready") {
    return `<p class="sp-iap-wait">${spEsc(t(iapState === "error" ? "iapUnavailable" : "iapLoading"))}</p>
      ${iapState === "error" ? `<button type="button" class="btn btn-ghost small" data-sp="iapretry">${spEsc(t("iapRetry"))}</button>` : ""}`;
  }
  const list = spAllOpen ? iapPackages : iapPackages.slice(0, SP_FIRST);
  const pick = iapPackages.find((x) => x.id === iapPickId) || iapPackages[0];
  const chip = (p) => `<button type="button" class="sp-opt${p.id === pick.id ? " on" : ""}" data-sp="ipick" data-id="${spEsc(p.id)}" aria-pressed="${p.id === pick.id}">
      <b>${spEsc(p.priceString)}<small>${spEsc(t("spPerYr"))}</small></b></button>`;
  const more = iapPackages.length > SP_FIRST
    ? `<button type="button" class="sp-more" data-sp="all" aria-expanded="${spAllOpen}">${spEsc(spAllOpen ? t("spFewer") : t("spAll", { n: iapPackages.length }))} <span aria-hidden="true">${spAllOpen ? "⌃" : "⌄"}</span></button>` : "";
  return `<div class="sp-grid">${list.map(chip).join("")}</div>${more}
    <div class="sp-sum"><strong>${spEsc(t("spYear", { y: pick.priceString }))}</strong></div>
    ${spMsgText ? `<p class="addr-msg ${spMsgKind} sp-msg">${spEsc(spMsgText)}</p>` : ""}
    <button type="button" class="btn btn-primary sp-cta" data-sp="go"${spBusyNow ? " disabled" : ""}>${spEsc(t("spCta", { y: pick.priceString }))}</button>
    <p class="sp-fine">${spEsc(t("iapFine", { store: storeName() }))}</p>
    <button type="button" class="link-btn sp-restore" data-sp="restore">${spEsc(t("iapRestore"))}</button>`;
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sp]");
  if (!b) return;
  if (b.dataset.sp === "ipick") { iapPickId = b.dataset.id; renderSupport(); }
  else if (b.dataset.sp === "restore") iapRestore();
  else if (b.dataset.sp === "iapretry") { iapState = "idle"; renderSupport(); }
});

/** Where a Supporter manages (or cancels) the plan from the phone app. */
async function manageInStore(sub) {
  if (sub?.store === "app_store") return openOutside("https://apps.apple.com/account/subscriptions");
  if (sub?.store === "play_store") return openOutside("https://play.google.com/store/account/subscriptions");
  return null; // bought on the website (Stripe): the website's page
}

// ---------- a pretend store, for testing in a browser (?iap=mock) — nothing is charged ----------
const IAP_MOCK = {
  _active: false,
  async configure() {},
  async logIn() { return {}; },
  async getOfferings() {
    await new Promise((r) => setTimeout(r, 400));
    const cents = typeof SP_PRICES !== "undefined" ? SP_PRICES : [998];
    const fmt = (c) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Math.ceil(c / 100) - 0.01);
    return { current: { availablePackages: cents.map((c) => ({ identifier: `supporter_${c}`, product: { priceString: fmt(c), price: Math.ceil(c / 100) - 0.01 } })) } };
  },
  async purchasePackage({ aPackage }) {
    await new Promise((r) => setTimeout(r, 600));
    if (window.__iapMockCancel) { const e = new Error("cancelled"); e.userCancelled = true; throw e; }
    this._active = true;
    // like RevenueCat's message to the server (supabase/functions/revenuecat-webhook)
    window.DAILYTIME_MOCK_SERVER?._storePurchase?.(aPackage.identifier, nativePlatform() === "ios" ? "app_store" : "play_store");
    return { customerInfo: { entitlements: { active: { [SP_ENTITLEMENT]: { productIdentifier: aPackage.identifier } } } } };
  },
  async restorePurchases() { return { customerInfo: { entitlements: { active: this._active ? { [SP_ENTITLEMENT]: {} } : {} } } }; },
};
