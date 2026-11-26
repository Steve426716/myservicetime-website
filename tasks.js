// MyServiceTime — Assignments (tasks with a due date) and "Assigned to" a person.
// Loaded before app.js (functions only). app.js calls initTasks(), and uses renderTasks(),
// fillAssigneeSelects(), assigneeName(), taskReminderPoints() and checkTaskReminders().
// Everything is stored in the signed-in person's private, encrypted data.

const TASKS_KEY = "dailytime.tasks";
const PRIORITIES = ["high", "normal", "low"];

let tasks = (() => {
  try { return JSON.parse(store.getItem(TASKS_KEY)) || []; }
  catch { return []; }
})();
const saveTasks = () => {
  store.setItem(TASKS_KEY, JSON.stringify(tasks));
  uploadReminderTimes(); // alerts when the app is closed
};
const taskById = (id) => tasks.find((x) => x.id === id);

/** When a task is due. Without a time, it's due at the end of that day. */
const dueOf = (task) => new Date(`${task.dueDate}T${task.dueTime || "23:59"}`).getTime();

// Titles to pick from (outline icons, like New event's picks): the meeting parts and congregation duties
const TASK_PARTS = [
  ["part_treasures", '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 6 3-6M12 9v12"/>'],
  ["part_ministry", '<path d="M12 21V9"/><path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 13c3 0 5-2 5-5-3 0-5 2-5 5zM12 9c-2.2 0-3.5-1.6-3.5-4 2.2 0 3.5 1.6 3.5 4zM12 9c2.2 0 3.5-1.6 3.5-4-2.2 0-3.5 1.6-3.5 4z"/><path d="M8 21h8"/>'],
  ["part_christians", '<circle cx="8" cy="7" r="2.6"/><circle cx="16" cy="7" r="2.6"/><path d="M3 20v-1.5C3 15.5 5.2 13 8 13s5 2.5 5 5.5V20M11 20v-1.5c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5V20"/>'],
  ["part_duties", '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11l2 2 4-4M9 17h6"/>'],
  ["part_cleaning", '<path d="M14.5 3.5L10 11"/><path d="M7 11h6l2 9H5z"/><path d="M8 15l-.5 5M11 15v5"/><path d="M18 9c2.5 0 3.5 2 3.5 4-2.5 0-3.5-2-3.5-4zM18 9v11"/>'],
];
const taskPartIcon = (path) => `<svg class="ev-svg" viewBox="0 0 24 24" aria-hidden="true"><g class="ev-line tk-line">${path}</g></svg>`;
const OTHER_NAME = "__other"; // "Other" in the Assigned to / Partner menus: the menu turns into a box to type a name
/** Names typed before (Assigned to and Partner): they join the menus, to pick next time. */
const typedTaskNames = () => [...new Set(tasks.flatMap((x) => [x.assigneeOther, x.partnerOther]).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, uiLocale()));

/** Who it's assigned to: a typed name, "Me", a contact's name, or "" if that contact was deleted. */
const taskWho = (x) => x.assigneeOther || assigneeName(x.assigneeId);
/** The partner, or "" (N/A). */
const taskPartner = (x) => x.partnerOther || (x.partnerId ? contactById(x.partnerId)?.name || "" : "");

/** "Me", a contact's name, or "" if that contact was deleted. */
function assigneeName(id) {
  if (!id) return t("me");
  return contactById(id)?.name || "";
}

// ---------- reminders ----------
function taskReminderPoints(task) {
  if (task.done) return [];
  const due = dueOf(task);
  const r = task.reminders || {};
  const pts = [];
  // without a time, "on the day" rings at 9:00 that morning
  const onDay = task.dueTime ? due : new Date(`${task.dueDate}T09:00`).getTime();
  if (r.dayBefore) pts.push({ key: "dayBefore", at: onDay - DAY, until: onDay, label: "alarmTaskTomorrow" });
  if (r.hourBefore && task.dueTime) pts.push({ key: "hourBefore", at: due - HOUR, until: due, label: "alarmTaskHour" });
  if (r.atTime) pts.push({ key: "atTime", at: onDay, until: onDay + 30 * 60000, label: "alarmTaskDue" });
  if (task.snoozeUntil) pts.push({ key: `snooze-${task.snoozeUntil}`, at: task.snoozeUntil, until: task.snoozeUntil + 60 * 60000, label: "alarmSnoozed" });
  return pts;
}

function checkTaskReminders(now) {
  let changed = false;
  for (const task of tasks) {
    task.fired = task.fired || {};
    for (const p of taskReminderPoints(task)) {
      if (task.fired[p.key]) continue;
      if (now >= p.at && now < p.until) {
        task.fired[p.key] = true;
        changed = true;
        const who = task.assigneeId || task.assigneeOther ? `👉 ${taskWho(task)}` : "";
        pushAlarm({
          id: `task-${task.id}`,
          title: `${t(p.label)}: ${task.title}`,
          text: [`${fmtDate(dueOf(task))}${task.dueTime ? " " + fmtTime(dueOf(task)) : ""}`, who, task.notes].filter(Boolean).join(" — "),
          tag: `task-${task.id}-${p.key}`,
        });
      } else if (now >= p.until) {
        task.fired[p.key] = true; // missed — don't ring late
        changed = true;
      }
    }
  }
  if (changed) store.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ---------- "Assigned to" menus ----------
function assigneeOptions(selected, { withEveryone = false } = {}) {
  const sorted = contacts.slice().sort((a, b) => a.name.localeCompare(b.name, uiLocale()));
  return [
    withEveryone ? `<option value="all">${esc(t("everyone"))}</option>` : "",
    `<option value="">${esc(t("me"))}</option>`,
    ...sorted.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`),
  ].join("");
}
function fillAssigneeSelects() {
  for (const [id, opts] of [["apptAssignee", {}], ["tAssignee", {}], ["fAssignee", { withEveryone: true }], ["tfAssignee", { withEveryone: true }]]) {
    const el = $(id);
    if (!el) continue;
    // the first time, filters start at "Everyone" and forms at "Me"
    const keep = el.options.length ? el.value : opts.withEveryone ? "all" : "";
    el.innerHTML = assigneeOptions(keep, opts);
    const valid = [...el.options].some((o) => o.value === keep);
    el.value = valid ? keep : opts.withEveryone ? "all" : "";
  }
  // the assignment form: Me / contacts / names typed before / Other; Partner: N/A / contacts / names typed before / Other
  const typed = typedTaskNames().map((n) => `<option value="o:${esc(n)}">${esc(n)}</option>`).join("");
  const other = `<option value="${OTHER_NAME}">${esc(t("someoneElse"))}</option>`;
  const ta = $("tAssignee");
  if (ta) { const keep = ta.value; ta.insertAdjacentHTML("beforeend", typed + other); ta.value = [...ta.options].some((o) => o.value === keep) ? keep : ""; }
  const tp = $("tPartner");
  if (tp) {
    const keep = tp.value;
    const sorted = contacts.slice().sort((a, b) => a.name.localeCompare(b.name, uiLocale()));
    tp.innerHTML = `<option value="">${esc(t("notApplicable"))}</option>` + sorted.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("") + typed + other;
    tp.value = [...tp.options].some((o) => o.value === keep) ? keep : "";
  }
  // the list's filter also offers the names typed in
  const tf = $("tfAssignee");
  if (tf) {
    const keep = tf.value;
    tf.insertAdjacentHTML("beforeend", typedTaskNames().map((n) => `<option value="o:${esc(n)}">${esc(n)}</option>`).join(""));
    tf.value = [...tf.options].some((o) => o.value === keep) ? keep : "all";
  }
}
const taskWhoKey = (x) => (x.assigneeOther ? `o:${x.assigneeOther}` : x.assigneeId || "");
const taskPartnerKey = (x) => (x.partnerOther ? `o:${x.partnerOther}` : x.partnerId || "-");
/** The list's person filter: assignments where that person is assigned or is the partner. */
const taskHasPerson = (x, who) => taskWhoKey(x) === who || taskPartnerKey(x) === who;
/** "Other" picked: the menu itself becomes the box to type the name (same place, no extra box). */
function syncTaskOthers() {
  for (const [sel, box] of [["tAssignee", "tAssigneeOther"], ["tPartner", "tPartnerOther"]]) {
    const on = $(sel).value === OTHER_NAME;
    $(sel).hidden = on;
    $(box).hidden = !on;
  }
}
/** What a menu + its box hold: { id } for a contact, { other } for a typed name, {} for Me / N/A. */
function readTaskPerson(sel, box) {
  const v = $(sel).value;
  if (v === OTHER_NAME) { const n = $(box).value.trim(); return n ? { other: n } : {}; }
  if (v.startsWith("o:")) return { other: v.slice(2) };
  return v ? { id: v } : {};
}
function markTaskPick() {
  const v = $("tTitle").value.trim().toLowerCase();
  document.querySelectorAll("#taskPicks .ev-pick").forEach((b) => b.classList.toggle("on", b.dataset.name.toLowerCase() === v));
}

// ---------- list ----------
function renderTasks() {
  const status = $("tfStatus").value;
  const who = $("tfAssignee").value;
  const q = $("tfSearch").value.trim().toLowerCase();
  const now = Date.now();
  const prRank = { high: 0, normal: 1, low: 2 };

  const list = tasks
    .filter((x) => status === "all" || (status === "done" ? x.done : !x.done))
    .filter((x) => who === "all" || taskHasPerson(x, who))
    .filter((x) => !q || [x.title, x.notes, taskWho(x), taskPartner(x)].join(" ").toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done) return (b.doneAt || 0) - (a.doneAt || 0);           // most recently done first
      return dueOf(a) - dueOf(b) || (prRank[a.priority] ?? 1) - (prRank[b.priority] ?? 1);
    });

  const open = tasks.filter((x) => !x.done);
  $("taskCount").textContent = open.length;
  $("taskOverdue").hidden = !open.some((x) => dueOf(x) < now);
  $("taskOverdue").textContent = t("overdueN", { n: open.filter((x) => dueOf(x) < now).length });
  $("taskEmpty").hidden = list.length > 0;
  $("taskEmpty").textContent = t(tasks.length ? "noTasksMatch" : "noTasks");

  $("taskList").innerHTML = list.map((x) => {
    const due = dueOf(x);
    const overdue = !x.done && due < now;
    const soon = !x.done && !overdue && due - now < DAY;
    const whenText = x.done
      ? t("doneOn", { date: fmtDate(x.doneAt || due) })
      : overdue ? t("overdueWas", { date: `${fmtDate(due)}${x.dueTime ? " " + fmtTime(due) : ""}` })
      : t("dueIn", { when: fmtCountdown(due - now) });
    const person = x.assigneeId ? contactById(x.assigneeId) : null;
    const name = taskWho(x);
    const partner = taskPartner(x);
    return `
      <li class="item task ${x.done ? "done" : ""} ${overdue ? "overdue" : ""} ${soon ? "soon" : ""} pr-${x.priority}" data-tid="${x.id}">
        <div class="task-row">
          <button class="task-check" data-tact="toggle" title="${esc(t(x.done ? "markUndone" : "markDone"))}" aria-pressed="${x.done}">${x.done ? "✓" : ""}</button>
          <div>
            <h3>${esc(x.title)}</h3>
            <div class="meta">
              <span>📅 ${fmtDate(due)}${x.dueTime ? ` · 🕒 ${fmtTime(due)}` : ""}</span>
              <span class="${overdue ? "late" : "countdown"}">${esc(whenText)}</span>
              ${name ? `<span class="assignee-chip">👉 ${esc(name)}</span>` : ""}
              ${partner ? `<span class="assignee-chip partner-chip">🤝 ${esc(t("partner"))}: ${esc(partner)}</span>` : ""}
            </div>
            ${x.notes ? `<div class="meta" style="margin-top:4px">📝 ${linkifyAddresses(x.notes)}</div>` : ""}
          </div>
        </div>
        <div class="item-actions">
          ${person && (person.phone || person.email) ? `<a class="btn small note-btn" href="${sendTaskHref(x, person)}">${esc(t("sendTask"))}</a>` : ""}
          <button class="btn small btn-ghost" data-tact="edit">${esc(t("edit"))}</button>
          <button class="btn small danger" data-tact="delete">${esc(t("delete"))}</button>
        </div>
      </li>`;
  }).join("");
}

/** Text or email the assignment to the person it's assigned to (opens the phone's own app). */
function sendTaskHref(task, person) {
  const due = dueOf(task);
  const text = t("sendTaskText", {
    name: person.name, title: task.title,
    date: `${fmtDate(due)}${task.dueTime ? " " + fmtTime(due) : ""}`,
  }) + (task.notes ? `\n${task.notes}` : "");
  if (person.phone) return `sms:${telHref(person.phone)}?&body=${encodeURIComponent(text)}`;
  return `mailto:${encodeURIComponent(person.email)}?subject=${encodeURIComponent(task.title)}&body=${encodeURIComponent(text)}`;
}

// ---------- form ----------
function openTaskForm(task = null, preset = {}) {
  $("taskForm").reset();
  fillAssigneeSelects();
  $("tId").value = task?.id || "";
  $("taskFormTitle").textContent = t(task ? "editTask" : "newTask").replace(/^\+\s*/, "");
  $("tTitle").value = task?.title || "";
  $("taskPicks").innerHTML = TASK_PARTS.map(([k, path]) => `<button type="button" class="ev-pick" data-name="${esc(t(k))}">${taskPartIcon(path)} ${esc(t(k))}</button>`).join("");
  markTaskPick();
  $("tDueDate").value = task?.dueDate || dayKey(Date.now() + DAY);
  $("tDueTime").value = task?.dueTime || "";
  $("tAssignee").value = task?.assigneeOther ? `o:${task.assigneeOther}` : task ? (contactById(task.assigneeId) ? task.assigneeId : "") : preset.assigneeId || "";
  $("tAssigneeOther").value = "";
  $("tPartner").value = task?.partnerOther ? `o:${task.partnerOther}` : contactById(task?.partnerId) ? task.partnerId : "";
  $("tPartnerOther").value = "";
  syncTaskOthers();
  $("tNotes").value = task?.notes || "";
  const r = task?.reminders || { dayBefore: true, hourBefore: false, atTime: true };
  $("tRemDay").checked = !!r.dayBefore;
  $("tRemHour").checked = !!r.hourBefore;
  $("tRemAt").checked = !!r.atTime;
  $("taskModal").hidden = false;
  $("tTitle").focus();
}
const closeTaskForm = () => { $("taskModal").hidden = true; };

function saveTaskForm(e) {
  e.preventDefault();
  const id = $("tId").value;
  const data = {
    title: $("tTitle").value.trim(),
    dueDate: $("tDueDate").value,
    dueTime: $("tDueTime").value,
    assigneeId: readTaskPerson("tAssignee", "tAssigneeOther").id || null,
    assigneeOther: readTaskPerson("tAssignee", "tAssigneeOther").other || "",
    partnerId: readTaskPerson("tPartner", "tPartnerOther").id || null,
    partnerOther: readTaskPerson("tPartner", "tPartnerOther").other || "",
    notes: $("tNotes").value.trim(),
    reminders: { dayBefore: $("tRemDay").checked, hourBefore: $("tRemHour").checked, atTime: $("tRemAt").checked },
  };
  if (!data.title || !data.dueDate) return;
  if (id) {
    const task = taskById(id);
    if (task.dueDate !== data.dueDate || task.dueTime !== data.dueTime) task.fired = {};
    Object.assign(task, data);
  } else {
    tasks.push({ id: crypto.randomUUID(), ...data, done: false, doneAt: null, fired: {}, createdAt: Date.now() });
  }
  saveTasks();
  closeTaskForm();
  fillAssigneeSelects(); // a newly typed name joins the list's filter
  renderTasks();
  renderPlanner();
  renderContacts();
  const r = data.reminders; // the first reminder turns alarms on by itself
  if (typeof remindersOnAfterSave === "function") remindersOnAfterSave([r.dayBefore && t("remDueDay"), r.hourBefore && t("remDueHour"), r.atTime && t("remDueAt")]);
}

// ---------- wiring ----------
function initTasks() {
  $("newTask").addEventListener("click", () => openTaskForm());
  $("taskForm").addEventListener("submit", saveTaskForm);
  $("tCancel").addEventListener("click", closeTaskForm);
  $("taskModal").addEventListener("mousedown", (e) => { if (e.target === $("taskModal")) closeTaskForm(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("taskModal").hidden) closeTaskForm(); });
  ["tfStatus", "tfAssignee", "tfSearch"].forEach((id) => $(id).addEventListener("input", renderTasks));

  $("taskList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tact]");
    if (!btn) return;
    const task = taskById(btn.closest("li[data-tid]").dataset.tid);
    if (!task) return;
    switch (btn.dataset.tact) {
      case "toggle":
        task.done = !task.done;
        task.doneAt = task.done ? Date.now() : null;
        break;
      case "edit": openTaskForm(task); return;
      case "delete":
        if (!confirm(t("deleteTaskConfirm", { title: task.title }))) return;
        tasks = tasks.filter((x) => x.id !== task.id);
        break;
    }
    saveTasks();
    renderTasks();
    renderContacts();
    renderPlanner();
  });
}

// Title picks, and the "type a name" boxes
document.addEventListener("click", (e) => {
  const b = e.target.closest("#taskPicks .ev-pick");
  if (!b) return;
  $("tTitle").value = b.dataset.name;
  markTaskPick();
});
document.addEventListener("input", (e) => { if (e.target.id === "tTitle") markTaskPick(); });
document.addEventListener("change", (e) => {
  if (e.target.id !== "tAssignee" && e.target.id !== "tPartner") return;
  syncTaskOthers();
  const box = $(e.target.id + "Other");
  if (!box.hidden) box.focus();
});
// left empty: back to the menu
document.addEventListener("focusout", (e) => {
  if (!["tAssigneeOther", "tPartnerOther"].includes(e.target.id) || e.target.value.trim()) return;
  const sel = $(e.target.id.replace("Other", ""));
  sel.value = "";
  setTimeout(syncTaskOthers, 150); // after a tap on Save, which then counts it as Me / N/A
});
