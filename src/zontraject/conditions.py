"""Zonnestand en de classificatie van zon en wind per segment (PRD §2.3)."""

from datetime import datetime

from astral import Observer
from astral.sun import azimuth, elevation

from .geo import angle_diff

GLARE_MAX_ELEVATION = 25.0  # laagstaande zon: 0° ≤ h ≤ 25°
GLARE_MAX_ANGLE = 30.0  # zon minder dan 30° naast de rijrichting
CLOUDY_FROM_PCT = 70  # vanaf deze bewolking telt een segment als "bewolkt"
HEADWIND_MAX_ANGLE = 45.0
TAILWIND_MIN_ANGLE = 135.0


def sun_position(lat: float, lon: float, when_utc: datetime) -> tuple[float, float]:
    """(azimut, elevatie) in graden, lokaal berekend."""
    obs = Observer(latitude=lat, longitude=lon)
    return azimuth(obs, when_utc), elevation(obs, when_utc)


def sun_state(heading: float, sun_az: float, sun_el: float, cloud_pct: float) -> str:
    """'donker' | 'bewolkt' | 'verblinding' | 'zon'."""
    if sun_el <= 0:
        return "donker"
    if cloud_pct >= CLOUDY_FROM_PCT:
        return "bewolkt"
    if sun_el <= GLARE_MAX_ELEVATION and angle_diff(heading, sun_az) < GLARE_MAX_ANGLE:
        return "verblinding"
    return "zon"


def wind_state(heading: float, wind_from: float) -> str:
    """'tegen' | 'zij' | 'mee'. wind_from = richting waar de wind vandaan komt."""
    diff = angle_diff(heading, wind_from)
    if diff < HEADWIND_MAX_ANGLE:
        return "tegen"
    if diff > TAILWIND_MIN_ANGLE:
        return "mee"
    return "zij"


def beaufort(kmh: float) -> int:
    limits = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]
    return next((i for i, lim in enumerate(limits) if kmh < lim), 12)
