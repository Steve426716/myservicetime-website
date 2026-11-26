// MyServiceTime — appointments, visits, alarm reminders, time tracker and notes.
// Data is stored in the signed-in person's private, encrypted storage (store, from auth.js).
// Text comes from i18n.js (t()), address recognition from addresses.js (findAddresses()).

const STORE_KEY = "dailytime.appointments";
const STARTED_KEY = "dailytime.started";
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const $ = (id) => document.getElementById(id);
let appts = load();
let started = store.getItem(STARTED_KEY) === "1";
let audioCtx = null;
let ringInterval = null;
let alarmQueue = [];
let currentAlarm = null;
let rendering = false;

// ---------- storage ----------
function load() {
  try { return JSON.parse(store.getItem(STORE_KEY)) || []; }
  catch { return []; }
}
function save() {
  store.setItem(STORE_KEY, JSON.stringify(appts));
  uploadReminderTimes(); // keep the server's reminder times (for alerts when the app is closed) up to date
}
const whenOf = (a) => new Date(`${a.date}T${a.time}`).getTime();

// ---------- formatting ----------
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(uiLocale(), { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(uiLocale(), { hour: "2-digit", minute: "2-digit" });
}
function fmtCountdown(ms) {
  if (ms <= 0) return t("now");
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / 60000);
  if (d) return t("inDH", { d, h });
  if (h) return t("inHM", { h, m });
  return t("inM", { m: Math.max(m, 1) });
}
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const typeLabel = (type) => t(type === "Visit" ? "visit" : "appointment");

// ---------- language ----------
$("langSel").innerHTML = Object.entries(LANGS)
  .map(([code, l]) => `<option value="${code}">${l.name}</option>`).join("");
$("langSel").value = lang;
$("langSel").addEventListener("change", () => setLang($("langSel").value, refreshText));

function refreshText() {
  applyStaticText();
  updateStartBtn();
  updateFormTitle();
  if (typeof renderTrialBar === "function") renderTrialBar();
  fillContactSelects();
  fillAssigneeSelects();
  renderContacts();
  renderTasks();
  render();
  renderEvents();
  renderPlanner();
  renderTracker();
  if (typeof renderTerritories === "function") renderTerritories();
  showQuickStatus();
  showQuickAddresses();
  renderPages();
  tickClock();
}

// ---------- form ----------
const form = $("apptForm");
$("date").value = dayKey(Date.now());

function updateFormTitle() {
  const editing = !!$("apptId").value;
  $("formTitle").textContent = t(editing ? "editAppt" : "newAppt");
  $("saveBtn").textContent = t(editing ? "update" : "save");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("apptId").value;
  const data = {
    title: $("title").value.trim(),
    type: $("type").value,
    date: $("date").value,
    time: $("time").value,
    email: $("email").value.trim(),
    address: $("address").value.trim(),
    lat: $("lat").value ? Number($("lat").value) : null,
    lon: $("lon").value ? Number($("lon").value) : null,
    notes: $("notes").value.trim(),
    contactId: $("apptContact").value || null,
    assigneeId: $("apptAssignee").value || null,
    reminders: {
      dayBefore: $("remDayBefore").checked,
      hourBefore: $("remHourBefore").checked,
      atTime: $("remAtTime").checked,
    },
  };
  if (!data.title || !data.date || !data.time) return;

  if (id) {
    const a = appts.find((x) => x.id === id);
    const timeChanged = a.date !== data.date || a.time !== data.time;
    Object.assign(a, data);
    if (timeChanged) { a.fired = {}; a.snoozeUntil = null; }
  } else {
    appts.push({ id: crypto.randomUUID(), ...data, fired: {}, snoozeUntil: null, startedAt: null, durations: [], createdAt: Date.now() });
  }
  save();
  resetForm();
  closeApptForm();
  render();
  renderPlanner();
  renderContacts(); // visit counts / history

  // anything with a reminder switches reminders on by itself (no need to tap "Start Reminders")
  const r = data.reminders;
  await remindersOnAfterSave([r.dayBefore && t("remDayBefore"), r.hourBefore && t("remHourBefore"), r.atTime && t("remAtTime")]);
});

/**
 * Called after saving something that has reminders (appointment, return visit, assignment, event, to-do with a time).
 * The first time, reminders switch on by themselves — the tap on Save lets the alarm make sound — and stay on after.
 * A short message says when the person will be reminded.
 */
async function remindersOnAfterSave(points) {
  const when = (points || []).filter(Boolean);
  if (!when.length) return;
  const wasOn = started;
  if (!started) { try { await setRemindersOn(true); } catch {} }
  showToast(`🔔 ${t(wasOn ? "rvReminded" : "rvRemindersOn")} ${when.join(" · ")}`);
}

/** A short message at the bottom of the screen that goes away by itself. */
function showToast(text, ms = 4500) {
  document.querySelectorAll(".toast").forEach((x) => x.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("out"), ms);
  setTimeout(() => el.remove(), ms + 400);
  el.addEventListener("click", () => el.remove());
}

// the appointment window: "+ New appointment" opens it empty; Save, Cancel, ✕, Esc or a click outside closes it
function openApptForm() {
  $("apptModal").hidden = false;
  if (currentView !== "tools") showView("tools", "#listCard");
  setTimeout(() => $("title").focus(), 50);
}
function closeApptForm() {
  $("apptModal").hidden = true;
  hideSuggest();
}
$("newAppt").addEventListener("click", () => { resetForm(); openApptForm(); });
$("cancelEdit").addEventListener("click", () => { resetForm(); closeApptForm(); });
$("apptClose").addEventListener("click", () => { resetForm(); closeApptForm(); });
$("apptModal").addEventListener("mousedown", (e) => { if (e.target === $("apptModal")) { resetForm(); closeApptForm(); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("apptModal").hidden && $("addrSuggest").hidden) { resetForm(); closeApptForm(); } });

// Choosing a contact fills in their email and address.
$("apptContact").addEventListener("change", () => {
  const c = contactById($("apptContact").value);
  if (!c) return;
  if (c.email) $("email").value = c.email;
  if (c.address) {
    $("address").value = c.address;
    lastQuery = c.address;
    setCoords(c.lat ?? null, c.lon ?? null);
    setAddrMsg(c.lat != null ? t("confirmed") : "", "ok");
  }
});

function resetForm() {
  form.reset();
  $("apptId").value = "";
  $("apptContact").value = "";
  $("apptAssignee").value = "";
  setCoords(null, null);
  hideSuggest();
  setAddrMsg("");
  $("date").value = dayKey(Date.now());
  applyDefaultReminders();
  updateFormTitle();
}

function editAppt(id) {
  const a = appts.find((x) => x.id === id);
  if (!a) return;
  $("apptId").value = a.id;
  $("apptContact").value = contactById(a.contactId) ? a.contactId : "";
  $("apptAssignee").value = contactById(a.assigneeId) ? a.assigneeId : "";
  $("title").value = a.title;
  $("type").value = a.type;
  $("date").value = a.date;
  $("time").value = a.time;
  $("email").value = a.email;
  $("address").value = a.address || "";
  setCoords(a.lat ?? null, a.lon ?? null);
  setAddrMsg(a.lat != null ? t("confirmed") : "", "ok");
  $("notes").value = a.notes;
  $("remDayBefore").checked = a.reminders.dayBefore;
  $("remHourBefore").checked = a.reminders.hourBefore;
  $("remAtTime").checked = a.reminders.atTime;
  updateFormTitle();
  openApptForm();
}

// ---------- address search (OpenStreetMap, worldwide) & GPS ----------
const GEO_URL = "https://nominatim.openstreetmap.org";
const POS_KEY = "dailytime.lastPosition";
let myPos = (() => { try { return JSON.parse(store.getItem(POS_KEY)); } catch { return null; } })();

// Photon: typo-tolerant search on OpenStreetMap data (any country).
async function searchPhoton(q, signal) {
  const params = new URLSearchParams({ q, limit: "6" });
  if (["en", "de", "fr"].includes(lang)) params.set("lang", lang); // other languages: local place names
  const box = myCountryBox();
  const several = myCountries().length > 1;
  if (myPos) { params.set("lat", myPos.lat); params.set("lon", myPos.lon); } // prefer results near you
  else if (box) { params.set("lat", box.lat); params.set("lon", box.lon); }
  if (box && !several) params.set("bbox", box.bbox.join(",")); // one country: only inside it
  if (box) params.set("limit", several ? "20" : "12");
  const res = await fetch(`https://photon.komoot.io/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const mine = myCountries();
  const inCountry = data.features.filter((f) => !mine.length || !f.properties.countrycode || mine.includes(f.properties.countrycode.toUpperCase()));
  return inCountry.slice(0, 6).map((f) => {
    const p = f.properties;
    const street = [p.housenumber, p.street].filter(Boolean).join(" ");
    const parts = [p.name !== p.street ? p.name : null, street, p.district, p.city || p.town || p.village, p.state, p.postcode, p.country];
    const display_name = [...new Set(parts.filter(Boolean))].join(", ");
    return { display_name, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
  });
}

// Nominatim: backup service, answers in the chosen language.
async function searchNominatim(q, signal) {
  const params = new URLSearchParams({ format: "jsonv2", limit: "6", q, "accept-language": lang });
  if (myCountries().length) params.set("countrycodes", myCountries().join(",").toLowerCase()); // only inside the person's countries
  if (myPos) {
    const b = 1;
    params.set("viewbox", `${myPos.lon - b},${myPos.lat + b},${myPos.lon + b},${myPos.lat - b}`);
  }
  const res = await fetch(`${GEO_URL}/search?${params}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).map((s) => ({ display_name: s.display_name, lat: Number(s.lat), lon: Number(s.lon) }));
}

async function geoSearch(q, signal) {
  try {
    const r = await searchPhoton(q, signal);
    if (r.length) return r;
    return await searchNominatim(q, signal); // Photon found nothing: ask the other service too
  } catch (err) {
    if (err.name === "AbortError") throw err;
    return await searchNominatim(q, signal);
  }
}

async function reverseGeocode(pos) {
  try {
    const res = await fetch(`${GEO_URL}/reverse?format=jsonv2&lat=${pos.lat}&lon=${pos.lon}&accept-language=${lang}`);
    const data = await res.json();
    return data.display_name || `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}`;
  } catch {
    return `${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}`;
  }
}

function suggestionHtml(list) {
  return list.map((s, i) => {
    const dist = myPos ? ` <span class="muted">· ${fmtKm(distanceKm(myPos, { lat: +s.lat, lon: +s.lon }))}</span>` : "";
    return `<li data-i="${i}">📍 ${esc(s.display_name)}${dist}</li>`;
  }).join("");
}

// --- appointment form address field ---
let searchTimer = null;
let searchAbort = null;
let lastQuery = "";
let suggestions = [];
let activeIdx = -1;

function setAddrMsg(text, kind = "") {
  $("addrMsg").textContent = text;
  $("addrMsg").className = `addr-msg ${kind}`;
}

function setCoords(lat, lon) {
  $("lat").value = lat ?? "";
  $("lon").value = lon ?? "";
  const map = $("addrMap");
  if (lat == null || lon == null) { map.hidden = true; map.removeAttribute("src"); return; }
  const d = 0.004;
  map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d * 0.6},${lon + d},${lat + d * 0.6}&layer=mapnik&marker=${lat},${lon}`;
  map.hidden = false;
}

function hideSuggest() { $("addrSuggest").hidden = true; suggestions = []; activeIdx = -1; }

async function searchAddress(query, { auto = false } = {}) {
  const q = query.trim();
  if (q.length < 3) { if (!auto) setAddrMsg(t("min3"), "err"); return; }
  if (auto && q === lastQuery) return;
  lastQuery = q;

  searchAbort?.abort();
  searchAbort = new AbortController();
  $("addrSearch").classList.add("busy");
  setAddrMsg(t("searching"));
  try {
    suggestions = await geoSearch(q, searchAbort.signal);
    showSuggestions();
  } catch (err) {
    if (err.name === "AbortError") return;
    setAddrMsg(t("searchDown"), "err");
  } finally {
    $("addrSearch").classList.remove("busy");
  }
}

function showSuggestions() {
  const ul = $("addrSuggest");
  activeIdx = -1;
  if (!suggestions.length) {
    ul.innerHTML = `<li class="none">${esc(t("noMatch"))}</li>`;
    ul.hidden = false;
    setAddrMsg(t("tryShorter"), "err");
    return;
  }
  ul.innerHTML = suggestionHtml(suggestions);
  ul.hidden = false;
  setAddrMsg(t("matches", { n: suggestions.length }));
}

function pickSuggestion(i) {
  const s = suggestions[i];
  if (!s) return;
  $("address").value = s.display_name;
  lastQuery = s.display_name;
  setCoords(Number(s.lat), Number(s.lon));
  hideSuggest();
  setAddrMsg(t("confirmed"), "ok");
}

$("addrSuggest").addEventListener("mousedown", (e) => {
  const li = e.target.closest("li[data-i]");
  if (!li) return;
  e.preventDefault();
  pickSuggestion(Number(li.dataset.i));
});

$("address").addEventListener("input", () => {
  // Typing changes the address, so the old map pin no longer applies.
  setCoords(null, null);
  setAddrMsg("");
  clearTimeout(searchTimer);
  // Wait until the user stops typing (also respects the free services' rate limits).
  searchTimer = setTimeout(() => searchAddress($("address").value, { auto: true }), 450);
});

$("address").addEventListener("keydown", (e) => {
  const open = !$("addrSuggest").hidden && suggestions.length;
  if (e.key === "Enter") {
    e.preventDefault();
    if (open && activeIdx >= 0) pickSuggestion(activeIdx);
    else { clearTimeout(searchTimer); lastQuery = ""; searchAddress($("address").value); }
  } else if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
    e.preventDefault();
    activeIdx = (activeIdx + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length;
    [...$("addrSuggest").children].forEach((li, i) => li.classList.toggle("active", i === activeIdx));
  } else if (e.key === "Escape") {
    hideSuggest();
  }
});

$("address").addEventListener("blur", () => setTimeout(hideSuggest, 150));

$("addrSearch").addEventListener("click", () => {
  clearTimeout(searchTimer);
  lastQuery = "";
  searchAddress($("address").value);
});

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error(t("gpsUnsupported")));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        myPos = { lat: p.coords.latitude, lon: p.coords.longitude, at: Date.now() };
        store.setItem(POS_KEY, JSON.stringify(myPos));
        resolve(myPos);
      },
      (err) => reject(new Error(t(err.code === 1 ? "gpsDenied" : err.code === 3 ? "gpsTimeout" : "gpsFail"))),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

$("addrGps").addEventListener("click", async () => {
  $("addrGps").classList.add("busy");
  setAddrMsg(t("gettingGps"));
  try {
    const pos = await getPosition();
    setCoords(pos.lat, pos.lon);
    $("address").value = await reverseGeocode(pos);
    lastQuery = $("address").value;
    hideSuggest();
    setAddrMsg(t("usingLocation"), "ok");
    render();
  } catch (err) {
    setAddrMsg(err.message, "err");
  } finally {
    $("addrGps").classList.remove("busy");
  }
});

// Refresh position quietly if the user already allowed location before.
navigator.permissions?.query({ name: "geolocation" }).then((p) => {
  if (p.state === "granted") getPosition().then(render).catch(() => {});
}).catch(() => {});

function distanceKm(a, b) {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function fmtKm(km) {
  const imperial = /-(US|LR|MM)$/i.test(navigator.language) || /^en-GB$/i.test(navigator.language);
  const nf = (n, digits) => n.toLocaleString(uiLocale(), { maximumFractionDigits: digits });
  if (imperial) { const mi = km * 0.621371; return mi < 0.1 ? `${nf(Math.round(mi * 5280), 0)} ft` : `${nf(mi, 1)} mi`; }
  return km < 1 ? `${nf(Math.round(km * 1000), 0)} m` : `${nf(km, 1)} km`;
}

// Opens turn-by-turn GPS navigation (Google Maps app on phones, maps website on computers).
function navUrl(dest) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving&dir_action=navigate`;
}
function directionsUrl(a) {
  return navUrl(a.lat != null ? `${a.lat},${a.lon}` : a.address);
}
/** A small icon inside a row: the outline drawing (or the emoji, with "Colorful icons"). */
const mi = (e) => `<span class="mi" data-ic="${e}">${e}</span>`;
/** A label that starts with an emoji ("🧭 Directions"): that emoji as a small icon, then the words. */
const icLabel = (s) => { const m = /^(\p{Extended_Pictographic}\uFE0F?)\s*/u.exec(s); return m ? mi(m[1]) + " " + esc(s.slice(m[0].length)) : esc(s); };

function navLink(addr) {
  return `<a class="addr-link" href="${navUrl(addr)}" target="_blank" rel="noopener" title="${esc(t("openGps"))}"><span class="mi" data-ic="📍">📍</span> ${esc(addr)}</a>`;
}
// Escapes note text and turns any addresses in it into GPS links.
function linkifyAddresses(text) {
  let out = "", pos = 0;
  for (const f of findAddresses(text)) {
    out += esc(text.slice(pos, f.start)) + navLink(f.value);
    pos = f.end;
  }
  return out + esc(text.slice(pos));
}

// --- "Find an address" window, used to insert an address into notes ---
let modalPick = null;
let modalAbort = null;
let modalTimer = null;
let modalResults = [];

function openAddrModal(onPick) {
  modalPick = onPick;
  modalResults = [];
  $("mAddr").value = "";
  $("mMsg").textContent = "";
  $("mMsg").className = "addr-msg";
  $("mResults").hidden = true;
  $("addrModal").hidden = false;
  $("mAddr").focus();
}
function closeAddrModal() {
  $("addrModal").hidden = true;
  modalAbort?.abort();
  modalPick = null;
}
function modalMsg(text, kind = "") { $("mMsg").textContent = text; $("mMsg").className = `addr-msg ${kind}`; }

async function modalSearch() {
  const q = $("mAddr").value.trim();
  if (q.length < 3) { modalMsg(t("min3"), "err"); return; }
  modalAbort?.abort();
  modalAbort = new AbortController();
  modalMsg(t("searching"));
  try {
    modalResults = await geoSearch(q, modalAbort.signal);
    if (!modalResults.length) {
      $("mResults").hidden = true;
      modalMsg(`${t("noMatch")} ${t("tryShorter")}`, "err");
      return;
    }
    $("mResults").innerHTML = suggestionHtml(modalResults);
    $("mResults").hidden = false;
    modalMsg(t("matches", { n: modalResults.length }));
  } catch (err) {
    if (err.name !== "AbortError") modalMsg(t("searchDown"), "err");
  }
}
function modalChoose(address, lat = null, lon = null) {
  const cb = modalPick;
  closeAddrModal();
  cb?.(address, lat, lon);
}

$("mAddr").addEventListener("input", () => {
  clearTimeout(modalTimer);
  modalTimer = setTimeout(modalSearch, 900);
});
$("mAddr").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); clearTimeout(modalTimer); modalSearch(); }
  if (e.key === "Escape") closeAddrModal();
});
$("mSearch").addEventListener("click", () => { clearTimeout(modalTimer); modalSearch(); });
$("mResults").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-i]");
  if (!li) return;
  const r = modalResults[Number(li.dataset.i)];
  modalChoose(r.display_name, Number(r.lat), Number(r.lon));
});
$("mGps").addEventListener("click", async () => {
  modalMsg(t("gettingGps"));
  try { const pos = await getPosition(); modalChoose(await reverseGeocode(pos), pos.lat, pos.lon); }
  catch (err) { modalMsg(err.message, "err"); }
});
$("mClose").addEventListener("click", closeAddrModal);
$("addrModal").addEventListener("mousedown", (e) => { if (e.target === $("addrModal")) closeAddrModal(); });

/** Puts "📍 address" on its own line at the cursor position of a text box's value. */
function insertAddressLine(text, cursor, address) {
  const before = text.slice(0, cursor), after = text.slice(cursor);
  const line = `📍 ${address}`;
  const pre = before && !before.endsWith("\n") ? "\n" : "";
  const post = after && !after.startsWith("\n") ? "\n" : "";
  return { value: before + pre + line + post + after, cursor: (before + pre + line).length };
}

// ---------- filters ----------
["fText", "fType", "fRange", "fDate", "fEmail", "fAssignee"].forEach((id) =>
  $(id).addEventListener("input", render)
);
$("clearFilters").addEventListener("click", () => {
  $("fText").value = ""; $("fType").value = ""; $("fRange").value = "upcoming";
  $("fDate").value = ""; $("fEmail").value = ""; $("fAssignee").value = "all";
  render();
});

function filtered() {
  const now = Date.now();
  const text = $("fText").value.trim().toLowerCase();
  const type = $("fType").value;
  const range = $("fRange").value;
  const date = $("fDate").value;
  const email = $("fEmail").value;
  const who = $("fAssignee").value;
  const today = dayKey(now), tomorrow = dayKey(now + DAY);

  return appts
    .filter((a) => {
      const t0 = whenOf(a);
      if (text && ![a.title, a.email, a.address, a.notes, contactById(a.contactId)?.name, ...(a.noteLog || []).map((n) => n.text)].join(" ").toLowerCase().includes(text)) return false;
      if (type && a.type !== type) return false;
      if (date && a.date !== date) return false;
      if (email === "with" && !a.email) return false;
      if (email === "without" && a.email) return false;
      if (who && who !== "all" && (a.assigneeId || "") !== who) return false;
      switch (range) {
        case "upcoming": return t0 >= now - HOUR || a.startedAt; // keep just-started visits visible
        case "today": return a.date === today;
        case "tomorrow": return a.date === tomorrow;
        case "week": return t0 >= now - HOUR && t0 <= now + 7 * DAY;
        case "past": return t0 < now;
        default: return true;
      }
    })
    .sort((x, y) => (range === "past" ? whenOf(y) - whenOf(x) : whenOf(x) - whenOf(y)));
}

// ---------- list ----------
const openNotes = new Set();   // appointments whose note panel is open
const noteDrafts = {};         // unsaved text per appointment
let focusId = null;

function render() {
  const list = filtered();
  const now = Date.now();
  $("countBadge").textContent = list.length;
  $("empty").hidden = list.length > 0;
  const keepFocus = focusId; // replacing the list removes the focused box, which would clear focusId
  rendering = true;

  $("list").innerHTML = list.map((a) => {
    const when = whenOf(a);
    const diff = when - now;
    const cls = ["item", a.type === "Visit" ? "visit" : "", a.startedAt ? "running" : diff < 0 ? "past" : diff < DAY ? "soon" : ""].join(" ");
    const total = (a.durations || []).reduce((s, d) => s + d, 0);
    const rem = [a.reminders.dayBefore && t("remDay"), a.reminders.hourBefore && t("remHour"), a.reminders.atTime && t("remAt")].filter(Boolean).join(", ") || t("none");
    const noteCount = (a.noteLog || []).length;
    const person = contactById(a.contactId);
    return `
      <li class="${cls}" data-id="${a.id}">
        <div>
          <h3>${esc(a.title)}<span class="tag">${esc(typeLabel(a.type))}</span></h3>
          ${person ? `<div class="meta person">
            <span>${avatarHtml(person.name, person.photo, "xs")} <strong>${esc(person.name)}</strong></span>
            ${person.phone ? `<a href="tel:${esc(telHref(person.phone))}">${mi("📞")} ${esc(person.phone)}</a>` : ""}
          </div>` : ""}
          ${a.assigneeId && assigneeName(a.assigneeId) ? `<div class="meta"><span class="assignee-chip">${mi("👉")} ${esc(t("assignedTo"))}: ${esc(assigneeName(a.assigneeId))}</span></div>` : ""}
          <div class="meta">
            <span>${mi("📅")} ${fmtDate(when)}</span>
            <span>${mi("🕒")} ${fmtTime(when)}</span>
            <span class="countdown">${diff < 0 ? t("passed") : fmtCountdown(diff)}</span>
            ${diff >= 0 ? wxChipAt(when, true, a) : ""}
            ${a.email ? `<span>${mi("✉️")} <a href="mailto:${esc(a.email)}">${esc(a.email)}</a></span>` : ""}
            <span>${mi("🔔")} ${esc(rem)}</span>
            ${a.startedAt ? `<span>${mi("⏱")} <span class="timer" data-start="${a.startedAt}">${fmtDuration(now - a.startedAt)}</span></span>` : ""}
            ${!a.startedAt && total ? `<span>${mi("⏱")} ${esc(t("timeSpentVal", { d: fmtDuration(total) }))}</span>` : ""}
          </div>
          ${a.address ? `<div class="meta" style="margin-top:4px">
            <a class="addr-link" href="${directionsUrl(a)}" target="_blank" rel="noopener" title="${esc(t("openGps"))}">${mi("📍")} ${esc(a.address)}</a>
            ${myPos && a.lat != null ? `<span class="dist">${esc(t("away", { d: fmtKm(distanceKm(myPos, a)) }))}</span>` : ""}
            <a href="${directionsUrl(a)}" target="_blank" rel="noopener">${icLabel(t("directions"))}</a>
          </div>` : ""}
          ${a.notes ? `<div class="meta" style="margin-top:4px">${mi("📝")} ${linkifyAddresses(a.notes)}</div>` : ""}
        </div>
        <div class="item-actions">
          ${a.startedAt
            ? `<button class="btn small stop" data-act="stop">${esc(t("stop"))}</button>`
            : `<button class="btn small go" data-act="start">${esc(t("start"))}</button>`}
          <button class="btn small note-btn ${openNotes.has(a.id) ? "open" : ""}" data-act="notes">${icLabel(t("noteBtn"))}${noteCount ? ` (${noteCount})` : ""}</button>
          <button class="btn small btn-ghost" data-act="edit">${esc(t("edit"))}</button>
          <button class="btn small danger" data-act="delete">${esc(t("delete"))}</button>
        </div>
        ${openNotes.has(a.id) ? notePanel(a) : ""}
      </li>`;
  }).join("");
  rendering = false;
  focusId = keepFocus;

  // Put back anything typed in open note boxes, and the cursor.
  document.querySelectorAll(".note-input").forEach((ta) => {
    const id = ta.closest("li.item").dataset.id;
    ta.value = noteDrafts[id] || "";
    if (id === focusId) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  });
}

// ---------- notes per appointment ----------
function notePanel(a) {
  const notes = (a.noteLog || []).slice().reverse();
  return `
    <div class="note-panel">
      ${a.address
        ? `<a class="btn nav-btn" href="${directionsUrl(a)}" target="_blank" rel="noopener">${icLabel(t("goGps"))} — ${esc(a.address)}</a>`
        : ""}
      <textarea class="note-input" rows="3" placeholder="${esc(t("notePh"))}"></textarea>
      <div class="note-tools">
        <button class="btn small btn-primary" data-act="addNote">${esc(t("saveNote"))}</button>
        <button class="btn small note-btn" data-act="insertAddr">${icLabel(t("insertAddr"))}</button>
        <span class="muted">${esc(notes.length ? t("notesN", { n: notes.length }) : t("noNotes"))} · ${esc(t("ctrlEnter"))}</span>
      </div>
      <div class="note-list">
        ${notes.map((n) => `
          <div class="note">
            <div class="note-head">
              <span>${fmtDate(n.at)} · ${fmtTime(n.at)}</span>
              <button class="note-del" data-act="delNote" data-note="${n.id}" title="${esc(t("delete"))}">✕</button>
            </div>
            <div class="note-text">${linkifyAddresses(n.text)}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

function addNote(a) {
  const text = (noteDrafts[a.id] || "").trim();
  if (!text) return;
  a.noteLog = [...(a.noteLog || []), { id: crypto.randomUUID(), text, at: Date.now() }];
  noteDrafts[a.id] = "";
  focusId = a.id;
}

$("list").addEventListener("input", (e) => {
  if (!e.target.classList.contains("note-input")) return;
  noteDrafts[e.target.closest("li.item").dataset.id] = e.target.value;
});
$("list").addEventListener("focusin", (e) => {
  if (e.target.classList.contains("note-input")) focusId = e.target.closest("li.item").dataset.id;
});
$("list").addEventListener("focusout", (e) => {
  if (e.target.classList.contains("note-input") && !rendering) focusId = null;
});
$("list").addEventListener("keydown", (e) => {
  if (!e.target.classList.contains("note-input") || e.key !== "Enter" || !(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  const a = appts.find((x) => x.id === e.target.closest("li.item").dataset.id);
  if (a) { addNote(a); save(); render(); }
});

$("list").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest("li.item").dataset.id;
  const a = appts.find((x) => x.id === id);
  if (!a) return;
  switch (btn.dataset.act) {
    case "notes":
      if (openNotes.has(id)) openNotes.delete(id);
      else { openNotes.add(id); focusId = id; }
      render();
      return;
    case "insertAddr": {
      const ta = btn.closest(".note-panel").querySelector(".note-input");
      const cursor = ta.selectionStart ?? ta.value.length;
      openAddrModal((address) => {
        const r = insertAddressLine(noteDrafts[id] || "", Math.min(cursor, (noteDrafts[id] || "").length), address);
        noteDrafts[id] = r.value;
        focusId = id;
        render();
      });
      return;
    }
    case "addNote": addNote(a); break;
    case "delNote":
      askSure(t("delNote")).then((ok) => {
        if (!ok) return;
        a.noteLog = (a.noteLog || []).filter((n) => n.id !== btn.dataset.note);
        save();
        render();
      });
      return;
    case "start": a.startedAt = Date.now(); break;
    case "stop":
      a.durations = [...(a.durations || []), Date.now() - a.startedAt];
      a.startedAt = null;
      break;
    case "edit": editAppt(id); return;
    case "delete":
      askSure(t("deleteConfirm", { title: a.title })).then((ok) => {
        if (!ok) return;
        appts = appts.filter((x) => x.id !== id);
        save();
        render();
      });
      return;
  }
  save();
  render();
});

// ---------- reminders / alarm ----------
function reminderPoints(a) {
  const when = whenOf(a);
  const pts = [];
  if (a.reminders.dayBefore) pts.push({ key: "dayBefore", at: when - DAY, until: when, label: "alarmTomorrow" });
  if (a.reminders.hourBefore) pts.push({ key: "hourBefore", at: when - HOUR, until: when, label: "alarmHour" });
  if (a.reminders.atTime) pts.push({ key: "atTime", at: when, until: when + 30 * 60000, label: "alarmNow" });
  if (a.snoozeUntil) pts.push({ key: `snooze-${a.snoozeUntil}`, at: a.snoozeUntil, until: a.snoozeUntil + 60 * 60000, label: "alarmSnoozed" });
  return pts;
}

function checkReminders() {
  if (!started) return;
  const now = Date.now();
  let changed = false;
  for (const a of appts) {
    a.fired = a.fired || {};
    for (const p of reminderPoints(a)) {
      if (a.fired[p.key]) continue;
      if (now >= p.at && now < p.until) {
        a.fired[p.key] = true;
        changed = true;
        triggerAlarm(a, p);
      } else if (now >= p.until) {
        a.fired[p.key] = true; // missed window — don't ring later
        changed = true;
      }
    }
  }
  if (changed) save();
  checkTaskReminders(now);
  checkTodoReminders(now);
  checkEventReminders(now);
  checkMyReminders(now);
}

function triggerAlarm(a, p) {
  const when = whenOf(a);
  const person = contactById(a.contactId);
  const title = `${t(p.label)}: ${a.title}`;
  const assignee = a.assigneeId && assigneeName(a.assigneeId);
  const text = [`${typeLabel(a.type)} — ${fmtDate(when)} ${fmtTime(when)}`, person && `👤 ${person.name}`, assignee && `👉 ${assignee}`, a.address, a.email].filter(Boolean).join(" — ");
  pushAlarm({ id: a.id, title, text, tag: `${a.id}-${p.key}` });
}

// When the app opens (or reminders are just turned on), reminders that are already due don't ring or pop up:
// they are listed quietly in a short message at the bottom instead.
let quietAlarms = false;
let quietList = [];
function checkRemindersQuietly() {
  quietAlarms = true;
  try { checkReminders(); } finally { quietAlarms = false; }
  if (quietList.length) {
    const shown = quietList.slice(0, 3).join(" · ") + (quietList.length > 3 ? ` (+${quietList.length - 3})` : "");
    showToast(`🔔 ${t("remAlreadyDue")} ${shown}`, 9000);
    quietList = [];
  }
}

/** A reminder is due: shown as a notification (phone or computer) — no ringing. */
function pushAlarm({ id, title, text, tag }) {
  if (typeof addNotice === "function") addNotice({ id: `rem:${tag || id}:${Date.now()}`, kind: "reminder", title, text, ref: id }); // 🔔 the notifications list
  if (quietAlarms) { quietList.push(title); return; } // opening the app: no pop-up, no sound
  if (NativeNotify.available) { NativeNotify.showNow({ title, text, tag }); return; } // store app: a phone notification
  playReminderTone(); // MyServiceTime's tone (about 2.6 s), once
  if (showWebNotification({ title, text, tag })) return; // website: the browser's notification
  // notifications not allowed (or not possible here): the reminder window in the app instead
  alarmQueue.push({ id, title, text });
  showNextAlarm();
}

/** Website: MyServiceTime's reminder tone, once (the store apps play it with the phone notification). */
let reminderTone = null;
function playReminderTone() {
  try {
    reminderTone = reminderTone || new Audio(`sounds/mst_reminder.wav?v=${APP_VERSION}`);
    reminderTone.currentTime = 0;
    reminderTone.play().catch(() => {});
  } catch {}
}

/** Website: shows a system notification if the person allowed them. Returns false if it can't. */
function showWebNotification({ title, text, tag }) {
  if (!("Notification" in window) || Notification.permission !== "granted") return false;
  const options = { body: text, tag, icon: "icons/icon-192.png", badge: "icons/badge-72.png", renotify: true };
  try {
    if (swRegistration?.showNotification) { swRegistration.showNotification(title, options); return true; }
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch { return false; }
}

function showNextAlarm() {
  if (currentAlarm || !alarmQueue.length) return;
  currentAlarm = alarmQueue.shift();
  $("alarmTitle").textContent = currentAlarm.title;
  $("alarmText").textContent = currentAlarm.text;
  $("alarm").hidden = false; // quiet: reminders don't ring any more
}

function closeAlarm() {
  $("alarm").hidden = true;
  stopRinging();
  currentAlarm = null;
  showNextAlarm();
}

$("alarmDismiss").addEventListener("click", closeAlarm);
$("alarmSnooze").addEventListener("click", () => {
  const id = currentAlarm?.id || "";
  const a = appts.find((x) => x.id === id);
  if (a) { a.snoozeUntil = Date.now() + 10 * 60000; save(); }
  const task = id.startsWith("task-") ? taskById(id.slice(5)) : null;
  if (task) { task.snoozeUntil = Date.now() + 10 * 60000; saveTasks(); }
  const todo = id.startsWith("todo-") ? todoById(id.slice(5)) : null;
  if (todo) { todo.snoozeUntil = Date.now() + 10 * 60000; saveTodos(); }
  const ev = id.startsWith("event-") ? eventById(id.slice(6)) : null;
  if (ev) { ev.snoozeUntil = Date.now() + 10 * 60000; saveEvents(); }
  const mine = id.startsWith("rem-") ? myReminders.find((x) => x.id === id.slice(4)) : null;
  if (mine) { mine.snoozeUntil = Date.now() + 10 * 60000; saveMyReminders(); }
  closeAlarm();
});

function beep() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [0, 0.25, 0.5].forEach((offset) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.2);
  });
}
function startRinging() { stopRinging(); beep(); ringInterval = setInterval(beep, 1500); }
function stopRinging() { clearInterval(ringInterval); ringInterval = null; }

// ---------- start button ----------
function updateStartBtn() {
  $("startBtn").textContent = t(started ? "remBtnOn" : "startReminders");
  $("startBtn").classList.toggle("on", started);
}

/** Turns alarms on or off. (Must follow a tap: browsers only allow sound after one.) */
async function setRemindersOn(on) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") await audioCtx.resume();
  started = on;
  store.setItem(STARTED_KEY, started ? "1" : "0");
  updateStartBtn();
  checkRemindersQuietly(); // already-due reminders are listed, not rung
  // alerts even when MyServiceTime is closed (asks to allow notifications the first time)
  if (started) await enableBackgroundReminders();
  else disableBackgroundReminders();
}

// Start Reminders: turns alarms on (if they were off) and opens the window to add what to be reminded of.
$("startBtn").addEventListener("click", async () => {
  openMyReminders();
  if (!started) { await setRemindersOn(true); renderMyReminders(); }
});

// Unlock sound on any first interaction if reminders were left ON.
document.addEventListener("pointerdown", () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}, { once: true });

// ---------- time tracker ----------
// running: { name, startedAt, resumedAt, accumulated, pausedAt } — accumulated = ms counted before the last resume
const TRACK_KEY = "dailytime.tracker";
let tracker = (() => {
  try { return JSON.parse(store.getItem(TRACK_KEY)) || { running: null, log: [] }; }
  catch { return { running: null, log: [] }; }
})();
const saveTracker = () => store.setItem(TRACK_KEY, JSON.stringify(tracker));

function trackerElapsed() {
  const r = tracker.running;
  if (!r) return 0;
  return r.accumulated + (r.pausedAt ? 0 : Date.now() - r.resumedAt);
}

$("trkStart").addEventListener("click", () => {
  if (tracker.running) return;
  const name = $("trkName").value.trim() || t("untitled");
  const now = Date.now();
  tracker.running = { name, note: $("trkNote").value.trim(), startedAt: now, resumedAt: now, accumulated: 0, pausedAt: null };
  saveTracker();
  renderTracker();
});

function pauseOrResumeTracker() {
  const r = tracker.running;
  if (!r) return;
  const now = Date.now();
  if (r.pausedAt) { r.resumedAt = now; r.pausedAt = null; }       // resume
  else { r.accumulated += now - r.resumedAt; r.pausedAt = now; }   // pause
  saveTracker();
  renderTracker();
}
$("trkPause").addEventListener("click", pauseOrResumeTracker);

// Stop → "Pause or Finish?"
$("trkStop").addEventListener("click", () => {
  const r = tracker.running;
  if (!r) return;
  $("stopTitle").textContent = t("stopTitle", { name: r.name });
  $("stopText").textContent = t("stopText", { time: fmtDuration(trackerElapsed()) });
  $("stopPause").hidden = !!r.pausedAt;        // already paused: only Finish / Cancel
  $("stopModal").hidden = false;
});
const closeStopModal = () => { $("stopModal").hidden = true; };
$("stopCancel").addEventListener("click", closeStopModal);
$("stopModal").addEventListener("mousedown", (e) => { if (e.target === $("stopModal")) closeStopModal(); });
$("stopPause").addEventListener("click", () => {
  closeStopModal();
  pauseOrResumeTracker();
});

/** Discard: throw away the running timer's time without saving it (after a yes/no question). */
function discardTracker() {
  const r = tracker.running;
  if (!r) return false;
  if (!confirm(t("discardConfirm", { time: fmtHM(trackerElapsed()), name: r.name }))) return false;
  tracker.running = null;
  saveTracker();
  $("trkNote").value = "";
  renderTracker();
  $("trkStatus").textContent = t("discardedMsg");
  return true;
}
$("stopDiscard").addEventListener("click", () => { if (discardTracker()) closeStopModal(); });

/** Finish: opens the "Save your time" window (note, times) — the timer keeps going until Save is tapped. */
$("stopFinish").addEventListener("click", () => {
  closeStopModal();
  if (tracker.running) openTimeEntry("finish");
});

$("trkRange").addEventListener("input", renderTracker);

$("trkHistory").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn || !confirm(t("delTimeEntry"))) return;
  tracker.log = tracker.log.filter((x) => x.id !== btn.dataset.id);
  saveTracker();
  renderTracker();
});

function updateTrackerClock() {
  $("trkClock").textContent = fmtDuration(trackerElapsed());
}

function renderTracker() {
  renderTimeCalendar(); // the calendar follows the tracked time
  if (typeof renderGoalBoxes === "function") renderGoalBoxes(); // the monthly goal follows it too
  const r = tracker.running;
  const card = document.querySelector(".tracker");
  card.classList.toggle("running", !!r && !r.pausedAt);
  card.classList.toggle("paused", !!r?.pausedAt);
  $("trkStart").hidden = !!r;
  $("trkPause").hidden = !r;
  $("trkStop").hidden = !r;
  $("trkName").disabled = !!r;
  $("trkNote").disabled = !!r;
  if (r) {
    $("trkName").value = r.name;
    $("trkNote").value = r.note || "";
    $("trkPause").textContent = t(r.pausedAt ? "resume" : "pause");
    $("trkStatus").textContent = t(r.pausedAt ? "pausedStatus" : "tracking", { name: r.name, time: fmtTime(r.startedAt) }) + (r.note ? ` · 📝 ${r.note}` : "");
  } else {
    $("trkStatus").textContent = t("notRunning");
  }
  updateTrackerClock();
  paintTrackerWeather();

  // Name suggestions from past activities
  const names = [...new Set(tracker.log.map((x) => x.name))];
  $("trkNames").innerHTML = names.map((n) => `<option value="${esc(n)}">`).join("");

  // Totals per activity in the chosen range
  const range = $("trkRange").value;
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const from = range === "today" ? startOfToday : range === "week" ? startOfToday - 6 * DAY : 0;
  const entries = tracker.log.filter((x) => x.end >= from);
  const totals = {};
  entries.forEach((x) => { totals[x.name] = (totals[x.name] || 0) + x.ms; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const sum = sorted.reduce((s, [, ms]) => s + ms, 0);

  $("trkTotal").textContent = sum ? t("total", { d: fmtDuration(sum) }) : "";
  $("trkTotals").innerHTML = sorted.length
    ? sorted.map(([name, ms]) => `
        <li><span class="name" title="${esc(name)}">${esc(name)}</span>
        <span class="bar"><span style="width:${Math.max(3, (ms / max) * 100)}%"></span></span>
        <span class="dur">${fmtDuration(ms)}</span></li>`).join("")
    : `<li class="muted">${esc(t(range === "today" ? "noTimeToday" : "noTimePeriod"))}</li>`;

  $("trkHistory").innerHTML = entries.slice().reverse().map((x) => `
    <li><strong>${esc(x.name)}</strong>
      <span class="when">${fmtDate(x.start)} · ${fmtTime(x.start)} – ${fmtTime(x.end)}</span>
      <span class="dur">${fmtDuration(x.ms)}</span>
      <button data-id="${x.id}" title="${esc(t("delete"))}">✕</button></li>`).join("")
    || `<li class="muted">${esc(t("nothingYet"))}</li>`;
}

// ---------- quick notes (auto-saved notepad) ----------
const QUICK_KEY = "dailytime.quickNotes";
const QUICK_AT_KEY = "dailytime.quickNotesSavedAt";
let quickTimer = null;

function showQuickStatus() {
  const at = Number(store.getItem(QUICK_AT_KEY));
  $("quickStatus").textContent = at ? t("savedAt", { date: fmtDate(at), time: fmtTime(at) }) : "";
}
function showQuickAddresses() {
  const found = [...new Set(findAddresses($("quickNotes").value).map((f) => f.value))];
  $("quickAddr").hidden = !found.length;
  $("quickAddr").innerHTML = found.length
    ? `<span class="muted">${esc(t("tapGps"))}</span> ${found.map(navLink).join("")}`
    : "";
}
function saveQuickSoon() {
  showQuickAddresses();
  $("quickStatus").textContent = t("saving");
  clearTimeout(quickTimer);
  quickTimer = setTimeout(() => {
    store.setItem(QUICK_KEY, $("quickNotes").value);
    store.setItem(QUICK_AT_KEY, String(Date.now()));
    showQuickStatus();
  }, 400);
}

$("quickNotes").value = store.getItem(QUICK_KEY) || "";
$("quickNotes").addEventListener("input", saveQuickSoon);

$("quickInsert").addEventListener("click", () => {
  const ta = $("quickNotes");
  const cursor = ta.selectionStart ?? ta.value.length;
  openAddrModal((address) => {
    const r = insertAddressLine(ta.value, cursor, address);
    ta.value = r.value;
    ta.focus();
    ta.setSelectionRange(r.cursor, r.cursor);
    saveQuickSoon();
  });
});

$("quickClear").addEventListener("click", () => {
  if (!$("quickNotes").value || !confirm(t("clearQuickConfirm"))) return;
  $("quickNotes").value = "";
  store.removeItem(QUICK_KEY);
  store.removeItem(QUICK_AT_KEY);
  showQuickStatus();
  showQuickAddresses();
});

// ---------- clock & loop ----------
function tickClock() {
  if (document.hidden) return; // in the background: nobody is looking (the time keeps counting all the same)
  updateTrackerClock();
  tickPages();
  $("clock").textContent = new Date().toLocaleString(uiLocale(), { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.querySelectorAll(".timer[data-start]").forEach((el) => {
    el.textContent = fmtDuration(Date.now() - Number(el.dataset.start));
  });
}

initAvatars();
initContacts();
initTasks();
initPlanner();
initEvents();
initTimeCalendar();
initPages();
initMapTool();
initSuggest(); // suggestions while typing an address (map, contacts, events)
initFeedback(); // "Send feedback"
initToolHub(); // the "Tools" page: every tool + search
initMoments(); // 📸 Moments (photos, encrypted on this device)
initTerritories(); // 🏘️ Territories (cards, maps, photo of the card)
initMyReminders();
initCountry();
initPublisher();
initAbout();
if ($("countryModal").hidden) nextOpeningStep(); // the publisher status question (the country one goes first)
initTour();
refreshText();
setInterval(tickClock, 1000);
// every 15 s: check the reminders, and redraw only the screen that is open (not every tool at once)
function refreshVisible() {
  if (document.hidden) return;
  const TOOL_REFRESH = { "#listCard": render, ".tasks-card": renderTasks, ".planner": renderPlanner, ".tracker": renderTimeCalendar, ".events-card": renderEvents };
  if (currentView === "tools") TOOL_REFRESH[currentTool]?.();
  else renderView();
}
setInterval(() => { checkReminders(); refreshVisible(); }, 15000);
// back in the app: up to date straight away
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  checkReminders();
  refreshVisible();
  tickClock();
});
checkRemindersQuietly(); // opening the app: no pop-up for reminders that came due while it was closed
initNotify();
