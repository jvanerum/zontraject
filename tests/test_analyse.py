from datetime import UTC, datetime, timedelta

import pytest

from zontraject.analyse import (
    Weather,
    analyse,
    build_segments,
    departure_advice,
    summarize,
)

# Rechte lijn van ~10 km pal west (heading 270°), punten om de ~100 m
WEST_ROUTE = [(52.0, 5.0 - i * 0.00146) for i in range(101)]


def constant_weather(wind_from: float = 270, kmh: float = 20, cloud: float = 0):
    return lambda _p, _t: Weather(wind_kmh=kmh, wind_from=wind_from, cloud_pct=cloud)


def test_build_segments_cover_route_without_gaps():
    segs = build_segments(WEST_ROUTE)
    assert segs[0].km_start == 0
    assert segs[-1].km_end == pytest.approx(10.0, rel=0.01)
    for a, b in zip(segs, segs[1:], strict=False):
        assert a.km_end == pytest.approx(b.km_start)
        assert a.coords[-1] == b.coords[0]
    assert all(s.heading == pytest.approx(270, abs=1) for s in segs)
    assert all(s.km_end - s.km_start >= 0.25 - 1e-9 for s in segs)


def test_build_segments_short_route():
    assert build_segments([(52.0, 5.0)]) == []
    assert len(build_segments([(52.0, 5.0), (52.0, 5.0005)])) == 1


def test_eta_follows_speed():
    segs = build_segments(WEST_ROUTE)
    dep = datetime(2026, 6, 21, 8, 0, tzinfo=UTC)
    res = analyse(segs, dep, 20, constant_weather())
    last = res[-1]
    km_mid = (last.km_start + last.km_end) / 2
    assert last.eta_utc == dep + timedelta(hours=km_mid / 20)


def test_headwind_and_westward_evening_glare():
    segs = build_segments(WEST_ROUTE)
    # 21 december, ~14:45 UTC: zon laag in het ZW/W; westwaarts rijden → in de ogen?
    dep = datetime(2026, 12, 21, 14, 30, tzinfo=UTC)
    res = analyse(segs, dep, 20, constant_weather(wind_from=270))
    s = summarize(res)
    assert s["wind"]["tegen"] == pytest.approx(1.0)
    assert sum(s["sun"].values()) == pytest.approx(1.0)
    assert s["distance_km"] == pytest.approx(10.0, rel=0.01)


def test_summary_overcast_means_no_glare():
    segs = build_segments(WEST_ROUTE)
    dep = datetime(2026, 12, 21, 14, 30, tzinfo=UTC)
    s = summarize(analyse(segs, dep, 20, constant_weather(cloud=100)))
    assert s["sun"]["bewolkt"] == pytest.approx(1.0)
    assert s["sun"]["verblinding"] == 0


def test_advice_none_without_preferences_or_problems():
    segs = build_segments(WEST_ROUTE)
    dep = datetime(2026, 6, 21, 10, 0, tzinfo=UTC)
    w = constant_weather(wind_from=90)  # wind mee
    assert departure_advice(segs, dep, 20, w, avoid_sun=False, avoid_wind=False) is None
    assert departure_advice(segs, dep, 20, w, avoid_sun=False, avoid_wind=True) is None


def test_advice_picks_offset_where_wind_turns():
    segs = build_segments(WEST_ROUTE)
    dep = datetime(2026, 6, 21, 10, 0, tzinfo=UTC)

    def weather(_p, when):  # tegenwind tot 10:45, daarna wind mee
        cutoff = datetime(2026, 6, 21, 10, 45, tzinfo=UTC)
        return Weather(20, 270 if when < cutoff else 90, 0)

    advice = departure_advice(segs, dep, 20, weather, avoid_sun=False, avoid_wind=True)
    assert advice["best"]["offset_min"] == 60
    assert advice["best"]["penalty"] == 0
    assert advice["improvement"] == pytest.approx(1.0)
