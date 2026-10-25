import pytest

from zontraject.geo import angle_diff, bearing_deg, compass, distance_m


def test_distance_one_degree_latitude_is_about_111_km():
    assert distance_m((52.0, 5.0), (53.0, 5.0)) == pytest.approx(111_195, rel=1e-3)


@pytest.mark.parametrize(
    ("b", "expected"),
    [((53.0, 5.0), 0), ((52.0, 6.0), 90), ((51.0, 5.0), 180), ((52.0, 4.0), 270)],
)
def test_bearing_cardinal_directions(b, expected):
    assert bearing_deg((52.0, 5.0), b) == pytest.approx(expected, abs=0.5)


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [(350, 10, 20), (10, 350, 20), (0, 180, 180), (90, 90, 0), (270, 45, 135)],
)
def test_angle_diff_wraps_around_360(a, b, expected):
    assert angle_diff(a, b) == expected


def test_compass_dutch_names():
    assert [compass(d) for d in (0, 45, 90, 202.5, 359)] == ["N", "NO", "O", "ZZW", "N"]
