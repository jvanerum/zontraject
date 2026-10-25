from datetime import UTC, datetime

import pytest

from zontraject.conditions import beaufort, sun_position, sun_state, wind_state


def test_sun_position_utrecht_summer_noon_is_high_in_the_south():
    # 21 juni 2026, 11:40 UTC ≈ zonnemiddag in Utrecht
    az, el = sun_position(52.09, 5.11, datetime(2026, 6, 21, 11, 40, tzinfo=UTC))
    assert az == pytest.approx(180, abs=5)
    assert el == pytest.approx(61.4, abs=1)


def test_sun_position_winter_evening_low_in_the_southwest():
    az, el = sun_position(52.09, 5.11, datetime(2026, 12, 21, 14, 30, tzinfo=UTC))
    assert 200 < az < 240
    assert 0 < el < 10


@pytest.mark.parametrize(
    ("heading", "az", "el", "cloud", "expected"),
    [
        (250, 248, 14, 10, "verblinding"),  # laag en recht van voren
        (250, 248, 30, 10, "zon"),  # te hoog voor verblinding
        (90, 248, 14, 10, "zon"),  # zon van opzij/achter
        (250, 248, 14, 90, "bewolkt"),
        (250, 248, -2, 0, "donker"),
        (10, 345, 10, 0, "verblinding"),  # 25° verschil over de 360°-grens
    ],
)
def test_sun_state(heading, az, el, cloud, expected):
    assert sun_state(heading, az, el, cloud) == expected


@pytest.mark.parametrize(
    ("heading", "wind_from", "expected"),
    [
        (240, 225, "tegen"),  # wind uit ZW, je rijdt naar ZW
        (45, 225, "mee"),  # wind uit ZW, je rijdt naar NO
        (135, 225, "zij"),
        (350, 20, "tegen"),  # over de 360°-grens
    ],
)
def test_wind_state_uses_direction_wind_comes_from(heading, wind_from, expected):
    assert wind_state(heading, wind_from) == expected


@pytest.mark.parametrize(("kmh", "bft"), [(0, 0), (3, 1), (18, 3), (25, 4), (120, 12)])
def test_beaufort(kmh, bft):
    assert beaufort(kmh) == bft
