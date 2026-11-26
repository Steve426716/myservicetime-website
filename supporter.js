// ---------- The welcome popup (once, after setup) and the Supporter popup (note, yearly amounts, tip, feedback) ----------
// Loaded with the first scripts, so the Cloud payment page (before the app starts) can use the Supporter part too.
// The store apps sell nothing: they get the welcome popup, never the Supporter one.

const WELCOME_KEY = "dailytime.welcomed";         // saved with the person's data: the welcome shows once per person
const SP_GO_KEY = "dailytime.supportGo";          // "Become a Supporter" was tapped: after creating the account, only "One last step"
const SP_AMOUNT_KEY = "dailytime.supportAmount";  // the amount picked, remembered through creating an account
// Yearly amounts (in cents), all ending in .98: 9.98, 13.98, 18.98, then 9 dollars more each time, up to 180.98
const SP_PRICES = [998, 1398, 1898];
for (let c = 1898 + 900; c <= 18098; c += 900) SP_PRICES.push(c);
const SP_FIRST = 6;                               // shown before "Show all options"
const TIP_PRICES = [98, 198, 298, 398, 498];      // one-time tips
// outline pictures for the perks (drawn here, so they also show on the payment page, before the app opens)
const SP_PERK_ICONS = [
  '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 21v-5h-5"/>',
  '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>', // Moments (camera)
  '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/><circle cx="17" cy="10.5" r="1"/>',
  '<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM18 13l.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8z"/>',
  '<path d="M4 19L9 5l5 14M5.8 14h6.4"/><path d="M15 19l3-8 3 8M15.9 16.5h4.2"/>',
];

let spPick = SP_PRICES.includes(+sessionStorage.getItem(SP_AMOUNT_KEY)) ? +sessionStorage.getItem(SP_AMOUNT_KEY) : SP_PRICES[0];
let spAllOpen = false, tipOpen = false, tipPick = 198, tipDone = false, spBusyNow = false;
// "Other amount": the person types any tip from US$1 to US$500 (in cents here; 0 = nothing valid typed yet)
const TIP_MIN = 100, TIP_MAX = 50000;
let tipOther = false, tipOtherText = "";
const tipOtherCents = () => { const v = parseFloat(String(tipOtherText).replace(",", ".")); return Number.isFinite(v) ? Math.round(v * 100) : 0; };
const tipOtherOk = () => tipOtherCents() >= TIP_MIN && tipOtherCents() <= TIP_MAX;
const tipAmount = () => (tipOther ? (tipOtherOk() ? tipOtherCents() : 0) : tipPick);
let spMsgText = "", spMsgKind = "";

const spEl = (id) => document.getElementById(id);
const spEsc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const spIsStore = () => typeof STORE_APP !== "undefined" && STORE_APP;
const spMoney = (cents) => (typeof usdText === "function" ? usdText(cents / 100) : "US$" + (cents / 100).toFixed(2));
const spMonthly = (cents) => spMoney(Math.round(cents / 12));
const spMonthlyShort = (cents) => "$" + (Math.round(cents / 12) / 100).toFixed(2); // inside the small price chips

// ---------- welcome ----------
/** Shows the welcome once (after the setup questions). True when it is showing. */
function maybeWelcome() {
  if (store.getItem(WELCOME_KEY) === "1" || !spEl("welcomeModal")) return false;
  if (!spEl("welcomeModal").hidden) return true;
  spEl("welcomeModal").hidden = false;
  document.body.classList.add("sp-open");
  return true;
}
function closeWelcome() {
  store.setItem(WELCOME_KEY, "1");
  spEl("welcomeModal").hidden = true;
  document.body.classList.remove("sp-open");
  // then the short tour of the app, the first time
  if (typeof startTour === "function" && typeof tour !== "undefined" && !tour && store.getItem(TOUR_DONE_KEY) !== "1") setTimeout(() => startTour("welcome"), 300);
}

// ---------- the Supporter popup ----------
function spOptHtml(c) {
  return `<button type="button" class="sp-opt${c === spPick ? " on" : ""}" data-sp="pick" data-c="${c}" aria-pressed="${c === spPick}">
    <b>${spEsc(spMoney(c))}<small>${spEsc(t("spPerYr"))}</small></b><span>${spEsc(t("spAbout", { m: spMonthlyShort(c) }))}</span></button>`;
}

/** The whole Supporter part. `where`: "modal" (inside the app) or "paywall" (the Cloud payment page). */
let supporterStore = "";
function supporterHtml(where) {
  const list = spAllOpen ? SP_PRICES : SP_PRICES.slice(0, SP_FIRST);
  const msg = spMsgText ? `<p class="addr-msg ${spMsgKind} sp-msg">${spEsc(spMsgText)}</p>` : "";
  const note = `<section class="sp-box sp-note">
      <h3 class="sp-label"><span class="sp-lbl-ic" aria-hidden="true">♡</span> ${spEsc(t("spNoteLabel"))}</h3>
      <div class="sp-paper"><p>${spEsc(t("spNote"))}</p><p class="sp-sign">Steve Dieubon</p></div>
    </section>`;
  const perks = ["spPerk1", "spPerk2", "spPerk3", "spPerk4", "spPerk5"].map((k, i) =>
    `<li><span class="sp-perk-ic" aria-hidden="true"><svg viewBox="0 0 24 24">${SP_PERK_ICONS[i]}</svg></span>${spEsc(t(k))}</li>`).join("");
  const supporter = `<section class="sp-box sp-gold">
      <h3 class="sp-label"><span aria-hidden="true">☆</span> ${spEsc(t("spLabel"))}</h3>
      <p class="sp-sub">${spEsc(t("spGet"))}</p>
      <ul class="sp-perks">${perks}</ul>
      <p class="sp-choose">${spEsc(t("spChoose"))}</p>
      ${payMode() === "store" ? iapSupporterHtml() : `<div class="sp-grid">${list.map(spOptHtml).join("")}</div>
      <button type="button" class="sp-more" data-sp="all" aria-expanded="${spAllOpen}">${spEsc(spAllOpen ? t("spFewer") : t("spAll", { n: SP_PRICES.length }))} <span aria-hidden="true">${spAllOpen ? "⌃" : "⌄"}</span></button>
      <div class="sp-sum"><strong>${spEsc(t("spYear", { y: spMoney(spPick) }))}</strong><span>${spEsc(t("spMonth", { m: spMonthly(spPick) }))}</span></div>
      ${msg}
      <button type="button" class="btn btn-primary sp-cta" data-sp="go"${spBusyNow ? " disabled" : ""}>${spEsc(t("spCta", { y: spMoney(spPick) }))}</button>
      <p class="sp-fine">${spEsc(t(payMode() === "link" ? "spLinkFine" : "spFine"))}</p>`}
    </section>`;
  const tipInner = tipDone
    ? `<div class="sp-thanks"><p class="sp-thanks-title">${spEsc(t("tipThanksTitle"))}</p><p>${spEsc(t("tipThanks"))}</p>
        <p class="sp-sign">${spEsc(t("tipLove"))}<br>Steve Dieubon</p>
        <button type="button" class="link-btn" data-sp="tipback">${spEsc(t("tipAgain"))}</button></div>`
    : `<p class="sp-tip-text">${spEsc(t("tipText"))}</p>
       <div class="sp-tips">${TIP_PRICES.map((c) => `<button type="button" class="sp-tip${!tipOther && c === tipPick ? " on" : ""}" data-sp="tippick" data-c="${c}" aria-pressed="${!tipOther && c === tipPick}">${spEsc(spMoney(c))}</button>`).join("")}</div>
       <button type="button" class="btn sp-tip-cta" data-sp="tipgo"${spBusyNow || !tipAmount() ? " disabled" : ""}>${spEsc(tipAmount() ? t("tipCta", { m: spMoney(tipAmount()) }) : t("tipOtherCta"))}</button>
       <p class="sp-fine">${spEsc(t("tipFine"))}</p>`;
  const tip = `<section class="sp-box sp-coral${tipOpen ? " open" : ""}">
      <button type="button" class="sp-tip-head" data-sp="tipopen" aria-expanded="${tipOpen}">
        <span class="sp-gift" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg></span>
        <span class="sp-tip-words"><strong>${spEsc(t("tipTitle"))}</strong><small>${spEsc(t("tipSub"))}</small></span>
        <span class="sp-chev" aria-hidden="true">${tipOpen ? "⌃" : "⌄"}</span>
      </button>
      <div class="sp-tip-body"${tipOpen ? "" : " hidden"}>${tipInner}</div>
    </section>`;
  const tipHere = payMode() === "store" ? "" : tip; // tips: website (and US phone app) only
  // they already chose an amount and tapped "Become a Supporter": after creating the account, one short last step
  if (where === "paywall" && sessionStorage.getItem(SP_GO_KEY) === "1" && payMode() !== "store") {
    return `<section class="sp-box sp-gold sp-last">
      <h3 class="sp-label"><span aria-hidden="true">☆</span> ${spEsc(t("spLastStep"))}</h3>
      <p class="sp-last-text">${spEsc(t("spLastText"))}</p>
      <div class="sp-sum"><strong>${spEsc(t("spYear", { y: spMoney(spPick) }))}</strong><span>${spEsc(t("spMonth", { m: spMonthly(spPick) }))}</span></div>
      ${msg}
      <button type="button" class="btn btn-primary sp-cta" data-sp="go"${spBusyNow ? " disabled" : ""}>${spEsc(t("spContinuePay"))}</button>
      <p class="sp-fine">${spEsc(t(payMode() === "link" ? "spLinkFine" : "spFine"))}</p>
      <button type="button" class="link-btn sp-other" data-sp="full">${spEsc(t("spOtherAmount"))}</button>
    </section>`;
  }
  if (where === "paywall") return note + supporter + tipHere; // the payment page has its own buttons below
  if (where === "store") {
    const signedIn = store.user && !store.local && !store.demo;
    supporterStore = `<section class="sp-box sp-gold">
      <h3 class="sp-label"><span aria-hidden="true">☆</span> ${spEsc(t("spLabel"))}</h3>
      <p class="sp-sub">${spEsc(t("spGet"))}</p>
      <ul class="sp-perks">${perks}</ul>
      ${signedIn ? "" : `<button type="button" class="btn btn-primary sp-cta" data-sp="signin">${spEsc(t("spStoreSignIn"))}</button>`}
    </section>`;
  }
  const feedback = `<section class="sp-box sp-gray">
      <h3 class="sp-label"><span class="sp-lbl-ic" data-ic="💬" aria-hidden="true">💬</span> ${spEsc(t("spFbLabel"))}</h3>
      <div class="sp-fb"><p>${spEsc(t("spFbAsk"))}</p><button type="button" class="btn btn-ghost small" data-sp="fb">${spEsc(t("fbMenu"))}</button></div>
    </section>`;
  const fb = typeof openFeedback === "function" ? feedback : ""; // (before the app opens, feedback isn't there yet)
  const later = `<button type="button" class="link-btn sp-later" data-sp="later">${spEsc(t("spLater"))}</button>`;
  if (where === "store") return note + supporterStore + fb + later;
  return note + supporter + tipHere + fb + later;
}

/** Redraws the Supporter part wherever it is showing. */
function renderSupport() {
  if (typeof paintPayMode === "function") paintPayMode();
  for (const [id, where] of [["spBody", spIsStore() && !canPayHere() ? "store" : "modal"], ["pwSupport", "paywall"]]) {
    const host = spEl(id);
    if (!host || host.closest("[hidden]")) continue;
    host.innerHTML = supporterHtml(where);
  }
}

/** The Supporter popup. Opens every time someone who isn't a Supporter yet goes to create an account or turn on the
 *  Cloud. The store apps get it too, without prices, tips or any way to pay (only "sign in" for website Supporters). */
function openSupport({ thanks = false } = {}) {
  spMsgText = ""; spBusyNow = false;
  if (thanks) { tipOpen = true; tipDone = true; }
  spEl("supportModal").hidden = false;
  document.body.classList.add("sp-open");
  renderSupport();
  spEl("supportModal").querySelector(".sp-sheet").scrollTop = 0;
}
function closeSupport() {
  spEl("supportModal").hidden = true;
  document.body.classList.remove("sp-open");
}

function spSay(text, kind = "") { spMsgText = text; spMsgKind = kind; renderSupport(); }

/** "Become a Supporter": an account first if needed, then Stripe's secure page for that yearly amount. */
function spGo() {
  sessionStorage.setItem(SP_AMOUNT_KEY, String(spPick)); // remembered through creating an account
  sessionStorage.setItem(SP_GO_KEY, "1");                  // so the Cloud page doesn't show the whole offer again
  sessionStorage.removeItem("dailytime.supportAuto");      // ...and goes straight to the payment page once the account exists
  if (store.demo) { closeSupport(); return leaveDemo("#signup"); }
  if (store.local) { closeSupport(); return appToAuth("#signup"); } // straight to creating the account (not "Do you have an account?" again)
  if (!store.user) { closeSupport(); return showMode("signup"); } // before the app opens: on to creating the account
  if (payMode() === "store") return iapBuy();                      // Google Play / App Store
  return subscribe(spPick);
}

/** A one-time tip: Stripe's secure page, then back here to a thank-you. */
async function sendTip() {
  spBusyNow = true; spSay(t("working"));
  try {
    const { data, error } = await sb.functions.invoke("create-tip", {
      body: { returnUrl: spIsStore() ? appReturnUrl() : location.origin + location.pathname, locale: lang, amount: tipAmount() },
    });
    if (error || !data?.url) throw error || new Error("no url");
    if (spIsStore()) { spBusyNow = false; spSay(t("spPayWeb"), "ok"); return openOutside(data.url); } // US phone app
    if (store._cacheWrites) await store._cacheWrites;
    location.href = data.url;
  } catch {
    spBusyNow = false; spSay(t("payError"), "err");
  }
}

/** Back from Stripe: "?tip=done" shows the thank-you (once the app has started). */
function spAfterStart() {
  const q = new URLSearchParams(location.search);
  const tipBack = q.get("tip");
  if (!tipBack) return;
  q.delete("tip");
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash);
  if (tipBack !== "done") return;
  // after the setup questions and the welcome, if they are showing
  const busy = () => document.body.classList.contains("in-setup") || (spEl("welcomeModal") && !spEl("welcomeModal").hidden);
  if (!busy()) return openSupport({ thanks: true });
  const wait = setInterval(() => { if (!busy()) { clearInterval(wait); openSupport({ thanks: true }); } }, 1000);
}

document.addEventListener("click", (e) => {
  if (e.target.closest("#wlStart")) return closeWelcome();
  if (e.target.id === "supportModal" || e.target.closest("#spClose")) return closeSupport();
  const b = e.target.closest("[data-sp]");
  if (!b) return;
  const what = b.dataset.sp;
  if (what === "pick") { spPick = +b.dataset.c; sessionStorage.setItem(SP_AMOUNT_KEY, String(spPick)); }
  else if (what === "all") spAllOpen = !spAllOpen;
  else if (what === "go") return spGo();
  else if (what === "full") sessionStorage.removeItem(SP_GO_KEY); // "Choose a different amount": the whole offer again
  else if (what === "tipopen") tipOpen = !tipOpen;
  else if (what === "tippick") { tipPick = +b.dataset.c; tipOther = false; }
  else if (what === "tipother") { tipOther = true; setTimeout(() => spEl("spTipOther")?.focus(), 50); }
  else if (what === "tipgo") return sendTip();
  else if (what === "tipback") tipDone = false;
  else if (what === "fb") { closeSupport(); if (typeof openFeedback === "function") openFeedback(); return; }
  else if (what === "later") return closeSupport();
  else if (what === "signin") { // store apps: Supporters from the website sign in to their Cloud here
    closeSupport();
    if (store.demo) return leaveDemo("#signin");
    if (typeof goCloud === "function" && store.local) return goCloud();
    return typeof showMode === "function" ? showMode("signin") : undefined;
  }
  spMsgText = "";
  renderSupport();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && spEl("supportModal") && !spEl("supportModal").hidden) closeSupport();
});

// ---------- "Are you sure?" before deleting (Events, Appointments, Schedule) ----------
/** Shows a clear in-app question with a red Delete button. Resolves true (delete) or false (cancel). */
function askSure(message) {
  return new Promise((resolve) => {
    document.getElementById("sureModal")?.remove();
    const wrap = document.createElement("div");
    wrap.id = "sureModal";
    wrap.className = "sp-overlay sure-overlay";
    wrap.innerHTML = `<div class="sp-sheet sure-sheet" role="alertdialog" aria-modal="true" aria-labelledby="sureTitle" aria-describedby="sureText">
      <div class="sure-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></div>
      <h2 id="sureTitle">${spEsc(t("sureTitle"))}</h2>
      <p id="sureText">${spEsc(message)}</p>
      <p class="muted small-text">${spEsc(t("sureNoUndo"))}</p>
      <div class="sure-actions">
        <button type="button" class="btn btn-ghost" data-sure="no">${spEsc(t("cancel"))}</button>
        <button type="button" class="btn danger sure-yes" data-sure="yes">${spEsc(t("delete"))}</button>
      </div></div>`;
    const done = (ok) => { wrap.remove(); document.removeEventListener("keydown", onKey); resolve(ok); };
    const onKey = (e) => { if (e.key === "Escape") done(false); };
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) return done(false);
      const b = e.target.closest("[data-sure]");
      if (b) done(b.dataset.sure === "yes");
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(wrap);
    setTimeout(() => wrap.querySelector('[data-sure="no"]').focus(), 30); // Cancel is the safe default
  });
}

// typing a tip amount: update the button without redrawing (so the keyboard stays open)
document.addEventListener("input", (e) => {
  if (e.target.id !== "spTipOther") return;
  tipOtherText = e.target.value;
  const host = e.target.closest(".sp-tip-body");
  const cta = host?.querySelector(".sp-tip-cta");
  if (cta) { cta.disabled = spBusyNow || !tipAmount(); cta.textContent = tipAmount() ? t("tipCta", { m: spMoney(tipAmount()) }) : t("tipOtherCta"); }
  const hint = host?.querySelector("#spTipHint");
  if (hint) hint.classList.toggle("bad", !!tipOtherText && !tipOtherOk());
});
