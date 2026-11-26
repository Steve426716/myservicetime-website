// MyServiceTime — the country the person uses the app in.
// Chosen when the account is created (or once after signing in, for older accounts), changeable in Profile.
// The map and the address search look for places in this country only, so "Delmas 33" or "Main Street"
// lands in the right place. Country names come from the browser (Intl), so they show in every language.
// Loaded before auth.js (the sign-up form needs the list); the parts that use the saved profile run after sign-in.

const COUNTRY_CODES = (
  "AF AX AL DZ AS AD AO AI AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO VG BN BG BF BI " +
  "CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO " +
  "FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE " +
  "JO KZ KE KI XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ " +
  "MM NA NR NP NL NC NZ NI NE NG NU NF KP MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN " +
  "LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA KR SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO " +
  "TT TN TR TM TC TV VI UG UA AE GB US UY UZ VU VA VE VN WF EH YE ZM ZW"
).split(" ");

const PENDING_COUNTRY_KEY = "dailytime.pendingCountry"; // chosen on the sign-up form, saved once the account is open

/** The country's name in the person's language. */
function countryName(code) {
  if (!code) return "";
  try { return new Intl.DisplayNames([uiLocale(), "en"], { type: "region" }).of(code) || code; } catch { return code; }
}

/** A good first guess: the region in the browser's language setting (e.g. fr-HT → Haiti). */
function guessCountry() {
  for (const l of navigator.languages || [navigator.language]) {
    const m = /[-_]([A-Z]{2})\b/i.exec(l || "");
    if (m && COUNTRY_CODES.includes(m[1].toUpperCase())) return m[1].toUpperCase();
  }
  return "";
}

/** <option>s for a country <select>, sorted by name in the person's language. */
function countryOptionsHtml(selected = "") {
  const collator = new Intl.Collator(uiLocale());
  const rows = COUNTRY_CODES.map((c) => [c, countryName(c)]).sort((a, b) => collator.compare(a[1], b[1]));
  const esc1 = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  return `<option value="">${esc1(t("countryPick"))}</option>` +
    rows.map(([c, n]) => `<option value="${c}"${c === selected ? " selected" : ""}>${esc1(n)}</option>`).join("");
}

/** Fills a <select> with the countries, keeping (or guessing) the choice. */
function fillCountrySelect(sel, selected) {
  if (!sel) return;
  sel.innerHTML = countryOptionsHtml(selected ?? sel.value ?? "");
}

// ---------- after sign-in (these use the saved profile) ----------

/** "HT", or "" if not chosen yet. The demo uses the visitor's own country (from the browser), or the United States. */
const myCountry = () => {
  if (store.demo) return guessCountry() || "US";
  return typeof loadProfile === "function" ? loadProfile().country || "" : "";
};
let demoCountryBox = null; // the demo saves nothing: its country area is kept in memory only
// the demo shows sample pins in a few countries (city level, never a real address)
const DEMO_COUNTRIES = ["HT", "US", "CA", "FR"];

/** The person's country (one only; the demo's sample pins sit in a few countries). */
function myCountries() {
  if (store.demo) return [...new Set([myCountry(), ...DEMO_COUNTRIES])];
  return myCountry() ? [myCountry()] : [];
}

/** The map area of each of those countries (looked up once, then remembered). */
function myCountryBoxes() {
  if (store.demo) return demoCountryBox ? [demoCountryBox] : [];
  const p = typeof loadProfile === "function" ? loadProfile() : {};
  const boxes = { ...(p.countryBoxes || {}) };
  if (p.countryBox && p.countryBox.code === p.country) boxes[p.country] = p.countryBox;
  return myCountries().map((c) => boxes[c]).filter(Boolean);
}


/** The country's area on the map: { code, lat, lon, bbox: [west, south, east, north] } (looked up once, then remembered). */
function myCountryBox() {
  if (store.demo) return demoCountryBox;
  const p = typeof loadProfile === "function" ? loadProfile() : {};
  return p.countryBox && p.countryBox.code === p.country ? p.countryBox : null;
}

async function lookUpCountryBox(code) {
  try {
    const params = new URLSearchParams({ country: code, format: "jsonv2", limit: "1", featureType: "country" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    const hit = (await res.json())[0];
    if (!hit) return null;
    const [south, north, west, east] = hit.boundingbox.map(Number);
    return { code, lat: Number(hit.lat), lon: Number(hit.lon), bbox: [west, south, east, north] };
  } catch {
    return null;
  }
}

/** Saves the country (and finds its area on the map). Places that were put outside it are looked up again. */
async function setMyCountry(code) {
  if (!COUNTRY_CODES.includes(code)) return;
  const before = myCountry();
  saveProfile({ ...loadProfile(), country: code });
  const box = await lookUpCountryBox(code);
  if (box) saveProfile({ ...loadProfile(), countryBox: box });
  if (before !== code && typeof replaceOutsideCountry === "function") replaceOutsideCountry();
  if (typeof renderMap === "function") renderMap();
}

/** Older accounts (or a missing box): ask once, right after sign-in. The demo doesn't ask. */
function ensureCountry() {
  if (store.demo) {
    lookUpCountryBox(myCountry()).then((box) => { demoCountryBox = box; if (typeof renderMap === "function") renderMap(); });
    return;
  }
  const pending = sessionStorage.getItem(PENDING_COUNTRY_KEY);
  if (pending) {
    sessionStorage.removeItem(PENDING_COUNTRY_KEY);
    if (!myCountry()) { setMyCountry(pending); return; }
  }
  const code = myCountry();
  if (code) { if (!myCountryBox()) setMyCountry(code); return; }
  // no country yet: asked as a step of "Set up your profile" (nextOpeningStep), after "About you"
}

// ---------- profile setup when the app opens: full page, one question per step ----------
let setupSteps = null; // e.g. ["country", "status"], decided the first time a question is asked
function setupPlan() {
  if (!setupSteps) {
    setupSteps = [];
    if (typeof aboutComplete === "function" && !aboutComplete()) setupSteps.push("about");
    if (!store.demo && !myCountry()) setupSteps.push("country");
    const askFirst = localStorage.getItem("dailytime.askAccountAfterSetup") === "1"; // the status comes after "Do you have an account?"
    if (!askFirst && typeof loadProfile === "function" && !loadProfile().pubStatus) setupSteps.push("status");
  }
  return setupSteps;
}
/** Shows a question as a full-page setup step ("Step 1 of 2"), or as a normal window (from a Change button). */
function setupLook(modalId, step) {
  const el = $(modalId);
  const plan = step ? setupPlan() : [];
  const i = plan.indexOf(step);
  el.classList.toggle("setup", i >= 0);
  document.body.classList.toggle("in-setup", i >= 0);
  const back = el.querySelector(".setup-back");
  if (back) { back.hidden = i < 0 || (i === 0 && (localStorage.getItem("dailytime.askAccountAfterSetup") === "1" || step === "status")); back.dataset.step = step || ""; }
  if (i < 0) { const b = el.querySelector('button[type="submit"]'); if (b) { b.dataset.i18n = "save"; b.textContent = t("save"); } return; }
  el.querySelector(".setup-step").textContent = plan.length > 1 ? t("setupStep", { n: i + 1, total: plan.length }) : "";
  el.querySelector(".setup-bar span").style.width = `${((i + 1) / plan.length) * 100}%`;
  el.scrollTop = 0;
  const submit = el.querySelector('button[type="submit"]');
  if (submit) { submit.dataset.i18n = i < plan.length - 1 ? "setupNext" : "setupFinish"; submit.textContent = t(submit.dataset.i18n); } // "Next →" … "Finish" (kept when the language is redrawn)
  const intro = el.querySelector(".setup-intro");
  if (intro) intro.hidden = i !== 0 || step === "status"; // the welcome line only on the first page ("About you"), not again later
}

/** "← Back" in the setup: the step before, or (on the first step) back to "Do you have an account?". */
function setupBack(step) {
  const plan = setupPlan();
  const i = plan.indexOf(step);
  for (const id of ["aboutModal", "countryModal", "statusModal"]) $(id).hidden = true;
  if (i <= 0) {
    document.body.classList.remove("in-setup");
    sessionStorage.removeItem("dailytime.askedAccount"); // so "Do you have an account?" shows again
    if (store.demo) return leaveDemo("");
    if (store.local) return leaveLocal();
    return signOut();
  }
  const prev = plan[i - 1];
  if (prev === "about") openAboutModal(true);
  else if (prev === "country") openCountryModal();
  else openStatusModal(true);
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".setup-back");
  if (b) setupBack(b.dataset.step);
});

function openCountryModal() {
  setupLook("countryModal", "country");
  fillCountrySelect($("cmSelect"), myCountry() || guessCountry());
  $("cmMsg").textContent = "";
  $("countryModal").hidden = false;
  setTimeout(() => $("cmSelect").focus(), 50);
}

function initCountry() {
  $("countryForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = $("cmSelect").value;
    if (!code) { $("cmMsg").textContent = t("countryNeeded"); $("cmMsg").className = "addr-msg err"; return; }
    $("countryModal").hidden = true;
    document.body.classList.remove("in-setup");
    await setMyCountry(code);
    if (typeof renderView === "function") renderView();
    nextOpeningStep(); // then the publisher status, then the welcome tour
  });
  $("profCountry").addEventListener("change", () => {
    const code = $("profCountry").value;
    if (code) setMyCountry(code).then(() => { $("profCountryMsg").textContent = t("countrySaved"); $("profCountryMsg").className = "addr-msg ok"; });
  });
  ensureCountry();
}
