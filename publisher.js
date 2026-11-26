// MyServiceTime — publisher status and the monthly hours goal that comes with it.
// Asked once when the app opens (after the country question), changeable any time in Profile.
// The goal shows on the Dashboard and the Progress page: hours tracked this month against the goal.
// Loaded before app.js (functions only); app.js calls initPublisher().

const PUB_STATUSES = [
  { id: "publisher", hours: 0 },    // no hour requirement
  { id: "auxiliary", hours: 30 },
  { id: "regular",   hours: 50 },
  { id: "special",   hours: 100 },
  { id: "co",        hours: 50 },
  { id: "custom",    hours: null }, // the person sets the goal (now or later)
];

const pubStatus = () => loadProfile().pubStatus || "";
/** Monthly goal in hours: 0 = no requirement, null = custom without a goal yet. */
function pubGoal() {
  const p = loadProfile();
  if (p.pubStatus === "custom") return p.pubGoal > 0 ? p.pubGoal : null;
  return PUB_STATUSES.find((s) => s.id === p.pubStatus)?.hours ?? null;
}
const pubLabel = (id) => t(`pub_${id}`);
const pubSub = (s) => (s.hours === 0 ? t("pubNoReq") : s.hours ? t("pubGoalN", { n: s.hours }) : t("pubCustomSub"));

/** "2025-03-01" → "March 1, 2025" */
const sinceText = (key) => (key ? new Date(`${key}T12:00`).toLocaleDateString(uiLocale(), { year: "numeric", month: "long", day: "numeric" }) : "");

function savePubStatus(status, goal, since) {
  const p = loadProfile();
  p.pubStatus = status;
  if (since !== undefined) p.pubSince = since || "";
  if (status === "custom") p.pubGoal = goal > 0 ? Math.min(999, Math.round(goal * 10) / 10) : null;
  else delete p.pubGoal;
  saveProfile(p);
}

// ---------- the question (when the app opens) ----------
function pubOptionsHtml(selected) {
  return PUB_STATUSES.map((s) => `
    <label class="pub-opt">
      <input type="radio" name="pubStatus" value="${s.id}" ${s.id === selected ? "checked" : ""} />
      <span class="pub-opt-body"><strong>${esc(pubLabel(s.id))}</strong><span class="muted small-text">${esc(pubSub(s))}</span></span>
    </label>`).join("");
}

function openStatusModal(setupStep = false) {
  setupLook("statusModal", setupStep ? "status" : null); // full page when the app opens; a window from "Change"
  const p = loadProfile();
  $("psOptions").innerHTML = pubOptionsHtml(p.pubStatus || "");
  $("psGoal").value = p.pubStatus === "custom" && p.pubGoal ? p.pubGoal : "";
  $("psSince").value = p.pubSince || "";
  $("psSince").dataset.for = p.pubStatus || "";
  $("psMsg").textContent = "";
  showCustomGoal();
  $("statusModal").hidden = false;
}
function showCustomGoal() {
  const picked = document.querySelector('#psOptions input[name="pubStatus"]:checked')?.value || "";
  $("psCustom").hidden = picked !== "custom";
  // "When did you start as Regular Pioneer?" — for whatever status is picked
  $("psSinceWrap").hidden = !picked;
  if (picked) $("psSinceLabel").textContent = t("pubSinceQ", { status: pubLabel(picked) });
  if (picked && $("psSince").dataset.for && $("psSince").dataset.for !== picked) $("psSince").value = ""; // a new status: a new start date
  if (picked) $("psSince").dataset.for = picked;
}

/** What to ask when the app opens, one question at a time: country, then status, then the welcome tour. */
function nextOpeningStep() {
  // the demo: no setup questions (no name, phone, email or password) — an example profile is filled in instead
  if (store.demo) {
    const p = loadProfile();
    if (!p.aboutDone || !p.pubStatus) {
      p.aboutDone = true;
      p.pubStatus = p.pubStatus || "regular"; // a Regular Pioneer: the monthly hours goal shows in the demo
      p.pubSince = p.pubSince || "2020-09-01";
      saveProfile(p);
      if (typeof renderGoalBoxes === "function") renderGoalBoxes();
      if (typeof renderView === "function") renderView();
    }
  }
  // a profile made on this device, now in an account: the account's email is the contact email, and the name and
  // phone go with the account (as "Edit profile" does) — without asking "About you" again
  if (!store.demo && !store.local && loadProfile().aboutDone && !store.getItem?.("dailytime.profileSent")) {
    const p = loadProfile();
    if (!p.contactEmail && store.user?.email) { p.contactEmail = store.user.email; saveProfile(p); }
    try {
      sb?.auth.updateUser({ data: { name: store.user.name, phone: p.phone || "", contact_email: p.contactEmail || "", lang } })
        .then(({ error }) => { if (!error) store.setItem?.("dailytime.profileSent", "1"); }).catch(() => {});
    } catch {}
  }
  // a Cloud account (it was made from inside the app, after the setup): the setup isn't asked again
  if (!aboutComplete() && store.user && !store.local && !store.demo) {
    const p = loadProfile();
    p.aboutDone = true;
    if (!p.name && store.user.name) p.name = store.user.name;
    saveProfile(p);
    if (!pubStatus()) store.setItem("dailytime.pubSkipSetup", "1");
    if (store.getItem(WELCOME_KEY) !== "1") store.setItem(WELCOME_KEY, "1");
    if (typeof TOUR_DONE_KEY !== "undefined") store.setItem(TOUR_DONE_KEY, "1"); // nor the welcome tour
  }
  if (!aboutComplete()) return openAboutModal(true);
  if (!store.demo && !myCountry()) return openCountryModal();
  if (typeof askAccountAfterSetup === "function" && askAccountAfterSetup()) return; // first open: "Do you have an account?" (after About you + country)
  if (!pubStatus() && store.getItem("dailytime.pubSkipSetup") !== "1") return openStatusModal(true); // then the publisher status, then the welcome
  if (maybeWelcome()) return; // the welcome from Steeve (once); the tour starts when it is closed
  if (typeof startTour === "function" && !tour && store.getItem(TOUR_DONE_KEY) !== "1") setTimeout(() => startTour("welcome"), 300);
}

// ---------- the monthly goal box (Dashboard and Progress) ----------
function monthBounds(ts = Date.now()) {
  const d = new Date(ts);
  return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime() };
}

function goalBoxHtml() {
  const status = pubStatus();
  if (!status) return "";
  const { from, to } = monthBounds();
  const done = trackedBetween(from, to);
  const goal = pubGoal();
  const month = new Date().toLocaleDateString(uiLocale(), { month: "long" });
  const since = loadProfile().pubSince;
  const head = `<div class="goal-head"><span class="goal-status">${esc(pubLabel(status))}${since ? ` <span class="goal-since">${esc(t("pubSince", { date: sinceText(since) }))}</span>` : ""}</span>
    <span class="goal-actions">
      <button type="button" class="goal-share" data-pub-share title="${esc(t("pubShare"))}">${SHARE_ICON}<span>${esc(t("pubShare"))}</span></button>
      <button type="button" class="link-btn small-text" data-pub-change>${esc(t("pubChange"))}</button>
    </span></div>`;
  if (goal === 0) {
    return `${head}<div class="goal-line"><strong>${esc(fmtHM(done))}</strong> <span class="muted">${esc(t("pubThisMonth", { month }))} · ${esc(t("pubNoReq"))}</span></div>`;
  }
  if (goal == null) {
    return `${head}<div class="goal-line"><strong>${esc(fmtHM(done))}</strong> <span class="muted">${esc(t("pubThisMonth", { month }))}</span></div>
      <p class="muted small-text">${esc(t("pubNoGoalYet"))} <button type="button" class="link-btn small-text" data-pub-change>${esc(t("pubAddGoal"))}</button></p>`;
  }
  const goalMs = goal * 3600e3;
  const share = Math.min(1, done / goalMs);
  const left = Math.max(0, goalMs - done);
  return `${head}
    <div class="goal-line"><strong>${esc(fmtHM(done))}</strong> <span class="muted">${esc(t("pubOfGoal", { goal, month }))}</span></div>
    <div class="goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(share * 100)}"><span style="width:${Math.max(share ? 2 : 0, share * 100)}%"></span></div>
    <div class="goal-foot"><span>${Math.round(share * 100)}%</span><span class="${left ? "" : "goal-done"}">${esc(left ? t("pubToGo", { time: fmtHM(left) }) : t("pubReached"))}</span></div>`;
}

const SHARE_ICON = `<svg class="share-ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5"/><path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12"/></svg>`;

// ---------- share my goal: a picture and a short text, through the device's own share menu ----------
/** "2026-11" → the 1st of that month (local time). */
const monthStart = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).getTime(); };

/** The status and goal of a month: what was saved that month, or (for older months) the current one. */
function goalOfMonth(key) {
  const saved = loadProfile().goalLog?.[key];
  if (saved && key !== monthKey()) return saved;
  return { status: pubStatus(), goal: pubGoal() };
}

/** Remembers this month's status and goal, so the month can still be shared later (after it ends). */
function recordGoalMonth() {
  const status = pubStatus();
  if (!status) return;
  const key = monthKey(), goal = pubGoal();
  const p = loadProfile();
  const old = p.goalLog?.[key];
  if (old && old.status === status && old.goal === goal) return;
  saveProfile({ ...p, goalLog: { ...(p.goalLog || {}), [key]: { status, goal } } });
}

/** Everything about one month's goal (this month by default). */
function goalFacts(key = monthKey()) {
  const { status, goal } = goalOfMonth(key);
  const from = monthStart(key);
  const { to } = monthBounds(from);
  const done = trackedBetween(from, to);
  const month = new Date(from).toLocaleDateString(uiLocale(), { month: "long", year: "numeric" });
  const share = goal ? Math.min(1, done / (goal * 3600e3)) : null;
  return { key, status, done, goal, month, share, reached: !!goal && done >= goal * 3600e3, past: key !== monthKey() };
}

/** Months that can be shared: this one and the ones before it, back to the start date (up to 12). */
function goalHistoryKeys() {
  const since = loadProfile().pubSince;
  const first = since ? monthKey(new Date(`${since}T12:00`).getTime()) : monthKey();
  const keys = [];
  const d = new Date(); d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const k = monthKey(d.getTime());
    if (k < first) break;
    keys.push(k);
    d.setMonth(d.getMonth() - 1);
  }
  return keys;
}

function renderGoalHistory() {
  const card = $("prGoalHist");
  if (!card) return;
  const keys = pubStatus() ? goalHistoryKeys() : [];
  card.hidden = !keys.length;
  if (!keys.length) return;
  $("prGoalHistList").innerHTML = keys.map((k) => {
    const f = goalFacts(k);
    const result = f.goal ? (f.reached ? `<span class="gh-ok">✓ ${esc(t("pubReachedShort"))}</span>` : `<span class="muted">${Math.round(f.share * 100)}%</span>`) : "";
    return `<li>
      <div class="gh-main"><strong>${esc(f.month)}</strong>
        <span class="muted small-text">${esc(pubLabel(f.status))}${f.goal ? ` · ${esc(t("pubGoalN", { n: f.goal }))}` : ""}</span></div>
      <div class="gh-hours"><strong>${esc(fmtHM(f.done))}</strong>${result}</div>
      <button type="button" class="goal-share" data-pub-share data-month="${k}" title="${esc(t("pubShare"))}">${SHARE_ICON}<span>${esc(t("pubShare"))}</span></button>
    </li>`;
  }).join("");
}

function goalShareText(f) {
  const vars = { status: pubLabel(f.status), done: fmtHM(f.done), goal: f.goal, month: f.month, pct: Math.round((f.share || 0) * 100) };
  return t(f.reached ? "pubShareReached" : f.goal ? "pubShareProgress" : "pubShareHours", vars);
}

/** A square picture of this month's goal (like a small poster), as a PNG file. */
async function goalShareImage(f) {
  const S = 1080, c = document.createElement("canvas");
  c.width = c.height = S;
  const x = c.getContext("2d");
  const bg = x.createLinearGradient(0, 0, S, S);
  bg.addColorStop(0, "#1e3a8a"); bg.addColorStop(0.55, "#4c1d95"); bg.addColorStop(1, "#6d28d9");
  x.fillStyle = bg; x.fillRect(0, 0, S, S);
  for (const [cx, cy, r, a] of [[880, 180, 320, 0.10], [160, 920, 380, 0.08]]) { // soft light circles
    x.fillStyle = `rgba(255,255,255,${a})`; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  }
  try { // logo + name
    const img = new Image(); img.src = "icons/logo.svg"; await img.decode();
    x.drawImage(img, 90, 84, 96, 96);
  } catch {}
  const font = (w, px) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  x.fillStyle = "#fff"; x.textBaseline = "middle";
  x.font = font(800, 46); x.fillText("MyServiceTime", 210, 132);
  x.textBaseline = "alphabetic";
  x.fillStyle = "#c4b5fd"; x.font = font(750, 44); x.fillText(pubLabel(f.status), 90, 330);
  x.fillStyle = "rgba(255,255,255,.75)"; x.font = font(600, 38); x.fillText(f.month, 90, 386);
  x.fillStyle = "#fff"; x.font = font(850, 170); x.fillText(fmtHM(f.done), 84, 590);
  if (f.goal) {
    x.fillStyle = "rgba(255,255,255,.8)"; x.font = font(650, 44); x.fillText(t("pubOfGoalShort", { goal: f.goal }), 92, 660);
    const bx = 90, by = 730, bw = S - 180, bh = 42, r = 21;
    const round = (w) => { x.beginPath(); x.moveTo(bx + r, by); x.arcTo(bx + w, by, bx + w, by + bh, r); x.arcTo(bx + w, by + bh, bx, by + bh, r); x.arcTo(bx, by + bh, bx, by, r); x.arcTo(bx, by, bx + w, by, r); x.closePath(); };
    x.fillStyle = "rgba(255,255,255,.18)"; round(bw); x.fill();
    const fill = x.createLinearGradient(bx, 0, bx + bw, 0);
    fill.addColorStop(0, "#60a5fa"); fill.addColorStop(1, "#f0abfc");
    x.fillStyle = fill; round(Math.max(bh, bw * f.share)); x.fill();
    x.fillStyle = "#fff"; x.font = font(800, 52);
    x.fillText(f.reached ? `🎉 ${t("pubCelebrate")}` : `${Math.round(f.share * 100)}%`, 90, 870);
    if (!f.reached && !f.past) {
      x.textAlign = "right"; x.fillStyle = "rgba(255,255,255,.85)"; x.font = font(700, 42);
      x.fillText(t("pubToGo", { time: fmtHM(f.goal * 3600e3 - f.done) }), S - 90, 868);
      x.textAlign = "left";
    }
  } else {
    x.fillStyle = "rgba(255,255,255,.8)"; x.font = font(650, 44); x.fillText(t("pubThisMonth", { month: f.month }), 92, 660);
  }
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}

let sharing = false;
async function shareGoal(trigger) {
  if (sharing || !pubStatus()) return;
  sharing = true;
  const host = trigger?.closest(".goal-card, .trk-goal, .celebrate-card, .gh-card"); // remembered now: the box can be redrawn meanwhile
  const f = goalFacts(trigger?.dataset.month || monthKey());
  const text = goalShareText(f);
  try {
    const blob = await goalShareImage(f);
    const file = blob && new File([blob], "myservicetime-goal.png", { type: "image/png" });
    if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text });
    else if (navigator.share) await navigator.share({ text });
    else {
      await navigator.clipboard.writeText(text);
      shareNote(host, t("pubShareCopied"));
    }
  } catch (err) {
    if (err?.name !== "AbortError") { // anything but "they closed the share menu": copy the text instead
      try { await navigator.clipboard.writeText(text); shareNote(host, t("pubShareCopied")); } catch {}
    }
  } finally {
    sharing = false;
    host?.closest(".celebrate")?.dispatchEvent(new Event("pubshared"));
  }
}

/** A small "Copied" note next to the Share button. */
function shareNote(host, msg) {
  const note = document.createElement("span");
  note.className = "share-note";
  note.textContent = msg;
  (host?.isConnected ? host : document.body).appendChild(note);
  setTimeout(() => note.remove(), 2600);
}

function renderGoalBoxes() {
  for (const id of ["dashGoal", "prGoal", "trGoal"]) {
    const el = $(id);
    if (!el) continue;
    const html = goalBoxHtml();
    el.hidden = !html;
    el.querySelector(".goal-box").innerHTML = html;
  }
  recordGoalMonth();
  renderGoalHistory();
  checkGoalReached();
}

// ---------- goal reached: a celebration over the whole Home page, once per month ----------
const monthKey = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

function checkGoalReached() {
  const goal = pubGoal();
  if (!goal) return; // no requirement, or no goal set yet
  const { from, to } = monthBounds();
  if (trackedBetween(from, to) < goal * 3600e3) return;
  const mark = `${monthKey()}:${pubStatus()}:${goal}`;
  const p = loadProfile();
  if (p.goalCelebrated === mark) return; // already celebrated this month's goal
  saveProfile({ ...p, goalCelebrated: mark });
  celebrateGoal(goal);
}

let celebrating = false;
function celebrateGoal(goal) {
  if (celebrating) return;
  celebrating = true;
  if (typeof currentView !== "undefined" && currentView !== "dashboard" && !tour) showView("dashboard"); // the Home page
  const month = new Date().toLocaleDateString(uiLocale(), { month: "long" });
  const box = document.createElement("div");
  box.className = "celebrate";
  box.setAttribute("role", "status");
  box.innerHTML = `<canvas class="celebrate-fx"></canvas>
    <div class="celebrate-card">
      <div class="celebrate-art"><img src="icons/celebrate-kid.svg?v=${APP_VERSION}" alt="" /><span class="celebrate-yeah">${esc(t("pubYeahLong"))}</span><span class="celebrate-yeah two">${esc(t("pubYeahLong"))}</span></div>
      <strong>${esc(t("pubCelebrate"))}</strong>
      <span>${esc(t("pubCelebrateSub", { goal, month }))}</span>
      <div class="celebrate-btns">
        <button type="button" class="btn btn-primary celebrate-share" data-pub-share>${SHARE_ICON} ${esc(t("pubShare"))}</button>
        <button type="button" class="btn btn-ghost celebrate-later" data-pub-later>${esc(t("pubLater"))}</button>
      </div>
      <span class="muted small-text celebrate-hint">${esc(t("pubLaterHint"))}</span></div>`;
  document.body.appendChild(box);
  const end = () => { if (!box.isConnected) return; box.classList.add("out"); setTimeout(() => { box.remove(); celebrating = false; }, 450); };
  let keep = false;
  box.addEventListener("click", (e) => { if (e.target.closest("[data-pub-share]")) { keep = true; return; } end(); });
  setTimeout(() => { if (!keep) end(); }, 5200); // if they tapped Share, the card waits for the share to finish
  box.addEventListener("pubshared", end);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) confetti(box.querySelector("canvas"), 3400);
  playGoalJingle();
}

/** The celebration jingle (melody, claps, slide whistle, cymbal — made for MyServiceTime). If it can't play here,
 *  the short built-in "ta-da" plays instead. */
let goalJingle = null;
function playGoalJingle() {
  try {
    goalJingle = goalJingle || new Audio(`sounds/goal-jingle.wav?v=${APP_VERSION}`);
    goalJingle.volume = 1;
    goalJingle.currentTime = 0;
    goalJingle.play().catch(() => playHappySound());
  } catch { playHappySound(); }
}

/** Two happy kid voices cheering "Yeah! Yeah!" in the person's language (the phone's or computer's own voices,
 *  made high and quick like children; a second voice is used when the device has one). */
function sayYeah() {
  const word = t("pubYeahLong").replace(/[¡!！]/g, "").trim(); // stretched out: "Yeaaaaah"
  const locale = uiLocale();
  // the boy, then the girl (a bit higher) — slow enough to hold the long "Yeaaaah", as loud as the device allows
  const cheers = [{ pitch: 1.7, rate: 0.7 }, { pitch: 2, rate: 0.75 }];
  try {
    const TTS = window.Capacitor?.isNativePlatform?.() && window.Capacitor.Plugins?.TextToSpeech;
    if (TTS) {
      cheers.forEach((c, i) => TTS.speak({ text: `${word}!`, lang: locale, rate: c.rate, pitch: c.pitch, volume: 1, category: "playback", queueStrategy: i ? 1 : 0 }).catch(() => {}));
      return;
    }
    if (!("speechSynthesis" in window)) return;
    const voices = speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith(lang));
    speechSynthesis.cancel();
    cheers.forEach((c, i) => {
      const u = new SpeechSynthesisUtterance(`${word}!`);
      u.lang = locale; u.rate = c.rate; u.pitch = c.pitch; u.volume = 1;
      const v = voices[i % Math.max(1, voices.length)];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    });
  } catch { /* no voice on this device: the music and confetti still play */ }
}

/** A short, happy "ta-da": a rising major arpeggio, a sparkle, then a bright chord (made by the browser, no sound file). */
function playHappySound() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const ctx = audioCtx, t0 = ctx.currentTime + 0.05;
    const master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    const note = (freq, at, len, type = "triangle", vol = 0.9) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0 + at);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(vol, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + len);
      o.connect(g).connect(master);
      o.start(t0 + at);
      o.stop(t0 + at + len + 0.05);
    };
    // C – E – G – C (up), quick and bouncy
    [[523.25, 0], [659.25, 0.11], [783.99, 0.22], [1046.5, 0.33]].forEach(([f, at]) => { note(f, at, 0.32); note(f * 2, at, 0.18, "sine", 0.25); });
    // a little sparkle
    [2093, 2637, 3136, 2637, 3520].forEach((f, i) => note(f, 0.5 + i * 0.06, 0.16, "sine", 0.18));
    // the final bright chord, held a moment
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => note(f, 0.82, 1.1, "triangle", 0.5));
    note(1567.98, 0.82, 0.9, "sine", 0.2);
  } catch { /* no sound on this device: the confetti still shows */ }
}

/** Paper confetti falling over the whole screen. */
function confetti(canvas, ms) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; };
  size();
  const colors = ["#6d5df6", "#3b82f6", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#fb923c"];
  const W = () => canvas.width, H = () => canvas.height;
  const bits = Array.from({ length: Math.min(220, Math.round(innerWidth / 4)) }, (_, i) => ({
    x: Math.random() * W(), y: -Math.random() * H() * 0.9 - 20 * dpr,
    w: (6 + Math.random() * 7) * dpr, h: (9 + Math.random() * 9) * dpr,
    vx: (Math.random() - 0.5) * 2.2 * dpr, vy: (2.2 + Math.random() * 3.2) * dpr,
    a: Math.random() * Math.PI, va: (Math.random() - 0.5) * 0.25, sway: Math.random() * Math.PI * 2,
    c: colors[i % colors.length], round: i % 5 === 0,
  }));
  const start = performance.now();
  const frame = (now) => {
    if (!canvas.isConnected) return;
    const tt = now - start;
    ctx.clearRect(0, 0, W(), H());
    ctx.globalAlpha = tt > ms - 600 ? Math.max(0, (ms - tt) / 600) : 1;
    for (const b of bits) {
      b.sway += 0.05;
      b.x += b.vx + Math.sin(b.sway) * 0.8 * dpr;
      b.y += b.vy;
      b.a += b.va;
      if (b.y > H() + 20 * dpr && tt < ms - 1200) { b.y = -20 * dpr; b.x = Math.random() * W(); }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.fillStyle = b.c;
      if (b.round) { ctx.beginPath(); ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h * Math.abs(Math.cos(b.a)) + 2);
      ctx.restore();
    }
    if (tt < ms) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- Profile ----------
function renderPubProfile() {
  const p = loadProfile();
  const s = PUB_STATUSES.find((x) => x.id === p.pubStatus);
  const goal = pubGoal();
  $("profPubInfo").innerHTML = s ? `
    <li><span class="muted">${esc(t("pubProfileTitle"))}</span><strong>${esc(pubLabel(s.id))}</strong></li>
    <li><span class="muted">${esc(t("pubStarted"))}</span><strong>${esc(p.pubSince ? sinceText(p.pubSince) : "—")}</strong></li>
    <li><span class="muted">${esc(t("pubGoalTitle"))}</span><strong>${esc(goal === 0 ? t("pubNoReq") : goal ? t("pubGoalN", { n: goal }) : "—")}</strong></li>`
    : `<li class="muted">${esc(t("pubPick"))}</li>`;
}

function initPublisher() {
  $("psOptions").addEventListener("change", () => {
    showCustomGoal();
    if (!$("psCustom").hidden) setTimeout(() => $("psGoal").focus(), 30);
  });
  $("statusForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const status = document.querySelector('#psOptions input[name="pubStatus"]:checked')?.value;
    if (!status) { $("psMsg").textContent = t("pubNeeded"); $("psMsg").className = "addr-msg err"; return; }
    const since = $("psSince").value;
    if (!since) { $("psMsg").textContent = t("pubSinceNeeded"); $("psMsg").className = "addr-msg err"; $("psSince").focus(); return; }
    savePubStatus(status, parseFloat($("psGoal").value), since);
    renderPubProfile();
    $("statusModal").hidden = true;
    document.body.classList.remove("in-setup");
    renderGoalBoxes();
    if (typeof renderView === "function") renderView();
    nextOpeningStep();
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-pub-change]")) openStatusModal();
    const share = e.target.closest("[data-pub-share]");
    if (share) shareGoal(share);
  });
}
