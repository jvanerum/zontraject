// Externe diensten vanuit de browser (spiegel van src/zontraject/services.py).
// Alle drie laten verzoeken vanuit de browser toe (CORS). De browser stuurt zelf een Referer mee,
// wat volgens het gebruiksbeleid van Nominatim volstaat (een eigen User-Agent kan hier niet).

import { distanceM } from "./geo.js";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const OSRM_BIKE_URL = "https://routing.openstreetmap.de/routed-bike/route/v1/driving";
const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_SAMPLE_EVERY_M = 5_000;
export const WEATHER_MAX_POINTS = 12;

/** Fout die als leesbare melding naar de gebruiker mag. */
export class ServiceError extends Error {}

async function getJson(url, what) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new ServiceError(`${what} is niet bereikbaar. Controleer je internetverbinding.`);
  }
  if (!res.ok) throw new ServiceError(`${what} gaf een fout (${res.status}).`);
  return res.json();
}

// --- Nominatim: max. 1 verzoek per seconde, met cache ---------------------------------------
const geoCache = new Map();
let geoQueue = Promise.resolve();
let geoLast = 0;

/** Adres → {point: [lat, lon], name} */
export function geocode(query) {
  const key = query.trim().toLowerCase();
  if (geoCache.has(key)) return Promise.resolve(geoCache.get(key));
  const job = geoQueue.then(async () => {
    const wait = 1000 - (Date.now() - geoLast);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "nl,be" });
    try {
      const hits = await getJson(`${NOMINATIM_URL}?${params}`, "De adreszoeker (Nominatim)");
      if (!hits.length) throw new ServiceError(`Adres niet gevonden: ${query}`);
      const result = { point: [Number(hits[0].lat), Number(hits[0].lon)], name: hits[0].display_name };
      geoCache.set(key, result);
      return result;
    } finally {
      geoLast = Date.now();
    }
  });
  geoQueue = job.catch(() => {});
  return job;
}

// --- OSRM fietsroute ------------------------------------------------------------------------
/** Fietsroute als lijst [lat, lon]. */
export async function bikeRoute(a, b) {
  const coords = `${a[1]},${a[0]};${b[1]},${b[0]}`;
  const data = await getJson(
    `${OSRM_BIKE_URL}/${coords}?overview=full&geometries=geojson`,
    "De routeplanner (OSRM)",
  );
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new ServiceError("Geen fietsroute gevonden tussen deze adressen.");
  }
  return data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
}

// --- Open-Meteo -----------------------------------------------------------------------------
/** Weerpunten langs de route: begin, elke ~5 km, einde (max. WEATHER_MAX_POINTS). */
export function samplePoints(route) {
  let points = [route[0]];
  let since = 0;
  for (let i = 1; i < route.length; i++) {
    since += distanceM(route[i - 1], route[i]);
    if (since >= WEATHER_SAMPLE_EVERY_M) {
      points.push(route[i]);
      since = 0;
    }
  }
  points.push(route.at(-1));
  if (points.length > WEATHER_MAX_POINTS) {
    const step = (points.length - 1) / (WEATHER_MAX_POINTS - 1);
    points = Array.from({ length: WEATHER_MAX_POINTS }, (_, i) => points[Math.round(i * step)]);
  }
  return points;
}

const isoDate = (d) => d.toISOString().slice(0, 10);

/** Uurlijkse wind en bewolking voor alle punten in één verzoek → lookup-functie. */
export async function fetchWeather(points, startUtc, endUtc) {
  const params = new URLSearchParams({
    latitude: points.map((p) => p[0].toFixed(4)).join(","),
    longitude: points.map((p) => p[1].toFixed(4)).join(","),
    hourly: "wind_speed_10m,wind_direction_10m,cloud_cover",
    wind_speed_unit: "kmh",
    timezone: "GMT",
    start_date: isoDate(startUtc),
    end_date: isoDate(endUtc),
  });
  const res = await fetch(`${OPEN_METEO_URL}?${params}`).catch(() => {
    throw new ServiceError("De weerdienst (Open-Meteo) is niet bereikbaar.");
  });
  if (res.status === 400) throw new ServiceError("Geen weersvoorspelling beschikbaar voor deze datum.");
  if (!res.ok) throw new ServiceError(`De weerdienst (Open-Meteo) gaf een fout (${res.status}).`);
  let data = await res.json();
  if (!Array.isArray(data)) data = [data]; // één punt → geen lijst
  return makeLookup(points, data.map((d) => parseHourly(d.hourly)));
}

export function parseHourly(h) {
  const rows = [];
  h.time.forEach((t, i) => {
    const ws = h.wind_speed_10m[i];
    const wd = h.wind_direction_10m[i];
    const cc = h.cloud_cover[i];
    if (ws == null || wd == null || cc == null) return;
    rows.push({ time: new Date(`${t}Z`), weather: { wind_kmh: ws, wind_from: wd, cloud_pct: cc } });
  });
  return rows;
}

/** Dichtstbijzijnde weerpunt + dichtstbijzijnde uur. series[i] = [{time, weather}] gesorteerd. */
export function makeLookup(points, series) {
  return (p, when) => {
    let best = 0;
    points.forEach((q, k) => {
      if (distanceM(p, q) < distanceM(p, points[best])) best = k;
    });
    const rows = series[best];
    if (!rows.length) throw new ServiceError("Onvolledige weersgegevens.");
    const limit = when.getTime() + 30 * 60_000; // afronden naar het dichtste uur
    let j = rows.findIndex((r) => r.time.getTime() >= limit) - 1;
    if (j === -2) j = rows.length - 1; // alles ligt vóór de limiet
    return rows[Math.min(Math.max(j, 0), rows.length - 1)].weather;
  };
}
