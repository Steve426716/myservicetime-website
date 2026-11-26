// MyServiceTime — your own reminders: "remind me to … at …", once or repeating every day / week / month.
// Opened by the Start Reminders button. They ring like the other alarms (with snooze), reach the phone
// when the app is closed (only the time is sent to the server), and show on the Dashboard.
// Loaded before app.js (functions only); app.js calls initMyReminders() and checkMyReminders().

const MY_REM_KEY = "dailytime.myReminders";
const REM_REPEATS = ["once", "daily", "weekly", "monthly"];

let myReminders = (() => {
  try { return JSON.parse(store.getItem(MY_REM_KEY)) || []; }
  catch { return []; }
})();
const saveMyReminders = () => {
  store.setItem(MY_REM_KEY, JSON.stringify(myReminders));
  uploadReminderTimes(); // alerts also arrive when the app is closed
};

/** The times (ms) a reminder rings between `from` and `to`, at most `max` of them. */
function remOccurrences(r, from, to, max = 40) {
  const base = new Date(`${r.date}T${r.time}`);
  if (isNaN(base)) return [];
  if (r.repeat === "once" || !REM_REPEATS.includes(r.repeat)) {
    const at = base.getTime();
    return at >= from && at <= to ? [at] : [];
  }
  const out = [];
  const stepDays = r.repeat === "daily" ? 1 : r.repeat === "weekly" ? 7 : 0;
  const f = new Date(from);
  // start just before `from` instead of walking from the first date
  let k = stepDays
    ? Math.max(0, Math.floor((from - base.getTime()) / (stepDays * 864e5)) - 1)
    : Math.max(0, (f.getFullYear() - base.getFullYear()) * 12 + f.getMonth() - base.getMonth() - 1);
  for (let guard = 0; out.length < max && guard < 2000; guard++, k++) {
    let d;
    if (stepDays) {
      d = new Date(base);
      d.setDate(base.getDate() + k * stepDays); // keeps the same clock time, even across daylight-saving changes
    } else {
      d = new Date(base.getFullYear(), base.getMonth() + k, 1, base.getHours(), base.getMinutes());
      d.setDate(Math.min(base.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); // Jan 31 → Feb 28
    }
    const at = d.getTime();
    if (at > to) break;
    if (at >= from) out.push(at);
  }
  return out;
}
const nextReminderAt = (r, now = Date.now()) => remOccurrences(r, now, now + 400 * 864e5, 1)[0] ?? null;

/** Upcoming moments for the server (phone alerts when the app is closed). */
function myReminderPoints(r) {
  const now = Date.now();
  const pts = remOccurrences(r, now, now + 60 * 864e5, 30).map((at) => ({ key: String(at), at }));
  if (r.snoozeUntil && r.snoozeUntil > now) pts.push({ key: `snooze-${r.snoozeUntil}`, at: r.snoozeUntil });
  return pts;
}

const repeatLabel = (r) => (r.repeat && r.repeat !== "once" ? `🔁 ${t(`rep_${r.repeat}`)}` : "");

/** Rings the reminders that are due (called with the other alarms). */
function checkMyReminders(now) {
  let changed = false;
  for (const r of myReminders) {
    r.fired = r.fired || {};
    const due = remOccurrences(r, now - 30 * 60000, now).map((at) => ({ key: String(at), at }));
    if (r.snoozeUntil && now >= r.snoozeUntil && now < r.snoozeUntil + 3600e3) due.push({ key: `snooze-${r.snoozeUntil}`, at: r.snoozeUntil });
    for (const p of due) {
      if (r.fired[p.key]) continue;
      r.fired[p.key] = true;
      changed = true;
      pushAlarm({
        id: `rem-${r.id}`,
        title: `🔔 ${r.text}`,
        text: [`${fmtDate(p.at)} ${fmtTime(p.at)}`, repeatLabel(r)].filter(Boolean).join(" — "),
        tag: `rem-${r.id}-${p.key}`,
      });
    }
    // forget old "already rang" marks so the data stays small
    for (const k of Object.keys(r.fired)) if (/^\d+$/.test(k) && Number(k) < now - 2 * 864e5) { delete r.fired[k]; changed = true; }
  }
  // one-time reminders disappear a day after they rang
  const before = myReminders.length;
  myReminders = myReminders.filter((r) => r.repeat !== "once" || new Date(`${r.date}T${r.time}`).getTime() > now - 864e5);
  if (changed || myReminders.length !== before) saveMyReminders();
}

// ---------- the Reminders window ----------
function renderMyReminders() {
  const on = started;
  $("remStatus").classList.toggle("on", on);
  $("remStatusText").textContent = t(on ? "remStatusOn" : "remStatusOff");
  $("remToggle").textContent = t(on ? "setTurnOff" : "setTurnOn");
  $("remToggle").className = `btn small ${on ? "btn-ghost" : "btn-primary"}`;
  $("rmRepeat").innerHTML = REM_REPEATS.map((k) => `<option value="${k}">${esc(t(`rep_${k}`))}</option>`).join("");

  const now = Date.now();
  const rows = myReminders.map((r) => ({ r, at: nextReminderAt(r, now) })).sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity));
  $("remList").innerHTML = rows.length ? rows.map(({ r, at }) => `
    <li class="rem-item ${at == null ? "past" : ""}" data-rid="${r.id}">
      <span class="rem-ic">🔔</span>
      <span class="rem-main">
        <strong>${esc(r.text)}</strong>
        <span class="muted">${at != null ? esc(`${fmtDate(at)} · ${fmtTime(at)}`) : esc(t("passed"))}${repeatLabel(r) ? ` · ${esc(repeatLabel(r))}` : ""}</span>
        ${at != null ? `<span class="rem-when">${esc(fmtCountdown(at - now))}</span>` : ""}
      </span>
      <button type="button" class="pl-btn del" data-rdel title="${esc(t("delete"))}">✕</button>
    </li>`).join("") : `<li class="muted small-text rem-empty">${esc(t("remEmpty"))}</li>`;
}

function openMyReminders() {
  $("remForm").reset();
  $("rmDate").value = plKey(Date.now());
  // suggest the next full hour
  const d = new Date(Date.now() + 3600e3);
  $("rmTime").value = `${String(d.getHours()).padStart(2, "0")}:00`;
  $("rmMsg").textContent = "";
  renderMyReminders();
  $("remModal").hidden = false;
  setTimeout(() => $("rmText").focus(), 50);
}
const closeMyReminders = () => { $("remModal").hidden = true; };

async function addMyReminder(e) {
  e.preventDefault();
  const text = $("rmText").value.trim().slice(0, 120);
  const date = $("rmDate").value, time = $("rmTime").value, repeat = $("rmRepeat").value;
  if (!text || !date || !time) return;
  const r = { id: crypto.randomUUID(), text, date, time, repeat, fired: {}, snoozeUntil: null, createdAt: Date.now() };
  if (nextReminderAt(r) == null) {
    $("rmMsg").textContent = t("remInPast");
    $("rmMsg").className = "addr-msg err";
    return;
  }
  myReminders.push(r);
  saveMyReminders();
  if (!started) await setRemindersOn(true); // a reminder only helps if alarms are on
  $("rmText").value = "";
  $("rmMsg").textContent = t("remAdded", { when: `${fmtDate(nextReminderAt(r))} ${fmtTime(nextReminderAt(r))}` });
  $("rmMsg").className = "addr-msg ok";
  renderMyReminders();
  if (typeof renderView === "function") renderView();
  $("rmText").focus();
}

function initMyReminders() {
  $("remForm").addEventListener("submit", addMyReminder);
  $("remClose").addEventListener("click", closeMyReminders);
  $("remModal").addEventListener("mousedown", (e) => { if (e.target === $("remModal")) closeMyReminders(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("remModal").hidden) closeMyReminders(); });
  $("remToggle").addEventListener("click", async () => { await setRemindersOn(!started); renderMyReminders(); });
  $("remList").addEventListener("click", (e) => {
    const del = e.target.closest("[data-rdel]");
    if (!del) return;
    const id = del.closest("[data-rid]").dataset.rid;
    const r = myReminders.find((x) => x.id === id);
    if (!r || !confirm(t("remDelete", { text: r.text }))) return;
    myReminders = myReminders.filter((x) => x.id !== id);
    saveMyReminders();
    renderMyReminders();
    if (typeof renderView === "function") renderView();
  });
}
