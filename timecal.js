// MyServiceTime — Time calendar: a month view of the time tracked each day, with each session's
// purpose and note. Tap a day to see its sessions, edit a note or delete a session.
// Loaded before app.js (functions only); app.js calls initTimeCalendar() and renderTimeCalendar().

let tcalMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let tcalSelected = plKey(Date.now());

/** "6h 30m" (in the person's language); whole hours as "10h". */
function fmtHM(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  if (m === 0 && h > 0) {
    const tpl = t("hm");
    return tpl.slice(0, tpl.indexOf("{m}")).trim().replace("{h}", h);
  }
  return t("hm", { h, m });
}

/** Sessions that started on a given day (plus a timer started that day and still running). */
function sessionsOn(key) {
  const list = tracker.log.filter((e) => plKey(e.start) === key).sort((a, b) => a.start - b.start);
  const r = tracker.running;
  if (r && plKey(r.startedAt) === key) {
    list.push({ id: "running", name: r.name, note: r.note || "", start: r.startedAt, end: Date.now(), ms: trackerElapsed(), running: true });
  }
  return list;
}

function renderTimeCalendar() {
  const grid = $("tcalGrid");
  if (!grid) return;
  const year = tcalMonth.getFullYear(), month = tcalMonth.getMonth();
  $("tcalTitle").textContent = tcalMonth.toLocaleDateString(uiLocale(), { month: "long", year: "numeric" });

  // 6 weeks, starting on the first day of the week for the person's country
  const first = new Date(year, month, 1);
  const back = (first.getDay() - weekStartsOn() + 7) % 7;
  const days = Array.from({ length: 42 }, (_, i) => plKey(new Date(year, month, 1 - back + i, 12).getTime()));

  const totals = Object.fromEntries(days.map((k) => [k, sessionsOn(k)]));
  const inMonth = (k) => Number(k.slice(5, 7)) - 1 === month && Number(k.slice(0, 4)) === year;
  const monthMs = days.filter(inMonth).reduce((s, k) => s + totals[k].reduce((a, e) => a + e.ms, 0), 0);
  const maxMs = Math.max(1, ...days.filter(inMonth).map((k) => totals[k].reduce((a, e) => a + e.ms, 0)));
  $("tcalTotal").textContent = monthMs ? t("monthTotal", { t: fmtHM(monthMs) }) : "";

  const today = plKey(Date.now());
  const heads = Array.from({ length: 7 }, (_, i) =>
    new Date(`${days[i]}T12:00`).toLocaleDateString(uiLocale(), { weekday: "narrow" }));

  grid.innerHTML = heads.map((h) => `<div class="tcal-head">${esc(h)}</div>`).join("") + days.map((k) => {
    const list = totals[k];
    const ms = list.reduce((a, e) => a + e.ms, 0);
    const level = ms ? Math.min(4, Math.ceil((ms / maxMs) * 4)) : 0;
    const hasNote = list.some((e) => e.note);
    const cls = ["tcal-cell", `lvl${level}`, inMonth(k) ? "" : "other", k === today ? "today" : "", k === tcalSelected ? "selected" : ""].join(" ");
    return `
      <button type="button" class="${cls}" data-day="${k}" title="${esc(ms ? fmtHM(ms) : "")}">
        <span class="tcal-num">${Number(k.slice(8))}</span>
        ${ms ? `<span class="tcal-time">${esc(fmtHM(ms))}</span>` : ""}
        ${hasNote ? `<span class="tcal-note" aria-hidden="true">📝</span>` : ""}
      </button>`;
  }).join("");

  // the selected day's sessions
  const list = sessionsOn(tcalSelected);
  const total = list.reduce((a, e) => a + e.ms, 0);
  $("tcalDay").hidden = false;
  $("tcalDayHead").innerHTML = `<strong>${esc(new Date(`${tcalSelected}T12:00`).toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" }))}</strong>
    ${total ? `<span class="tcal-day-total">⏱ ${esc(fmtHM(total))}</span>` : ""}`;
  $("tcalSessions").innerHTML = list.length ? list.map((e) => {
    const nextDay = plKey(e.end) !== plKey(e.start) ? " (+1)" : "";
    return `
      <li class="tcal-session ${e.running ? "running" : ""} ${e.id === tcalHighlight ? "flash" : ""}" data-sid="${e.id}">
        <div class="tcal-s-top">
          <span class="tcal-s-time">${fmtTime(e.start)} – ${e.running ? esc(t("now")) : fmtTime(e.end) + nextDay}</span>
          <strong class="tcal-s-purpose">${esc(e.name)}</strong>
          <span class="tcal-s-dur">${esc(fmtHM(e.ms))}</span>
          ${e.manual ? `<span class="tcal-s-manual" title="${esc(t("teManual"))}">✍️</span>` : ""}
          ${e.running ? "" : `
            <span class="tcal-s-actions">
              <button class="pl-btn" data-tcal="edit">${esc(t("edit"))}</button>
              <button class="pl-btn del" data-tcal="delete" title="${esc(t("delete"))}">✕</button>
            </span>`}
        </div>
        ${e.note ? `<div class="tcal-s-note">📝 ${linkifyAddresses(e.note)}</div>` : ""}
      </li>`;
  }).join("") : `<li class="muted small-text">${esc(t("noSessions"))}</li>`;
}

function initTimeCalendar() {
  if (store.getItem("dailytime.goals") != null) store.removeItem("dailytime.goals"); // time goals were removed
  const shift = (n) => { tcalMonth = new Date(tcalMonth.getFullYear(), tcalMonth.getMonth() + n, 1); renderTimeCalendar(); };
  $("tcalPrev").addEventListener("click", () => shift(-1));
  $("tcalNext").addEventListener("click", () => shift(1));
  $("tcalToday").addEventListener("click", () => {
    const d = new Date();
    tcalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    tcalSelected = plKey(d.getTime());
    renderTimeCalendar();
  });
  $("tcalGrid").addEventListener("click", (e) => {
    const cell = e.target.closest("[data-day]");
    if (!cell) return;
    tcalSelected = cell.dataset.day;
    const d = new Date(`${tcalSelected}T12:00`);
    if (d.getMonth() !== tcalMonth.getMonth()) tcalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    renderTimeCalendar();
  });
  $("tcalSessions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tcal]");
    if (!btn) return;
    const entry = tracker.log.find((x) => x.id === btn.closest("[data-sid]").dataset.sid);
    if (!entry) return;
    if (btn.dataset.tcal === "edit") return openTimeEntry("edit", { entry });
    if (!confirm(t("delTimeEntry"))) return;
    tracker.log = tracker.log.filter((x) => x.id !== entry.id);
    saveTracker();
    renderTracker();
    renderPlanner();
  });
  initTimeEntry();
  initMonthPicker();
}

// ---------- month / year picker (opened by the 📆 icon or the month name) ----------
let tpYear = new Date().getFullYear();

function renderMonthPicker() {
  $("tpYear").textContent = tpYear;
  const now = new Date();
  // months with tracked time get a small dot
  const tracked = new Set(tracker.log.map((e) => { const d = new Date(e.start); return `${d.getFullYear()}-${d.getMonth()}`; }));
  $("tpMonths").innerHTML = Array.from({ length: 12 }, (_, m) => {
    const name = new Date(tpYear, m, 15).toLocaleDateString(uiLocale(), { month: "short" });
    const shown = tcalMonth.getFullYear() === tpYear && tcalMonth.getMonth() === m;
    const current = now.getFullYear() === tpYear && now.getMonth() === m;
    return `<button type="button" class="tp-month ${shown ? "on" : ""} ${current ? "now" : ""}" data-month="${m}">
      ${esc(name)}${tracked.has(`${tpYear}-${m}`) ? `<span class="tp-dot" aria-hidden="true"></span>` : ""}</button>`;
  }).join("");
}

function toggleMonthPicker(open = $("tcalPicker").hidden) {
  $("tcalPicker").hidden = !open;
  $("tcalPickBtn").setAttribute("aria-expanded", String(open));
  $("tcalPickBtn").classList.toggle("on", open);
  if (open) { tpYear = tcalMonth.getFullYear(); renderMonthPicker(); }
}

function initMonthPicker() {
  $("tcalPickBtn").addEventListener("click", () => toggleMonthPicker());
  $("tcalTitle").addEventListener("click", () => toggleMonthPicker());
  $("tpPrevYear").addEventListener("click", () => { tpYear--; renderMonthPicker(); });
  $("tpNextYear").addEventListener("click", () => { tpYear++; renderMonthPicker(); });
  $("tpMonths").addEventListener("click", (e) => {
    const b = e.target.closest("[data-month]");
    if (!b) return;
    const m = Number(b.dataset.month);
    tcalMonth = new Date(tpYear, m, 1);
    const now = new Date();
    // show today if it's this month, otherwise the 1st of the chosen month
    tcalSelected = now.getFullYear() === tpYear && now.getMonth() === m ? plKey(now.getTime()) : plKey(new Date(tpYear, m, 1, 12).getTime());
    toggleMonthPicker(false);
    renderTimeCalendar();
  });
  // close when tapping elsewhere or pressing Esc
  document.addEventListener("click", (e) => {
    if (!$("tcalPicker").hidden && !e.target.closest("#tcalPicker, #tcalPickBtn, #tcalTitle")) toggleMonthPicker(false);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("tcalPicker").hidden) toggleMonthPicker(false); });
}

// ---------- the time entry window ----------
// "add":    tap "+ Add time" on a calendar day and type what you did and when
// "edit":   change a session (purpose, times, note)
// "finish": after Finish on the timer — add a note (and fix the times if needed) before it is saved
let teMode = "add", teEntry = null, teFrozen = null;
const hhmm = (ts) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

/** Start and end (ms) from the window's boxes; an end earlier than the start means it ended after midnight. */
function teTimes() {
  const date = $("teDate").value, s = $("teStart").value, e = $("teEnd").value;
  if (!date || !s || !e) return null;
  const start = new Date(`${date}T${s}`).getTime();
  let end = new Date(`${date}T${e}`).getTime();
  if (end <= start) end += 864e5;
  return { start, end };
}
/** True when the person didn't touch the times (then a finished timer keeps its exact time, pauses left out). */
const teTimesUntouched = () => teFrozen && $("teDate").value === teFrozen.date && $("teStart").value === teFrozen.s && $("teEnd").value === teFrozen.e;

function showTeDuration() {
  const el = $("teDur");
  const tm = teTimes();
  if (!tm) { el.textContent = ""; el.className = "addr-msg te-dur"; return; }
  const ms = teTimesUntouched() ? teFrozen.ms : tm.end - tm.start;
  const bad = ms > 864e5 || $("teStart").value === $("teEnd").value;
  el.textContent = bad ? t(ms > 864e5 ? "teTooLong" : "teBadTime") : t("teDuration", { time: fmtHM(ms) });
  el.className = `addr-msg te-dur ${bad ? "err" : "ok"}`;
}

function openTimeEntry(mode, { entry = null, date = null } = {}) {
  teMode = mode;
  teEntry = entry;
  teFrozen = null;
  $("timeForm").reset();
  $("teTitle").textContent = t(mode === "finish" ? "teFinishTitle" : mode === "edit" ? "teEditTitle" : "teAddTitle");
  $("teSummary").hidden = mode !== "finish";
  $("teDiscard").hidden = mode !== "finish"; // a finished timer can still be thrown away instead of saved
  if (mode === "finish") {
    const r = tracker.running, now = Date.now();
    teFrozen = { ms: trackerElapsed(), end: now, date: plKey(r.startedAt), s: hhmm(r.startedAt), e: hhmm(now) };
    $("teSummary").textContent = t("teTracked", { time: fmtHM(teFrozen.ms), name: r.name });
    $("teName").value = r.name;
    $("teDate").value = teFrozen.date;
    $("teStart").value = teFrozen.s;
    $("teEnd").value = teFrozen.e;
    $("teNote").value = r.note || "";
  } else if (mode === "edit") {
    teFrozen = { ms: entry.ms, end: entry.end, date: plKey(entry.start), s: hhmm(entry.start), e: hhmm(entry.end) };
    $("teName").value = entry.name;
    $("teDate").value = teFrozen.date;
    $("teStart").value = teFrozen.s;
    $("teEnd").value = teFrozen.e;
    $("teNote").value = entry.note || "";
  } else {
    $("teDate").value = date || tcalSelected || plKey(Date.now());
  }
  showTeDuration();
  $("timeModal").hidden = false;
  setTimeout(() => $(mode === "add" ? "teName" : "teNote").focus(), 50);
}
const closeTimeEntry = () => { $("timeModal").hidden = true; };

function saveTimeEntry(e) {
  e.preventDefault();
  const name = $("teName").value.trim();
  const tm = teTimes();
  if (!name || !tm) return;
  const untouched = teTimesUntouched();
  const ms = untouched ? teFrozen.ms : tm.end - tm.start;
  if (ms > 864e5 || $("teStart").value === $("teEnd").value) return showTeDuration();
  const note = $("teNote").value.trim().slice(0, 500);
  let saved;
  if (teMode === "edit") {
    Object.assign(teEntry, { name, note }, untouched ? {} : { start: tm.start, end: tm.end, ms, manual: true });
    saved = teEntry;
  } else if (teMode === "finish") {
    if (!tracker.running) return closeTimeEntry();
    saved = { id: crypto.randomUUID(), name, note, start: untouched ? tracker.running.startedAt : tm.start, end: untouched ? teFrozen.end : tm.end, ms };
    if (!untouched) saved.manual = true;
    tracker.log.push(saved);
    tracker.running = null;
    $("trkNote").value = ""; // the next session starts with a fresh note
  } else {
    saved = { id: crypto.randomUUID(), name, note, start: tm.start, end: tm.end, ms, manual: true };
    tracker.log.push(saved);
  }
  saveTracker();
  closeTimeEntry();
  renderTracker();
  renderPlanner();
  showSessionInCalendar(saved);
}

function initTimeEntry() {
  $("tcalAdd").addEventListener("click", () => openTimeEntry("add", { date: tcalSelected }));
  $("timeForm").addEventListener("submit", saveTimeEntry);
  for (const id of ["teDate", "teStart", "teEnd"]) $(id).addEventListener("input", showTeDuration);
  $("teCancel").addEventListener("click", closeTimeEntry);   // Finish: the timer just keeps going
  $("teDiscard").addEventListener("click", () => { if (discardTracker()) closeTimeEntry(); });
  $("teClose").addEventListener("click", closeTimeEntry);
  $("timeModal").addEventListener("mousedown", (e) => { if (e.target === $("timeModal")) closeTimeEntry(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("timeModal").hidden) closeTimeEntry(); });
}

let tcalHighlight = null; // a session just finished

/** After "Finish" in the Time Tracker: open the calendar on the day the session started and highlight it. */
function showSessionInCalendar(entry) {
  const d = new Date(entry.start);
  tcalMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  tcalSelected = plKey(entry.start);
  tcalHighlight = entry.id;
  renderTimeCalendar();
  const note = $("tcalSaved");
  note.textContent = t("savedToCalendar", {
    name: entry.name, time: fmtHM(entry.ms),
    date: d.toLocaleDateString(uiLocale(), { weekday: "long", month: "long", day: "numeric" }),
  });
  note.hidden = false;
  showView("tools", ".tcal"); // (also when the timer was stopped from the Dashboard)
  clearTimeout(showSessionInCalendar.timer);
  showSessionInCalendar.timer = setTimeout(() => { note.hidden = true; tcalHighlight = null; renderTimeCalendar(); }, 8000);
}
