"""Externe diensten: Nominatim (geocoding), OSRM-fiets (routing), Open-Meteo (weer)."""

import asyncio
import time
from bisect import bisect_left
from datetime import UTC, datetime, timedelta

import httpx

from .analyse import Weather, WeatherLookup
from .geo import Point, distance_m

USER_AGENT = "ZonTraject/0.1 (lokaal prototype)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_BIKE_URL = "https://routing.openstreetmap.de/routed-bike/route/v1/driving"
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_SAMPLE_EVERY_M = 5_000  # één weerpunt per ~5 km route
WEATHER_MAX_POINTS = 12


class ServiceError(Exception):
    """Fout die als leesbare melding naar de gebruiker mag."""


# --- Nominatim: max. 1 verzoek per seconde, met cache --------------------------------------
_geo_cache: dict[str, tuple[Point, str]] = {}
_geo_lock = asyncio.Lock()
_geo_last = 0.0


async def geocode(client: httpx.AsyncClient, query: str) -> tuple[Point, str]:
    """Adres → ((lat, lon), weergavenaam)."""
    key = query.strip().lower()
    if key in _geo_cache:
        return _geo_cache[key]
    global _geo_last
    async with _geo_lock:
        wait = 1.0 - (time.monotonic() - _geo_last)
        if wait > 0:
            await asyncio.sleep(wait)
        r = await client.get(
            NOMINATIM_URL,
            params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "nl,be"},
            headers={"User-Agent": USER_AGENT},
        )
        _geo_last = time.monotonic()
    r.raise_for_status()
    hits = r.json()
    if not hits:
        raise ServiceError(f"Adres niet gevonden: {query}")
    hit = hits[0]
    result = ((float(hit["lat"]), float(hit["lon"])), hit["display_name"])
    _geo_cache[key] = result
    return result


# --- OSRM fietsroute -----------------------------------------------------------------------
async def bike_route(client: httpx.AsyncClient, a: Point, b: Point) -> list[Point]:
    """Fietsroute als lijst (lat, lon)."""
    coords = f"{a[1]},{a[0]};{b[1]},{b[0]}"
    r = await client.get(
        f"{OSRM_BIKE_URL}/{coords}", params={"overview": "full", "geometries": "geojson"}
    )
    r.raise_for_status()
    data = r.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ServiceError("Geen fietsroute gevonden tussen deze adressen.")
    return [(lat, lon) for lon, lat in data["routes"][0]["geometry"]["coordinates"]]


# --- Open-Meteo ----------------------------------------------------------------------------
def sample_points(route: list[Point]) -> list[Point]:
    """Weerpunten langs de route: begin, elke ~5 km, einde (max. WEATHER_MAX_POINTS)."""
    points = [route[0]]
    since = 0.0
    for prev, p in zip(route, route[1:], strict=False):
        since += distance_m(prev, p)
        if since >= WEATHER_SAMPLE_EVERY_M:
            points.append(p)
            since = 0.0
    points.append(route[-1])
    if len(points) > WEATHER_MAX_POINTS:
        step = (len(points) - 1) / (WEATHER_MAX_POINTS - 1)
        points = [points[round(i * step)] for i in range(WEATHER_MAX_POINTS)]
    return points


async def fetch_weather(
    client: httpx.AsyncClient, points: list[Point], start_utc: datetime, end_utc: datetime
) -> WeatherLookup:
    """Uurlijkse wind en bewolking voor alle punten in één verzoek → lookup-functie."""
    r = await client.get(
        OPEN_METEO_URL,
        params={
            "latitude": ",".join(f"{p[0]:.4f}" for p in points),
            "longitude": ",".join(f"{p[1]:.4f}" for p in points),
            "hourly": "wind_speed_10m,wind_direction_10m,cloud_cover",
            "wind_speed_unit": "kmh",
            "timezone": "GMT",
            "start_date": start_utc.date().isoformat(),
            "end_date": end_utc.date().isoformat(),
        },
    )
    if r.status_code == 400:
        raise ServiceError("Geen weersvoorspelling beschikbaar voor deze datum.")
    r.raise_for_status()
    data = r.json()
    if isinstance(data, dict):  # één punt → geen lijst
        data = [data]
    series = [_parse_hourly(d["hourly"]) for d in data]
    return make_lookup(points, series)


def _parse_hourly(h: dict) -> list[tuple[datetime, Weather]]:
    rows = []
    for t, ws, wd, cc in zip(
        h["time"], h["wind_speed_10m"], h["wind_direction_10m"], h["cloud_cover"], strict=True
    ):
        if ws is None or wd is None or cc is None:
            continue
        rows.append((datetime.fromisoformat(t).replace(tzinfo=UTC), Weather(ws, wd, cc)))
    return rows


def make_lookup(
    points: list[Point], series: list[list[tuple[datetime, Weather]]]
) -> WeatherLookup:
    """Dichtstbijzijnde weerpunt + dichtstbijzijnde uur."""

    def lookup(p: Point, when: datetime) -> Weather:
        i = min(range(len(points)), key=lambda k: distance_m(p, points[k]))
        rows = series[i]
        if not rows:
            raise ServiceError("Onvolledige weersgegevens.")
        times = [t for t, _ in rows]
        j = bisect_left(times, when + timedelta(minutes=30)) - 1
        return rows[min(max(j, 0), len(rows) - 1)][1]

    return lookup
