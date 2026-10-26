// Zonnestand en classificatie van zon en wind (spiegel van src/zontraject/conditions.py).
// De zonnestand volgt het NOAA-algoritme, met atmosferische refractie (zoals astral).

import { angleDiff } from "./geo.js";

export const GLARE_MAX_ELEVATION = 25; // laagstaande zon: 0° ≤ h ≤ 25°
export const GLARE_MAX_ANGLE = 30; // zon minder dan 30° naast de rijrichting
export const CLOUDY_FROM_PCT = 70;
export const HEADWIND_MAX_ANGLE = 45;
export const TAILWIND_MIN_ANGLE = 135;

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** {azimuth, elevation} in graden voor een Date (UTC-moment). */
export function sunPosition(lat, lon, date) {
  const jd = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (jd - 2_451_545) / 36_525;

  const l0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    Math.sin(rad(m)) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * m)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * m)) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda)));

  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(l0)) -
        2 * e * Math.sin(rad(m)) +
        4 * e * y * Math.sin(rad(m)) * Math.cos(2 * rad(l0)) -
        0.5 * y * y * Math.sin(4 * rad(l0)) -
        1.25 * e * e * Math.sin(2 * rad(m)),
    );

  const minutesUtc =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolar = (((minutesUtc + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  let hourAngle = trueSolar / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const phi = rad(lat);
  const ha = rad(hourAngle);
  const cosZenith = Math.min(
    1,
    Math.max(-1, Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha)),
  );
  const elevation = 90 - deg(Math.acos(cosZenith));
  const azimuth =
    (deg(Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi))) +
      180 +
      360) %
    360;
  return { azimuth, elevation: elevation + refraction(elevation) };
}

function refraction(el) {
  if (el > 85) return 0;
  const te = Math.tan(rad(el));
  let arcsec;
  if (el > 5) arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (el > -0.575) arcsec = 1735 + el * (-518.2 + el * (103.4 + el * (-12.79 + el * 0.711)));
  else arcsec = -20.774 / te;
  return arcsec / 3600;
}

/** 'donker' | 'bewolkt' | 'verblinding' | 'zon' */
export function sunState(heading, sunAz, sunEl, cloudPct) {
  if (sunEl <= 0) return "donker";
  if (cloudPct >= CLOUDY_FROM_PCT) return "bewolkt";
  if (sunEl <= GLARE_MAX_ELEVATION && angleDiff(heading, sunAz) < GLARE_MAX_ANGLE) {
    return "verblinding";
  }
  return "zon";
}

/** 'tegen' | 'zij' | 'mee'. windFrom = richting waar de wind vandaan komt. */
export function windState(heading, windFrom) {
  const diff = angleDiff(heading, windFrom);
  if (diff < HEADWIND_MAX_ANGLE) return "tegen";
  if (diff > TAILWIND_MIN_ANGLE) return "mee";
  return "zij";
}

export function beaufort(kmh) {
  const limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const i = limits.findIndex((lim) => kmh < lim);
  return i === -1 ? 12 : i;
}
