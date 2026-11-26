// MyServiceTime — Contacts book for people you know.
// Each signed-in person has their own contacts, typed in by them and stored in their private, encrypted data.
// Loaded before app.js; app.js calls initContacts(), and uses contactById(), telHref(),
// fillContactSelects() and renderContacts().

const CONTACTS_KEY = "dailytime.contacts";
const RELATIONS = ["family", "friend", "client", "doctor", "work", "other"];

let contacts = (() => {
  try { return JSON.parse(store.getItem(CONTACTS_KEY)) || []; }
  catch { return []; }
})();
const openHistory = new Set();

const saveContacts = () => store.setItem(CONTACTS_KEY, JSON.stringify(contacts));
const contactById = (id) => (id ? contacts.find((c) => c.id === id) : null);
const telHref = (phone) => String(phone).replace(/[^\d+*#,;]/g, "");
const relLabel = (r) => t(`rel_${RELATIONS.includes(r) ? r : "other"}`);

// ---------- list ----------
function fillContactSelects() {
  const sorted = contacts.slice().sort((a, b) => a.name.localeCompare(b.name, uiLocale()));
  const keep = $("apptContact").value;
  $("apptContact").innerHTML = `<option value="">${esc(t("noContact"))}</option>` +
    sorted.map((c) => `<option value="${c.id}">${esc(c.name)}${c.relation ? ` · ${esc(relLabel(c.relation))}` : ""}</option>`).join("");
  $("apptContact").value = contactById(keep) ? keep : "";

  const relKeep = $("cRelFilter").value;
  $("cRelFilter").innerHTML = `<option value="">${esc(t("allRelations"))}</option>` +
    RELATIONS.map((r) => `<option value="${r}">${esc(relLabel(r))}</option>`).join("");
  $("cRelFilter").value = relKeep;

  if (typeof fillAssigneeSelects === "function") fillAssigneeSelects();
  const formKeep = $("cRelation").value;
  $("cRelation").innerHTML = RELATIONS.map((r) => `<option value="${r}">${esc(relLabel(r))}</option>`).join("");
  $("cRelation").value = formKeep || "friend";
}

function visitsWith(id) {
  return appts.filter((a) => a.contactId === id).sort((x, y) => whenOf(y) - whenOf(x));
}

function renderContacts() {
  const q = $("cSearch").value.trim().toLowerCase();
  const rel = $("cRelFilter").value;
  const list = contacts
    .filter((c) => (!rel || c.relation === rel) &&
      (!q || [c.name, c.phone, c.email, c.address, c.notes].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, uiLocale()));

  $("contactCount").textContent = contacts.length;
  $("contactEmpty").hidden = list.length > 0;
  $("contactEmpty").textContent = t(contacts.length ? "noContactsMatch" : "noContacts");

  $("contactList").innerHTML = list.map((c) => {
    const visits = visitsWith(c.id);
    const openTasks = tasks.filter((x) => x.assigneeId === c.id && !x.done).length;
    return `
      <li class="item contact" data-cid="${c.id}">
        <div>
          <h3>${avatarHtml(c.name, c.photo, "md")}<span>${esc(c.name)}<span class="tag rel-${esc(c.relation || "other")}">${esc(relLabel(c.relation))}</span></span></h3>
          <div class="meta">
            ${c.phone ? `<span>📞 ${esc(c.phone)}</span>` : ""}
            ${c.email ? `<span>✉️ ${esc(c.email)}</span>` : ""}
            ${visits.length ? `<span>📅 ${esc(t("visitsN", { n: visits.length }))}</span>` : ""}
            ${openTasks ? `<span class="assignee-chip">📋 ${esc(t("tasksForN", { n: openTasks }))}</span>` : ""}
          </div>
          ${c.address ? `<div class="meta" style="margin-top:4px">${navLinkFor(c)}</div>` : ""}
          ${c.notes ? `<div class="meta" style="margin-top:4px">📝 ${linkifyAddresses(c.notes)}</div>` : ""}
        </div>
        <div class="item-actions">
          ${c.phone ? `<a class="btn small go" href="tel:${esc(telHref(c.phone))}">${esc(t("call"))}</a>
                       <a class="btn small note-btn" href="sms:${esc(telHref(c.phone))}">${esc(t("sms"))}</a>` : ""}
          ${c.email ? `<a class="btn small note-btn" href="mailto:${esc(c.email)}">${esc(t("mail"))}</a>` : ""}
          ${c.address ? `<a class="btn small nav-mini" href="${contactNavUrl(c)}" target="_blank" rel="noopener">${esc(t("goGps"))}</a>` : ""}
          <button class="btn small btn-primary" data-cact="visit">${esc(t("newVisit"))}</button>
          <button class="btn small note-btn" data-cact="assign">${esc(t("assignTask"))}</button>
          <button class="btn small btn-ghost ${openHistory.has(c.id) ? "open" : ""}" data-cact="history">${esc(t("historyBtn"))}</button>
          <button class="btn small btn-ghost" data-cact="edit">${esc(t("edit"))}</button>
          <button class="btn small danger" data-cact="delete">${esc(t("delete"))}</button>
        </div>
        ${openHistory.has(c.id) ? historyPanel(visits) : ""}
      </li>`;
  }).join("");
}

const contactNavUrl = (c) => navUrl(c.lat != null ? `${c.lat},${c.lon}` : c.address);
const navLinkFor = (c) =>
  `<a class="addr-link" href="${contactNavUrl(c)}" target="_blank" rel="noopener" title="${esc(t("openGps"))}">📍 ${esc(c.address)}</a>`;

function historyPanel(visits) {
  if (!visits.length) return `<div class="note-panel"><span class="muted">${esc(t("noHistory"))}</span></div>`;
  return `
    <div class="note-panel">
      <div class="note-list">
        ${visits.map((a) => {
          const when = whenOf(a);
          const spent = (a.durations || []).reduce((s, d) => s + d, 0);
          const notes = (a.noteLog || []).length;
          return `
            <div class="note">
              <div class="note-head">
                <span>📅 ${fmtDate(when)} · ${fmtTime(when)} · ${esc(typeLabel(a.type))}</span>
                <span>${when > Date.now() ? esc(fmtCountdown(when - Date.now())) : ""}</span>
              </div>
              <div class="history-text">${[
                `<strong>${esc(a.title)}</strong>`,
                spent ? ` · ⏱ ${fmtDuration(spent)}` : "",
                notes ? ` · 📝 ${esc(t("notesN", { n: notes }))}` : "",
                a.notes ? `<br>${linkifyAddresses(a.notes)}` : "",
                ...(a.noteLog || []).map((n) => `<br>• ${linkifyAddresses(n.text)}`),
              ].join("")}</div>
            </div>`;
        }).join("")}
      </div>
    </div>`;
}

// ---------- contact form ----------
function openContactForm(c = null) {
  $("contactForm").reset();
  fillContactSelects();
  $("cId").value = c?.id || "";
  $("contactFormTitle").textContent = t(c ? "editContact" : "newContact").replace(/^\+\s*/, "");
  $("cName").value = c?.name || "";
  $("cPhoto").value = safePhoto(c?.photo);
  showContactPhotoButton();
  $("cPhone").value = c?.phone || "";
  $("cEmail").value = c?.email || "";
  $("cAddress").value = c?.address || "";
  $("cLat").value = c?.lat ?? "";
  $("cLon").value = c?.lon ?? "";
  $("cRelation").value = c?.relation || "friend";
  $("cNotes").value = c?.notes || "";
  $("contactModal").hidden = false;
  $("cName").focus();
}
function closeContactForm() { $("contactModal").hidden = true; }

function saveContactForm(e) {
  e.preventDefault();
  const id = $("cId").value;
  const data = {
    name: $("cName").value.trim(),
    photo: safePhoto($("cPhoto").value),
    phone: $("cPhone").value.trim(),
    email: $("cEmail").value.trim(),
    address: $("cAddress").value.trim(),
    lat: $("cLat").value !== "" ? Number($("cLat").value) : null,
    lon: $("cLon").value !== "" ? Number($("cLon").value) : null,
    relation: $("cRelation").value,
    notes: $("cNotes").value.trim(),
  };
  if (!data.name) return;
  if (id) {
    const c = contactById(id);
    delete c.birthday; delete c.bdayReminder; delete c.fired; // from an older version
    Object.assign(c, data);
  } else {
    contacts.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
  }
  saveContacts();
  closeContactForm();
  fillContactSelects();
  renderContacts();
  render();
}

/** Starts a new visit in the appointment form, filled in for this contact. */
function newVisitFor(c) {
  resetForm();
  $("apptContact").value = c.id;
  $("apptContact").dispatchEvent(new Event("change"));
  $("type").value = "Visit";
  $("title").value = `${t("visit")}: ${c.name}`;
  openApptForm();
  setTimeout(() => $("date").focus(), 60);
}

function showContactPhotoButton() {
  $("cPhotoBtn").innerHTML = avatarHtml($("cName").value || "?", $("cPhoto").value, "md");
}

// ---------- wiring ----------
function initContacts() {
  $("cPhotoBtn").addEventListener("click", () => openPhotoPicker({
    title: t("contactPhoto"),
    name: $("cName").value || "?",
    photo: $("cPhoto").value,
    onSave: (photo) => { $("cPhoto").value = photo || ""; showContactPhotoButton(); },
  }));
  $("cName").addEventListener("input", showContactPhotoButton); // initials follow the name
  $("newContact").addEventListener("click", () => openContactForm());
  $("contactForm").addEventListener("submit", saveContactForm);
  $("cCancel").addEventListener("click", closeContactForm);
  $("contactModal").addEventListener("mousedown", (e) => { if (e.target === $("contactModal")) closeContactForm(); });
  $("cSearch").addEventListener("input", renderContacts);
  $("cRelFilter").addEventListener("input", renderContacts);
  $("cAddress").addEventListener("input", () => { $("cLat").value = ""; $("cLon").value = ""; });
  $("cAddrFind").addEventListener("click", () => {
    openAddrModal((address, lat, lon) => {
      $("cAddress").value = address;
      $("cLat").value = lat ?? "";
      $("cLon").value = lon ?? "";
    });
    $("mAddr").value = $("cAddress").value;
    if ($("mAddr").value.trim().length >= 3) $("mSearch").click();
  });

  $("contactList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-cact]");
    if (!btn) return;
    const c = contactById(btn.closest("li[data-cid]").dataset.cid);
    if (!c) return;
    switch (btn.dataset.cact) {
      case "visit": newVisitFor(c); break;
      case "assign": openTaskForm(null, { assigneeId: c.id }); break;
      case "edit": openContactForm(c); break;
      case "history":
        if (openHistory.has(c.id)) openHistory.delete(c.id); else openHistory.add(c.id);
        renderContacts();
        break;
      case "delete":
        if (!confirm(t("deleteContactConfirm", { name: c.name }))) return;
        contacts = contacts.filter((x) => x.id !== c.id);
        saveContacts();
        fillContactSelects();
        renderContacts();
        render();
        break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("contactModal").hidden && $("addrModal").hidden) closeContactForm();
  });
}
