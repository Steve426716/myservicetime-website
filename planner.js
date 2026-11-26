// MyServiceTime — Planner: to-do lists by day and week, together with appointments and assignments.
// Loaded before app.js (functions only). app.js calls initPlanner(), renderPlanner(),
// todoReminderPoints() and checkTodoReminders(). Stored in the person's private, encrypted data.

const TODOS_KEY = "dailytime.todos";

let todos = (() => {
  try { return JSON.parse(store.getItem(TODOS_KEY)) || []; }
  catch { return []; }
})();
const saveTodos = () => {
  store.setItem(TODOS_KEY, JSON.stringify(todos));
  uploadReminderTimes(); // to-dos with a time also alert when the app is closed
};
const todoById = (id) => todos.find((x) => x.id === id);

// (this file loads before app.js, so it has its own small date helper)
const plKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
let plannerView = "month";            // "month" (shown first), "day" or "week"
let plannerDate = plKey(Date.now());  // the day being looked at (YYYY-MM-DD)

const addDays = (key, n) => {
  const d = new Date(`${key}T12:00`);
  d.setDate(d.getDate() + n);
  return plKey(d.getTime());
};
const todayKey = () => plKey(Date.now());

/** First day of the week for the person's language/country (Monday for most, Sunday e.g. in the US). */
function weekStartsOn() {
  const chosen = typeof loadSettings === "function" ? loadSettings().weekStart : "auto"; // Settings → "Week starts on"
  if (chosen !== "auto" && chosen != null) return Number(chosen) % 7;
  try {
    const loc = new Intl.Locale(navigator.language || uiLocale());
    const info = loc.getWeekInfo?.() || loc.weekInfo;
    if (info?.firstDay) return info.firstDay % 7; // 7 = Sunday → 0
  } catch {}
  return 1;
}
function weekDays(key) {
  const d = new Date(`${key}T12:00`);
  const back = (d.getDay() - weekStartsOn() + 7) % 7;
  const start = addDays(key, -back);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---------- reminders ----------
function todoReminderPoints(todo) {
  if (todo.done || !todo.date || !todo.time) return [];
  const at = new Date(`${todo.date}T${todo.time}`).getTime();
  const pts = [{ key: "atTime", at, until: at + 30 * 60000, label: "alarmTodo" }];
  if (todo.snoozeUntil) pts.push({ key: `snooze-${todo.snoozeUntil}`, at: todo.snoozeUntil, until: todo.snoozeUntil + 60 * 60000, label: "alarmSnoozed" });
  return pts;
}
function checkTodoReminders(now) {
  let changed = false;
  for (const todo of todos) {
    todo.fired = todo.fired || {};
    for (const p of todoReminderPoints(todo)) {
      if (todo.fired[p.key]) continue;
      if (now >= p.at && now < p.until) {
        todo.fired[p.key] = true;
        changed = true;
        pushAlarm({ id: `todo-${todo.id}`, title: `${t(p.label)}: ${todo.text}`, text: `${fmtDate(p.at)} ${fmtTime(p.at)}`, tag: `todo-${todo.id}-${p.key}` });
      } else if (now >= p.until) {
        todo.fired[p.key] = true;
        changed = true;
      }
    }
  }
  if (changed) store.setItem(TODOS_KEY, JSON.stringify(todos));
}

// ---------- what's on a given day ----------
/** Everything planned for a day, in time order: appointments, assignments due, and to-dos. */
function itemsForDay(key) {
  const items = [];
  for (const a of appts) {
    if (a.date !== key) continue;
    items.push({ kind: "appt", time: a.time, title: a.title, done: whenOf(a) < Date.now(), sub: typeLabel(a.type), obj: a });
  }
  for (const x of tasks) {
    if (x.dueDate !== key) continue;
    items.push({ kind: "task", time: x.dueTime || "", title: x.title, done: x.done, sub: t("assignments").replace(/^\S+\s/, ""), obj: x });
  }
  for (const td of todos) {
    if (td.date !== key) continue;
    items.push({ kind: "todo", time: td.time || "", title: td.text, done: td.done, obj: td });
  }
  // events (Memorial, Assembly, Convention, CO visit…) on each of their days
  for (const { ev, o, dayNum, totalDays } of eventsOnDay(key)) {
    items.push({
      kind: "event", icon: EVENT_ICON[ev.kind], time: key === o.start ? ev.time || "" : "", title: eventTitle(ev),
      done: false, sub: dayNum ? t("dayOfDays", { n: dayNum, total: totalDays }) : t(`ev_${ev.kind}`), obj: ev,
    });
  }
  // finished Time Tracker sessions, on the day they started
  for (const e of tracker.log) {
    if (plKey(e.start) !== key) continue;
    const d = new Date(e.start);
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    items.push({ kind: "time", time, title: e.name, done: false, sub: fmtHM(e.ms) + (e.note ? ` · 📝 ${e.note}` : ""), obj: e });
  }
  // timed items first (by time), then the rest in the order they were added
  return items.sort((p, q) => (p.time ? 0 : 1) - (q.time ? 0 : 1) || p.time.localeCompare(q.time));
}

const fmtHour = (key, time) => (time ? fmtTime(new Date(`${key}T${time}`).getTime()) : "");
const kindIcon = { appt: "📅", task: "✅", todo: "", time: "⏱" };
let plHighlight = null; // a session just finished in the Time Tracker

function itemHtml(item, key, { compact = false } = {}) {
  const time = fmtHour(key, item.time);
  if (item.kind === "todo") {
    const td = item.obj;
    return `
      <li class="pl-item todo ${td.done ? "done" : ""}" data-todo="${td.id}">
        <button class="task-check small" data-pact="toggle" aria-pressed="${td.done}" title="${esc(t(td.done ? "markUndone" : "markDone"))}">${td.done ? "✓" : ""}</button>
        ${time ? `<span class="pl-time">${time}</span>` : ""}
        <span class="pl-text" data-pact="edit" title="${esc(t("editTodo"))}">${linkifyAddresses(td.text)}</span>
        ${compact ? "" : `
          <span class="pl-actions">
            ${!td.done ? `<button class="pl-btn" data-pact="tomorrow" title="${esc(t("moveTomorrow"))}">${esc(t("moveTomorrow"))}</button>` : ""}
            <button class="pl-btn del" data-pact="delete" title="${esc(t("delete"))}">✕</button>
          </span>`}
      </li>`;
  }
  const flash = item.kind === "time" && item.obj.id === plHighlight ? "flash" : "";
  return `
    <li class="pl-item ${item.kind} ${item.done ? "done" : ""} ${flash}">
      <span class="pl-kind">${item.icon || kindIcon[item.kind]}</span>
      ${time ? `<span class="pl-time">${time}</span>` : ""}
      <span class="pl-text">${esc(item.title)}${!compact && item.sub ? ` <span class="pl-sub">· ${esc(item.sub)}</span>` : ""}</span>
    </li>`;
}

// ---------- drawing ----------
function renderPlanner() {
  const today = todayKey();
  $("plMonth").classList.toggle("on", plannerView === "month");
  $("plDay").classList.toggle("on", plannerView === "day");
  $("plWeek").classList.toggle("on", plannerView === "week");
  const month = plannerView === "month";
  $("plMonthView").hidden = !month;
  $("plDayView").hidden = !(month || plannerView === "day"); // Month also shows the chosen day, with the calendar still open
  $("plWeekView").hidden = plannerView !== "week";
  $("plSplit").classList.toggle("split", month);
  $("plDayHead").hidden = !month;

  $("plPick").hidden = !month;
  $("plTitle").hidden = month; // the month calendar shows the month and year boxes instead
  if (month) renderMonth(today);
  if (month || plannerView === "day") {
    if (document.activeElement !== $("plDate")) $("plDate").value = plannerDate; // the form adds to the day shown
    paintAmPm();
    const d = new Date(`${plannerDate}T12:00`);
    const rel = plannerDate === today ? t("today") : plannerDate === addDays(today, 1) ? t("tomorrow") : "";
    $(month ? "plDayHead" : "plTitle").textContent = (rel ? `${rel} · ` : "") + d.toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" });
    paintDayWeather(month ? "plDayHead" : "plTitle", plannerDate); // that day's forecast, when the weather is on

    const items = itemsForDay(plannerDate);
    const doable = items.filter((i) => i.kind === "task" || i.kind === "todo"); // things to tick off
    const done = doable.filter((i) => i.done).length;
    $("plProgress").hidden = !doable.length;
    $("plProgressText").textContent = t("doneOfTotal", { done, total: doable.length });
    $("plProgressBar").style.width = doable.length ? `${(done / doable.length) * 100}%` : "0";

    $("plList").innerHTML = items.map((i) => itemHtml(i, plannerDate)).join("");
    $("plEmpty").hidden = items.length > 0;

    // unfinished to-dos from earlier days (only offered when looking at today)
    const late = plannerDate === today ? todos.filter((x) => !x.done && x.date && x.date < today) : [];
    $("plLate").hidden = !late.length;
    $("plLateText").textContent = t("unfinishedEarlier", { n: late.length });

    // "Anytime" to-dos (no date)
    const anytime = todos.filter((x) => !x.date && !x.done);
    $("plAnytimeList").innerHTML = anytime.map((x) => `
      <li class="pl-item todo" data-todo="${x.id}">
        <button class="task-check small" data-pact="toggle" aria-pressed="false" title="${esc(t("markDone"))}"></button>
        <span class="pl-text" data-pact="edit" title="${esc(t("editTodo"))}">${linkifyAddresses(x.text)}</span>
        <span class="pl-actions">
          <button class="pl-btn" data-pact="plan">${esc(t("planForDay"))}</button>
          <button class="pl-btn del" data-pact="delete" title="${esc(t("delete"))}">✕</button>
        </span>
      </li>`).join("");
    $("plAnytimeEmpty").hidden = anytime.length > 0;
  }
  if (plannerView === "week") {
    const days = weekDays(plannerDate);
    const first = new Date(`${days[0]}T12:00`), last = new Date(`${days[6]}T12:00`);
    const fmt = (d) => d.toLocaleDateString(uiLocale(), { month: "short", day: "numeric" });
    $("plTitle").textContent = `${fmt(first)} – ${fmt(last)}`;
    $("plWeekGrid").innerHTML = days.map((key) => {
      const items = itemsForDay(key);
      const d = new Date(`${key}T12:00`);
      const shown = items.slice(0, 5);
      const doable = items.filter((i) => i.kind === "task" || i.kind === "todo"); // things to tick off
      const done = doable.filter((i) => i.done).length;
      return `
        <div class="pl-day ${key === today ? "today" : ""} ${key < today ? "past" : ""}" data-day="${key}">
          <button class="pl-day-head" data-pact="openDay">
            <span class="pl-dow">${d.toLocaleDateString(uiLocale(), { weekday: "short" })}</span>
            <span class="pl-dnum">${d.getDate()}</span>
            ${doable.length ? `<span class="pl-count">${done}/${doable.length}</span>` : ""}
          </button>
          <ul class="pl-day-list">${shown.map((i) => itemHtml(i, key, { compact: true })).join("")}</ul>
          ${items.length > shown.length ? `<button class="pl-more" data-pact="openDay">${esc(t("moreN", { n: items.length - shown.length }))}</button>` : ""}
          ${!items.length ? `<button class="pl-more add" data-pact="openDay">+</button>` : ""}
        </div>`;
    }).join("");
  }
}

// ---------- the month calendar ----------
/** A month: the days in a grid (weeks start on the day chosen in Settings), with a colored dot for each kind of thing. */
function renderMonth(today) {
  const first = `${plannerDate.slice(0, 8)}01`;
  const firstDate = new Date(`${first}T12:00`);
  $("plTitle").textContent = firstDate.toLocaleDateString(uiLocale(), { month: "long", year: "numeric" });
  // the month and year boxes (in the person's language), years from 20 back to 10 ahead
  const y = firstDate.getFullYear(), m = firstDate.getMonth(), nowY = new Date().getFullYear();
  $("plPickMonth").innerHTML = Array.from({ length: 12 }, (_, i) =>
    `<option value="${i}" ${i === m ? "selected" : ""}>${esc(new Date(2000, i, 15).toLocaleDateString(uiLocale(), { month: "long" }))}</option>`).join("");
  const from = Math.min(y, nowY - 20), to = Math.max(y, nowY + 10);
  let years = "";
  for (let yy = to; yy >= from; yy--) years += `<option value="${yy}" ${yy === y ? "selected" : ""}>${yy}</option>`;
  $("plPickYear").innerHTML = years;
  const start = weekDays(first)[0];
  const month = plannerDate.slice(0, 7);
  $("plMonthDow").innerHTML = weekDays(first).map((k) =>
    `<span>${esc(new Date(`${k}T12:00`).toLocaleDateString(uiLocale(), { weekday: "narrow" }))}</span>`).join("");
  let html = "";
  for (let i = 0; i < 42; i++) {
    const key = addDays(start, i);
    if (i % 7 === 0 && i > 0 && key.slice(0, 7) > month) break; // no empty last row
    const items = itemsForDay(key);
    const kinds = [...new Set(items.map((x) => x.kind))];
    const open = items.filter((x) => (x.kind === "todo" || x.kind === "task") && !x.done).length;
    const cls = [key.slice(0, 7) !== month ? "other" : "", key === today ? "today" : "", key === plannerDate ? "sel" : "", key < today ? "past" : ""].join(" ");
    html += `<button type="button" class="pl-mday ${cls}" data-mday="${key}" aria-label="${esc(new Date(`${key}T12:00`).toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" }))}${items.length ? ` — ${items.length}` : ""}">
      <span class="pl-mnum">${Number(key.slice(8))}</span>
      <span class="pl-dots">${["appt", "event", "task", "todo", "time"].filter((k) => kinds.includes(k)).map((k) => `<i class="dot ${k}"></i>`).join("")}</span>
      ${open ? `<span class="pl-mcount">${open}</span>` : ""}
    </button>`;
  }
  $("plMonthGrid").innerHTML = html;
}

// ---------- the "Add a to-do" day and time (hour : minute + AM/PM, no clock dial) ----------
/** "HH:MM" (24-hour) from the three boxes, or "" when no hour is chosen. */
function plChosenTime() {
  const h = Number($("plHour").value);
  if (!h) return "";
  const m = $("plMin").value || "00";
  const h24 = $("plAmPm").value === "pm" ? (h % 12) + 12 : h % 12;
  return `${String(h24).padStart(2, "0")}:${m}`;
}
/** The AM / PM words in the person's language (e.g. "a. m." / "p. m."). */
function paintAmPm() {
  const word = (hour) => {
    try {
      return new Intl.DateTimeFormat(uiLocale(), { hour: "numeric", hour12: true }).formatToParts(new Date(2000, 0, 1, hour))
        .find((p) => p.type === "dayPeriod")?.value || (hour < 12 ? "AM" : "PM");
    } catch { return hour < 12 ? "AM" : "PM"; }
  };
  $("plAmPm").options[0].textContent = word(9);
  $("plAmPm").options[1].textContent = word(21);
}
function resetPlTime() {
  $("plHour").value = "";
  $("plMin").value = "";
  $("plAmPm").value = new Date().getHours() >= 12 ? "pm" : "am";
}

// ---------- actions ----------
function addTodo(e) {
  e.preventDefault();
  const text = $("plText").value.trim();
  if (!text) return;
  const anytime = $("plAnytimeToggle").checked;
  const day = $("plDate").value || plannerDate;
  const time = anytime ? "" : plChosenTime();
  todos.push({
    id: crypto.randomUUID(), text,
    date: anytime ? "" : day,
    time,
    done: false, doneAt: null, fired: {}, createdAt: Date.now(),
  });
  saveTodos();
  // a to-do with a time rings at that time: the first one turns alarms on by itself
  const ts = time ? new Date(`${day}T${time}`).getTime() : 0;
  if (ts > Date.now() && typeof remindersOnAfterSave === "function") remindersOnAfterSave([`${fmtDate(ts)} ${fmtTime(ts)}`]);
  $("plText").value = "";
  resetPlTime();
  if (!anytime && day !== plannerDate) plannerDate = day; // show the day it was added to
  renderPlanner();
  $("plText").focus();
}

function onPlannerClick(e) {
  const btn = e.target.closest("[data-pact]");
  if (!btn) return;
  const act = btn.dataset.pact;
  if (act === "openDay") {
    plannerDate = btn.closest("[data-day]").dataset.day;
    plannerView = "day";
    renderPlanner();
    return;
  }
  if (act === "moveLate") {
    const today = todayKey();
    todos.forEach((x) => { if (!x.done && x.date && x.date < today) { x.date = today; x.fired = {}; } });
    saveTodos();
    renderPlanner();
    return;
  }
  const td = todoById(btn.closest("[data-todo]")?.dataset.todo);
  if (!td) return;
  switch (act) {
    case "toggle":
      td.done = !td.done;
      td.doneAt = td.done ? Date.now() : null;
      break;
    case "tomorrow":
      td.date = addDays(td.date || todayKey(), 1);
      td.fired = {};
      break;
    case "plan":
      td.date = plannerDate;
      break;
    case "edit": {
      const text = prompt(t("editTodo"), td.text);
      if (text == null || !text.trim()) return;
      td.text = text.trim();
      break;
    }
    case "delete":
      askSure(t("deleteTodoConfirm", { text: td.text })).then((ok) => {
        if (!ok) return;
        todos = todos.filter((x) => x.id !== td.id);
        saveTodos();
        renderPlanner();
      });
      return;
    default: return;
  }
  saveTodos();
  renderPlanner();
}

function initPlanner() {
  $("plMonth").addEventListener("click", () => { plannerView = "month"; renderPlanner(); });
  $("plDay").addEventListener("click", () => { plannerView = "day"; renderPlanner(); });
  // a day in the month calendar opens that day (to see it and add to-dos)
  $("plMonthGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mday]");
    if (!b) return;
    plannerDate = b.dataset.mday;
    renderPlanner();
    // small screens: the day is under the calendar — glide down to it
    if (!matchMedia("(min-width: 1024px)").matches) $("plDayHead").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("plWeek").addEventListener("click", () => { plannerView = "week"; renderPlanner(); });
  // ◀ ▶ : a month, a week or a day back / forward
  const step = (n) => {
    if (plannerView === "month") {
      const d = new Date(`${plannerDate.slice(0, 8)}01T12:00`);
      d.setMonth(d.getMonth() + n);
      plannerDate = plKey(d.getTime());
    } else plannerDate = addDays(plannerDate, plannerView === "week" ? 7 * n : n);
    renderPlanner();
  };
  // choosing a month or a year in the boxes
  const jump = () => {
    const yy = Number($("plPickYear").value), mm = Number($("plPickMonth").value);
    const day = Math.min(Number(plannerDate.slice(8)), new Date(yy, mm + 1, 0).getDate());
    plannerDate = `${yy}-${String(mm + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    renderPlanner();
  };
  $("plPickMonth").addEventListener("change", jump);
  $("plPickYear").addEventListener("change", jump);
  $("plPrev").addEventListener("click", () => step(-1));
  $("plNext").addEventListener("click", () => step(1));
  $("plToday").addEventListener("click", () => { plannerDate = todayKey(); renderPlanner(); });
  $("plAddForm").addEventListener("submit", addTodo);
  $("plAnytimeToggle").addEventListener("change", () => {
    const off = $("plAnytimeToggle").checked; // "No date": no day and no time
    for (const id of ["plDate", "plHour", "plMin", "plAmPm"]) $(id).disabled = off;
    $("plAddForm").classList.toggle("no-when", off);
  });
  // choosing a minute or AM/PM first also picks an hour, so the time is never half chosen
  $("plMin").addEventListener("change", () => { if ($("plMin").value && !$("plHour").value) $("plHour").value = String(((new Date().getHours() + 11) % 12) + 1); });
  resetPlTime();
  document.querySelector(".planner").addEventListener("click", onPlannerClick);
}

/** (Not used by Finish any more — Finish now opens the Time calendar.) Opens the Planner on a session's day. */
function showSessionInPlanner(entry) {
  plannerView = "day";
  plannerDate = plKey(entry.start);
  plHighlight = entry.id;
  renderPlanner();
  const note = $("plSaved");
  note.textContent = t("savedToPlanner", {
    name: entry.name, time: fmtHM(entry.ms),
    date: new Date(entry.start).toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" }),
  });
  note.hidden = false;
  document.querySelector(".planner").scrollIntoView({ behavior: "smooth", block: "start" });
  clearTimeout(showSessionInPlanner.timer);
  showSessionInPlanner.timer = setTimeout(() => { note.hidden = true; plHighlight = null; renderPlanner(); }, 8000);
}
