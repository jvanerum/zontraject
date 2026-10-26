// Segmenten, ETA, classificatie, samenvatting en vertrekadvies
// (spiegel van src/zontraject/analyse.py). Puur: het weer komt binnen via een lookup-functie.

import { beaufort, sunPosition, sunState, windState } from "./conditions.js";
import { bearingDeg, distanceM } from "./geo.js";

export const MIN_SEGMENT_M = 250;
export const ADVICE_OFFSETS_MIN = [-60, -30, 30, 60];

const HOUR_MS = 3_600_000;

/** Voeg opeenvolgende routepunten samen tot segmenten van minstens minLenM meter. */
export function buildSegments(coords, minLenM = MIN_SEGMENT_M) {
  const segments = [];
  if (coords.length < 2) return segments;
  let current = [coords[0]];
  let segLen = 0;
  let doneM = 0;
  for (let i = 1; i < coords.length; i++) {
    segLen += distanceM(coords[i - 1], coords[i]);
    current.push(coords[i]);
    if (segLen >= minLenM) {
      segments.push(makeSegment(current, doneM, segLen));
      doneM += segLen;
      current = [coords[i]];
      segLen = 0;
    }
  }
  if (current.length > 1) {
    if (segments.length && segLen < minLenM / 2) {
      // te kort restje: bij het vorige segment
      const last = segments.pop();
      const lastLen = (last.km_end - last.km_start) * 1000;
      doneM -= lastLen;
      segLen += lastLen;
      current = [...last.coords, ...current.slice(1)];
    }
    segments.push(makeSegment(current, doneM, segLen));
  }
  return segments;
}

function makeSegment(coords, startM, lengthM) {
  return {
    coords: [...coords],
    km_start: startM / 1000,
    km_end: (startM + lengthM) / 1000,
    heading: bearingDeg(coords[0], coords.at(-1)),
  };
}

const midpoint = (seg) => seg.coords[Math.floor(seg.coords.length / 2)];

/** weather(point, dateUtc) → {wind_kmh, wind_from, cloud_pct} */
export function analyse(segments, departure, speedKmh, weather) {
  return segments.map((seg) => {
    const kmMid = (seg.km_start + seg.km_end) / 2;
    const eta = new Date(departure.getTime() + (kmMid / speedKmh) * HOUR_MS);
    const [lat, lon] = midpoint(seg);
    const { azimuth, elevation } = sunPosition(lat, lon, eta);
    const w = weather(midpoint(seg), eta);
    return {
      coords: seg.coords,
      km_start: seg.km_start,
      km_end: seg.km_end,
      heading: seg.heading,
      eta_utc: eta.toISOString(),
      sun_az: azimuth,
      sun_el: elevation,
      cloud_pct: w.cloud_pct,
      sun: sunState(seg.heading, azimuth, elevation, w.cloud_pct),
      wind_kmh: w.wind_kmh,
      wind_from: w.wind_from,
      wind: windState(seg.heading, w.wind_from),
    };
  });
}

/** Aandeel van de afstand per zon- en windtoestand (0–1) en de gemiddelde wind. */
export function summarize(results) {
  const len = (r) => r.km_end - r.km_start;
  const total = results.reduce((s, r) => s + len(r), 0) || 1;
  const shares = (attr, states) =>
    Object.fromEntries(
      states.map((st) => [st, results.filter((r) => r[attr] === st).reduce((s, r) => s + len(r), 0) / total]),
    );
  // Afronden op 0,1 km/u: zo geven Python en de browser-engine dezelfde Beaufort op een grens.
  const avgWind = Math.round((results.reduce((s, r) => s + r.wind_kmh * len(r), 0) / total) * 10) / 10;
  return {
    distance_km: total,
    sun: shares("sun", ["zon", "bewolkt", "verblinding", "donker"]),
    wind: shares("wind", ["mee", "zij", "tegen"]),
    avg_wind_kmh: avgWind,
    avg_wind_bft: beaufort(avgWind),
  };
}

export function penalty(summary, avoidSun, avoidWind) {
  return (avoidSun ? summary.sun.verblinding : 0) + (avoidWind ? summary.wind.tegen : 0);
}

/** Beste verschuiving uit ADVICE_OFFSETS_MIN als die de voorkeuren beter respecteert. */
export function departureAdvice(segments, departure, speedKmh, weather, avoidSun, avoidWind) {
  if (!avoidSun && !avoidWind) return null;
  const base = penalty(summarize(analyse(segments, departure, speedKmh, weather)), avoidSun, avoidWind);
  if (base === 0) return null;
  const options = ADVICE_OFFSETS_MIN.map((offset) => {
    const dep = new Date(departure.getTime() + offset * 60_000);
    const summary = summarize(analyse(segments, dep, speedKmh, weather));
    return {
      offset_min: offset,
      departure_utc: dep.toISOString(),
      penalty: penalty(summary, avoidSun, avoidWind),
      summary,
    };
  });
  const best = options.reduce((a, b) =>
    b.penalty < a.penalty || (b.penalty === a.penalty && Math.abs(b.offset_min) < Math.abs(a.offset_min)) ? b : a,
  );
  return {
    base_penalty: base,
    best: best.penalty < base ? best : null,
    improvement: Math.max((base - best.penalty) / base, 0),
    options,
  };
}
