# PROGRESS — ZonTraject

## 2026-10-26 20:00 — Online zetten: Netlify (statisch) én Render (Python)
- **Probleem:** de deploy op Netlify werkte niet. ZonTraject was een FastAPI-app, en Netlify draait geen Python. Daarnaast stond de pagina in `web/static/` en waren `app.css` en `vendor/` niet gebouwd.
- **Gedaan:**
  - Rekenlogica in JavaScript: `web/static/engine/` (geo, conditions met NOAA-zonnestand, analyse, services, index).
  - `app.js` kiest zelf: `/api/health` ok → server, anders de browser.
  - `netlify.toml` (base `web`, `npm ci && npm test && npm run build`, publish `static`).
  - `Dockerfile` + `render.yaml` + `.dockerignore` voor Render.
  - Gemiddelde wind afgerond op 0,1 km/u (Python én JS), zodat de Beaufort-grens gelijk valt.
- **Geverifieerd:**
  - pytest 37 en `node --test` 17 geslaagd; ruff schoon.
  - De zonnestand in JS is identiek aan astral (200 willekeurige gevallen, afwijking 0,000°).
  - Beide engines zijn identiek op dezelfde route en hetzelfde weer (max afwijking 7,6e-13).
  - Het Netlify-buildcommando lukt lokaal vanaf nul. Als statische site (zonder Python) werkt de pagina in de browser, inclusief advies.
  - Via de Python-server gebruikt de pagina wel `/api/analyse`.
- **Niet geverifieerd:**
  - de echte Netlify-deploy;
  - de Docker-build (Docker staat niet op deze pc);
  - de Render-deploy.
- **Let op:** Nominatim kan voor dezelfde zoekterm een iets ander punt geven, afhankelijk van de client (±100 m). Daardoor verschillen de routes tussen browser en server soms een beetje.

## 2026-10-25 16:12 — Handover
- **Gedaan:** HANDOVER.md bijgewerkt en gearchiveerd in `handover/HANDOVER-2026-10-25-1612.md`.
- **Geverifieerd:** pytest 37 geslaagd, ruff schoon. `main` staat 1 doc-commit voor op `origin/main`.
- **Volgende:** de gebruiker pusht, installeert uv en test met `.\start.ps1`; daarna next_steps 2–5.

## 2026-10-25 16:10 — Op GitHub
- **Gedaan:** de gebruiker heeft de private repo jvanerum/zontraject aangemaakt en `main` gepusht. "Repository not found" kwam doordat de repo nog niet bestond.
- **Geverifieerd:** `git ls-remote origin` geeft `main` = `991d1b4` = lokaal.
- **Volgende:** zie HANDOVER.md, next_steps 2–5.

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
