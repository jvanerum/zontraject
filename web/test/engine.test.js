// Tests voor de browser-engine (node --test). Dezelfde gevallen als de pytest-tests in tests/.
import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { analyse, buildSegments, departureAdvice, summarize } from "../static/engine/analyse.js";
import { beaufort, sunPosition, sunState, windState } from "../static/engine/conditions.js";
import { angleDiff, bearingDeg, distanceM } from "../static/engine/geo.js";
import { makeLookup, samplePoints, WEATHER_MAX_POINTS } from "../static/engine/services.js";

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ""} ${actual} ≉ ${expected} (±${tol})`);
const utc = (y, mo, d, h, mi = 0) => new Date(Date.UTC(y, mo - 1, d, h, mi));

describe("geo", () => {
  test("1° breedtegraad ≈ 111 km", () => near(distanceM([52, 5], [53, 5]), 111_195, 111));
  test("windrichtingen", () => {
    for (const [b, exp] of [[[53, 5], 0], [[52, 6], 90], [[51, 5], 180], [[52, 4], 270]]) {
      near(bearingDeg([52, 5], b), exp, 0.5);
    }
  });
  test("hoekverschil rond 360°", () => {
    for (const [a, b, exp] of [[350, 10, 20], [10, 350, 20], [0, 180, 180], [90, 90, 0], [270, 45, 135]]) {
      assert.equal(angleDiff(a, b), exp);
    }
  });
});

describe("conditions", () => {
  test("Utrecht, zomermiddag: hoog in het zuiden", () => {
    const { azimuth, elevation } = sunPosition(52.09, 5.11, utc(2026, 6, 21, 11, 40));
    near(azimuth, 180, 5);
    near(elevation, 61.4, 1);
  });
  test("winteravond: laag in het zuidwesten", () => {
    const { azimuth, elevation } = sunPosition(52.09, 5.11, utc(2026, 12, 21, 14, 30));
    assert.ok(azimuth > 200 && azimuth < 240);
    assert.ok(elevation > 0 && elevation < 10);
  });
  test("zontoestand", () => {
    const cases = [
      [250, 248, 14, 10, "verblinding"],
      [250, 248, 30, 10, "zon"],
      [90, 248, 14, 10, "zon"],
      [250, 248, 14, 90, "bewolkt"],
      [250, 248, -2, 0, "donker"],
      [10, 345, 10, 0, "verblinding"],
    ];
    for (const [h, az, el, cloud, exp] of cases) assert.equal(sunState(h, az, el, cloud), exp);
  });
  test("wind: richting waar de wind vandaan komt", () => {
    for (const [h, from, exp] of [[240, 225, "tegen"], [45, 225, "mee"], [135, 225, "zij"], [350, 20, "tegen"]]) {
      assert.equal(windState(h, from), exp);
    }
  });
  test("beaufort", () => {
    for (const [kmh, bft] of [[0, 0], [3, 1], [18, 3], [25, 4], [120, 12]]) assert.equal(beaufort(kmh), bft);
  });
});

// Rechte lijn van ~10 km pal west, punten om de ~100 m
const WEST_ROUTE = Array.from({ length: 101 }, (_, i) => [52, 5 - i * 0.00146]);
const constantWeather = (windFrom = 270, kmh = 20, cloud = 0) => () => ({
  wind_kmh: kmh,
  wind_from: windFrom,
  cloud_pct: cloud,
});

describe("analyse", () => {
  test("segmenten dekken de route zonder gaten", () => {
    const segs = buildSegments(WEST_ROUTE);
    assert.equal(segs[0].km_start, 0);
    near(segs.at(-1).km_end, 10, 0.1);
    for (let i = 1; i < segs.length; i++) {
      near(segs[i - 1].km_end, segs[i].km_start, 1e-9);
      assert.deepEqual(segs[i - 1].coords.at(-1), segs[i].coords[0]);
    }
    for (const s of segs) {
      near(s.heading, 270, 1);
      assert.ok(s.km_end - s.km_start >= 0.25 - 1e-9);
    }
  });
  test("korte routes", () => {
    assert.deepEqual(buildSegments([[52, 5]]), []);
    assert.equal(buildSegments([[52, 5], [52, 5.0005]]).length, 1);
  });
  test("ETA volgt de snelheid", () => {
    const segs = buildSegments(WEST_ROUTE);
    const dep = utc(2026, 6, 21, 8);
    const last = analyse(segs, dep, 20, constantWeather()).at(-1);
    const kmMid = (last.km_start + last.km_end) / 2;
    near(new Date(last.eta_utc).getTime(), dep.getTime() + (kmMid / 20) * 3_600_000, 1); // Date = hele ms
  });
  test("tegenwind en samenvatting", () => {
    const s = summarize(analyse(buildSegments(WEST_ROUTE), utc(2026, 12, 21, 14, 30), 20, constantWeather(270)));
    near(s.wind.tegen, 1, 1e-9);
    near(Object.values(s.sun).reduce((a, b) => a + b), 1, 1e-9);
    near(s.distance_km, 10, 0.1);
  });
  test("bewolkt = geen verblinding", () => {
    const s = summarize(analyse(buildSegments(WEST_ROUTE), utc(2026, 12, 21, 14, 30), 20, constantWeather(270, 20, 100)));
    near(s.sun.bewolkt, 1, 1e-9);
    assert.equal(s.sun.verblinding, 0);
  });
  test("geen advies zonder voorkeur of probleem", () => {
    const segs = buildSegments(WEST_ROUTE);
    const w = constantWeather(90);
    assert.equal(departureAdvice(segs, utc(2026, 6, 21, 10), 20, w, false, false), null);
    assert.equal(departureAdvice(segs, utc(2026, 6, 21, 10), 20, w, false, true), null);
  });
  test("advies kiest het uur waarop de wind draait", () => {
    const cutoff = utc(2026, 6, 21, 10, 45).getTime();
    const weather = (_p, when) => ({ wind_kmh: 20, wind_from: when.getTime() < cutoff ? 270 : 90, cloud_pct: 0 });
    const advice = departureAdvice(buildSegments(WEST_ROUTE), utc(2026, 6, 21, 10), 20, weather, false, true);
    assert.equal(advice.best.offset_min, 60);
    assert.equal(advice.best.penalty, 0);
    near(advice.improvement, 1, 1e-9);
  });
});

describe("services", () => {
  const rows = (windFrom) =>
    Array.from({ length: 24 }, (_, h) => ({
      time: utc(2026, 6, 21, h),
      weather: { wind_kmh: 10 + h, wind_from: windFrom, cloud_pct: 0 },
    }));
  test("dichtste weerpunt en dichtste uur", () => {
    const lookup = makeLookup([[52, 5], [52, 6]], [rows(90), rows(270)]);
    let w = lookup([52, 5.9], utc(2026, 6, 21, 10, 40));
    assert.equal(w.wind_from, 270);
    assert.equal(w.wind_kmh, 21);
    w = lookup([52, 5.1], utc(2026, 6, 21, 10, 20));
    assert.equal(w.wind_from, 90);
    assert.equal(w.wind_kmh, 20);
  });
  test("weerpunten: begin, einde en maximum", () => {
    const route = Array.from({ length: 1000 }, (_, i) => [52, 5 + i * 0.01]);
    const pts = samplePoints(route);
    assert.deepEqual(pts[0], route[0]);
    assert.deepEqual(pts.at(-1), route.at(-1));
    assert.equal(pts.length, WEATHER_MAX_POINTS);
  });
});
