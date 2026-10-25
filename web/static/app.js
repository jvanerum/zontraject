// ZonTraject frontend: formulier → POST /api/analyse → meters, kaart (Zon/Wind) en tijdlijn.
/* global L */

const $ = (sel) => document.querySelector(sel);
const form = $("#form");
const TZ = "Europe/Brussels";
const hhmm = new Intl.DateTimeFormat("nl-BE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

// Kleuren uit de Tailwind-tokens (input.css), zodat er geen losse hex-waarden in JS staan.
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();

const STATES = {
  sun: {
    zon: { label: "Zon", color: "sun" },
    bewolkt: { label: "Bewolkt", color: "neutral-state" },
    verblinding: { label: "Verblinding", color: "alert" },
    donker: { label: "Donker", color: "ink-soft" },
  },
  wind: {
    mee: { label: "Mee", color: "ok" },
    zij: { label: "Zijwind", color: "neutral-state" },
    tegen: { label: "Tegen", color: "alert" },
  },
};

let map;
let routeLayer;
let lastData;
let mode = "sun";

// --- Formulier ------------------------------------------------------------------------------
function initForm() {
  const now = new Date();
  const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  form.date.value = local(now).slice(0, 10);
  form.date.min = form.date.value;
  form.date.max = local(new Date(now.getTime() + 15 * 86400000)).slice(0, 10); // Open-Meteo: ±16 dagen
  form.time.value = local(now).slice(11, 16);

  const bikes = [...document.querySelectorAll(".bike")];
  const syncBikes = () =>
    bikes.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.speed === form.speed.value)));
  bikes.forEach((b) =>
    b.addEventListener("click", () => {
      form.speed.value = b.dataset.speed;
      syncBikes();
    }),
  );
  form.speed.addEventListener("input", syncBikes);
  syncBikes();

  document.querySelectorAll(".mode").forEach((b) =>
    b.addEventListener("click", () => {
      mode = b.dataset.mode;
      syncModes();
      if (lastData) drawRoute(lastData);
    }),
  );
  syncModes();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
}

function syncModes() {
  document.querySelectorAll(".mode").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
}

async function run() {
  const btn = $("#submit");
  const err = $("#error");
  btn.disabled = true;
  btn.textContent = "Bezig met berekenen…";
  err.classList.add("hidden");
  try {
    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: form.start.value,
        end: form.end.value,
        departure: `${form.date.value}T${form.time.value}`,
        speed_kmh: Number(form.speed.value),
        avoid_sun: form.avoid_sun.checked,
        avoid_wind: form.avoid_wind.checked,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : "Ongeldige invoer.");
    lastData = data;
    render(data);
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btn.textContent = "Bereken route & profiel";
  }
}

// --- Weergave -------------------------------------------------------------------------------
const pct = (x) => `${Math.round(x * 100)}%`;
const deg = (x) => `${String(Math.round(x)).padStart(3, "0")}°`;
const shortName = (n) => n.split(",")[0];

function render(data) {
  $("#empty").classList.add("hidden");
  $("#results").classList.remove("hidden");
  const s = data.summary;

  $("#route-meta").textContent = `${s.distance_km.toFixed(1)} km · ${hhmm.format(new Date(data.departure_utc))}–${hhmm.format(new Date(data.arrival_utc))}`;
  $("#sun-main").textContent = pct(s.sun.zon);
  $("#wind-main").textContent = pct(s.wind.mee);
  $("#wind-meta").textContent = `gem. ${Math.round(s.avg_wind_kmh)} km/u · ${s.avg_wind_bft} Bft`;
  renderMeter("sun", s);
  renderMeter("wind", s);
  renderAdvice(data);
  renderTimeline(data.segments);
  $("#map-title").textContent = `Trajectkaart: ${shortName(data.start.name)} → ${shortName(data.end.name)}`;
  drawRoute(data);
}

function renderMeter(kind, summary) {
  const shares = summary[kind];
  const bar = $(`#${kind}-bar`);
  const legend = $(`#${kind}-legend`);
  bar.replaceChildren();
  legend.replaceChildren();
  for (const [state, meta] of Object.entries(STATES[kind])) {
    const share = shares[state];
    if (!share) continue;
    const part = document.createElement("div");
    part.style.width = pct(share);
    part.style.background = token(meta.color);
    bar.append(part);
    const li = document.createElement("li");
    li.innerHTML = `<span style="color:${token(meta.color)}">●</span> ${pct(share)} ${meta.label} <span class="text-muted">(${(share * summary.distance_km).toFixed(1)} km)</span>`;
    legend.append(li);
  }
}

function renderAdvice(data) {
  const box = $("#advice");
  const a = data.advice;
  const apply = $("#advice-apply");
  if (!a) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  const s = data.summary;
  const what = [
    form.avoid_sun.checked && s.sun.verblinding > 0 && "verblinding",
    form.avoid_wind.checked && s.wind.tegen > 0 && "tegenwind",
  ].filter(Boolean).join(" en ");
  if (!a.best) {
    $("#advice-text").innerHTML = `<strong class="text-primary-hover">Vertrekadvies:</strong> je rit heeft ${what}, maar binnen ±60 minuten is er geen beter vertrektijdstip.`;
    apply.classList.add("hidden");
    return;
  }
  apply.classList.remove("hidden");
  const off = a.best.offset_min;
  const newTime = hhmm.format(new Date(a.best.departure_utc));
  $("#advice-text").innerHTML = `<strong class="text-primary-hover">Slim vertrekadvies:</strong> als je ${Math.abs(off)} minuten ${off > 0 ? "later" : "eerder"} vertrekt (${newTime}), heb je <strong>${pct(a.improvement)}</strong> minder ${what}.`;
  apply.textContent = `Pas aan naar ${newTime} (${off > 0 ? "+" : ""}${off} min)`;
  apply.onclick = () => {
    form.time.value = newTime;
    const d = new Date(a.best.departure_utc);
    form.date.value = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d); // YYYY-MM-DD
    run();
  };
}

// Opeenvolgende segmenten met dezelfde zon- én windtoestand samenvoegen tot één rij.
function groupSegments(segments) {
  const groups = [];
  for (const seg of segments) {
    const last = groups.at(-1);
    if (last && last.sun === seg.sun && last.wind === seg.wind) {
      last.segs.push(seg);
    } else {
      groups.push({ sun: seg.sun, wind: seg.wind, segs: [seg] });
    }
  }
  return groups;
}

function renderTimeline(segments) {
  const body = $("#timeline");
  body.replaceChildren();
  for (const g of groupSegments(segments)) {
    const first = g.segs[0];
    const last = g.segs.at(-1);
    const mid = g.segs[Math.floor(g.segs.length / 2)];
    const bad = g.sun === "verblinding" || g.wind === "tegen";
    const tr = document.createElement("tr");
    tr.className = `border-b border-line ${bad ? "bg-alert-bg text-alert" : ""}`;
    tr.innerHTML = `
      <td class="py-2 pr-3">${first.km_start.toFixed(1)} – ${last.km_end.toFixed(1)}</td>
      <td class="pr-3">${hhmm.format(new Date(first.eta_utc))} – ${hhmm.format(new Date(last.eta_utc))}</td>
      <td class="pr-3">${deg(mid.heading)}</td>
      <td class="pr-3">${deg(mid.sun_az)} / ${Math.round(mid.sun_el)}°</td>
      <td class="pr-3">${Math.round(mid.wind_kmh)} km/u uit ${deg(mid.wind_from)}</td>
      <td>${STATES.sun[g.sun].label} · ${STATES.wind[g.wind].label}</td>`;
    body.append(tr);
  }
}

function drawRoute(data) {
  if (!map) {
    map = L.map("map");
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers',
    }).addTo(map);
  }
  if (routeLayer) routeLayer.remove();
  routeLayer = L.layerGroup().addTo(map);
  const states = STATES[mode];
  for (const seg of data.segments) {
    const state = seg[mode];
    L.polyline(seg.coords, { color: token(states[state].color), weight: 6, opacity: 0.9 })
      .bindTooltip(
        `km ${seg.km_start.toFixed(1)}–${seg.km_end.toFixed(1)} · ${hhmm.format(new Date(seg.eta_utc))}<br>` +
          `Zon: ${STATES.sun[seg.sun].label} (az ${Math.round(seg.sun_az)}°, h ${Math.round(seg.sun_el)}°)<br>` +
          `Wind: ${STATES.wind[seg.wind].label}, ${Math.round(seg.wind_kmh)} km/u`,
      )
      .addTo(routeLayer);
  }
  L.circleMarker([data.start.lat, data.start.lon], { radius: 6, color: token("ink") }).addTo(routeLayer);
  L.circleMarker([data.end.lat, data.end.lon], { radius: 6, color: token("ink"), fillOpacity: 1 }).addTo(routeLayer);
  map.fitBounds(data.segments.flatMap((s) => s.coords), { padding: [20, 20] });
  setTimeout(() => map.invalidateSize(), 0);

  $("#map-legend").innerHTML = Object.values(states)
    .map((m) => `<li><span style="color:${token(m.color)}">●</span> ${m.label}</li>`)
    .join("");
}

initForm();
