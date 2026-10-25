"""FastAPI: POST /api/analyse + de statische frontend uit web/static."""

from datetime import UTC, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .analyse import ADVICE_OFFSETS_MIN, analyse, build_segments, departure_advice, summarize
from .services import ServiceError, bike_route, fetch_weather, geocode, sample_points

LOCAL_TZ = ZoneInfo("Europe/Brussels")
STATIC_DIR = Path(__file__).resolve().parents[2] / "web" / "static"

app = FastAPI(title="ZonTraject")


class AnalyseRequest(BaseModel):
    start: str = Field(min_length=2)
    end: str = Field(min_length=2)
    departure: datetime  # lokale tijd (Europe/Brussels) zonder tijdzone
    speed_kmh: float = Field(gt=5, le=50)
    avoid_sun: bool = True
    avoid_wind: bool = True


@app.post("/api/analyse")
async def analyse_route(req: AnalyseRequest) -> dict:
    dep_local = req.departure.replace(tzinfo=req.departure.tzinfo or LOCAL_TZ)
    dep_utc = dep_local.astimezone(UTC)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            a, a_name = await geocode(client, req.start)
            b, b_name = await geocode(client, req.end)
            route = await bike_route(client, a, b)
            segments = build_segments(route)
            duration = timedelta(hours=segments[-1].km_end / req.speed_kmh)
            margin = timedelta(minutes=max(abs(m) for m in ADVICE_OFFSETS_MIN) + 60)
            weather = await fetch_weather(
                client, sample_points(route), dep_utc - margin, dep_utc + duration + margin
            )
    except ServiceError as e:
        raise HTTPException(422, str(e)) from e
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Externe dienst niet bereikbaar: {e}") from e

    results = analyse(segments, dep_utc, req.speed_kmh, weather)
    advice = departure_advice(
        segments, dep_utc, req.speed_kmh, weather, req.avoid_sun, req.avoid_wind
    )
    return {
        "start": {"name": a_name, "lat": a[0], "lon": a[1]},
        "end": {"name": b_name, "lat": b[0], "lon": b[1]},
        "departure_utc": dep_utc.isoformat(),
        "arrival_utc": (dep_utc + duration).isoformat(),
        "segments": [r.to_dict() for r in results],
        "summary": summarize(results),
        "advice": advice,
    }


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "frontend_built": (STATIC_DIR / "app.css").exists()}


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
