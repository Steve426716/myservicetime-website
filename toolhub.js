// MyServiceTime — the "Tools" page (top menu): every tool in one list, and a Search that finds anything you
// saved — contacts, appointments / visits, events, assignments, to-dos and Quick Notes — and opens it.
// Loaded before pages.js / app.js (functions only); app.js calls initToolHub().

const HUB_TOOLS = [
  { sel: ".tracker", icon: "⏱️", key: "trackerTitle" },
  { sel: "#listCard", icon: "📅", key: "actAppts" },
  { sel: ".events-card", icon: "🗓️", key: "events" },
  { sel: ".tasks-card", icon: "✅", key: "assignments" },
  { sel: ".contacts", icon: "👥", key: "contacts" },
  { sel: ".quicknotes", icon: "📝", key: "quickNotes" },
  { sel: ".planner", icon: "📒", key: "planner" },
  { sel: ".map-card", icon: "🗺️", key: "mapTitle" },
  { sel: ".territories-card", icon: "🏘️", key: "trTitle" },
];
const hubName = (key) => t(key).replace(LEADING_ICON, "");
const hubToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** A small number on each tool: what is coming up or still open. */
function hubCount(sel) {
  const now = Date.now(), today = hubToday();
  if (sel === "#listCard") return appts.filter((a) => whenOf(a) >= now).length;
  if (sel === ".events-card") return events.filter((ev) => (ev.endDate || ev.startDate) >= today).length;
  if (sel === ".tasks-card") return tasks.filter((x) => !x.done).length;
  if (sel === ".contacts") return contacts.length;
  if (sel === ".moments-card") return Moments.list().length;
  if (sel === ".territories-card") return typeof territories !== "undefined" ? territories.filter((x) => !x.done).length : 0;
  if (sel === ".planner") return todos.filter((x) => !x.done && (!x.date || x.date >= today)).length;
  return 0;
}

/** Everything saved that matches the words typed (up to 30). */
function hubFind(q) {
  const s = q.toLowerCase();
  const has = (...parts) => parts.filter(Boolean).join(" ").toLowerCase().includes(s);
  const out = [];
  for (const x of (typeof territories !== "undefined" ? territories : []))
    if (has(x.number, x.name, x.notes)) out.push({ icon: "🏘️", label: trLabel(x), sub: x.number ? `${t("trTitleOne")} ${x.number}` : "", open: () => { goToTool(".territories-card"); openTerritory(x.id); } });
  for (const c of contacts) if (has(c.name, c.phone, c.email, c.address, c.notes))
    out.push({ icon: "👤", label: c.name, sub: [c.phone, c.address].filter(Boolean).join(" · "), open: () => openContactForm(c) });
  for (const a of appts) if (has(a.title, a.address, a.notes, a.email, contactById?.(a.contactId)?.name))
    out.push({ icon: a.type === "Visit" ? "🏠" : "📅", label: a.title, sub: [`${fmtDate(whenOf(a))} ${fmtTime(whenOf(a))}`, a.address].filter(Boolean).join(" · "), open: () => editAppt(a.id) });
  for (const ev of events) if (has(eventTitle(ev), ev.address, ev.notes))
    out.push({ icon: "🗓️", label: eventTitle(ev), sub: [ev.startDate, ev.address].filter(Boolean).join(" · "), open: () => openEventForm(ev) });
  for (const x of tasks) if (has(x.title, x.notes))
    out.push({ icon: x.done ? "☑️" : "✅", label: x.title, sub: x.dueDate || "", open: () => openTaskForm(x) });
  for (const x of todos) if (has(x.text))
    out.push({ icon: x.done ? "☑️" : "📒", label: x.text, sub: x.date || "", open: () => {
      if (x.date) { plannerDate = x.date; plannerView = "day"; }
      goToTool(".planner");
      if (typeof renderPlanner === "function") renderPlanner();
    } });
  for (const m of Moments.list()) if (has(m.caption))
    out.push({ icon: "📸", label: m.caption, sub: m.date || "", open: () => { goToTool(".moments-card"); Moments.open(m.id); } });
  const notes = $("quickNotes").value;
  const at = notes.toLowerCase().indexOf(s);
  if (at >= 0) {
    const line = notes.slice(notes.lastIndexOf("\n", at) + 1).split("\n")[0];
    out.push({ icon: "📝", label: line.slice(0, 80), sub: hubName("quickNotes"), open: () => {
      goToTool(".quicknotes");
      setTimeout(() => { const ta = $("quickNotes"); ta.focus({ preventScroll: true }); ta.setSelectionRange(at, at + s.length); }, 120);
    } });
  }
  return out.slice(0, 30);
}

let hubResults = [];
let hubMode = "tools"; // "tools" (the Tools button) or "search" (the 🔍 Search button: nothing listed until you type)
function renderToolHub() {
  const q = $("hubSearch").value.trim();
  const search = hubMode === "search";
  $("hubTitle").textContent = t(search ? "mapSearchBtn" : "navTools");
  $("hubTitle").dataset.icon = search ? "🔍" : "🧰";
  const tools = search && !q ? [] : HUB_TOOLS.filter((x) => !q || hubName(x.key).toLowerCase().includes(q.toLowerCase()));
  $("hubTools").innerHTML = tools.map((x) => {
    const n = hubCount(x.sel);
    return `<li><button type="button" class="hub-tool" data-hub-tool="${x.sel}">
      <span class="hub-ic" data-ic="${x.icon}">${x.icon}</span><span class="hub-name">${esc(hubName(x.key))}</span>
      ${n ? `<span class="hub-count">${n}</span>` : ""}<span class="hub-chev" aria-hidden="true">›</span></button></li>`;
  }).join("");
  $("hubToolsHead").hidden = !tools.length;

  hubResults = q ? hubFind(q) : [];
  $("hubFoundHead").hidden = !q;
  $("hubFound").innerHTML = hubResults.map((r, i) => `<li><button type="button" class="hub-hit" data-hub-hit="${i}">
      <span class="hub-ic" data-ic="${r.icon}">${r.icon}</span>
      <span class="hub-txt"><strong>${esc(r.label)}</strong>${r.sub ? `<span class="muted">${esc(r.sub)}</span>` : ""}</span>
      <span class="hub-chev" aria-hidden="true">›</span></button></li>`).join("");
  $("hubNone").hidden = !q || hubResults.length > 0 || tools.length > 0;
}

/** The 🔍 Search button in the top bar: opens Tools with the cursor in the search box. */
function openHubSearch() {
  showView("toolhub");
  hubMode = "search";
  renderToolHub();
  const box = $("hubSearch");
  setTimeout(() => { box.focus(); box.select(); }, 60);
  $("navSearch").classList.add("on");
  document.querySelector('#appNav [data-view="toolhub"]').classList.remove("on");
}

function initToolHub() {
  $("navSearch").addEventListener("click", openHubSearch);
  // leaving the page (or picking another button): the Search button goes back to normal
  $("appNav").addEventListener("click", (e) => { if (!e.target.closest("#navSearch")) $("navSearch").classList.remove("on"); });
  // ⚙️ More
  const onMore = (e) => {
    const b = e.target.closest("[data-more]");
    if (!b) return;
    const what = b.dataset.more;
    if (what === "reminders") openMyReminders();
    else if (what === "settings") showView("settings");
    else if (what === "help") openHelp();
    else if (what === "feedback") openFeedback();
    else if (what === "theme") DailyTheme.toggle();
    else if (what === "logout") $("acctOut").click();
    else if (what === "cloud") goCloud();
    else if (what === "shareapp") openShareApp(); // a QR code of the app's link
    else if (what === "security") openSecurity();  // Settings → Security (App lock)
    else if (what === "rate") openRate();          // ⭐ the store page
    else if (what === "whatsnew") openWhatsNew();  // every update, in plain words
    else if (what === "appinfo") openAppInfo();    // version, this device, credits
    else if (what === "privacy" || what === "terms") openLegal(what); // inside the app, with ✕
    else if (what === "sync") { // Device Sync: in Settings it opens/closes right there; elsewhere it opens Settings on it
      if (currentView === "settings" && !$("setSupportWrap").hidden) setDeviceSyncOpen(false);
      else openDeviceSync();
    }
  };
  $("moreList").addEventListener("click", onMore);
  $("setMoreList").addEventListener("click", onMore); // the same list at the top of Settings
  $("setSyncList").addEventListener("click", onMore); // Settings → Device Sync
  $("hubForm").addEventListener("submit", (e) => { e.preventDefault(); renderToolHub(); $("hubSearch").blur(); });
  let timer = null;
  $("hubSearch").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(renderToolHub, 200); });
  document.querySelector('[data-page="toolhub"]').addEventListener("click", (e) => {
    const tool = e.target.closest("[data-hub-tool]");
    if (tool) return goToTool(tool.dataset.hubTool);
    const hit = e.target.closest("[data-hub-hit]");
    if (hit) hubResults[Number(hit.dataset.hubHit)]?.open();
  });
}

function renderMore() { paintThemeControls(); }
