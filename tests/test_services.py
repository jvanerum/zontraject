from datetime import UTC, datetime

from zontraject.analyse import Weather
from zontraject.services import WEATHER_MAX_POINTS, make_lookup, sample_points


def _rows(day: int, wind_from: float):
    return [
        (datetime(2026, 6, day, h, tzinfo=UTC), Weather(10 + h, wind_from, 0)) for h in range(24)
    ]


def test_lookup_takes_nearest_point_and_nearest_hour():
    points = [(52.0, 5.0), (52.0, 6.0)]
    lookup = make_lookup(points, [_rows(21, 90), _rows(21, 270)])

    w = lookup((52.0, 5.9), datetime(2026, 6, 21, 10, 40, tzinfo=UTC))
    assert w.wind_from == 270  # dichtste punt
    assert w.wind_kmh == 10 + 11  # 10:40 → 11:00

    w = lookup((52.0, 5.1), datetime(2026, 6, 21, 10, 20, tzinfo=UTC))
    assert w.wind_from == 90
    assert w.wind_kmh == 10 + 10  # 10:20 → 10:00


def test_sample_points_include_ends_and_respect_max():
    route = [(52.0, 5.0 + i * 0.01) for i in range(1000)]  # ~680 km
    pts = sample_points(route)
    assert pts[0] == route[0] and pts[-1] == route[-1]
    assert len(pts) == WEATHER_MAX_POINTS
