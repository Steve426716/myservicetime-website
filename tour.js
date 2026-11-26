// MyServiceTime — tutorials: a guided tour that highlights one part of the app at a time.
// The welcome tour starts by itself the first time someone opens the app; the ❓ button (and Settings)
// opens Help, where every tutorial can be replayed. Loaded before app.js (functions only);
// app.js calls initTour(). Texts for the 12 languages are in tour-text.js (TOUR_TEXT).

// Each step: which page to show, what to highlight (none = a card in the middle), and its text index.
const TOURS = {
  welcome:      { icon: "👋", steps: [
    { view: "dashboard" },
    { view: "dashboard", target: "#appNav" },
    { view: "dashboard", target: "#dashStats" },
    { view: "dashboard", target: ".dash-quick" },
    { view: "dashboard", target: "#menuBtn", alt: "#drawerPanel" }, // big screens: the menu is the list on the left
    { view: "tools", target: "#startBtn" },
    { view: "tools", target: "#helpBtn" },
  ] },
  appointments: { icon: "📅", steps: [
    { view: "tools", target: "#newAppt" },
    { view: "tools", target: "#listCard .filters" },
    { view: "tools", target: "#listCard .list" },
  ] },
  tracker:      { icon: "⏱️", steps: [
    { view: "tools", target: ".tracker-main" },
    { view: "tools", target: "#tcalGrid" },
    { view: "tools", target: "#tcalAdd" },
    { view: "tools", target: "#tcalPickBtn" },
  ] },
  events:       { icon: "🗓️", steps: [
    { view: "tools", target: "#newEvent" },
    { view: "tools", target: ".events-card" },
  ] },
  assignments:  { icon: "✅", steps: [
    { view: "tools", target: "#newTask" },
    { view: "tools", target: ".tasks-card" },
  ] },
  contacts:     { icon: "👤", steps: [
    { view: "tools", target: "#newContact" },
    { view: "tools", target: ".contacts" },
  ] },
  notes:        { icon: "📝", steps: [
    { view: "tools", target: ".quicknotes" },
  ] },
  planner:      { icon: "📒", steps: [
    { view: "tools", target: "#plAddForm" },
    { view: "tools", target: ".pl-views" },
  ] },
  activity:     { icon: "📈", steps: [
    { view: "activity", target: ".act-week" },
    { view: "activity", target: "#actFilters" },
  ] },
  profile:      { icon: "⚙️", steps: [
    { view: "profile", target: ".profile-card" },
    { view: "settings", target: ".settings-card" },
  ] },
};

const TOUR_DONE_KEY = "dailytime.tourDone"; // saved with the person's data (so it follows them to every device)

/** Text in the person's language (English if missing). */
function tourText(path) {
  const pick = (code) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), TOUR_TEXT[code]);
  return pick(lang) ?? pick("en") ?? "";
}

let tour = null; // { name, i }

function startTour(name) {
  if (!TOURS[name]) return;
  closeHelp();
  for (const id of ["apptModal", "timeModal", "eventModal", "taskModal", "contactModal", "stopModal"]) { const m = $(id); if (m) m.hidden = true; }
  if (typeof toggleMonthPicker === "function") toggleMonthPicker(false);
  tour = { name, i: 0 };
  $("tour").hidden = false;
  document.body.classList.add("touring");
  showTourStep();
}

function endTour() {
  if (!tour) return;
  if (tour.name === "welcome") store.setItem(TOUR_DONE_KEY, "1");
  tour = null;
  $("tour").hidden = true;
  document.body.classList.remove("touring");
}

function moveTour(delta) {
  if (!tour) return;
  const next = tour.i + delta;
  if (next < 0) return;
  if (next >= TOURS[tour.name].steps.length) return endTour();
  tour.i = next;
  showTourStep();
}

function showTourStep() {
  const def = TOURS[tour.name];
  const step = def.steps[tour.i];
  const [title, body] = tourText(`${tour.name}.${tour.i}`) || ["", ""];
  if (step.view === "tools") revealTool(step.target);   // opens the tool the step talks about
  else if (step.view && currentView !== step.view) showView(step.view);
  let el = step.target ? document.querySelector(step.target) : null;
  if (el && !el.getClientRects().length && step.alt) el = document.querySelector(step.alt);
  const visible = el && el.getClientRects().length;

  $("tourStepNo").textContent = tourText("ui.step").replace("{n}", tour.i + 1).replace("{total}", def.steps.length);
  $("tourTitle").textContent = `${tour.i === 0 ? `${def.icon} ` : ""}${title}`;
  $("tourBody").textContent = body;
  $("tourBack").hidden = tour.i === 0;
  $("tourBack").textContent = tourText("ui.back");
  $("tourSkip").textContent = tourText("ui.skip");
  $("tourSkip").hidden = tour.i === def.steps.length - 1;
  $("tourNext").textContent = tour.i === def.steps.length - 1 ? tourText("ui.done") : tourText("ui.next");
  $("tourDots").innerHTML = def.steps.map((_, i) => `<span class="${i === tour.i ? "on" : ""}"></span>`).join("");

  // bring the highlighted part on screen (below the menu bars), then draw the spotlight around it
  if (visible) {
    const top = el.getBoundingClientRect().top + window.scrollY;
    const inHeader = !!el.closest(".topbar, #appNav");
    window.scrollTo(0, inHeader ? 0 : Math.max(0, top - topBarsHeight() - 24));
  }
  $("tour").classList.toggle("centered", !visible);
  setTimeout(() => placeTour(visible ? el : null), 30);
  $("tourNext").focus({ preventScroll: true });
}

/** Puts the spotlight on the element and the card next to it (on phones the card sits at the bottom). */
function placeTour(el) {
  const spot = $("tourSpot"), card = $("tourCard");
  if (!el) {
    spot.style.cssText = "left:50%;top:40%;width:0;height:0";
    card.style.cssText = "";
    return;
  }
  const r = el.getBoundingClientRect(), pad = 8;
  spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
  if (window.innerWidth < 600) { card.style.cssText = ""; return; } // CSS docks it at the bottom
  const cw = card.offsetWidth, ch = card.offsetHeight, gap = 16;
  let top = r.bottom + pad + gap;
  if (top + ch > window.innerHeight - 10) top = r.top - pad - gap - ch;          // no room below: above
  if (top < 10) top = Math.min(window.innerHeight - ch - 10, Math.max(10, r.bottom - ch)); // still no room: overlap the bottom
  const left = Math.min(window.innerWidth - cw - 12, Math.max(12, r.left + r.width / 2 - cw / 2));
  card.style.cssText = `left:${left}px;top:${top}px`;
}

// ---------- Help: the list of tutorials ----------
function openHelp() {
  $("helpTitle").textContent = tourText("ui.helpTitle");
  $("helpIntro").textContent = tourText("ui.helpIntro");
  $("helpList").innerHTML = Object.entries(TOURS).map(([name, def]) => `
    <li><button type="button" class="help-item" data-tour="${name}">
      <span class="help-ic" data-ic="${def.icon}">${def.icon}</span>
      <span class="help-text"><strong>${esc(tourText(`names.${name}.0`))}</strong><span class="muted">${esc(tourText(`names.${name}.1`))}</span></span>
      <span class="help-go">▶</span>
    </button></li>`).join("");
  $("helpModal").hidden = false;
}
function closeHelp() { const m = $("helpModal"); if (m) m.hidden = true; }

function initTour() {
  $("helpBtn").addEventListener("click", openHelp);
  $("setHelp")?.addEventListener("click", openHelp);
  $("helpClose").addEventListener("click", closeHelp);
  $("helpModal").addEventListener("mousedown", (e) => { if (e.target === $("helpModal")) closeHelp(); });
  $("helpList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tour]");
    if (b) startTour(b.dataset.tour);
  });
  $("tourNext").addEventListener("click", () => moveTour(1));
  $("tourBack").addEventListener("click", () => moveTour(-1));
  $("tourSkip").addEventListener("click", endTour);
  document.addEventListener("keydown", (e) => {
    if (tour) {
      if (e.key === "Escape") endTour();
      else if (e.key === "ArrowRight") moveTour(1);
      else if (e.key === "ArrowLeft") moveTour(-1);
    } else if (e.key === "Escape" && !$("helpModal").hidden) closeHelp();
  });
  const replace = () => { if (tour) { const def = TOURS[tour.name].steps[tour.i]; const el = def.target && document.querySelector(def.target); placeTour(el && el.getClientRects().length ? el : null); } };
  window.addEventListener("resize", replace);
  window.addEventListener("scroll", replace, { passive: true });

  // the first time: welcome tour (a moment after the app opens)
  if (store.getItem(TOUR_DONE_KEY) !== "1" || store.getItem(WELCOME_KEY) !== "1") setTimeout(() => {
    if (!tour && $("paywall").hidden && $("countryModal").hidden && $("statusModal").hidden && $("aboutModal").hidden && $("welcomeModal").hidden && $("supportModal").hidden) {
      if (!maybeWelcome() && store.getItem(TOUR_DONE_KEY) !== "1") startTour("welcome"); // the welcome first (once), then the tour
    }
  }, 900);
}
