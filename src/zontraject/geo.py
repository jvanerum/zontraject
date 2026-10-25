"""Geometrie op de bol: afstand, rijrichting en hoekverschil."""

import math

EARTH_RADIUS_M = 6_371_000

Point = tuple[float, float]  # (lat, lon)


def distance_m(a: Point, b: Point) -> float:
    """Haversine-afstand in meter."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(h))


def bearing_deg(a: Point, b: Point) -> float:
    """Kompasrichting van a naar b (0° = noord, 90° = oost)."""
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    return math.degrees(math.atan2(x, y)) % 360


def angle_diff(a: float, b: float) -> float:
    """Kleinste hoek tussen twee richtingen, 0–180° (350° vs 10° → 20°)."""
    d = abs(a - b) % 360
    return 360 - d if d > 180 else d


def compass(deg: float) -> str:
    """Windroos-afkorting in het Nederlands (16 streken)."""
    names = ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO",
             "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"]  # fmt: skip
    return names[round(deg % 360 / 22.5) % 16]
