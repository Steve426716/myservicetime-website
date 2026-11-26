// MyServiceTime — light / dark look. Loaded first (in <head>) so the page never flashes the wrong colors.
// The choice is kept on this device: "light", "dark" or "auto" (follows the phone / computer setting).
// Until someone chooses, MyServiceTime opens in the dark look.
// The App Store / Google Play version is marked here too (before anything shows), so its home page never flashes.
(function () {
  try {
    const q = new URLSearchParams(location.search).get("storeapp");
    const store = window.Capacitor?.isNativePlatform?.() || q === "1" || (q !== "0" && localStorage.getItem("dailytime.storeApp") === "1");
    if (store) document.documentElement.classList.add("store-app");
    // myservicetime.app typed in a browser: the website (get.html) first, even for people who already use the app;
    // its "Open MyServiceTime" comes back here with #app. The app opens straight away in the phone apps, when added
    // to the home screen, from links into it (#signin, sign-in emails, payments), and on reloads inside it.
    if (!store && /\/(index\.html)?$/.test(location.pathname)) {
      const IN_APP = "dailytime.inApp";
      const home = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
      const link = location.hash.length > 1 || /[?&](checkout|tip|code|error|type)=/.test(location.search);
      const nav = (performance.getEntriesByType?.("navigation")[0] || {}).type;
      const inside = sessionStorage.getItem(IN_APP) === "1" &&
        (nav === "reload" || nav === "back_forward" || document.referrer.startsWith(location.origin));
      if (home || link || inside) sessionStorage.setItem(IN_APP, "1");
      else location.replace("get.html" + location.search.replace(/[?&]?(mock|storeapp=\d)\b/g, "").replace(/^&/, "?"));
    }
  } catch {}
  // App lock (lock.js): nothing of the app shows until the passcode / Face ID is given
  try {
    const lock = JSON.parse(localStorage.getItem("dailytime.lock") || "null");
    if (lock && (lock.hash || lock.method === "bio")) document.documentElement.classList.add("app-locked");
  } catch {}
})();

(function () {
  const KEY = "dailytime.theme";
  const darkQuery = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;

  const DEFAULT = "dark";
  const pref = () => { try { return localStorage.getItem(KEY) || DEFAULT; } catch { return DEFAULT; } };
  const isDark = (p = pref()) => p === "dark" || (p === "auto" && !!darkQuery?.matches);

  // accent color (Settings → Accent color), kept on this device; purple is the default
  const ACCENT_KEY = "dailytime.accent";
  const ACCENT_COLORS = {"purple": "#5b4bf0", "blue": "#2563eb", "teal": "#0d9488", "green": "#16a34a", "orange": "#ea580c", "pink": "#db2777", "red": "#dc2626", "indigo": "#4f46e5", "cyan": "#0891b2", "gold": "#ca8a04", "brown": "#9a5b34", "slate": "#475569", "maroon": "#9f1239"};
  const accent = () => { try { const a = localStorage.getItem(ACCENT_KEY); return ACCENT_COLORS[a] ? a : "purple"; } catch { return "purple"; } };
  // icon style: simple outline icons ("line", for everyone) or the colorful emoji ("color", with the Cloud)
  const ICONS_KEY = "dailytime.iconStyle";
  const icons = () => { try { return localStorage.getItem(ICONS_KEY) === "color" ? "color" : "line"; } catch { return "line"; } };

  // more Appearance choices (free, on this device): the first value of each list is the default
  const LOOKS = {
    textsize: ["s", "m", "l", "xl"], // Small for everyone; Normal, Large and Extra large come with the Cloud
    density: ["comfortable", "compact"],
    corners: ["round", "square"],
    font: ["standard", "classic"],
    bold: ["off", "on"],
    motion: ["on", "off"],
  };
  const look = (k) => { try { const v = localStorage.getItem("dailytime.look." + k); return LOOKS[k].includes(v) ? v : LOOKS[k][0]; } catch { return LOOKS[k][0]; } };

  function apply() {
    const dark = isDark();
    for (const k of Object.keys(LOOKS)) document.documentElement.setAttribute("data-" + k, look(k));
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.dataset.accent = accent();
    document.documentElement.dataset.icons = icons();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = accent() === "purple" ? "#101b3f" : dark ? "#1b1938" : ACCENT_COLORS[accent()]; // the phone's top edge matches the navy bar
    document.dispatchEvent(new CustomEvent("themechange", { detail: { dark, pref: pref() } }));
    // some browsers keep drawing drop-down boxes in the old colors until they are redrawn
    document.querySelectorAll("select").forEach((s) => { s.style.display = "none"; void s.offsetHeight; s.style.display = ""; });
  }

  window.DailyTheme = {
    pref,
    isDark: () => isDark(),
    set(p) { try { localStorage.setItem(KEY, p); } catch {} apply(); },
    toggle() { this.set(isDark() ? "light" : "dark"); },
    accent,
    accents: Object.keys(ACCENT_COLORS),
    setAccent(a) { try { localStorage.setItem(ACCENT_KEY, a); } catch {} apply(); },
    icons,
    setIcons(v) { try { localStorage.setItem(ICONS_KEY, v); } catch {} apply(); },
    looks: LOOKS,
    look,
    setLook(k, v) { if (!LOOKS[k] || !LOOKS[k].includes(v)) return; try { localStorage.setItem("dailytime.look." + k, v); } catch {} apply(); },
    apply,
  };
  darkQuery?.addEventListener?.("change", () => { if (pref() === "auto") apply(); });
  apply();

  // any button marked data-theme-toggle switches light ↔ dark and shows 🌙 (go dark) or ☀️ (go light)
  const paintButtons = () => document.querySelectorAll("[data-theme-toggle]").forEach((b) => { b.textContent = isDark() ? "☀️" : "🌙"; });
  document.addEventListener("themechange", paintButtons);
  document.addEventListener("DOMContentLoaded", () => {
    paintButtons();
    document.addEventListener("click", (e) => { if (e.target.closest("[data-theme-toggle]")) window.DailyTheme.toggle(); });
  });
})();
