// MyServiceTime — the menu and its pages: Dashboard, My tools (the original page), Activity, Profile, Settings.
// Loaded before app.js (functions only); app.js calls initPages(), and renderPages() when the language changes.
// Everything shown here is read from the same private, encrypted data the rest of the app uses.

const VIEW_KEY = "dailytime.view";          // which page this browser tab had open (survives a reload)
const SETTINGS_KEY = "dailytime.settings";  // saved with the person's data, so it follows them to every device
const VIEWS = ["dashboard", "toolhub", "more", "tools", "activity", "progress", "profile", "settings"];
const DEFAULT_SETTINGS = { weekStart: "auto", rem: { dayBefore: true, hourBefore: true, atTime: true } };
let currentView = "dashboard";

// ---------- settings ----------
function loadSettings() {
  let s = {};
  try { s = JSON.parse(store.getItem(SETTINGS_KEY)) || {}; } catch {}
  return { ...DEFAULT_SETTINGS, ...s, rem: { ...DEFAULT_SETTINGS.rem, ...(s.rem || {}) } };
}
function saveSettings(s) {
  store.setItem(SETTINGS_KEY, JSON.stringify(s));
  const el = $("setSaved");
  el.textContent = t("setSavedMsg");
  clearTimeout(saveSettings.timer);
  saveSettings.timer = setTimeout(() => { el.textContent = ""; }, 2000);
}
/** New appointments start with the reminder boxes the person chose in Settings. */
function applyDefaultReminders() {
  if ($("apptId")?.value) return; // editing: keep that appointment's own choices
  const r = loadSettings().rem;
  $("remDayBefore").checked = r.dayBefore;
  $("remHourBefore").checked = r.hourBefore;
  $("remAtTime").checked = r.atTime;
}

// ---------- the menu ----------
// My tools shows ONE tool at a time (picked from the ☰ menu, the shortcut bar or a link).
const TOOL_KEY = "dailytime.tool";
const TOOL_SECTIONS = [".tracker", "#listCard", ".events-card", ".tasks-card", ".contacts", ".quicknotes", ".planner", ".map-card", ".moments-card", ".territories-card"];
let currentTool = TOOL_SECTIONS.includes(sessionStorage.getItem(TOOL_KEY)) ? sessionStorage.getItem(TOOL_KEY) : ".tracker";

/** Which tool a selector or element belongs to (".tcal" → ".tracker"), or null. */
function toolFor(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  return el ? TOOL_SECTIONS.find((s) => el.closest(s)) || null : null;
}

/** Shows only this tool inside My tools. */
function showTool(sel) {
  if (!TOOL_SECTIONS.includes(sel)) return;
  currentTool = sel;
  sessionStorage.setItem(TOOL_KEY, sel);
  for (const s of TOOL_SECTIONS) { const el = document.querySelector(s); if (el) el.hidden = s !== sel; }
  spyTools();
  if (typeof renderDrawer === "function") renderDrawer();
  if (typeof refreshVisible === "function" && currentView === "tools") refreshVisible();
  if (sel === ".map-card" && typeof renderMap === "function") { if (typeof mapPlaced !== "undefined") mapPlaced = false; setTimeout(renderMap, 0); } // the map draws (and opens wide) when it's shown
}

function showView(view, target = null) {
  if (!VIEWS.includes(view)) view = "dashboard";
  currentView = view;
  sessionStorage.setItem(VIEW_KEY, view);
  document.querySelectorAll("[data-page]").forEach((el) => { el.hidden = el.dataset.page !== view; });
  $("navSearch")?.classList.remove("on");
  if (view === "toolhub" && typeof hubMode !== "undefined") { hubMode = "tools"; $("hubSearch").value = ""; }
  document.querySelectorAll("#appNav [data-view]").forEach((b) => {
    const on = b.dataset.view === view || (view === "tools" && b.dataset.view === "toolhub") // a tool is open: "Tools" stays lit
      || (view === "more" && b.dataset.view === "settings");
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (view === "tools") showTool(toolFor(el) || currentTool);
  renderView();
  renderDrawer(); // the side list shows which page is open
  window.scrollTo(0, 0);
  // a part inside the tool (e.g. the Time calendar inside the Time Tracker): scroll to it
  if (el && !TOOL_SECTIONS.some((s) => el.matches(s))) setTimeout(() => scrollToSection(el), 0);
}

/** Opens "My tools" on one tool (or a part of it), and puts the cursor in a box there. */
function goToTool(selector, focusId) {
  showView("tools", selector);
  if (focusId) setTimeout(() => $(focusId)?.focus({ preventScroll: true }), 100);
}

/** For the tutorials: make sure the tool holding this element is the one shown. */
function revealTool(selector) {
  // something inside the Schedule's day page (e.g. "Add a to-do"): show the day, not the month calendar
  const el = document.querySelector(selector);
  if (el?.closest("#plDayView") && $("plDayView").hidden) { plannerView = "day"; renderPlanner(); }
  const tool = toolFor(selector);
  if (currentView !== "tools") showView("tools", tool ? selector : null);
  else if (tool && tool !== currentTool) showTool(tool);
}

// ---------- My tools: section icons and the shortcut bar ----------
const LEADING_ICON = /^\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍\p{Extended_Pictographic})*)\s*/u;

/** Section titles get their icon in a small tile (set as data-icon), so the text itself stays clean. */
function decorateText() {
  document.querySelectorAll("[data-strip-icon]").forEach((el) => { el.textContent = el.textContent.replace(LEADING_ICON, ""); });
  const titles = document.querySelectorAll("main.layout .card h2, .tracker-summary h3, .tcal h3, .page .card > h2, .page .card > .list-head > h2");
  titles.forEach((h) => {
    if (h.children.length) return; // titles with their own markup are left alone
    const m = h.textContent.match(LEADING_ICON);
    if (m) { h.dataset.icon = m[1]; h.textContent = h.textContent.slice(m[0].length); }
  });
  $("formTitle").dataset.icon = "📅";
  document.querySelector('#listCard h2').dataset.icon = "🔔";
}

/** Height of the bars stuck to the top of the screen (menu, and the shortcut bar in My tools). */
/** Settings → "Device Sync": shows (or hides) the Cloud option and everything the Cloud gives, right under it. */
function setDeviceSyncOpen(open) {
  $("setSupportWrap").hidden = !open;
  $("setSyncBtn").setAttribute("aria-expanded", String(open));
  $("setSyncBtn").classList.toggle("open", open);
}
function openDeviceSync() {
  if (currentView !== "settings") showView("settings");
  setDeviceSyncOpen(true);
  setTimeout(() => {
    scrollToSection($("setSyncBtn"), true);
    $("setSupport").classList.add("flash");
    setTimeout(() => $("setSupport").classList.remove("flash"), 1600);
  }, 50);
}

function topBarsHeight() {
  const demo = $("demoBanner"); // the demo's banner stays at the top too
  return $("appNav").offsetHeight + (currentView === "tools" ? $("toolsBar").offsetHeight : 0)
    + (demo && !demo.hidden && demo.offsetParent ? demo.offsetHeight : 0);
}

function scrollToSection(el, smooth = false) {
  const top = () => el.getBoundingClientRect().top + window.scrollY - topBarsHeight() - 12;
  const start = window.scrollY;
  window.scrollTo({ top: top(), behavior: smooth ? "smooth" : "auto" });
  // some browsers skip the smooth glide: then jump straight there
  if (smooth) setTimeout(() => {
    if (Math.abs(window.scrollY - start) < 2 && Math.abs(top() - start) > 2) window.scrollTo(0, top());
  }, 450);
}

/** Highlights the tool shown, in the shortcut bar (and keeps it in sight there). */
function spyTools() {
  const buttons = [...document.querySelectorAll("#toolsBar [data-jump]")];
  const active = buttons.find((b) => b.dataset.jump === currentTool);
  buttons.forEach((b) => {
    const on = b === active;
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  const bar = $("toolsBar");
  if (active && currentView === "tools") bar.scrollTo({ left: active.offsetLeft - bar.clientWidth / 2 + active.offsetWidth / 2, behavior: "smooth" });
}

/** "Become a Supporter" (Home card, Settings row): for everyone who isn't a Supporter yet — not in a phone app
 *  where the plan can't be bought here (outside the US, store payments not set up). */
function offerSupport() {
  const supporter = store.user && !store.local && !store.demo && typeof isActive === "function" && isActive(store.subscription);
  const canSell = !(typeof STORE_APP !== "undefined" && STORE_APP) || (typeof canPayHere === "function" && canPayHere());
  return !supporter && canSell;
}
document.addEventListener("click", (e) => {
  if ((e.target.closest("#homeSup") || e.target.closest('[data-more="support"]')) && typeof openSupport === "function") openSupport();
});

function renderView() {
  if (currentView === "dashboard") renderDashboard();
  else if (currentView === "activity") renderActivity();
  else if (currentView === "profile") renderProfile();
  else if (currentView === "settings") renderSettings();
  else if (currentView === "progress") renderProgress();
  else if (currentView === "toolhub") renderToolHub();
  else if (currentView === "more") renderMore();
}
function renderPages() { decorateText(); renderView(); }

// ---------- small helpers ----------
const startOfDay = (ts = Date.now()) => new Date(new Date(ts).setHours(0, 0, 0, 0)).getTime();
const weekStartTs = (ts = Date.now()) => new Date(`${weekDays(plKey(ts))[0]}T00:00`).getTime();
const longDate = (ts) => new Date(ts).toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const dayName = (d, style = "long") => new Date(2024, 0, 7 + d).toLocaleDateString(uiLocale(), { weekday: style }); // Jan 7 2024 = Sunday

/** Time tracked between two moments (finished sessions + a running timer). */
function trackedBetween(from, to) {
  let ms = tracker.log.filter((e) => e.start >= from && e.start < to).reduce((s, e) => s + e.ms, 0);
  const r = tracker.running;
  if (r && r.startedAt >= from && r.startedAt < to) ms += trackerElapsed();
  return ms;
}

function statCard({ icon, num, label, sub = "", subClass = "", go = "", bar = null }) {
  return `
    <button type="button" class="stat" ${go ? `data-goto="${go}"` : "disabled"}>
      <span class="stat-ic" data-ic="${icon}">${icon}</span>
      <span class="stat-body">
        <span class="stat-num">${esc(num)}</span>
        <span class="stat-label">${esc(label)}</span>
        ${bar != null ? `<span class="stat-bar"><span style="width:${Math.round(bar * 100)}%"></span></span>` : ""}
        ${sub ? `<span class="stat-sub ${subClass}">${esc(sub)}</span>` : ""}
      </span>
    </button>`;
}

// ---------- Dashboard ----------
function greetingKey() {
  const h = new Date().getHours();
  return h < 12 ? "goodMorning" : h < 18 ? "goodAfternoon" : "goodEvening";
}

/** The next things coming up: appointments, assignments, to-dos and events. */
function nextUpItems(max = 6) {
  const now = Date.now(), today = todayKey();
  const items = [];
  for (const a of appts) {
    const at = whenOf(a);
    if (at >= now) items.push({ at, icon: a.type === "Visit" ? "🏠" : "📅", title: a.title, sub: [typeLabel(a.type), contactById(a.contactId)?.name].filter(Boolean).join(" · "), go: "#listCard", timed: true });
  }
  for (const x of tasks) {
    if (x.done || !x.dueDate || x.dueDate < today) continue;
    items.push({ at: dueOf(x), icon: "📋", title: x.title, sub: [t("navTasksShort"), (x.assigneeId || x.assigneeOther) && taskWho(x)].filter(Boolean).join(" · "), go: ".tasks-card", timed: !!x.dueTime });
  }
  for (const x of todos) {
    if (x.done || !x.date || x.date < today) continue;
    const at = new Date(`${x.date}T${x.time || "23:59"}`).getTime();
    if (x.time && at < now) continue;
    items.push({ at, icon: "☑️", title: x.text, sub: t("qaTodo"), go: ".planner", timed: !!x.time });
  }
  for (const r of myReminders) {
    const at = nextReminderAt(r, now);
    if (at != null) items.push({ at, icon: "🔔", title: r.text, sub: [t("remTitle"), repeatLabel(r)].filter(Boolean).join(" · "), goRem: true, timed: true });
  }
  for (const ev of events) {
    const o = nextOccurrence(ev);
    if (!o) continue;
    const at = new Date(`${o.start}T${ev.time || "00:00"}`).getTime();
    items.push({ at: Math.max(at, startOfDay()), icon: EVENT_ICON[ev.kind] || EVENT_ICON.other, title: eventTitle(ev), sub: dateRangeText(ev, o), go: ".events-card", timed: false, event: true });
  }
  return items.sort((a, b) => a.at - b.at).slice(0, max);
}

function whenLabel(item) {
  const day = plKey(item.at);
  const dayText = day === todayKey() ? t("today") : day === addDays(todayKey(), 1) ? t("tomorrowWord")
    : new Date(item.at).toLocaleDateString(uiLocale(), { weekday: "short", month: "short", day: "numeric" });
  return item.timed ? `${dayText} · ${fmtTime(item.at)}` : dayText;
}

function renderDashboard() {
  renderWeatherCard();
  $("homeSup").hidden = !offerSupport();
  const name = myName();
  const first = (store.user?.name || "").trim().split(/\s+/)[0] || (name.includes("@") ? name.split("@")[0] : name);
  $("dashAvatar").innerHTML = avatarHtml(name, loadProfile().photo, "lg");
  $("dashGreeting").textContent = t(greetingKey(), { name: first });
  $("dashDate").textContent = longDate(Date.now());

  // numbers at the top
  const now = Date.now(), today = todayKey();
  const todays = appts.filter((a) => a.date === today).sort((a, b) => whenOf(a) - whenOf(b));
  const nextToday = todays.find((a) => whenOf(a) >= now);
  const wStart = weekStartTs();
  const thisWeek = trackedBetween(wStart, wStart + 7 * 864e5);
  const lastWeek = trackedBetween(wStart - 7 * 864e5, Math.min(wStart, now - 7 * 864e5 + 1)); // same part of last week
  const diff = thisWeek - lastWeek;
  const open = tasks.filter((x) => !x.done);
  const late = open.filter((x) => x.dueDate && dueOf(x) < now).length;
  const todayTodos = todos.filter((x) => x.date === today);
  const doneTodos = todayTodos.filter((x) => x.done).length;

  $("dashStats").innerHTML = [
    statCard({ icon: "📅", num: String(todays.length), label: t("stApptsToday"), go: "#listCard",
      sub: nextToday ? t("stNextAt", { time: fmtTime(whenOf(nextToday)) }) : todays.length ? t("stNoMoreToday") : "" }),
    statCard({ icon: "⏱️", num: fmtHM(thisWeek), label: t("stWeekTime"), go: ".tracker",
      sub: !thisWeek && !lastWeek ? "" : Math.abs(diff) < 60000 ? t("stSameAsLast") : t("stVsLast", { arrow: diff > 0 ? "▲" : "▼", time: fmtHM(Math.abs(diff)) }),
      subClass: diff > 0 ? "up" : diff < 0 ? "down" : "" }),
    statCard({ icon: "📋", num: String(open.length), label: t("stTasksOpen"), go: ".tasks-card",
      sub: late ? t("stLate", { n: late }) : open.length ? t("stAllOnTime") : "", subClass: late ? "down" : "up" }),
    statCard({ icon: "☑️", num: `${doneTodos}/${todayTodos.length}`, label: t("stTodosToday"), go: ".planner",
      bar: todayTodos.length ? doneTodos / todayTodos.length : 0 }),
  ].join("");

  // next up
  const next = nextUpItems();
  $("dashNext").innerHTML = next.length
    ? next.map((x) => `
        <li><button type="button" class="dash-item" ${x.goRem ? "data-open-rem" : `data-goto="${x.go}"`}>
          <span class="dash-ic"${String(x.icon).startsWith("<") ? "" : ` data-ic="${x.icon}"`}>${x.icon}</span>
          <span class="dash-main"><strong>${esc(x.title)}</strong>${x.sub ? `<span class="muted">${esc(x.sub)}</span>` : ""}</span>
          <span class="dash-when">${esc(x.event ? fmtCountdown(x.at - now) : whenLabel(x))}</span>
        </button></li>`).join("")
    : `<li class="muted dash-empty">${esc(t("dashNothingNext"))}</li>`;

  renderDashTracker();
  renderGoalBoxes();

  // this week, day by day
  const days = weekDays(today);
  const per = days.map((k) => sessionsOn(k).reduce((s, e) => s + e.ms, 0));
  const max = Math.max(...per, 1);
  $("dashWeekTotal").textContent = fmtHM(per.reduce((s, x) => s + x, 0));
  $("dashBars").innerHTML = days.map((k, i) => `
    <div class="dash-bar ${k === today ? "today" : ""}" title="${esc(fmtHM(per[i]))}">
      <span class="dash-bar-val">${per[i] ? esc(fmtHM(per[i])) : ""}</span>
      <span class="dash-bar-col"><span style="height:${per[i] ? Math.max(4, (per[i] / max) * 100) : 0}%"></span></span>
      <span class="dash-bar-day">${esc(dayName(new Date(`${k}T12:00`).getDay(), "short"))}</span>
    </div>`).join("");
}

function renderDashTracker() {
  const r = tracker.running;
  const todayMs = trackedBetween(startOfDay(), startOfDay() + 864e5);
  $("dashTracker").innerHTML = `
    <h2>${esc(t("trackerTitle"))}</h2>
    <p class="dash-trk-state ${r ? (r.pausedAt ? "paused" : "running") : ""}">
      ${esc(r ? t(r.pausedAt ? "dashTimerPaused" : "dashTimerRunning") : t("dashTimerIdle"))}${r ? ` · <strong>${esc(r.name)}</strong>` : ""}
    </p>
    <div class="dash-trk-clock" id="dashTrkClock">${fmtDuration(trackerElapsed())}</div>
    <p class="muted small-text">${esc(t("dashTodayTotal", { time: fmtHM(todayMs) }))}</p>
    <div class="actions">
      ${r ? `<button type="button" class="btn btn-ghost" data-trk="pause">${esc(t(r.pausedAt ? "resume" : "pause"))}</button>
             <button type="button" class="btn stop" data-trk="stop">${esc(t("stop"))}</button>`
          : `<button type="button" class="btn btn-primary" data-goto=".tracker" data-focus="trkName">▶ ${esc(t("dashStartTimer"))}</button>`}
    </div>`;
}

/** Called every second by the app's clock. */
function tickPages() {
  if (currentView === "dashboard" && tracker.running) {
    const el = $("dashTrkClock");
    if (el) el.textContent = fmtDuration(trackerElapsed());
  }
}

// ---------- Activity ----------
let actFilter = "all";
let actShown = 40;
const ACT_FILTERS = [["all", "actAll"], ["time", "actTime"], ["appt", "actAppts"], ["tasks", "actTasks"], ["events", "actEvents"], ["contacts", "actContacts"]];

/** Everything that has happened, newest first (built from the saved data; nothing extra is recorded). */
function activityItems() {
  const now = Date.now();
  const items = [];
  for (const s of tracker.log) {
    // when it was, and the note written for it (addresses in the note become GPS links)
    items.push({ at: s.end, kind: "time", icon: s.manual ? "✍️" : "⏱️", text: t("actTracked", { time: fmtHM(s.ms), name: s.name }),
      sub: `${fmtTime(s.start)} – ${fmtTime(s.end)}`, noteHtml: s.note ? linkifyAddresses(s.note) : "" });
  }
  for (const a of appts) {
    const at = whenOf(a);
    if (at <= now) items.push({ at, kind: "appt", icon: a.type === "Visit" ? "🏠" : "📅", text: `${typeLabel(a.type)}: ${a.title}`, sub: contactById(a.contactId)?.name || a.address || "" });
    for (const n of a.noteLog || []) items.push({ at: n.at, kind: "appt", icon: "📝", text: t("actNote", { title: a.title }), sub: n.text });
  }
  for (const x of tasks) {
    if (x.createdAt) items.push({ at: x.createdAt, kind: "tasks", icon: "📋", text: t("actTaskNew", { title: x.title }), sub: x.assigneeId || x.assigneeOther ? `👉 ${taskWho(x)}` : "" });
    if (x.done && x.doneAt) items.push({ at: x.doneAt, kind: "tasks", icon: "✅", text: t("actTaskDone", { title: x.title }), sub: "" });
  }
  for (const x of todos) {
    if (x.done && x.doneAt) items.push({ at: x.doneAt, kind: "tasks", icon: "☑️", text: t("actTodoDone", { title: x.text }), sub: "" });
  }
  for (const ev of events) {
    if (ev.createdAt) items.push({ at: ev.createdAt, kind: "events", icon: EVENT_ICON[ev.kind] || EVENT_ICON.other, text: t("actEvent", { title: eventTitle(ev) }), sub: "" });
  }
  for (const c of contacts) {
    if (c.createdAt) items.push({ at: c.createdAt, kind: "contacts", icon: "👤", text: t("actContact", { name: c.name }), sub: c.relation ? relLabel(c.relation) : "" });
  }
  return items.filter((i) => i.at && i.at <= now).sort((a, b) => b.at - a.at);
}

function dayHeading(ts) {
  const k = plKey(ts);
  if (k === todayKey()) return t("today");
  if (k === addDays(todayKey(), -1)) return t("actYesterday");
  return longDate(ts);
}

// ---------- Activity: one week at a time ----------
let wkOffset = 0; // 0 = this week, -1 = last week…

function renderWeek(all) {
  const thisWeek = todayKey();
  const days = weekDays(addDays(thisWeek, wkOffset * 7));
  const from = new Date(`${days[0]}T00:00`).getTime(), to = new Date(`${addDays(days[6], 1)}T00:00`).getTime();
  const inRange = (i) => i.at >= from && i.at < to;
  const fmt = (k, opts) => new Date(`${k}T12:00`).toLocaleDateString(uiLocale(), opts);
  $("wkRange").textContent = `${fmt(days[0], { month: "long", day: "numeric" })} – ${fmt(days[6], { month: "long", day: "numeric", year: "numeric" })}`;
  $("wkThis").classList.toggle("on", wkOffset === 0);
  $("wkNext").disabled = wkOffset >= 0;

  // totals for the week
  const week = all.filter(inRange);
  const count = (test) => week.filter(test).length;
  const isAppt = (i) => i.kind === "appt" && i.icon !== "📝";
  const sessions = days.flatMap((k) => sessionsOn(k));
  const weekMs = sessions.reduce((s, e) => s + e.ms, 0);
  $("actStats").innerHTML = [
    statCard({ icon: "⏱️", num: fmtHM(weekMs), label: t("wkTime") }),
    statCard({ icon: "📅", num: String(count(isAppt)), label: t("wkAppts") }),
    statCard({ icon: "✅", num: String(count((i) => i.icon === "✅")), label: t("wkTasks") }),
    statCard({ icon: "☑️", num: String(count((i) => i.icon === "☑️")), label: t("wkTodos") }),
  ].join("");

  // day by day: time bar, then what was done; tap a day to open it in the Time calendar
  const perDay = days.map((k) => sessionsOn(k).reduce((s, e) => s + e.ms, 0));
  const max = Math.max(...perDay, 1);
  $("wkDays").innerHTML = days.map((k, i) => {
    const dayItems = all.filter((x) => plKey(x.at) === k);
    const n = { appt: dayItems.filter(isAppt).length, task: dayItems.filter((x) => x.icon === "✅").length, todo: dayItems.filter((x) => x.icon === "☑️").length };
    const daySessions = sessionsOn(k);
    const notes = daySessions.filter((e) => e.note).length;
    const chips = [n.appt && `📅 ${n.appt}`, n.task && `✅ ${n.task}`, n.todo && `☑️ ${n.todo}`, notes && `📝 ${notes}`].filter(Boolean);
    // everything written in the Time calendar that day: when, what, how long, and the note
    const entries = daySessions.map((e) => `
        <li class="wk-entry ${e.running ? "running" : ""}">
          <div class="wk-entry-top">
            <span class="wk-entry-time">${fmtTime(e.start)} – ${e.running ? esc(t("now")) : fmtTime(e.end)}</span>
            <strong>${esc(e.name)}</strong>
            <span class="wk-entry-dur">${esc(fmtHM(e.ms))}</span>
            ${e.manual ? `<span title="${esc(t("teManual"))}">✍️</span>` : ""}
          </div>
          ${e.note ? `<div class="wk-entry-note">📝 ${linkifyAddresses(e.note)}</div>` : ""}
        </li>`).join("");
    return `
      <div class="wk-day-block ${k === thisWeek ? "today" : ""} ${k > thisWeek ? "future" : ""}">
        <button type="button" class="wk-day" data-wkday="${k}" title="${esc(t("wkOpenDay"))}">
          <span class="wk-name">${esc(fmt(k, { weekday: "short" }))} <b>${Number(k.slice(8))}</b></span>
          <span class="wk-bar"><span style="width:${perDay[i] ? Math.max(4, (perDay[i] / max) * 100) : 0}%"></span></span>
          <span class="wk-time">${perDay[i] ? esc(fmtHM(perDay[i])) : "—"}</span>
          <span class="wk-chips">${chips.map((c) => `<span>${esc(c)}</span>`).join("")}</span>
        </button>
        ${entries ? `<ul class="wk-entries">${entries}</ul>` : ""}
      </div>`;
  }).join("");

  // time per activity (purpose)
  const byName = {};
  for (const e of sessions) byName[e.name] = (byName[e.name] || 0) + e.ms;
  const rows = Object.entries(byName).sort((a, b) => b[1] - a[1]);
  const top = rows[0]?.[1] || 1;
  $("wkPurposes").innerHTML = rows.length
    ? rows.map(([name, ms]) => `
        <li><span class="name" title="${esc(name)}">${esc(name)}</span>
        <span class="bar"><span style="width:${Math.max(3, (ms / top) * 100)}%"></span></span>
        <span class="dur">${esc(fmtHM(ms))}</span></li>`).join("")
    : `<li class="muted">${esc(t("wkNoTime"))}</li>`;
}

/** Opens a day of the week in the Time calendar (where time can be added or changed). */
function openDayInCalendar(k) {
  const d = new Date(`${k}T12:00`);
  tcalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  tcalSelected = k;
  renderTimeCalendar();
  showView("tools", ".tcal");
}

function renderActivity() {
  const all = activityItems();
  renderWeek(all);

  $("actFilters").innerHTML = ACT_FILTERS.map(([key, label]) =>
    `<button type="button" class="chip ${actFilter === key ? "on" : ""}" data-filter="${key}">${esc(t(label))}</button>`).join("");

  const list = all.filter((i) => actFilter === "all" || i.kind === actFilter);
  const shown = list.slice(0, actShown);
  let html = "", lastDay = "";
  for (const i of shown) {
    const d = plKey(i.at);
    if (d !== lastDay) {
      if (lastDay) html += "</ul>";
      html += `<h3 class="act-day">${esc(dayHeading(i.at))}</h3><ul class="act-list">`;
      lastDay = d;
    }
    html += `
      <li class="act-item act-kind-${i.kind}">
        <span class="act-ic" data-ic="${i.icon}">${i.icon}</span>
        <span class="act-main"><span>${esc(i.text)}</span>${i.sub ? `<span class="muted">${esc(i.sub)}</span>` : ""}${i.noteHtml ? `<span class="act-note">📝 ${i.noteHtml}</span>` : ""}</span>
        <span class="act-time muted">${esc(fmtTime(i.at))}</span>
      </li>`;
  }
  if (lastDay) html += "</ul>";
  $("actFeed").innerHTML = html || `<p class="empty">${esc(t("actEmpty"))}</p>`;
  $("actMore").hidden = list.length <= actShown;
}

// ---------- Progress: how you're doing over time (week by week, or month by month) ----------
let prMode = "week"; // "week" or "month"

/** The last periods, oldest first: { from, to, label } (8 weeks or 6 months). */
function progressPeriods() {
  const out = [];
  if (prMode === "week") {
    const thisWeek = weekStartTs();
    for (let i = 7; i >= 0; i--) {
      const from = new Date(thisWeek); from.setDate(from.getDate() - i * 7);
      const to = new Date(from); to.setDate(to.getDate() + 7);
      out.push({ from: from.getTime(), to: to.getTime(), label: from.toLocaleDateString(uiLocale(), { month: "short", day: "numeric" }) });
    }
  } else {
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      out.push({ from: from.getTime(), to: to.getTime(), label: from.toLocaleDateString(uiLocale(), { month: "short" }) });
    }
  }
  return out;
}

/** Days in a row with something done (time tracked, an assignment or to-do finished, or an appointment held). */
function activityStreaks() {
  const now = Date.now();
  const days = new Set();
  for (const e of tracker.log) days.add(plKey(e.start));
  if (tracker.running) days.add(plKey(tracker.running.startedAt));
  for (const x of tasks) if (x.done && x.doneAt) days.add(plKey(x.doneAt));
  for (const x of todos) if (x.done && x.doneAt) days.add(plKey(x.doneAt));
  for (const a of appts) if (whenOf(a) <= now) days.add(a.date);
  // current: back from today (or from yesterday, if nothing yet today)
  let current = 0, k = todayKey();
  if (!days.has(k)) k = addDays(k, -1);
  while (days.has(k)) { current++; k = addDays(k, -1); }
  // best: the longest run ever
  let best = 0;
  for (const d of days) {
    if (days.has(addDays(d, -1))) continue; // only count from the first day of each run
    let run = 0, x = d;
    while (days.has(x)) { run++; x = addDays(x, 1); }
    best = Math.max(best, run);
  }
  return { current, best };
}

/** "▲ +2h vs last week" / "▼ −3 vs last month" / "Same as last week". */
function changeText(now, before, fmt) {
  const diff = now - before;
  const vsKey = prMode === "week" ? "prVsWeek" : "prVsMonth";
  if (Math.abs(diff) < (fmt === fmtHM ? 60000 : 1)) return { text: t(prMode === "week" ? "prSameWeek" : "prSameMonth"), cls: "" };
  return { text: t(vsKey, { change: `${diff > 0 ? "▲ +" : "▼ −"}${fmt(Math.abs(diff))}` }), cls: diff > 0 ? "up" : "down" };
}

function renderProgress() {
  renderGoalBoxes();
  document.querySelectorAll("[data-prmode]").forEach((b) => b.classList.toggle("on", b.dataset.prmode === prMode));
  const periods = progressPeriods();
  const now = Date.now();
  const inP = (ts, p) => ts >= p.from && ts < p.to;

  // the period before, cut at the same point (Wednesday vs last Wednesday), so the comparison is fair
  const curP = periods[periods.length - 1], prevP = periods[periods.length - 2];
  const prevSoFar = { from: prevP.from, to: Math.min(prevP.to, prevP.from + (now - curP.from)) };

  // time tracked, period by period
  const time = periods.map((p) => trackedBetween(p.from, p.to));
  const cur = time[time.length - 1], prev = trackedBetween(prevSoFar.from, prevSoFar.to);
  $("prTimeLabel").textContent = t(prMode === "week" ? "prTimeWeek" : "prTimeMonth");
  $("prTimeNum").textContent = fmtHM(cur);
  const ch = changeText(cur, prev, fmtHM);
  $("prTimeChange").textContent = ch.text;
  $("prTimeChange").className = `pr-change ${ch.cls}`;
  const max = Math.max(...time, 1);
  $("prChart").innerHTML = periods.map((p, i) => `
    <div class="pr-bar ${i === periods.length - 1 ? "now" : ""}" title="${esc(`${p.label}: ${fmtHM(time[i])}`)}">
      <span class="pr-bar-val">${time[i] ? esc(fmtHM(time[i])) : ""}</span>
      <span class="pr-bar-col"><span style="height:${time[i] ? Math.max(4, (time[i] / max) * 100) : 0}%"></span></span>
      <span class="pr-bar-label">${esc(p.label)}</span>
    </div>`).join("");

  // counts, period by period, each with a small trend
  const count = (list) => periods.map((p) => list.filter((ts) => inP(ts, p)).length);
  const make = (icon, label, list) => ({ icon, label, values: count(list), before: list.filter((ts) => inP(ts, prevSoFar)).length });
  const series = [
    make("✅", t("prTasks"), tasks.filter((x) => x.done && x.doneAt).map((x) => x.doneAt)),
    make("☑️", t("prTodos"), todos.filter((x) => x.done && x.doneAt).map((x) => x.doneAt)),
    make("📅", t("prAppts"), appts.map(whenOf).filter((ts) => ts <= now)),
  ];
  const streak = activityStreaks();
  $("prStats").innerHTML = series.map((s) => {
    const c = s.values[s.values.length - 1], b = s.before;
    const chg = changeText(c, b, String);
    const top = Math.max(...s.values, 1);
    return `
      <div class="pr-stat">
        <div class="pr-stat-top"><span class="stat-ic" data-ic="${s.icon}">${s.icon}</span><span class="pr-stat-num">${c}</span></div>
        <div class="stat-label">${esc(s.label)}</div>
        <div class="stat-sub ${chg.cls}">${esc(chg.text)}</div>
        <div class="pr-spark" aria-hidden="true">${s.values.map((v, i) => `<span class="${i === s.values.length - 1 ? "now" : ""}" style="height:${v ? Math.max(12, (v / top) * 100) : 4}%"></span>`).join("")}</div>
      </div>`;
  }).join("") + `
      <div class="pr-stat pr-streak">
        <div class="pr-stat-top"><span class="stat-ic" data-ic="🔥">🔥</span><span class="pr-stat-num">${streak.current}</span></div>
        <div class="stat-label">${esc(t("prStreak"))}</div>
        <div class="stat-sub">${esc(t("prBest", { n: streak.best }))}</div>
      </div>`;

  // what the time went to this period
  const p = periods[periods.length - 1];
  const byName = {};
  for (const e of tracker.log) if (inP(e.start, p)) byName[e.name] = (byName[e.name] || 0) + e.ms;
  if (tracker.running && inP(tracker.running.startedAt, p)) byName[tracker.running.name] = (byName[tracker.running.name] || 0) + trackerElapsed();
  const rows = Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topMs = rows[0]?.[1] || 1;
  $("prTop").innerHTML = rows.length
    ? rows.map(([name, ms]) => `
        <li><span class="name" title="${esc(name)}">${esc(name)}</span>
        <span class="bar"><span style="width:${Math.max(3, (ms / topMs) * 100)}%"></span></span>
        <span class="dur">${esc(fmtHM(ms))}</span></li>`).join("")
    : `<li class="muted">${esc(t(prMode === "week" ? "prNoTimeWeek" : "prNoTimeMonth"))}</li>`;
}

// ---------- Profile ----------
function subscriptionText() {
  const sub = store.subscription;
  const date = (iso) => new Date(iso).toLocaleDateString(uiLocale(), { year: "numeric", month: "long", day: "numeric" });
  if (isActive(sub)) {
    if (sub.status === "past_due") return { text: t("subPastDue"), kind: "err" };
    if (sub.cancel_at_period_end && sub.current_period_end) return { text: t("subEnding", { date: date(sub.current_period_end) }), kind: "warn" };
    if (sub.status === "trialing" && sub.current_period_end) return { text: t("subTrialing", { date: date(sub.current_period_end) }), kind: "ok" };
    return { text: sub.current_period_end ? t("subActive", { date: date(sub.current_period_end) }) : t("subActiveShort"), kind: "ok" };
  }
  if (inFreeWeek()) {
    const n = Math.max(1, Math.ceil((freeWeekEnds() - Date.now()) / 864e5));
    return { text: t("subFreeWeek", { n }), kind: "ok" };
  }
  return { text: t("subNone"), kind: "warn" };
}

function renderProfile() {
  $("profAvatar").innerHTML = avatarHtml(myName(), loadProfile().photo, "xl");
  $("profName").textContent = store.user?.name || store.user?.email || "";
  const pp = loadProfile();
  $("profContact").innerHTML = [pp.phone && `📞 ${esc(pp.phone)}`, pp.contactEmail && pp.contactEmail !== store.user?.email && `✉️ ${esc(pp.contactEmail)}`]
    .filter(Boolean).join(" &nbsp;·&nbsp; ");
  $("profContact").hidden = !$("profContact").innerHTML;
  const since = store.user?.createdAt;
  $("profSince").textContent = store.local ? t("localOnly") : since && !store.demo ? t("memberSince", { date: new Date(since).toLocaleDateString(uiLocale(), { year: "numeric", month: "long", day: "numeric" }) }) : "";
  for (const id of ["profSubCard", "profSecCard", "profDangerCard", "profCountryCard"]) $(id).hidden = !!store.demo || (store.local && id !== "profCountryCard");
  if (!store.demo && document.activeElement !== $("profCountry")) fillCountrySelect($("profCountry"), myCountry());
  renderPubProfile();
  if (!store.demo && !store.local) {
    const s = subscriptionText();
    $("profSubText").textContent = s.text;
    $("profSubText").className = `sub-state ${s.kind}`;
  }
}

function openNameForm() {
  $("profNameInput").value = store.user?.name || "";
  $("nameMsg").textContent = "";
  $("nameForm").hidden = false;
  $("profEditName").hidden = true;
  $("profNameInput").focus();
}
function closeNameForm() {
  $("nameForm").hidden = true;
  $("profEditName").hidden = false;
}
async function saveName(e) {
  e.preventDefault();
  const name = $("profNameInput").value.trim().slice(0, 60);
  if (!name) return;
  $("nameMsg").textContent = t("working");
  $("nameMsg").className = "addr-msg";
  try {
    if (!store.demo && !store.local) {
      const { error } = await sb.auth.updateUser({ data: { name } });
      if (error) throw error;
    }
    store.user.name = name;
    if (!store.demo) saveCache(); // this device remembers the new name too
    closeNameForm();
    renderProfileAvatar();
    renderView();
  } catch (err) {
    $("nameMsg").textContent = friendlyError(err);
    $("nameMsg").className = "addr-msg err";
  }
}

// ---------- Settings ----------
/** The ☁️ Cloud card at the top of Settings: where the data is, and what to tap. */
function renderCloudCard() {
  // the phone apps show "sign in" only where they can't sell the plan (outside the US, store payments not set up)
  const storeApp = typeof STORE_APP !== "undefined" && STORE_APP && !(typeof canPayHere === "function" && canPayHere());
  const btn = $("setCloudBtn");
  btn.hidden = false;
  if (store.demo) {
    $("setCloudState").textContent = t("cloudDemoState");
    btn.textContent = t(storeApp ? "cloudSignIn" : "cloudCreate");
    btn.onclick = () => openSupport(); // the Supporter popup first (store apps: no prices, only "sign in")
  } else if (store.local) {
    $("setCloudState").textContent = t("cloudLocalState");
    btn.textContent = t(storeApp ? "cloudSignIn" : "cloudTurnOn");
    btn.onclick = () => openSupport();
  } else {
    const s = subscriptionText();
    $("setCloudState").textContent = `${s.text} · ${$("syncStatus").textContent}`;
    btn.textContent = t("manageSub");
    btn.onclick = () => manageSubscription();
    btn.hidden = storeApp && !["app_store", "play_store"].includes(store.subscription?.store); // bought in a store: managed there
  }
}

/** Under the colors, when they're locked: what they come with, and the same button as the Cloud card. */
function paintAccentLock(flash = false) {
  const locked = !accentUnlocked();
  const storeApp = typeof STORE_APP !== "undefined" && STORE_APP && !(typeof canPayHere === "function" && canPayHere());
  $("setAccentLock").hidden = !locked;
  if (!locked) return;
  $("setAccentLockText").textContent = t(storeApp ? "accentLockedStore" : typeof payMode === "function" && payMode() === "store" ? "accentLockedPay" : "accentLocked");
  $("setAccentLockBtn").textContent = $("setCloudBtn").textContent;
  $("setAccentLockBtn").hidden = $("setCloudBtn").hidden;
  if (flash) { $("setAccentLock").classList.remove("flash"); void $("setAccentLock").offsetWidth; $("setAccentLock").classList.add("flash"); }
}

function renderSettings() {
  $("setSupRow").hidden = !offerSupport(); // ⭐ Become a Supporter, right under Terms of Service
  if (typeof paintLockSettings === "function") paintLockSettings(); // Security → App lock
  renderCloudCard();
  $("setSupport").classList.toggle("unlocked", accentUnlocked()); // ✓ (you have it) or 🔒 (comes with the Cloud)
  paintAccentLock();
  const s = loadSettings();
  $("setLang").value = lang;
  $("setTheme").value = DailyTheme.pref();
  const autoDay = (() => {
    try {
      const info = new Intl.Locale(navigator.language || uiLocale());
      const w = info.getWeekInfo?.() || info.weekInfo;
      return w?.firstDay ? w.firstDay % 7 : 1;
    } catch { return 1; }
  })();
  $("setWeekStart").innerHTML = [
    `<option value="auto">${esc(t("setAuto", { day: dayName(autoDay) }))}</option>`,
    ...[0, 1, 6].map((d) => `<option value="${d}">${esc(dayName(d))}</option>`),
  ].join("");
  $("setWeekStart").value = String(s.weekStart);
  $("setWeather").checked = wxOn();
  $("setRemDay").checked = s.rem.dayBefore;
  $("setRemHour").checked = s.rem.hourBefore;
  $("setRemAt").checked = s.rem.atTime;
  $("setAlarmsState").textContent = t(started ? "setAlarmsOn" : "setAlarmsOff");
  $("setAlarmsBtn").textContent = t(started ? "setTurnOff" : "setTurnOn");
  $("setAlarmsBtn").className = `btn ${started ? "btn-ghost" : "btn-primary"}`;
  $("setSyncRow").hidden = !!(store.demo || store.local);
  $("setSyncState").textContent = $("syncStatus").textContent;
  $("setVersion").textContent = t("setVersion", { v: APP_VERSION });
}

function settingsChanged() {
  const s = loadSettings();
  s.weekStart = $("setWeekStart").value === "auto" ? "auto" : Number($("setWeekStart").value);
  s.rem = { dayBefore: $("setRemDay").checked, hourBefore: $("setRemHour").checked, atTime: $("setRemAt").checked };
  saveSettings(s);
  applyDefaultReminders();
  renderPlanner();          // the week may now start on another day
  renderTimeCalendar();
}

/** Downloads everything in this account as a file the person keeps (readable, so keep it safe). */
function exportData() {
  const data = {};
  for (const [k, v] of Object.entries(store._data)) {
    let value = v;
    try { value = JSON.parse(v); } catch {}
    data[k.replace(/^dailytime\./, "")] = value;
  }
  const file = { app: "MyServiceTime", exportedAt: new Date().toISOString(), account: { email: store.user?.email || "", name: store.user?.name || "" }, data };
  const json = JSON.stringify(file, null, 2);
  const name = `myservicetime-${todayKey()}.json`;
  const FS = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.Filesystem;
  const SH = FS && window.Capacitor.Plugins?.Share;
  if (FS && SH) { // store app: save the file, then let the person send it where they want (Drive, email, Files…)
    FS.writeFile({ path: name, data: json, directory: "CACHE", encoding: "utf8" })
      .then(({ uri }) => SH.share({ title: name, url: uri }))
      .catch(() => {});
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `myservicetime-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** "Import data": puts back the data from a file made with "Download a copy" (after asking). */
async function importData(file) {
  if (!file) return;
  let parsed;
  try { parsed = JSON.parse(await file.text()); } catch { parsed = null; }
  if (!parsed || parsed.app !== "MyServiceTime" || typeof parsed.data !== "object") { alert(t("importBad")); return; }
  if (!confirm(t("importAsk"))) return;
  for (const [k, v] of Object.entries(parsed.data)) {
    store.setItem(`dailytime.${k}`, typeof v === "string" ? v : JSON.stringify(v));
  }
  await store._cacheWrites;
  alert(t("importDone"));
  location.reload(); // the app opens again with the imported data
}

// ---------- ☰ side menu ----------
function renderDrawer() {
  $("drawerAvatar").innerHTML = avatarHtml(myName(), loadProfile().photo, "md");
  $("drawerName").textContent = store.user?.name || store.user?.email || "";
  document.querySelectorAll("#drawer [data-dview]").forEach((b) => b.classList.toggle("on",
    (b.dataset.dview === currentView || (currentView === "tools" && b.dataset.dview === "toolhub")) && !b.classList.contains("drawer-user")));
  document.querySelectorAll("#drawer [data-djump]").forEach((b) => b.classList.toggle("on", currentView === "tools" && b.dataset.djump === currentTool));
  paintThemeControls();
}

// Big screens: the menu is a list that stays on the left; ☰ hides it or brings it back (remembered).
const SIDE_KEY = "dailytime.sideOff";
const bigScreen = () => matchMedia("(min-width: 700px)").matches;
function paintSide() {
  const off = localStorage.getItem(SIDE_KEY) === "1";
  document.body.classList.toggle("side-off", off);
  if (bigScreen()) $("menuBtn").setAttribute("aria-expanded", String(!off));
}

function openDrawer() {
  if (bigScreen()) {
    localStorage.setItem(SIDE_KEY, document.body.classList.contains("side-off") ? "0" : "1");
    paintSide();
    renderDrawer();
    return;
  }
  renderDrawer();
  const d = $("drawer");
  d.hidden = false;
  requestAnimationFrame(() => d.classList.add("open"));
  setTimeout(() => d.classList.add("open"), 30); // (in case the frame is skipped)
  $("menuBtn").setAttribute("aria-expanded", "true");
  $("drawerPanel").focus({ preventScroll: true });
}
function closeDrawer() {
  const d = $("drawer");
  if (d.hidden) return;
  d.classList.remove("open");
  $("menuBtn").setAttribute("aria-expanded", "false");
  setTimeout(() => { if (!d.classList.contains("open")) d.hidden = true; }, 220);
}

/** Keeps the ☰ menu switch and the Settings choice in step with the light / dark look. */
/** Accent colors come with the Cloud (an active plan or the free Cloud week). Free use, the demo and
 *  "this device only" keep the default purple. */
function accentUnlocked() {
  if (typeof store === "undefined" || !store.user || store.demo || store.local) return false;
  return (typeof isActive === "function" && isActive(store.subscription)) || (typeof inFreeWeek === "function" && inFreeWeek());
}

function paintThemeControls() {
  const dark = DailyTheme.isDark();
  const lookUnlocked = accentUnlocked(); // Supporter extras
  document.querySelectorAll("[data-look]").forEach((box) => box.querySelectorAll("[data-v]").forEach((b) => {
    const on = b.dataset.v === DailyTheme.look(box.dataset.look);
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(on));
    // Text size comes with the Cloud: only "Normal" without it
    b.classList.toggle("lock", !lookUnlocked && b.dataset.v !== DailyTheme.looks[box.dataset.look][0]); // Supporter extras
  }));
  const tsLock = $("lkTextLock");
  if (tsLock) tsLock.hidden = lookUnlocked;
  const unlocked = accentUnlocked();
  if (!unlocked && DailyTheme.accent() !== "purple") DailyTheme.setAccent("purple"); // the Cloud ended: back to purple
  if (!unlocked && DailyTheme.icons() !== "line") DailyTheme.setIcons("line");       // …and back to the outline icons
  // …and the extra Appearance choices back to their first (normal) one
  if (!unlocked) for (const [k, vals] of Object.entries(DailyTheme.looks)) if (DailyTheme.look(k) !== vals[0]) DailyTheme.setLook(k, vals[0]);
  document.querySelectorAll("#setIconPick [data-icon-pick]").forEach((b) => {
    const on = b.dataset.iconPick === DailyTheme.icons();
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(on));
    b.classList.toggle("lock", !unlocked && b.dataset.iconPick === "color");
  });
  document.querySelectorAll("#setThemePick [data-theme-pick]").forEach((b) => {
    const on = b.dataset.themePick === DailyTheme.pref();
    b.classList.toggle("on", on);
    b.setAttribute("aria-checked", String(on));
  });
  const box = $("setAccentPick");
  if (box) {
    if (!box.children.length) box.innerHTML = DailyTheme.accents.map((a) =>
      `<button type="button" data-accent-pick="${a}" role="radio" aria-label="${esc(t(`accent_${a}`))}" title="${esc(t(`accent_${a}`))}"></button>`).join("");
    box.classList.toggle("locked", !unlocked);
    box.querySelectorAll("[data-accent-pick]").forEach((b) => {
      const on = b.dataset.accentPick === DailyTheme.accent();
      b.classList.toggle("on", on);
      b.classList.toggle("lock", !unlocked && b.dataset.accentPick !== "purple");
      b.setAttribute("aria-checked", String(on));
      b.title = b.ariaLabel = t(`accent_${b.dataset.accentPick}`);
    });
  }
  $("drawerThemeSwitch").classList.toggle("on", dark);
  $("drawerTheme").setAttribute("aria-checked", String(dark));
  $("moreThemeSwitch")?.classList.toggle("on", dark);
  $("moreTheme")?.setAttribute("aria-checked", String(dark));
  if ($("setTheme")) $("setTheme").value = DailyTheme.pref();
}

function initDrawer() {
  document.addEventListener("themechange", paintThemeControls);
  $("setTheme").addEventListener("change", () => DailyTheme.set($("setTheme").value));
  $("setThemePick").addEventListener("click", (e) => { const b = e.target.closest("[data-theme-pick]"); if (b) DailyTheme.set(b.dataset.themePick); });
  // Text size, spacing, corners, font, bold text, animations
  document.querySelectorAll("[data-look]").forEach((box) => box.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    if (b.classList.contains("lock")) return openSupport(); // Supporter extras
    DailyTheme.setLook(box.dataset.look, b.dataset.v);
    paintThemeControls();
  }));
  $("setAccentPick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-accent-pick]");
    if (!b) return;
    if (!accentUnlocked() && b.dataset.accentPick !== "purple") { paintAccentLock(true); return; } // comes with the Cloud
    DailyTheme.setAccent(b.dataset.accentPick);
  });
  $("setAccentLockBtn").addEventListener("click", () => $("setCloudBtn").click()); // same as the Cloud card's button
  $("setIconPick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-icon-pick]");
    if (!b) return;
    if (!accentUnlocked() && b.dataset.iconPick === "color") { paintAccentLock(true); return; } // comes with the Cloud
    DailyTheme.setIcons(b.dataset.iconPick);
  });
  paintThemeControls();
  $("menuBtn").addEventListener("click", openDrawer);
  paintSide();
  $("drawer").addEventListener("click", (e) => {
    if (e.target.closest("[data-close-drawer]")) return closeDrawer();
    if (e.target.closest('[data-daction="theme"]')) return DailyTheme.toggle(); // the menu stays open, to see the change
    const view = e.target.closest("[data-dview]");
    const jump = e.target.closest("[data-djump]");
    const action = e.target.closest("[data-daction]");
    if (!view && !jump && !action) return;
    closeDrawer();
    if (view) showView(view.dataset.dview);
    else if (jump) goToTool(jump.dataset.djump);
    else if (action.dataset.daction === "reminders") openMyReminders();
    else if (action.dataset.daction === "help") openHelp();
    else if (action.dataset.daction === "feedback") openFeedback();
    else if (action.dataset.daction === "cloud") goCloud();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("drawer").hidden) closeDrawer(); });
}

// ---------- start ----------
function initPages() {
  initDrawer();
  // menu buttons (and anything else marked data-view, like the picture at the top right)
  document.addEventListener("click", (e) => {
    const v = e.target.closest("[data-view]");
    if (v) { showView(v.dataset.view); return; }
    const g = e.target.closest("[data-goto]");
    if (g && !g.disabled) goToTool(g.dataset.goto, g.dataset.focus);
  });

  // My tools: shortcut bar
  $("toolsBar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-jump]");
    if (!b) return;
    showTool(b.dataset.jump);
    window.scrollTo(0, 0);
  });
  const setNavHeight = () => document.documentElement.style.setProperty("--nav-h", `${$("appNav").offsetHeight}px`);
  window.addEventListener("resize", setNavHeight);
  setNavHeight();

  // a reminder in "Next up" opens the Reminders window
  $("dashNext").addEventListener("click", (e) => { if (e.target.closest("[data-open-rem]")) openMyReminders(); });

  // dashboard
  document.querySelector(".dash-quick").addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]");
    if (!b) return;
    const go = b.dataset.go;
    if (go === "appt") { resetForm(); openApptForm(); }
    else if (go === "task") openTaskForm();
    else if (go === "event") openEventForm();
    else if (go === "todo") { plannerView = "day"; plannerDate = todayKey(); renderPlanner(); goToTool(".planner", "plText"); }
    else if (go === "contact") openContactForm();
    else if (go === "note") goToTool(".quicknotes", "quickNotes");
    else if (go === "sync") openDeviceSync(); // Settings → Device Sync, opened
  });
  $("dashTracker").addEventListener("click", (e) => {
    const b = e.target.closest("[data-trk]");
    if (b) $(b.dataset.trk === "pause" ? "trkPause" : "trkStop").click();
  });

  // activity
  $("actFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (!b) return;
    actFilter = b.dataset.filter;
    actShown = 40;
    renderActivity();
  });
  $("actMore").addEventListener("click", () => { actShown += 40; renderActivity(); });
  document.querySelectorAll("[data-prmode]").forEach((b) => b.addEventListener("click", () => { prMode = b.dataset.prmode; renderProgress(); }));
  $("wkPrev").addEventListener("click", () => { wkOffset--; renderActivity(); });
  $("wkNext").addEventListener("click", () => { if (wkOffset < 0) wkOffset++; renderActivity(); });
  $("wkThis").addEventListener("click", () => { wkOffset = 0; renderActivity(); });
  $("wkDays").addEventListener("click", (e) => {
    const d = e.target.closest("[data-wkday]");
    if (d) openDayInCalendar(d.dataset.wkday);
  });

  // profile
  $("profAvatar").addEventListener("click", editMyPhoto);
  $("profEditName").addEventListener("click", () => openAboutModal(false)); // name, picture, phone, email
  $("acctOut").addEventListener("click", () => { if (store.demo) leaveDemo(""); }); // real accounts: auth.js signs out
  $("nameCancel").addEventListener("click", closeNameForm);
  $("nameForm").addEventListener("submit", saveName);

  // settings
  $("setLang").innerHTML = Object.entries(LANGS).map(([code, l]) => `<option value="${code}">${l.name}</option>`).join("");
  $("setLang").addEventListener("change", () => {
    setLang($("setLang").value, () => {
      $("langSel").value = lang;
      refreshText();
    });
  });
  for (const id of ["setWeekStart", "setRemDay", "setRemHour", "setRemAt"]) $(id).addEventListener("change", settingsChanged);
  $("setAlarmsBtn").addEventListener("click", () => setRemindersOn(!started));
  // "Test notification": asks for permission if needed, then sends one to this device
  $("setTestSound").addEventListener("click", async () => {
    const note = { title: t("testNotifTitle"), text: t("testNotifText"), tag: `mst-test-${Date.now()}` };
    if (NativeNotify.available) {
      if (await NativeNotify.enable()) NativeNotify.showNow(note);
      return;
    }
    if ("Notification" in window && Notification.permission === "default") { try { await Notification.requestPermission(); } catch {} }
    playReminderTone();
    if (!showWebNotification(note)) showToast(t("notifyDenied"), 9000);
  });
  $("setSyncNow").addEventListener("click", () => {
    scheduleSync(0);
    setTimeout(renderSettings, 1500);
  });
  $("setExport").addEventListener("click", exportData);
  $("setImportFile").addEventListener("change", (e) => { importData(e.target.files[0]); e.target.value = ""; });

  // when anything is saved (here or in a pop-up window), the open page shows it right away
  let timer = null;
  const changed = () => { clearTimeout(timer); timer = setTimeout(renderView, 60); };
  const set = store.setItem.bind(store), remove = store.removeItem.bind(store);
  store.setItem = (k, v) => { set(k, v); changed(); };
  store.removeItem = (k) => { remove(k); changed(); };

  applyDefaultReminders();
  showView(sessionStorage.getItem(VIEW_KEY) || "dashboard");
}

