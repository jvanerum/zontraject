# PROGRESS — ZonTraject

## 2026-10-25 15:49 — Handover
- **Gedaan:** HANDOVER.md geschreven en gearchiveerd in `handover/HANDOVER-2026-10-25-1549.md`.
- **Geverifieerd:** pytest 37 geslaagd, ruff schoon.
- **Volgende:** de eerste commit (na akkoord), verblinding live verifiëren, de tijdlijn rustiger maken, de mobiele layout nakijken.

## 2026-10-25 15:45 — Eerste werkende versie (v0.1)
- **Beslist:** FastAPI + statische HTML/Tailwind/Leaflet; kaart met schakelaar Zon/Wind; zonnestand lokaal; tokens uit de tekst van DESIGN.md; alles lokaal gebundeld; vertrekadvies ±30/60 min; extra's uit Stitch (bos/schaduw, hoogteprofiel, UV, extra pagina's, login) niet in v1. Zie AGENTS.md.
- **Gedaan:**
  - Backend: `geo`, `conditions`, `analyse` (puur) en `services` (Nominatim, OSRM-fiets, Open-Meteo).
  - Endpoint `POST /api/analyse`.
  - Frontend: formulier, zon- en windmeter, vertrekadvies, Leaflet-kaart met OSM-tegels, gegroepeerde segmenttijdlijn.
- **Geverifieerd:**
  - `uv run pytest`: 37 geslaagd; `ruff check`: schoon; `npm run build` werkt.
  - End-to-end via de browser: Amersfoort → Utrecht op 26/10 om 16:15 met 25 km/u gaf 23,4 km, 100% bewolkt, wind 1% mee, 75% zij, 24% tegen. Het advies meldt correct "geen beter vertrektijdstip".
- **Niet geverifieerd:**
  - een rit met echte verblinding (beide testdagen waren volledig bewolkt);
  - de mobiele weergave;
  - het gedrag bij een API-storing.
- **Volgende:** testen met een zonnige voorspelling; de tijdlijn rustiger maken (veel korte stukjes in de stad); de mobiele layout nakijken; de eerste commit.

## 2026-10-25 15:30 — Projectstructuur opgezet
- **Gedaan:**
  - `git init` op `main`, nog zonder commits.
  - AGENTS.md, README.md, `init.sh`, `.gitignore`, `.gitattributes`.
  - Skills `/handover` en `/resume` in `.agents/skills/`; mappen `design/` en `handover/`.
- **Geverifieerd:** `bash init.sh` draait.
- **Volgende:**
  - `design/UI.md` toevoegen (van de gebruiker, uit Google Stitch);
  - de webstack kiezen (PRD §1);
  - daarna een eerste skelet.
- **Open punten in de PRD:**
  - de zonnestand lokaal berekenen (Open-Meteo levert waarschijnlijk geen azimut of elevatie);
  - de windrichting is de richting waar de wind *vandaan* komt;
  - hoekverschillen moeten rond 360° draaien;
  - "schaduw" betekent alleen bewolking;
  - voor fietsroutes is een OSRM-server met fietsprofiel nodig.
