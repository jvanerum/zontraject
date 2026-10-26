// Geometrie op de bol: afstand, rijrichting en hoekverschil (spiegel van src/zontraject/geo.py).

const EARTH_RADIUS_M = 6_371_000;
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/** Haversine-afstand in meter tussen [lat, lon]-punten. */
export function distanceM([lat1, lon1], [lat2, lon2]) {
  const h =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Kompasrichting van a naar b (0° = noord, 90° = oost). */
export function bearingDeg([lat1, lon1], [lat2, lon2]) {
  const dlon = rad(lon2 - lon1);
  const x = Math.sin(dlon) * Math.cos(rad(lat2));
  const y =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dlon);
  return (deg(Math.atan2(x, y)) + 360) % 360;
}

/** Kleinste hoek tussen twee richtingen, 0–180° (350° vs 10° → 20°). */
export function angleDiff(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
