// MyServiceTime — Map: your own contacts and upcoming appointments / visits as pins on a map.
// Only addresses the person saved themselves are shown (nobody is looked up). Tap a pin to call,
// get GPS directions or plan a new visit. "Near me" sorts everyone by distance.
// The map pictures come from OpenStreetMap (Leaflet loads only when the Map tool is opened).
// Loaded before app.js (functions only); app.js calls initMapTool(); pages.js calls renderMap().

// Note: the map library is always used as window.L — addresses.js has its own "L" (a letter pattern).
const LEAFLET_VER = "1.9.4";
let leafletLoading = null;
let mapView = null, mapMarkers = null, mapMe = null;
let mapFilter = "all";
let mapGeocoding = false;
let mapPlaced = false; // the opening view was set (reset each time the Map is opened)
const mapNotFound = new Set(); // addresses the search couldn't place (not retried this session)
const markerById = new Map();

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletLoading) {
    leafletLoading = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VER}/dist/leaflet.css`;
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VER}/dist/leaflet.js`;
      s.onload = resolve;
      s.onerror = () => { leafletLoading = null; reject(new Error("leaflet")); };
      document.head.appendChild(s);
    });
  }
  return leafletLoading;
}

/** Everything that can go on the map: contacts with an address, and upcoming appointments / visits. */
// each kind of pin has its own color (also shown in the legend under the map)
const PIN_KINDS = [
  { kind: "contact", color: "#2563eb", label: "mapPeople" },
  { kind: "visit",   color: "#16a34a", label: "visits" },
  { kind: "appt",    color: "#f59e0b", label: "appointments" },
  { kind: "event",   color: "#7c3aed", label: "actEvents" },
];
const pinKind = (x) => (x.kind === "appt" && x.visit ? "visit" : x.kind);

function mapItems() {
  const now = Date.now();
  const items = [];
  for (const c of contacts) {
    if (!c.address) continue;
    items.push({ key: `c-${c.id}`, kind: "contact", obj: c, name: c.name, sub: c.relation ? relLabel(c.relation) : "", address: c.address,
      lat: c.lat ?? null, lon: c.lon ?? null, phone: c.phone || "", photo: c.photo || "" });
  }
  for (const a of appts) {
    const at = whenOf(a);
    if (!a.address || at < now - 3600e3) continue; // upcoming (or just started) only
    const person = contactById(a.contactId);
    items.push({ key: `a-${a.id}`, kind: "appt", obj: a, name: a.title, sub: `${typeLabel(a.type)} · ${fmtDate(at)} ${fmtTime(at)}`, address: a.address,
      lat: a.lat ?? null, lon: a.lon ?? null, phone: person?.phone || "", at, visit: a.type === "Visit" });
  }
  for (const ev of (typeof events !== "undefined" ? events : [])) {
    const o = typeof nextOccurrence === "function" ? nextOccurrence(ev) : null;
    if (!ev.address || !o) continue; // upcoming events with a place
    items.push({ key: `e-${ev.id}`, kind: "event", obj: ev, name: eventTitle(ev), sub: dateRangeText(ev, o), address: ev.address,
      lat: ev.lat ?? null, lon: ev.lon ?? null, phone: "", evKind: ev.kind });
  }
  const q = ($("mapSearch")?.value || "").trim().toLowerCase();
  return items.filter((x) =>
    (mapFilter === "all" || (mapFilter === "contacts" ? x.kind === "contact" : mapFilter === "events" ? x.kind === "event" : x.kind === "appt")) &&
    (!q || `${x.name} ${x.address} ${x.sub}`.toLowerCase().includes(q)));
}

const hasSpot = (x) => x.lat != null && x.lon != null;
/** "25 Main St" (no city) exists in hundreds of towns: don't guess, ask for the city instead. */
const tooVague = (address) => !/[,，،、]/.test(address) && address.trim().split(/\s+/).length < 5;

function pinHtml(x) {
  if (x.kind === "contact") {
    const src = safePhoto(x.photo);
    return src ? `<img class="map-pin-img" src="${src}" alt="" />` : `<span class="map-pin-txt" style="--h:${avatarHue(x.name)}">${esc(initials(x.name))}</span>`;
  }
  if (x.kind === "event") return `<span class="map-pin-txt appt">${EVENT_ICON[x.evKind] || EVENT_ICON.other}</span>`;
  return `<span class="map-pin-txt appt">${x.visit ? "🏠" : "📅"}</span>`;
}

function renderMapLegend() {
  $("mapLegend").innerHTML = PIN_KINDS.map((k) => `<span><i style="background:${k.color}"></i>${esc(t(k.label))}</span>`).join("");
}

function popupHtml(x) {
  const dist = myPos && hasSpot(x) ? ` · ${fmtKm(distanceKm(myPos, x))}` : "";
  return `
    <div class="map-pop">
      <strong>${esc(x.name)}</strong>
      ${x.sub ? `<span class="muted">${esc(x.sub)}</span>` : ""}
      <span class="map-pop-addr">📍 ${esc(x.address)}${esc(dist)}</span>
      <span class="map-pop-btns">
        ${x.phone ? `<a class="btn small btn-ghost" href="tel:${telHref(x.phone)}">${esc(t("mapCall"))}</a>` : ""}
        <a class="btn small btn-primary" href="${navUrl(hasSpot(x) ? `${x.lat},${x.lon}` : x.address)}" target="_blank" rel="noopener">${esc(t("mapDirections"))}</a>
        ${x.kind === "contact" ? `<button type="button" class="btn small btn-ghost" data-map-visit="${x.obj.id}">${esc(t("mapVisit"))}</button>`
          : x.kind === "event" ? "" : `<button type="button" class="btn small btn-ghost" data-map-edit="${x.obj.id}">${esc(t("edit"))}</button>`}
      </span>
    </div>`;
}

function renderMapList(items) {
  const sorted = myPos
    ? [...items].sort((a, b) => (hasSpot(a) ? distanceKm(myPos, a) : 1e9) - (hasSpot(b) ? distanceKm(myPos, b) : 1e9))
    : [...items].sort((a, b) => (a.kind === b.kind ? (a.at || 0) - (b.at || 0) || a.name.localeCompare(b.name) : a.kind === "appt" ? -1 : 1));
  $("mapList").innerHTML = sorted.length ? sorted.map((x) => `
    <li><button type="button" class="map-row ${hasSpot(x) ? "" : "nospot"}" data-map-key="${x.key}">
      <span class="map-row-pin k-${pinKind(x)}">${pinHtml(x)}</span>
      <span class="map-row-main"><strong>${esc(x.name)}</strong>
        <span class="muted">${esc([x.sub, x.address].filter(Boolean).join(" · "))}</span>
        ${hasSpot(x) ? "" : `<span class="map-row-warn">${esc(t(tooVague(x.address) ? "mapVague" : mapNotFound.has(x.address) ? "mapNotFound" : "mapPlacing"))}</span>`}
      </span>
      ${myPos && hasSpot(x) ? `<span class="map-row-dist">${esc(fmtKm(distanceKm(myPos, x)))}</span>` : ""}
    </button></li>`).join("")
    : `<li class="muted small-text map-empty">${esc(t("mapEmpty"))}</li>`;
}

async function renderMap() {
  if (currentView !== "tools" || currentTool !== ".map-card") return;
  renderMapLegend();
  $("mapFilters").innerHTML = [["all", "actAll"], ["contacts", "mapPeople"], ["appts", "mapVisits"], ["events", "actEvents"]]
    .map(([k, label]) => `<button type="button" class="chip ${mapFilter === k ? "on" : ""}" data-mapf="${k}">${esc(t(label))}</button>`).join("");
  const items = mapItems();
  renderMapList(items);
  try {
    await loadLeaflet();
  } catch {
    $("mapMsg").textContent = t("mapLoadErr");
    $("mapMsg").className = "addr-msg err";
    return;
  }
  if (!mapView) {
    mapView = window.L.map("mapBox", { zoomControl: true, attributionControl: true });
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(mapView);
    mapMarkers = window.L.layerGroup().addTo(mapView);
    mapView.on("popupopen", (e) => {
      const box = e.popup.getElement();
      box.querySelector("[data-map-visit]")?.addEventListener("click", (ev) => { mapView.closePopup(); newVisitFor(contactById(ev.currentTarget.dataset.mapVisit)); });
      box.querySelector("[data-map-edit]")?.addEventListener("click", (ev) => { mapView.closePopup(); editAppt(ev.currentTarget.dataset.mapEdit); });
    });
  }
  setTimeout(() => mapView.invalidateSize(), 50);
  mapMarkers.clearLayers();
  markerById.clear();
  const spots = [];
  for (const x of items.filter(hasSpot)) {
    const m = window.L.marker([x.lat, x.lon], {
      icon: window.L.divIcon({ className: `map-pin ${x.kind} k-${pinKind(x)}`, html: pinHtml(x), iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -38] }),
      title: x.name,
    }).bindPopup(popupHtml(x), { maxWidth: 260 });
    m.addTo(mapMarkers);
    markerById.set(x.key, m);
    spots.push([x.lat, x.lon]);
  }
  if (myPos) {
    if (!mapMe) mapMe = window.L.circleMarker([myPos.lat, myPos.lon], { radius: 9, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip(t("mapYou"));
    mapMe.setLatLng([myPos.lat, myPos.lon]).addTo(mapView);
    spots.push([myPos.lat, myPos.lon]);
  }
  // the map opens zoomed out far enough to show several countries (zoom in with + or by tapping a place);
  // it is placed only when the Map is opened, so later redraws keep the person's own zoom
  const OPEN_ZOOM = 5;
  if (mapPlaced) { placeMissing(items); return; }
  mapPlaced = true;
  if (spots.length > 1) mapView.fitBounds(spots, { padding: [36, 36], maxZoom: OPEN_ZOOM, animate: false });
  else if (spots.length === 1) mapView.setView(spots[0], OPEN_ZOOM, { animate: false });
  else if (myCountryBoxes().length > 1) { // nothing yet, several countries: all of them
    const b = myCountryBoxes().map((x) => x.bbox[2] - x.bbox[0] > 60 ? [[x.lat - 12, x.lon - 27], [x.lat + 12, x.lon + 27]] : [[x.bbox[1], x.bbox[0]], [x.bbox[3], x.bbox[2]]]).flat();
    mapView.fitBounds(b, { animate: false, padding: [20, 20] });
  }
  else if (myCountryBox()) { // nothing yet: your country
    const box = myCountryBox(), [w, s, e, n] = box.bbox;
    // very wide countries (islands far away, e.g. the United States): center on the country instead
    if (e - w > 60 || n - s > 45) mapView.fitBounds([[box.lat - 12, box.lon - 27], [box.lat + 12, box.lon + 27]], { animate: false });
    else mapView.fitBounds([[s, w], [n, e]], { animate: false, maxZoom: OPEN_ZOOM });
  }
  else mapView.setView([18.5, -72.3], 3); // nothing to show yet: a wide view
  placeMissing(items);
}

/** Saved addresses without map coordinates: find them (one at a time, politely) and remember the spot. */
async function placeMissing(items) {
  if (mapGeocoding) return;
  const todo = items.filter((x) => !hasSpot(x) && !mapNotFound.has(x.address) && !tooVague(x.address));
  const msg = $("mapMsg");
  if (!todo.length) { msg.textContent = ""; return; }
  mapGeocoding = true;
  try {
    for (let i = 0; i < todo.length; i++) {
      const x = todo[i];
      msg.textContent = t("mapFinding", { n: todo.length - i });
      msg.className = "addr-msg";
      let found = null;
      try { found = (await geoSearch(x.address))[0] || null; } catch {}
      if (found) {
        x.obj.lat = Number(found.lat);
        x.obj.lon = Number(found.lon);
        if (x.kind === "contact") saveContacts(); else if (x.kind === "event") saveEvents(); else save();
      } else {
        mapNotFound.add(x.address);
      }
      await new Promise((r) => setTimeout(r, 1100)); // the free map search allows about one request a second
    }
  } finally {
    mapGeocoding = false;
    msg.textContent = "";
    renderMap();
  }
}

/** After the country changes: places saved outside it (found in the wrong country) are looked up again. */
function replaceOutsideCountry() {
  const boxes = myCountryBoxes();
  mapNotFound.clear();
  if (!boxes.length) return;
  const inBox = (o, [w, s, e, n]) => o.lat >= s && o.lat <= n && o.lon >= w && o.lon <= e;
  const outside = (o) => o.lat != null && o.lon != null && !boxes.some((b) => inBox(o, b.bbox));
  let c = 0, a = 0;
  for (const x of contacts) if (x.address && outside(x)) { x.lat = null; x.lon = null; c++; }
  for (const x of appts) if (x.address && outside(x)) { x.lat = null; x.lon = null; a++; }
  if (c) saveContacts();
  if (a) save();
}

// ---------- the Search button: your own pins first, otherwise any address in your country ----------
let mapFoundPin = null;
async function mapSearchNow() {
  const q = $("mapSearch").value.trim();
  const msg = $("mapMsg");
  if (!q) { $("mapSearch").focus(); return; }
  await renderMap(); // the list and pins now show only what matches
  if (!mapView) return;
  if (mapFoundPin) { mapFoundPin.remove(); mapFoundPin = null; }
  const mine = mapItems().filter(hasSpot);
  if (mine.length) { // one of your contacts, visits or events
    if (mine.length === 1) {
      mapView.setView([mine[0].lat, mine[0].lon], 15);
      setTimeout(() => markerById.get(mine[0].key)?.openPopup(), 250);
    } else {
      mapView.fitBounds(mine.map((x) => [x.lat, x.lon]), { padding: [36, 36], maxZoom: 15 });
    }
    msg.textContent = "";
    return;
  }
  // nothing of yours: look the place up on the map (only in your country)
  if (q.length < 3) { msg.textContent = t("min3"); msg.className = "addr-msg err"; return; }
  msg.textContent = t("searching");
  msg.className = "addr-msg";
  let found = null;
  try { found = (await geoSearch(q))[0] || null; } catch {}
  if (!found) { msg.textContent = t("noMatch"); msg.className = "addr-msg err"; return; }
  msg.textContent = "";
  mapShowPlace(found);
}

/** Puts a red pin on a place found by the search (with Directions and "New visit here"). */
function mapShowPlace(found) {
  if (!mapView) return;
  if (mapFoundPin) { mapFoundPin.remove(); mapFoundPin = null; }
  $("mapMsg").textContent = "";
  const lat = Number(found.lat), lon = Number(found.lon);
  mapFoundPin = window.L.marker([lat, lon], {
    icon: window.L.divIcon({ className: "map-pin k-found", html: '<span class="map-pin-txt appt">📍</span>', iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -38] }),
  }).addTo(mapView).bindPopup(`
    <div class="map-pop">
      <span class="map-pop-addr">📍 ${esc(found.display_name)}</span>
      <span class="map-pop-btns">
        <a class="btn small btn-primary" href="${navUrl(`${lat},${lon}`)}" target="_blank" rel="noopener">${esc(t("mapDirections"))}</a>
        <button type="button" class="btn small btn-ghost" data-map-visit-here>${esc(t("mapVisitHere"))}</button>
      </span>
    </div>`, { maxWidth: 260 });
  mapView.setView([lat, lon], 16);
  setTimeout(() => mapFoundPin?.openPopup(), 250);
  mapFoundPin.on("popupopen", (e) => {
    e.popup.getElement().querySelector("[data-map-visit-here]")?.addEventListener("click", () => {
      mapView.closePopup();
      resetForm();
      $("type").value = "Visit";
      $("address").value = found.display_name;
      $("lat").value = lat;
      $("lon").value = lon;
      openApptForm();
    });
  });
}

function initMapTool() {
  $("mapSearchForm").addEventListener("submit", (e) => { e.preventDefault(); mapSearchNow(); });
  $("mapFilters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mapf]");
    if (!b) return;
    mapFilter = b.dataset.mapf;
    renderMap();
  });
  let typing = null;
  $("mapSearch").addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(renderMap, 250); });
  $("mapList").addEventListener("click", (e) => {
    const row = e.target.closest("[data-map-key]");
    const m = row && markerById.get(row.dataset.mapKey);
    if (!m || !mapView) return;
    mapView.flyTo(m.getLatLng(), Math.max(mapView.getZoom(), 15), { duration: 0.6 });
    setTimeout(() => m.openPopup(), 650);
    $("mapBox").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("mapNearMe").addEventListener("click", async () => {
    $("mapNearMe").classList.add("busy");
    $("mapMsg").textContent = t("gettingGps");
    $("mapMsg").className = "addr-msg";
    try {
      await getPosition();
      $("mapMsg").textContent = "";
      await renderMap();
    } catch (err) {
      $("mapMsg").textContent = err.message;
      $("mapMsg").className = "addr-msg err";
    } finally {
      $("mapNearMe").classList.remove("busy");
    }
  });
}
