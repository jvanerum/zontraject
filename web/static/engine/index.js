// Volledige analyse in de browser. Geeft hetzelfde antwoord als POST /api/analyse van de
// Python-server (src/zontraject/main.py), zodat de pagina met en zonder server werkt.

import { ADVICE_OFFSETS_MIN, analyse, buildSegments, departureAdvice, summarize } from "./analyse.js";
import { bikeRoute, fetchWeather, geocode, samplePoints } from "./services.js";

export { ServiceError } from "./services.js";

const HOUR_MS = 3_600_000;

/** req: {start, end, departure: "YYYY-MM-DDTHH:MM" (lokale tijd), speed_kmh, avoid_sun, avoid_wind} */
export async function analyseRoute(req) {
  const departure = new Date(req.departure); // zonder tijdzone = lokale tijd van de browser
  const a = await geocode(req.start);
  const b = await geocode(req.end);
  const route = await bikeRoute(a.point, b.point);
  const segments = buildSegments(route);
  const durationMs = (segments.at(-1).km_end / req.speed_kmh) * HOUR_MS;
  const marginMs = (Math.max(...ADVICE_OFFSETS_MIN.map(Math.abs)) + 60) * 60_000;
  const weather = await fetchWeather(
    samplePoints(route),
    new Date(departure.getTime() - marginMs),
    new Date(departure.getTime() + durationMs + marginMs),
  );

  const results = analyse(segments, departure, req.speed_kmh, weather);
  return {
    start: { name: a.name, lat: a.point[0], lon: a.point[1] },
    end: { name: b.name, lat: b.point[0], lon: b.point[1] },
    departure_utc: departure.toISOString(),
    arrival_utc: new Date(departure.getTime() + durationMs).toISOString(),
    segments: results,
    summary: summarize(results),
    advice: departureAdvice(segments, departure, req.speed_kmh, weather, req.avoid_sun, req.avoid_wind),
  };
}
