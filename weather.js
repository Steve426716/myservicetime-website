// ---------- Weather (Dashboard card + the chosen day in Schedule) ----------
// Free forecast from Open-Meteo (no account, no key). Only a rounded location (about 1 km) is sent,
// and only after the person turns the weather on. The forecast stays on this device (never uploaded) and is
// forgotten when the app closes; the on/off choice is per device, so a new phone never asks for the location by itself.

const WX_ON_KEY = "dailytime.weatherOn";   // "1" on · "0" turned off / "Not now" · nothing = not asked yet
const WX_CACHE_KEY = "dailytime.weather";  // { lat, lon, unit, at, data }
const WX_FRESH = 30 * 60e3;
const WX_F_COUNTRIES = ["US", "LR", "BS", "BZ", "KY", "PW", "FM", "MH"]; // countries that use °F

let wxState = "idle"; // idle | loading | error
let wxErrorKey = "";
let wxLastTry = 0;    // after a failure, wait a few minutes before trying again by itself

const wxOn = () => localStorage.getItem(WX_ON_KEY) === "1";
function wxSetOn(on) {
  localStorage.setItem(WX_ON_KEY, on ? "1" : "0");
  if (!on) { sessionStorage.removeItem(WX_CACHE_KEY); sessionStorage.removeItem(WX_PLACES_KEY); wxPlaces = {}; }
  wxRepaint();
}
function wxUnit() {
  const c = (typeof myCountry === "function" && myCountry()) || "";
  if (c) return WX_F_COUNTRIES.includes(c) ? "F" : "C";
  return /-US$/i.test(navigator.language || "") ? "F" : "C";
}
let wxMemRaw = null, wxMemVal = null; // read once, not on every chip
function wxCache() {
  const raw = sessionStorage.getItem(WX_CACHE_KEY);
  if (raw !== wxMemRaw) {
    wxMemRaw = raw;
    try { wxMemVal = raw ? JSON.parse(raw) : null; } catch { wxMemVal = null; }
  }
  return wxMemVal;
}

/** Weather code (WMO) → [emoji, text key]. */
function wxKind(code, isDay = 1) {
  if (code === 0) return isDay ? ["☀️", "wxClear"] : ["🌙", "wxClear"];
  if (code <= 2) return isDay ? ["🌤️", "wxPartly"] : ["☁️", "wxPartly"];
  if (code === 3) return ["☁️", "wxCloudy"];
  if (code === 45 || code === 48) return ["🌫️", "wxFog"];
  if (code >= 51 && code <= 57) return ["🌦️", "wxDrizzle"];
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ["🌧️", "wxRainy"];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["❄️", "wxSnow"];
  if (code >= 95) return ["⛈️", "wxStorm"];
  return ["☁️", "wxCloudy"];
}
const wxIc = (e, cls = "") => `<span class="wx-ic ${cls}" data-ic="${e}" aria-hidden="true">${e}</span>`;
const wxDeg = (v) => `${Math.round(v)}°`;

async function wxPosition() {
  const p = typeof myPos !== "undefined" && myPos && Date.now() - (myPos.at || 0) < 6 * 3600e3 ? myPos : await getPosition();
  return { lat: Math.round(p.lat * 100) / 100, lon: Math.round(p.lon * 100) / 100 }; // about 1 km: enough for weather
}

/** One forecast from Open-Meteo for a rounded spot. */
async function wxFetch(lat, lon, unit) {
  const q = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: "auto", forecast_days: "16",
    current: "temperature_2m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: unit === "F" ? "fahrenheit" : "celsius",
  });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error("http");
    const data = await r.json();
    if (!data.current || !data.daily || !data.hourly) throw new Error("data");
    return data;
  } finally { clearTimeout(timer); }
}

/** Gets the forecast where the person is, if the saved one is old (or `force`). Repaints when done. */
async function loadWeather(force = false) {
  if (!wxOn() || wxState === "loading") return;
  const unit = wxUnit();
  const c = wxCache();
  if (!force && c && c.unit === unit && Date.now() - c.at < WX_FRESH) return;
  if (!force && Date.now() - wxLastTry < 5 * 60e3) return;
  wxLastTry = Date.now();
  wxState = "loading";
  if (!c) renderWeatherCard();
  let stage = "place";
  try {
    const { lat, lon } = await wxPosition();
    stage = "forecast";
    const data = await wxFetch(lat, lon, unit);
    try { sessionStorage.setItem(WX_CACHE_KEY, JSON.stringify({ lat, lon, unit, at: Date.now(), data })); } catch {}
    wxState = "idle"; wxErrorKey = "";
  } catch (err) {
    wxState = "error";
    wxErrorKey = stage === "place" ? "wxNeedLoc" : "wxFail"; // no location allowed, or no internet / service down
  }
  wxRepaint();
}

// Appointments and events far from the person (a visit in another town): that place's own forecast.
// Only its area is sent, rounded to about 10 km. Kept for this session only, like the rest.
const WX_PLACES_KEY = "dailytime.weatherPlaces";
const wxPlaceTry = {};
let wxPlaces = (() => { try { return JSON.parse(sessionStorage.getItem(WX_PLACES_KEY)) || {}; } catch { return {}; } })();
let wxRepaintTimer = null;
/** → { data, far } — the forecast to use for a place (the person's own one when it is near them). */
function wxPlaceData(place) {
  const c = wxCache();
  const own = c ? { data: c.data, far: false } : null;
  if (!place || place.lat == null || place.lon == null) return own;
  const lat = Number(place.lat), lon = Number(place.lon);
  // near the person (about 25 km): their own forecast is right
  if (c && typeof distanceKm === "function" && distanceKm({ lat: c.lat, lon: c.lon }, { lat, lon }) < 25) return own;
  const unit = wxUnit();
  const key = `${unit}:${lat.toFixed(1)},${lon.toFixed(1)}`;
  const hit = wxPlaces[key];
  if (hit && Date.now() - hit.at < 3 * WX_FRESH) return { data: hit.data, far: true };
  if (!(Date.now() - (wxPlaceTry[key] || 0) < 5 * 60e3) && Object.values(wxPlaceTry).filter((x) => x === -1).length < 4) {
    wxPlaceTry[key] = -1; // loading
    wxFetch(lat.toFixed(1), lon.toFixed(1), unit).then((data) => {
      wxPlaces[key] = { at: Date.now(), data };
      try { sessionStorage.setItem(WX_PLACES_KEY, JSON.stringify(wxPlaces)); } catch {}
    }).catch(() => {}).finally(() => {
      wxPlaceTry[key] = Date.now();
      clearTimeout(wxRepaintTimer);
      wxRepaintTimer = setTimeout(wxRepaint, 300); // one repaint for several places
    });
  }
  return hit ? { data: hit.data, far: true } : null; // an older one is still better than nothing
}

/** After new weather: the Dashboard card and every tool that shows it. */
function wxRepaint() {
  renderWeatherCard();
  if (!window.__appStarted) return; // the tools are drawn once the app has started
  if (typeof renderPlanner === "function") renderPlanner();
  if (typeof renderEvents === "function") renderEvents();
  if (typeof render === "function") render();          // appointments
  paintTrackerWeather();
}

/** Forecast chip for a moment (appointment / event): that hour if a time is known, else that day. "" when unknown.
 *  `place` ({ lat, lon }) — where it happens, when known. */
function wxChipAt(ts, withTime = true, place = null) {
  if (!wxOn() || !ts || ts < Date.now() - 3600e3) return "";
  if (!wxCache()) { loadWeather(); return ""; }
  const got = wxPlaceData(place);
  if (!got) return "";
  const w = got.data;
  // that moment in the place's own time (forecast hours are in local time there)
  const d = new Date(ts + (w.utc_offset_seconds || 0) * 1000), p = (n) => String(n).padStart(2, "0");
  const day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  const where = got.far ? ` ${esc(t("wxThere"))}` : "";
  if (withTime) {
    const i = w.hourly.time.indexOf(`${day}T${p(d.getUTCHours())}:00`);
    if (i >= 0) {
      const [e, k] = wxKind(w.hourly.weather_code[i], w.hourly.is_day ? w.hourly.is_day[i] : 1);
      const rain = w.hourly.precipitation_probability?.[i] ?? 0;
      return `<span class="wx-chip" title="${esc(t(k))}">${wxIc(e)}<span>${wxDeg(w.hourly.temperature_2m[i])}${rain >= 20 ? " · " + esc(t("wxRain", { n: rain })) : ""}${where}</span></span>`;
    }
  }
  const i = w.daily.time.indexOf(day);
  if (i < 0) return "";
  const [e, k] = wxKind(w.daily.weather_code[i], 1);
  const rain = w.daily.precipitation_probability_max?.[i] ?? 0;
  return `<span class="wx-chip" title="${esc(t(k))}">${wxIc(e)}<span>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°${rain >= 20 ? " · " + esc(t("wxRain", { n: rain })) : ""}${where}</span></span>`;
}

/** Time Tracker: the weather right now, next to its title. */
function paintTrackerWeather() {
  const el = $("trkWx");
  if (!el) return;
  const c = wxOn() ? wxCache() : null;
  if (wxOn() && !c) loadWeather();
  if (!c) { el.innerHTML = ""; return; }
  const [e, k] = wxKind(c.data.current.weather_code, c.data.current.is_day);
  el.innerHTML = `<span class="wx-chip" title="${esc(t("wxTitle"))}">${wxIc(e)}<span>${wxDeg(c.data.current.temperature_2m)} · ${esc(t(k))}</span></span>`;
}

/** Next three parts of the day (morning 9:00, afternoon 13:00, evening 17:00), moving on to tomorrow. */
function wxParts(d) {
  const out = [];
  const nowLocal = d.current.time; // "2026-11-18T10:15" in the place's own time
  const today = nowLocal.slice(0, 10);
  const curH = +nowLocal.slice(11, 13);
  for (const day of d.daily.time.slice(0, 2)) {
    for (const [h, key] of [[9, "wxMorning"], [13, "wxAfternoon"], [17, "wxEvening"]]) {
      if (day === today && h < curH) continue; // that part of today is over
      const stamp = `${day}T${String(h).padStart(2, "0")}:00`;
      const i = d.hourly.time.indexOf(stamp);
      if (i < 0) continue;
      out.push({ key, tomorrow: day !== today, temp: d.hourly.temperature_2m[i], code: d.hourly.weather_code[i],
        isDay: d.hourly.is_day ? d.hourly.is_day[i] : 1, rain: d.hourly.precipitation_probability?.[i] ?? 0 });
      if (out.length === 3) return out;
    }
  }
  return out;
}

function wxTip(parts, unit) {
  const toC = (v) => (unit === "F" ? (v - 32) * 5 / 9 : v);
  const rain = Math.max(0, ...parts.map((p) => p.rain || 0));
  const hot = Math.max(...parts.map((p) => toC(p.temp)));
  const cold = Math.min(...parts.map((p) => toC(p.temp)));
  if (parts.some((p) => p.code >= 95)) return ["⛈️", "wxTipStorm"];
  if (rain >= 50) return ["🌧️", "wxTipRain"];
  if (hot >= 32) return ["☀️", "wxTipHot"];
  if (cold <= 5) return ["❄️", "wxTipCold"];
  return ["🌤️", "wxTipNice"];
}

/** The Dashboard card. */
function renderWeatherCard() {
  const el = $("dashWeather");
  if (!el) return;
  const asked = localStorage.getItem(WX_ON_KEY);
  if (asked === "0") { el.hidden = true; return; }
  el.hidden = false;
  if (asked !== "1") { // not asked yet: offer it once
    el.innerHTML = `<div class="wx-intro">${wxIc("🌤️", "wx-big")}
      <div><h2>${esc(t("wxTitle"))}</h2><p class="muted small-text">${esc(t("wxIntro"))}</p></div></div>
      <div class="wx-actions"><button type="button" class="btn btn-primary small" data-wx="on">${esc(t("wxTurnOn"))}</button>
      <button type="button" class="btn btn-ghost small" data-wx="later">${esc(t("wxNotNow"))}</button></div>`;
    return;
  }
  const c = wxCache();
  if (!c || Date.now() - c.at >= WX_FRESH || c.unit !== wxUnit()) setTimeout(() => loadWeather(), 0);
  if (!c) {
    el.innerHTML = `<h2>${esc(t("wxTitle"))}</h2>` + (wxState === "error"
      ? `<p class="muted">${esc(t(wxErrorKey || "wxFail"))}</p><button type="button" class="btn btn-ghost small" data-wx="retry">${esc(t("wxRetry"))}</button>`
      : `<p class="muted">${esc(t("wxLoading"))}</p>`);
    return;
  }
  const d = c.data, u = c.unit;
  const [nowE, nowK] = wxKind(d.current.weather_code, d.current.is_day);
  const parts = wxParts(d);
  const [tipE, tipK] = wxTip(parts.length ? parts : [{ temp: d.current.temperature_2m, rain: d.daily.precipitation_probability_max?.[0] || 0, code: d.current.weather_code }], u);
  const at = new Date(c.at).toLocaleTimeString(uiLocale(), { hour: "numeric", minute: "2-digit" });
  el.innerHTML = `<div class="list-head"><h2>${esc(t("wxTitle"))}</h2>
      <button type="button" class="icon-btn wx-refresh" data-wx="retry" aria-label="${esc(t("wxRetry"))}" title="${esc(t("wxRetry"))}">↻</button></div>
    <div class="wx-now">${wxIc(nowE, "wx-big")}
      <div><div class="wx-temp">${wxDeg(d.current.temperature_2m)}<small>${u}</small></div>
      <div class="muted">${esc(t(nowK))} · ${esc(t("wxHiLo", { h: Math.round(d.daily.temperature_2m_max[0]), l: Math.round(d.daily.temperature_2m_min[0]) }))}</div></div></div>
    <div class="wx-parts">${parts.map((p) => { const [e] = wxKind(p.code, p.isDay); return `<div class="wx-part">
      <span class="wx-pname">${esc(t(p.key))}${p.tomorrow ? `<small>${esc(t("tomorrow"))}</small>` : ""}</span>${wxIc(e)}
      <strong>${wxDeg(p.temp)}</strong><span class="wx-rain">${p.rain >= 10 ? esc(t("wxRain", { n: p.rain })) : "&nbsp;"}</span></div>`; }).join("")}</div>
    <p class="wx-tip">${wxIc(tipE)}<span>${esc(t(tipK))}</span></p>
    <p class="muted small-text wx-src">${esc(t("wxSource", { time: at }))}${wxState === "error" ? " · " + esc(t("wxFail")) : ""}</p>`;
}

/** Schedule: a small forecast next to the chosen day (when it is within the next 16 days). */
function paintDayWeather(elId, dateKey) {
  const host = $(elId);
  if (!host || !wxOn()) return;
  const c = wxCache();
  if (!c) { loadWeather(); return; }
  const i = c.data.daily.time.indexOf(dateKey);
  if (i < 0) return;
  const [e, k] = wxKind(c.data.daily.weather_code[i], 1);
  const rain = c.data.daily.precipitation_probability_max?.[i] ?? 0;
  const chip = document.createElement("span");
  chip.className = "wx-chip";
  chip.title = t(k);
  chip.innerHTML = `${wxIc(e)}<span>${Math.round(c.data.daily.temperature_2m_max[i])}° / ${Math.round(c.data.daily.temperature_2m_min[i])}°${rain >= 20 ? " · " + esc(t("wxRain", { n: rain })) : ""}</span>`;
  host.appendChild(chip);
}

// buttons on the card + the Settings switch
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-wx]");
  if (!b) return;
  const what = b.dataset.wx;
  if (what === "on") { wxSetOn(true); loadWeather(true); }
  else if (what === "later") wxSetOn(false);
  else if (what === "retry") { wxState = "idle"; loadWeather(true); renderWeatherCard(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id !== "setWeather") return;
  wxSetOn(e.target.checked);
  if (e.target.checked) loadWeather(true);
});
