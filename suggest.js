// MyServiceTime — suggestions while you type an address (or a name, on the map).
// The places come from the map search, limited to the country the person picked, so the common streets,
// neighborhoods and towns of their area show up first. On the map, the person's own contacts, visits
// and events that match are listed on top. Loaded before app.js (functions only); app.js calls initSuggest().

/**
 * Adds a drop-down of suggestions under a text box.
 * own(q)  → the person's own matches [{ label, sub, icon, item }] (optional)
 * onPick({ display_name, lat, lon } | ownItem) → what to do with the choice
 */
function attachSuggest(input, { own = null, onPick }) {
  const box = document.createElement("ul");
  box.className = "suggest live-suggest";
  box.hidden = true;
  box.setAttribute("role", "listbox");
  // placed right under the box (inside the same row / label)
  const host = input.closest(".map-search, .addr-row, label") || input.parentNode;
  host.style.position = host.style.position || "relative";
  host.appendChild(box);

  let timer = null, abort = null, lastQ = "", options = [], active = -1;
  const hide = () => { box.hidden = true; options = []; active = -1; };
  const paint = () => [...box.children].forEach((li, i) => li.classList.toggle("active", i === active));

  function show(list) {
    options = list;
    active = -1;
    if (!list.length) return hide();
    box.innerHTML = list.map((o, i) => `<li data-i="${i}" role="option">
      <span class="sg-ic">${o.icon || "📍"}</span>
      <span class="sg-txt"><strong>${esc(o.label)}</strong>${o.sub ? `<span class="muted">${esc(o.sub)}</span>` : ""}</span></li>`).join("");
    box.hidden = false;
  }

  async function lookUp(q) {
    if (q === lastQ) return;
    lastQ = q;
    const mine = own ? own(q).slice(0, 3) : [];
    if (mine.length) show(mine);
    if (q.length < 3) return;
    abort?.abort();
    abort = new AbortController();
    try {
      const places = (await geoSearch(q, abort.signal)).slice(0, 5).map((p) => {
        const [first, ...rest] = String(p.display_name).split(", ");
        const km = myPos ? ` · ${fmtKm(distanceKm(myPos, { lat: +p.lat, lon: +p.lon }))}` : "";
        return { label: first, sub: rest.join(", ") + km, icon: "📍", place: p };
      });
      if (input.value.trim() !== q) return; // the person kept typing
      show([...mine, ...places]);
    } catch { /* offline or stopped: no suggestions */ }
  }

  function pick(i) {
    const o = options[i];
    if (!o) return;
    hide();
    lastQ = "";
    onPick(o.place || o.item, o);
  }

  input.setAttribute("autocomplete", "off");
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!q) { lastQ = ""; return hide(); }
    timer = setTimeout(() => lookUp(q), 450); // waits for a short pause in typing
  });
  input.addEventListener("keydown", (e) => {
    if (box.hidden || !options.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      paint();
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      e.stopPropagation();
      pick(active);
    } else if (e.key === "Escape") {
      hide();
    }
  });
  box.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]");
    if (!li) return;
    e.preventDefault(); // keep the text box focused
    pick(Number(li.dataset.i));
  });
  input.addEventListener("blur", () => setTimeout(hide, 150));
  return { hide };
}

function initSuggest() {
  // Map: your own people / visits / events first, then places in your country
  const mapSg = attachSuggest($("mapSearch"), {
    own: (q) => {
      const s = q.toLowerCase();
      const all = typeof mapItems === "function" ? (() => { const keep = $("mapSearch").value; $("mapSearch").value = ""; const r = mapItems(); $("mapSearch").value = keep; return r; })() : [];
      return all.filter((x) => `${x.name} ${x.address}`.toLowerCase().includes(s)).map((x) => ({
        label: x.name, sub: x.address, item: x,
        icon: x.kind === "contact" ? "👤" : x.kind === "event" ? "🗓️" : x.visit ? "🏠" : "📅",
      }));
    },
    onPick: (choice) => {
      if (choice.key) { // one of yours
        $("mapSearch").value = choice.name;
        mapSearchNow();
      } else {
        $("mapSearch").value = choice.display_name;
        mapShowPlace(choice);
      }
    },
  });
  $("mapSearchForm").addEventListener("submit", () => mapSg.hide());

  // Contact address
  attachSuggest($("cAddress"), {
    onPick: (p) => { $("cAddress").value = p.display_name; $("cLat").value = p.lat; $("cLon").value = p.lon; },
  });
  // Event place
  attachSuggest($("eAddress"), {
    onPick: (p) => { $("eAddress").value = p.display_name; $("eAddress").dataset.lat = p.lat; $("eAddress").dataset.lon = p.lon; },
  });
}
