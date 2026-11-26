// MyServiceTime — Events: Memorial, Assembly, Convention, CO visit (and other events),
// each on the dates you pick (one or several days; events no longer repeat by themselves).
// Loaded before app.js (functions only). app.js calls initEvents(), renderEvents(),
// checkEventReminders(); planner.js uses eventsOnDay(); notify.js uses eventReminderPoints().

const EVENTS_KEY = "dailytime.events";
const EVENT_KINDS = ["memorial", "assembly", "convention", "co_visit", "other"];
// The Memorial: a flat unleavened bread and a cup of red wine (drawn, so it looks the same on every device)
const MEMORIAL_ICON = `<svg class="ev-svg" viewBox="0 0 24 24" aria-hidden="true">
  <g class="ev-col">
  <path d="M12.6 1.4h9.2c.2 6.4-1.7 10-4.6 10.7-2.9-.7-4.8-4.3-4.6-10.7z" fill="rgba(255,255,255,.35)" stroke="#9ca3af" stroke-width=".9"/>
  <path d="M13 4.6h8.4c-.4 4.7-2 6.8-4.2 7.3-2.2-.5-3.8-2.6-4.2-7.3z" fill="#9f1239"/>
  <path d="M13.4 5.3h7.6" stroke="#e11d48" stroke-width=".9" stroke-linecap="round"/>
  <path d="M17.2 12.1v7.2" stroke="#9ca3af" stroke-width="1.3" stroke-linecap="round"/>
  <ellipse cx="17.2" cy="20" rx="3.8" ry="1.1" fill="#9ca3af"/>
  <ellipse cx="8.4" cy="17.6" rx="8.2" ry="4.2" fill="#e9cf98" stroke="#b8863f" stroke-width="1"/>
  <ellipse cx="8.4" cy="17.1" rx="6.9" ry="3.2" fill="#f4e2b8"/>
  <g fill="#c49552"><circle cx="4.6" cy="16.6" r=".65"/><circle cx="7.6" cy="15.4" r=".65"/><circle cx="10.8" cy="16.2" r=".65"/><circle cx="6.4" cy="18.6" r=".65"/><circle cx="9.7" cy="18.8" r=".65"/><circle cx="12.9" cy="17.6" r=".65"/></g>
  </g>
  <g class="ev-line"><path d="M15 3h6c0 4.2-1.3 6.7-3 7.2-1.7-.5-3-3-3-7.2zM15.4 5.6h5.2M18 10.2V18M15.6 20h4.8"/><path d="M2 17a5.5 3 0 1 0 11 0 5.5 3 0 1 0-11 0z"/><path d="M5.3 16.6h.01M8.3 15.8h.01M9.8 17.6h.01"/></g>
</svg>`;
// CO visit: the circuit overseer in a suit and his wife in a dress, side by side
const CO_VISIT_ICON = `<svg class="ev-svg" viewBox="0 0 24 24" aria-hidden="true">
  <g class="ev-col">
  <path d="M13 7.6c0-2.6 1.6-4.2 3.6-4.2s3.6 1.6 3.6 4.2v5.2H13z" fill="#2b1a12"/>
  <rect x="15.6" y="9.4" width="2" height="3.2" fill="#7a4c31"/>
  <circle cx="16.6" cy="7.6" r="2.7" fill="#8d5a3b"/>
  <path d="M14.2 6.6c.5-1.6 1.4-2.3 2.4-2.3s1.9.7 2.4 2.3c-.8-.6-1.6-.9-2.4-.9s-1.6.3-2.4.9z" fill="#2b1a12"/>
  <path d="M14.7 11.4h3.8l.6 1.6-2.5 1.2-2.5-1.2z" fill="#8d5a3b"/>
  <path d="M13.6 12.6c.9-.6 1.9-.9 3-.9s2.1.3 3 .9l2.6 10.4H11z" fill="#db2777"/>
  <path d="M14.4 12.4c.6 1 1.3 1.5 2.2 1.5s1.6-.5 2.2-1.5" stroke="#fbcfe8" stroke-width=".7" fill="none" stroke-linecap="round"/>
  <path d="M15.6 17.6h2" stroke="#9d174d" stroke-width=".9" stroke-linecap="round"/>
  <path d="M1.6 23v-5.3c0-3.2 2.3-5.4 5.6-5.4s5.6 2.2 5.6 5.4V23z" fill="#1e2b4a"/>
  <path d="M5.6 12.5l1.6 3.4 1.6-3.4z" fill="#fff"/>
  <path d="M7.2 13.2l-.75 1.3.75 3.6.75-3.6z" fill="#dc2626"/>
  <path d="M4.3 13.6l1.6 2.6M10.1 13.6l-1.6 2.6" stroke="#2c3d63" stroke-width=".8" stroke-linecap="round"/>
  <circle cx="7.2" cy="7.4" r="3" fill="#e0a872"/>
  <path d="M4.2 7c0-2.3 1.4-3.7 3-3.7s3 1.4 3 3.7c-.9-1-2.4-1.5-3-1.5s-2.1.5-3 1.5z" fill="#3b2a20"/>
  </g>
  <g class="ev-line"><circle cx="7.5" cy="7" r="3"/><path d="M2 21v-1.2c0-3.1 2.5-5.6 5.5-5.6s5.5 2.5 5.5 5.6V21"/><path d="M7.5 14.4l-1 2.4 1 2.6 1-2.6z"/><circle cx="17" cy="7.4" r="2.6"/><path d="M14.4 21l1.4-5.6c.3-1.1 2.1-1.1 2.4 0l1.4 5.6z"/></g>
</svg>`;
// Convention: a big assembly — a speaker at the podium on stage, the audience in rows
const CONVENTION_ICON = `<svg class="ev-svg" viewBox="0 0 24 24" aria-hidden="true">
  <g class="ev-col">
  <rect x="2.5" y="1.2" width="19" height="7.6" rx="1.4" fill="#1d4ed8"/>
  <rect x="5.5" y="2.5" width="13" height="1.3" rx=".6" fill="#bfdbfe"/>
  <rect x="1.5" y="8.6" width="21" height="1.8" rx=".6" fill="#a16207"/>
  <circle cx="12" cy="4.9" r="1.15" fill="#e0a872"/>
  <path d="M10.5 8.6v-1.3c0-.9.7-1.5 1.5-1.5s1.5.6 1.5 1.5v1.3z" fill="#1e2b4a"/>
  <rect x="10.4" y="6.6" width="3.2" height="2.2" rx=".3" fill="#78350f"/>
  <g fill="#334155">
    <path d="M2.2 15.6a1.9 1.4 0 0 1 3.8 0zM7.2 15.6a1.9 1.4 0 0 1 3.8 0zM13 15.6a1.9 1.4 0 0 1 3.8 0zM18 15.6a1.9 1.4 0 0 1 3.8 0z"/>
    <path d="M.3 20.4a1.9 1.4 0 0 1 3.8 0zM5.2 20.4a1.9 1.4 0 0 1 3.8 0zM10.1 20.4a1.9 1.4 0 0 1 3.8 0zM15 20.4a1.9 1.4 0 0 1 3.8 0zM19.9 20.4a1.9 1.4 0 0 1 3.8 0z"/>
  </g>
  <g fill="#3b2a20">
    <circle cx="4.1" cy="13.3" r="1.25"/><circle cx="9.1" cy="13.3" r="1.25"/><circle cx="14.9" cy="13.3" r="1.25"/><circle cx="19.9" cy="13.3" r="1.25"/>
    <circle cx="2.2" cy="18.1" r="1.25"/><circle cx="7.1" cy="18.1" r="1.25"/><circle cx="12" cy="18.1" r="1.25"/><circle cx="16.9" cy="18.1" r="1.25"/><circle cx="21.8" cy="18.1" r="1.25"/>
  </g>
  <rect x="0" y="21.6" width="24" height="2" rx=".8" fill="#64748b" opacity=".5"/>
  </g>
  <g class="ev-line"><path d="M3 3h18v6H3zM12 6.2v2.8M10.4 9h3.2"/><circle cx="5" cy="13.5" r="1.3"/><circle cx="9.7" cy="13.5" r="1.3"/><circle cx="14.3" cy="13.5" r="1.3"/><circle cx="19" cy="13.5" r="1.3"/><path d="M3 18a2 1.6 0 0 1 4 0M7.7 18a2 1.6 0 0 1 4 0M12.3 18a2 1.6 0 0 1 4 0M17 18a2 1.6 0 0 1 4 0M2 21h20"/></g>
</svg>`;
// Assembly and other events: the emoji when icons are colorful, an outline drawing otherwise
const emojiIcon = (emoji, line) => `<svg class="ev-svg" viewBox="0 0 24 24" aria-hidden="true"><g class="ev-col"><text x="12" y="19.5" font-size="19" text-anchor="middle">${emoji}</text></g><g class="ev-line">${line}</g></svg>`;
const ASSEMBLY_ICON = emojiIcon("🏛️", '<path d="M3 9.5L12 4l9 5.5M4 10h16M5.5 10v8M9.8 10v8M14.2 10v8M18.5 10v8M3 20h18"/>');
const OTHER_ICON = emojiIcon("📌", '<path d="M9.5 3h5l-.8 4.6 2.8 2.9H7.5l2.8-2.9zM12 10.5V21"/>');
const EVENT_ICON = { memorial: MEMORIAL_ICON, assembly: ASSEMBLY_ICON, convention: CONVENTION_ICON, co_visit: CO_VISIT_ICON, other: OTHER_ICON };
/** Plain-text icon (for alarm titles and phone notifications, which can't show a drawing). */
const EVENT_ICON_TEXT = { memorial: "🍷", assembly: "🏛️", convention: "🎤", co_visit: "🤝", other: "📌" };
const eventIconText = (kind) => EVENT_ICON_TEXT[kind] || EVENT_ICON_TEXT.other;
// Events happen once, on the dates picked ("every 6 months" and "every year" were removed).
const DEFAULT_REPEAT = { memorial: "none", assembly: "none", convention: "none", co_visit: "none", other: "none" };
const REPEAT_MONTHS = { none: 0, "6m": 6, "1y": 12 };

let events = (() => {
  try { return JSON.parse(store.getItem(EVENTS_KEY)) || []; }
  catch { return []; }
})();
for (const ev of events) if (ev.repeat && ev.repeat !== "none") ev.repeat = "none"; // repeating was removed
const saveEvents = () => {
  store.setItem(EVENTS_KEY, JSON.stringify(events));
  uploadReminderTimes(); // reminders also arrive when the app is closed
};
const eventById = (id) => events.find((x) => x.id === id);
const eventTitle = (ev) => ev.title || t(`ev_${ev.kind}`);

// ---------- dates ----------
const evDate = (key) => new Date(`${key}T12:00`);
const evKey = (d) => plKey(d.getTime());
/** Moves a date by n months, keeping the day (or the month's last day, e.g. Aug 31 → Feb 28). */
function addMonthsKey(key, n) {
  const d = evDate(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return evKey(d);
}
const spanDays = (ev) => (ev.endDate && ev.endDate > ev.startDate ? Math.round((evDate(ev.endDate) - evDate(ev.startDate)) / 864e5) : 0);

/** The k-th occurrence of an event: { start, end } as YYYY-MM-DD. */
function occurrence(ev, k) {
  const start = k ? addMonthsKey(ev.startDate, k * REPEAT_MONTHS[ev.repeat]) : ev.startDate;
  return { start, end: spanDays(ev) ? addDays(start, spanDays(ev)) : start, k };
}

/** Occurrences that end on/after `fromKey`, up to `max` of them (one-time events: just the one). */
function occurrencesFrom(ev, fromKey, max = 3) {
  const out = [];
  const step = REPEAT_MONTHS[ev.repeat];
  if (!step) {
    const o = occurrence(ev, 0);
    return o.end >= fromKey ? [o] : [];
  }
  // jump close to fromKey, then walk forward
  const monthsGap = (evDate(fromKey).getFullYear() - evDate(ev.startDate).getFullYear()) * 12 + (evDate(fromKey).getMonth() - evDate(ev.startDate).getMonth());
  let k = Math.max(0, Math.floor(monthsGap / step) - 1);
  while (out.length < max && k < 2000) {
    const o = occurrence(ev, k++);
    if (o.end >= fromKey) out.push(o);
  }
  return out;
}

const nextOccurrence = (ev) => occurrencesFrom(ev, plKey(Date.now()), 1)[0] || null;

/** Events happening on a given day (for the Planner). */
function eventsOnDay(key) {
  const out = [];
  for (const ev of events) {
    const o = occurrencesFrom(ev, key, 1)[0];
    if (o && o.start <= key && key <= o.end) {
      const dayNum = spanDays(ev) ? Math.round((evDate(key) - evDate(o.start)) / 864e5) + 1 : 0;
      out.push({ ev, o, dayNum, totalDays: spanDays(ev) + 1 });
    }
  }
  return out;
}

// ---------- reminders ----------
/** Reminder moments for the next two occurrences (keys include the date, so each year rings again). */
function eventReminderPoints(ev) {
  const r = ev.reminders || {};
  const pts = [];
  for (const o of occurrencesFrom(ev, plKey(Date.now() - 864e5), 2)) {
    const at = new Date(`${o.start}T${ev.time || "09:00"}`).getTime();
    if (r.weekBefore) pts.push({ key: `${o.start}-week`, at: at - 7 * 864e5, until: at, label: "alarmEventWeek", o });
    if (r.dayBefore) pts.push({ key: `${o.start}-day`, at: at - 864e5, until: at, label: "alarmEventDay", o });
    if (r.atStart) pts.push({ key: `${o.start}-start`, at, until: at + 60 * 60000, label: "alarmEventNow", o });
  }
  if (ev.snoozeUntil) pts.push({ key: `snooze-${ev.snoozeUntil}`, at: ev.snoozeUntil, until: ev.snoozeUntil + 60 * 60000, label: "alarmSnoozed" });
  return pts;
}

function checkEventReminders(now) {
  let changed = false;
  for (const ev of events) {
    ev.fired = ev.fired || {};
    for (const p of eventReminderPoints(ev)) {
      if (ev.fired[p.key]) continue;
      if (now >= p.at && now < p.until) {
        ev.fired[p.key] = true;
        changed = true;
        const o = p.o || nextOccurrence(ev);
        pushAlarm({
          id: `event-${ev.id}`,
          title: `${t(p.label)}: ${eventIconText(ev.kind)} ${eventTitle(ev)}`,
          text: [o && dateRangeText(ev, o), ev.address].filter(Boolean).join(" — "),
          tag: `event-${ev.id}-${p.key}`,
        });
      } else if (now >= p.until) {
        ev.fired[p.key] = true;
        changed = true;
      }
    }
  }
  if (changed) store.setItem(EVENTS_KEY, JSON.stringify(events));
}

// ---------- drawing ----------
function dateRangeText(ev, o) {
  const fmt = (k, opts) => evDate(k).toLocaleDateString(uiLocale(), opts);
  const full = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
  let s = o.end !== o.start ? `${fmt(o.start, { weekday: "short", month: "short", day: "numeric" })} – ${fmt(o.end, full)}` : fmt(o.start, full);
  if (ev.time) s += ` · ${fmtTime(new Date(`${o.start}T${ev.time}`).getTime())}`;
  return s;
}

function renderEvents() {
  const list = $("eventList");
  if (!list) return;
  const today = plKey(Date.now());
  const showAll = $("evShow").value === "all";
  const rows = events
    .map((ev) => ({ ev, o: nextOccurrence(ev) || occurrence(ev, 0) }))
    .filter((x) => showAll || x.o.end >= today)
    .sort((a, b) => {
      const ua = a.o.end >= today, ub = b.o.end >= today;
      if (ua !== ub) return ua ? -1 : 1;                                  // upcoming before past
      return ua ? a.o.start.localeCompare(b.o.start) : b.o.start.localeCompare(a.o.start); // soonest first / latest past first
    });

  $("eventCount").textContent = events.filter((ev) => nextOccurrence(ev)).length;
  $("eventEmpty").hidden = rows.length > 0;
  list.innerHTML = rows.map(({ ev, o }) => {
    const past = o.end < today;
    const now = o.start <= today && today <= o.end;
    const startAt = new Date(`${o.start}T${ev.time || "00:00"}`).getTime();
    const when = past ? t("passed") : now ? t("eventNow") : fmtCountdown(startAt - Date.now());
    return `
      <li class="item event ev-${ev.kind} ${past ? "past" : ""} ${now ? "running" : ""}" data-eid="${ev.id}">
        <div>
          <h3><span class="ev-icon">${EVENT_ICON[ev.kind] || EVENT_ICON.other}</span> ${esc(eventTitle(ev))}</h3>
          <div class="meta">
            <span><span class="mi" data-ic="📅">📅</span> ${esc(dateRangeText(ev, o))}</span>
            <span class="countdown">${esc(when)}</span>
            ${past ? "" : wxChipAt(now ? Date.now() : startAt, !!ev.time || now, ev)}
            ${ev.repeat !== "none" ? `<span class="ev-repeat">🔁 ${esc(t(`repeat_${ev.repeat}`))}</span>` : ""}
          </div>
          ${ev.address ? `<div class="meta" style="margin-top:4px">${navLink(ev.address)}</div>` : ""}
          ${ev.notes ? `<div class="meta" style="margin-top:4px">📝 ${linkifyAddresses(ev.notes)}</div>` : ""}
        </div>
        <div class="item-actions">
          <button class="btn small btn-ghost" data-eact="edit">${esc(t("edit"))}</button>
          <button class="btn small danger" data-eact="delete">${esc(t("delete"))}</button>
        </div>
      </li>`;
  }).join("");
}

// ---------- form ----------
const LISTED_KINDS = ["memorial", "assembly", "convention", "co_visit"];

/** If the name is one from the list (in any language), which kind it is; otherwise "other". */
function kindFromName(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return "other";
  for (const k of LISTED_KINDS) {
    for (const code of Object.keys(LANGS)) {
      if (((typeof EVENT_NAMES !== "undefined" ? EVENT_NAMES[code] : STRINGS[code])?.[`ev_${k}`] || "").toLowerCase() === n) return k;
    }
  }
  return "other";
}

/** Names to pick from: the list (Memorial, Assembly…) and names the person has typed before. */
function eventNameChoices() {
  const listed = LISTED_KINDS.map((k) => ({ name: t(`ev_${k}`), icon: EVENT_ICON[k] }));
  const own = [...new Set(events.filter((e) => e.title && kindFromName(e.title) === "other").map((e) => e.title))]
    .map((name) => ({ name, icon: EVENT_ICON.other }));
  return [...listed, ...own];
}

function openEventForm(ev = null) {
  $("eventForm").reset();
  $("eId").value = ev?.id || "";
  $("eventFormTitle").textContent = t(ev ? "editEvent" : "newEvent").replace(/^\+\s*/, "");
  const choices = eventNameChoices();
  $("eventNames").innerHTML = choices.map((c) => `<option value="${esc(c.name)}">`).join("");
  $("eventPicks").innerHTML = choices.map((c) => `<button type="button" class="ev-pick" data-name="${esc(c.name)}">${c.icon} ${esc(c.name)}</button>`).join("");
  $("eTitle").value = ev ? eventTitle(ev) : "";
  $("eStart").value = ev?.startDate || "";
  $("eEnd").value = ev?.endDate || "";
  $("eTime").value = ev?.time || "";
  $("eRepeat").value = "none";
  $("eAddress").value = ev?.address || "";
  $("eNotes").value = ev?.notes || "";
  const r = ev?.reminders || { weekBefore: true, dayBefore: true, atStart: true };
  $("eRemWeek").checked = !!r.weekBefore;
  $("eRemDay").checked = !!r.dayBefore;
  $("eRemStart").checked = !!r.atStart;
  markPickedName();
  $("eventModal").hidden = false;
  $("eTitle").focus();
}
const closeEventForm = () => { $("eventModal").hidden = true; };

/** Highlights the quick-pick matching the typed name; for a new event, a listed name sets its usual repeat. */
function markPickedName() {
  const name = $("eTitle").value.trim().toLowerCase();
  document.querySelectorAll("#eventPicks .ev-pick").forEach((b) => b.classList.toggle("on", b.dataset.name.toLowerCase() === name));
}
function nameChanged() {
  markPickedName();
  const kind = kindFromName($("eTitle").value);
  if (!$("eId").value && kind !== "other") $("eRepeat").value = DEFAULT_REPEAT[kind];
}

function saveEventForm(e) {
  e.preventDefault();
  const startDate = $("eStart").value;
  if (!startDate || !$("eTitle").value.trim()) return;
  let endDate = $("eEnd").value;
  if (endDate && endDate < startDate) endDate = "";
  const data = {
    kind: kindFromName($("eTitle").value),
    title: $("eTitle").value.trim(),
    startDate, endDate,
    time: $("eTime").value,
    repeat: "none",
    address: $("eAddress").value.trim(),
    notes: $("eNotes").value.trim(),
    reminders: { weekBefore: $("eRemWeek").checked, dayBefore: $("eRemDay").checked, atStart: $("eRemStart").checked },
  };
  const id = $("eId").value;
  if (id) {
    const ev = eventById(id);
    if (ev.startDate !== startDate || ev.time !== data.time || ev.repeat !== data.repeat) ev.fired = {};
    if (ev.address !== data.address) { ev.lat = null; ev.lon = null; } // a new place: found again on the map
    Object.assign(ev, data);
  } else {
    events.push({ id: crypto.randomUUID(), ...data, fired: {}, createdAt: Date.now() });
  }
  // a place picked from the suggestions keeps its exact spot on the map
  const picked = $("eAddress").dataset;
  const saved = id ? eventById(id) : events[events.length - 1];
  if (saved && picked.lat && saved.address === data.address) { saved.lat = Number(picked.lat); saved.lon = Number(picked.lon); }
  delete picked.lat; delete picked.lon;
  saveEvents();
  closeEventForm();
  renderEvents();
  renderPlanner();
  const r = data.reminders; // the first reminder turns alarms on by itself
  if (typeof remindersOnAfterSave === "function") remindersOnAfterSave([r.weekBefore && t("remWeek"), r.dayBefore && t("remDueDay"), r.atStart && t("remStart")]);
}

function initEvents() {
  $("newEvent").addEventListener("click", () => openEventForm());
  $("eventForm").addEventListener("submit", saveEventForm);
  $("eCancel").addEventListener("click", closeEventForm);
  $("eventModal").addEventListener("mousedown", (e) => { if (e.target === $("eventModal")) closeEventForm(); });
  $("evShow").addEventListener("input", renderEvents);
  // the name: type anything, or tap one from the list
  $("eTitle").addEventListener("input", nameChanged);
  $("eventPicks").addEventListener("click", (e) => {
    const b = e.target.closest(".ev-pick");
    if (!b) return;
    $("eTitle").value = b.dataset.name;
    nameChanged();
  });
  $("eStart").addEventListener("change", () => { if (!$("eEnd").value || $("eEnd").value < $("eStart").value) $("eEnd").min = $("eStart").value; });
  $("eAddress").addEventListener("input", () => { delete $("eAddress").dataset.lat; delete $("eAddress").dataset.lon; });
  $("eAddrFind").addEventListener("click", () => {
    openAddrModal((address) => { $("eAddress").value = address; });
    $("mAddr").value = $("eAddress").value;
    if ($("mAddr").value.trim().length >= 3) $("mSearch").click();
  });
  $("eventList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-eact]");
    if (!btn) return;
    const ev = eventById(btn.closest("[data-eid]").dataset.eid);
    if (!ev) return;
    if (btn.dataset.eact === "edit") return openEventForm(ev);
    askSure(t("deleteEventConfirm", { title: eventTitle(ev) })).then((ok) => {
      if (!ok) return;
      events = events.filter((x) => x.id !== ev.id);
      saveEvents();
      renderEvents();
      renderPlanner();
    });
  });
}
