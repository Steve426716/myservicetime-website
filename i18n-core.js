// MyServiceTime — translations (core). MADE BY tools/build-lang.js FROM i18n.js — edit i18n.js, then run that tool.
// Only the person's language is downloaded (lang/<code>.js); switching language loads the new one.

const LANGS = {
  en: { name: "English", locale: "en" },
  es: { name: "Español", locale: "es" },
  fr: { name: "Français", locale: "fr" },
  ht: { name: "Kreyòl ayisyen", locale: "fr-HT" },
  pt: { name: "Português", locale: "pt" },
  de: { name: "Deutsch", locale: "de" },
  it: { name: "Italiano", locale: "it" },
  ru: { name: "Русский", locale: "ru" },
  ar: { name: "العربية", locale: "ar", dir: "rtl" },
  hi: { name: "हिन्दी", locale: "hi" },
  zh: { name: "中文", locale: "zh-CN" },
  ja: { name: "日本語", locale: "ja" },
  tl: { name: "Tagalog", locale: "fil" },
  ko: { name: "한국어", locale: "ko" },
  sw: { name: "Kiswahili", locale: "sw" },
  tw: { name: "Twi (beta)", locale: "ak", beta: true }, // not yet checked by a native speaker
  pl: { name: "Polski", locale: "pl" },
  nl: { name: "Nederlands", locale: "nl" },
  id: { name: "Bahasa Indonesia", locale: "id" },
  vi: { name: "Tiếng Việt", locale: "vi" },
};

const STRINGS = {}; // filled by lang/<code>.js
// event names in every language (Events recognises a name typed in any of them)
const EVENT_NAMES = {"en":{"ev_memorial":"Memorial","ev_assembly":"Assembly","ev_convention":"Convention","ev_co_visit":"CO visit"},"es":{"ev_memorial":"Conmemoración","ev_assembly":"Asamblea de circuito","ev_convention":"Asamblea regional","ev_co_visit":"Visita del superintendente de circuito"},"fr":{"ev_memorial":"Mémorial","ev_assembly":"Assemblée de circonscription","ev_convention":"Assemblée régionale","ev_co_visit":"Visite du responsable de circonscription"},"ht":{"ev_memorial":"Memoryal","ev_assembly":"Asanble sikonskripsyon","ev_convention":"Asanble rejyonal","ev_co_visit":"Vizit siveyan sikonskripsyon"},"pt":{"ev_memorial":"Celebração","ev_assembly":"Assembleia de circuito","ev_convention":"Congresso regional","ev_co_visit":"Visita do superintendente de circuito"},"de":{"ev_memorial":"Gedächtnismahl","ev_assembly":"Kreiskongress","ev_convention":"Regionaler Kongress","ev_co_visit":"Besuch des Kreisaufsehers"},"it":{"ev_memorial":"Commemorazione","ev_assembly":"Assemblea di circoscrizione","ev_convention":"Assemblea regionale","ev_co_visit":"Visita del sorvegliante di circoscrizione"},"ru":{"ev_memorial":"Вечеря воспоминания","ev_assembly":"Районный конгресс","ev_convention":"Региональный конгресс","ev_co_visit":"Посещение районного надзирателя"},"ar":{"ev_memorial":"الذكرى","ev_assembly":"المحفل الدائري","ev_convention":"المحفل الإقليمي","ev_co_visit":"زيارة ناظر الدائرة"},"hi":{"ev_memorial":"स्मारक","ev_assembly":"सर्किट सम्मेलन","ev_convention":"क्षेत्रीय अधिवेशन","ev_co_visit":"सर्किट निगरान का दौरा"},"zh":{"ev_memorial":"受难纪念","ev_assembly":"分区大会","ev_convention":"区域大会","ev_co_visit":"分区监督探访"},"ja":{"ev_memorial":"記念式","ev_assembly":"巡回大会","ev_convention":"地域大会","ev_co_visit":"巡回監督の訪問"},"tl":{"ev_memorial":"Memoryal","ev_assembly":"Asamblea","ev_convention":"Kombensiyon","ev_co_visit":"Dalaw ng CO"},"ko":{"ev_memorial":"기념식","ev_assembly":"순회 대회","ev_convention":"지역 대회","ev_co_visit":"순회 감독자 방문"},"sw":{"ev_memorial":"Ukumbusho","ev_assembly":"Kusanyiko","ev_convention":"Kusanyiko la eneo","ev_co_visit":"Ziara ya mwangalizi wa mzunguko"},"tw":{"ev_memorial":"Nkaedi","ev_assembly":"Nhyiamu kɛse","ev_convention":"Ɔmantam nhyiamu","ev_co_visit":"Ɔmantam sohwɛfo nsrahwɛ"},"pl":{"ev_memorial":"Pamiątka","ev_assembly":"Zgromadzenie obwodowe","ev_convention":"Kongres","ev_co_visit":"Wizyta nadzorcy obwodu"},"nl":{"ev_memorial":"Gedachtenisviering","ev_assembly":"Kringvergadering","ev_convention":"Congres","ev_co_visit":"Bezoek kringopziener"},"id":{"ev_memorial":"Peringatan","ev_assembly":"Kebaktian wilayah","ev_convention":"Kebaktian regional","ev_co_visit":"Kunjungan pengawas wilayah"},"vi":{"ev_memorial":"Lễ Tưởng Niệm","ev_assembly":"Hội nghị vòng quanh","ev_convention":"Hội nghị vùng","ev_co_visit":"Giám thị vòng quanh thăm"}};

const LANG_KEY = "dailytime.lang";

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && LANGS[saved]) return saved;
  for (const l of navigator.languages || [navigator.language || "en"]) {
    const code = l.toLowerCase().split("-")[0];
    if (LANGS[code]) return code;
  }
  return "en";
}

let lang = detectLang();

/** Translate a key, filling {placeholders} from vars. */
function t(key, vars = {}) {
  const s = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Locale used for dates, times and numbers. */
const uiLocale = () => LANGS[lang].locale;

/** Fill every element marked with data-i18n / data-i18n-ph / data-i18n-title. */
function applyStaticText() {
  document.documentElement.lang = lang;
  document.documentElement.dir = LANGS[lang].dir || "ltr";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  // home page cards: the emoji at the start of a title goes into its own tile (data-icon)
  document.querySelectorAll("[data-split-icon]").forEach((el) => {
    const m = el.textContent.match(/^\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic})*)\s*/u);
    if (m) { el.dataset.icon = m[1]; el.textContent = el.textContent.slice(m[0].length); }
  });
  // "© 2026 Owner. All rights reserved." (the owner's name from config.js, or "MyServiceTime")
  const cfgC = window.DAILYTIME_CONFIG || {};
  const years = new Date().getFullYear() > 2026 ? `2026–${new Date().getFullYear()}` : "2026";
  document.querySelectorAll("[data-copyright]").forEach((el) => { el.textContent = t("copyright", { year: years, owner: cfgC.ownerName || "MyServiceTime" }); });
  // "MyServiceTime is owned by Steeve Dieubon." (the website)
  document.querySelectorAll("[data-owner]").forEach((el) => { el.textContent = cfgC.ownerName ? t("ownerLine", { owner: cfgC.ownerName }) : ""; });
  // "Support" links: write to the email in config.js (hidden until one is set)
  const support = window.DAILYTIME_CONFIG?.supportEmail || "";
  document.querySelectorAll("[data-support]").forEach((a) => { if (support) a.href = `mailto:${support}`; });
  document.querySelectorAll("[data-support-wrap]").forEach((el) => { el.hidden = !support; }); document.querySelectorAll("[data-support-addr]").forEach((el) => { el.textContent = support; });
}

/** Downloads one language (lang/<code>.js) if it isn't here yet. */
function loadLang(code) {
  if (STRINGS[code] && Object.keys(STRINGS[code]).length > 50) return Promise.resolve();
  const core = document.querySelector('script[src*="i18n-core.js"]');
  const v = core ? (core.getAttribute("src").split("?")[1] || "") : "";
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `lang/${code}.js${v ? "?" + v : ""}`;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/** Switch language. If it isn't downloaded yet, it is loaded first; `done` runs once the new texts are on screen. */
function setLang(code, done) {
  if (!LANGS[code]) return;
  if (!STRINGS[code] || Object.keys(STRINGS[code]).length < 50) {
    loadLang(code).then(() => setLang(code, done)).catch(() => {});
    return;
  }
  lang = code;
  localStorage.setItem(LANG_KEY, code);
  applyStaticText();
  if (LANGS[code].beta) showBetaLanguageNote(code);
  if (typeof done === "function") done();
}

/** A language marked "beta" (not yet checked by a native speaker): say so once, in that language and in English,
 *  and ask people to report mistakes with "Send feedback". */
function showBetaLanguageNote(code) {
  const seen = `dailytime.betaNote.${code}`;
  if (localStorage.getItem(seen)) return;
  localStorage.setItem(seen, "1");
  const NOTES = {
    tw: "🧪 Twi yɛ foforo wɔ MyServiceTime mu, enti ebia mfomso bi wom. Boa yɛn: ⚙️ Settings → 💬 Ka w'adwene.",
  };
  const en = "🧪 Twi is new in MyServiceTime and may have mistakes. Please help us: ⚙️ Settings → 💬 Send feedback.";
  document.querySelectorAll(".toast.beta-note").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.className = "toast beta-note";
  el.setAttribute("role", "status");
  el.innerHTML = `${(NOTES[code] || "").replace(/</g, "&lt;")}<br><span>${en}</span>`;
  el.addEventListener("click", () => el.remove());
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 12000);
}
