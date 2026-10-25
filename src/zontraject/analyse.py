"""Route opdelen in segmenten, ETA per segment, zon/wind classificeren, samenvatten en
vertrekadvies (PRD §2.2, §2.3, §3). Puur: het weer komt binnen via een lookup-functie."""

from collections.abc import Callable
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta

from .conditions import beaufort, sun_position, sun_state, wind_state
from .geo import Point, bearing_deg, distance_m

MIN_SEGMENT_M = 250  # korte OSRM-stukjes samenvoegen tot segmenten van minstens zoveel meter
ADVICE_OFFSETS_MIN = (-60, -30, 30, 60)


@dataclass
class Weather:
    wind_kmh: float
    wind_from: float  # graden, richting waar de wind vandaan komt
    cloud_pct: float


WeatherLookup = Callable[[Point, datetime], Weather]


@dataclass
class Segment:
    coords: list[Point]
    km_start: float
    km_end: float
    heading: float

    @property
    def midpoint(self) -> Point:
        return self.coords[len(self.coords) // 2]


@dataclass
class SegmentResult:
    coords: list[Point]
    km_start: float
    km_end: float
    heading: float
    eta_utc: datetime
    sun_az: float
    sun_el: float
    cloud_pct: float
    sun: str
    wind_kmh: float
    wind_from: float
    wind: str

    @property
    def length_km(self) -> float:
        return self.km_end - self.km_start

    def to_dict(self) -> dict:
        d = asdict(self)
        d["eta_utc"] = self.eta_utc.isoformat()
        return d


def build_segments(coords: list[Point], min_len_m: float = MIN_SEGMENT_M) -> list[Segment]:
    """Voeg opeenvolgende routepunten samen tot segmenten van minstens `min_len_m`."""
    segments: list[Segment] = []
    if len(coords) < 2:
        return segments
    current = [coords[0]]
    seg_len = 0.0
    done_m = 0.0
    for prev, point in zip(coords, coords[1:], strict=False):
        seg_len += distance_m(prev, point)
        current.append(point)
        if seg_len >= min_len_m:
            segments.append(_segment(current, done_m, seg_len))
            done_m += seg_len
            current, seg_len = [point], 0.0
    if len(current) > 1:
        if segments and seg_len < min_len_m / 2:  # te kort restje: bij het vorige segment
            last = segments.pop()
            done_m -= (last.km_end - last.km_start) * 1000
            seg_len += (last.km_end - last.km_start) * 1000
            current = last.coords + current[1:]
        segments.append(_segment(current, done_m, seg_len))
    return segments


def _segment(coords: list[Point], start_m: float, length_m: float) -> Segment:
    return Segment(
        coords=list(coords),
        km_start=start_m / 1000,
        km_end=(start_m + length_m) / 1000,
        heading=bearing_deg(coords[0], coords[-1]),
    )


def analyse(
    segments: list[Segment], departure_utc: datetime, speed_kmh: float, weather: WeatherLookup
) -> list[SegmentResult]:
    results = []
    for seg in segments:
        km_mid = (seg.km_start + seg.km_end) / 2
        eta = departure_utc + timedelta(hours=km_mid / speed_kmh)
        lat, lon = seg.midpoint
        az, el = sun_position(lat, lon, eta)
        w = weather(seg.midpoint, eta)
        results.append(
            SegmentResult(
                coords=seg.coords,
                km_start=seg.km_start,
                km_end=seg.km_end,
                heading=seg.heading,
                eta_utc=eta,
                sun_az=az,
                sun_el=el,
                cloud_pct=w.cloud_pct,
                sun=sun_state(seg.heading, az, el, w.cloud_pct),
                wind_kmh=w.wind_kmh,
                wind_from=w.wind_from,
                wind=wind_state(seg.heading, w.wind_from),
            )
        )
    return results


def summarize(results: list[SegmentResult]) -> dict:
    """Aandeel van de afstand per zon- en windtoestand (0–1) en de gemiddelde wind."""
    total = sum(r.length_km for r in results) or 1.0

    def shares(attr: str, states: tuple[str, ...]) -> dict[str, float]:
        return {
            s: sum(r.length_km for r in results if getattr(r, attr) == s) / total for s in states
        }

    avg_wind = sum(r.wind_kmh * r.length_km for r in results) / total
    return {
        "distance_km": total,
        "sun": shares("sun", ("zon", "bewolkt", "verblinding", "donker")),
        "wind": shares("wind", ("mee", "zij", "tegen")),
        "avg_wind_kmh": avg_wind,
        "avg_wind_bft": beaufort(avg_wind),
    }


def penalty(summary: dict, avoid_sun: bool, avoid_wind: bool) -> float:
    """Hoe slecht een rit scoort op de gekozen voorkeuren (0 = geen probleem)."""
    p = 0.0
    if avoid_sun:
        p += summary["sun"]["verblinding"]
    if avoid_wind:
        p += summary["wind"]["tegen"]
    return p


def departure_advice(
    segments: list[Segment],
    departure_utc: datetime,
    speed_kmh: float,
    weather: WeatherLookup,
    avoid_sun: bool,
    avoid_wind: bool,
) -> dict | None:
    """Beste verschuiving uit ADVICE_OFFSETS_MIN als die de voorkeuren beter respecteert."""
    if not (avoid_sun or avoid_wind):
        return None
    base = penalty(summarize(analyse(segments, departure_utc, speed_kmh, weather)), avoid_sun,
                   avoid_wind)  # fmt: skip
    if base == 0:
        return None
    options = []
    for offset in ADVICE_OFFSETS_MIN:
        dep = departure_utc + timedelta(minutes=offset)
        summary = summarize(analyse(segments, dep, speed_kmh, weather))
        options.append(
            {
                "offset_min": offset,
                "departure_utc": dep.isoformat(),
                "penalty": penalty(summary, avoid_sun, avoid_wind),
                "summary": summary,
            }
        )
    best = min(options, key=lambda o: (o["penalty"], abs(o["offset_min"])))
    improvement = (base - best["penalty"]) / base
    return {
        "base_penalty": base,
        "best": best if best["penalty"] < base else None,
        "improvement": max(improvement, 0.0),
        "options": options,
    }
