# AGENTS.md: werkafspraken voor AI-assistenten

## Context
- **Specificatie:** [prd_zontraject_app.md](prd_zontraject_app.md).
- **UI:** `design/stitch_minimalist_web_browser_interface/`.
  - `dutch_solar_vector/DESIGN.md`: design system;
  - `zontraject_routeplanner_analyse/{code.html,screen.png}`: visuele referentie.
  - Kopieer geen CDN-links. De voorbeeldcijfers in het ontwerp zijn **geen** testverwachtingen.
- **Sessie-overdracht:** `/handover` aan het einde, `/resume` aan het begin (`.agents/skills/`).

## Beslissingen (2026-10-25, niet heropenen)
- **Stack:** statische frontend (`web/`): HTML, vanilla JS, Tailwind 4 en Leaflet. Geen Streamlit, geen frontend-framework.
- **Twee engines met dezelfde logica (2026-10-26):**
  - `web/static/engine/` (JS) rekent in de browser, zodat de site statisch op **Netlify** draait (`netlify.toml`).
  - `src/zontraject/` (Python/FastAPI) draait als server, bv. op **Render** (`Dockerfile`, `render.yaml`) of lokaal.
  - `app.js` vraagt `/api/health`: is er een server, dan rekent die, anders de browser.
  - **Elke wijziging aan de rekenlogica gebeurt in beide**, met tests aan beide kanten (`tests/` en `web/test/`). Beide geven hetzelfde antwoord-JSON.
- **Eenvoud gaat voor.** Kies bij twijfel de eenvoudigste oplossing.
- **Assets lokaal gebundeld via npm:** Tailwind, Leaflet en de fonts Inter en JetBrains Mono. Geen CDN's of Google Fonts.
  - Externe verzoeken alleen naar Nominatim, OSRM, Open-Meteo en de OSM-kaarttegels.
- **Zonnestand lokaal berekenen** (`astral`), niet via Open-Meteo.
- **Windrichting = waar de wind vandaan komt.** Hoekverschillen worden altijd teruggerekend naar 0–180°.
- **Kaart in 2 dimensies**, met een schakelaar Zon/Wind:
  - Zon: rood = verblinding, amber = zon, slate = bewolkt of donker.
  - Wind: rood = tegen, slate = zij, groen = mee.
- **Kleuren:** de slate- en amber-tokens uit de tekst van DESIGN.md (`web/src/input.css`), niet de Material-tokens in de frontmatter.
- **Vertrekadvies:** −60, −30, +30 en +60 minuten (PRD).
- **Niet in v1:** schaduw van bos of gebouwen, hoogteprofiel, UV-index, de pagina's "Hoe het werkt" en "Documentatie", login of avatar.
- **Externe diensten:**
  - routing: `routing.openstreetmap.de/routed-bike`;
  - geocoding: Nominatim (max. 1 verzoek/s, eigen User-Agent);
  - weer: Open-Meteo (uurwaarden, in UTC).

## Conventies
- **Taal:** UI-teksten en docs in het Nederlands. Code-identifiers en commits in het Engels.
- **Python:** 3.12, `ruff` (lijnlengte 100), type hints. `uv run pytest` moet groen zijn.
  - De rekenlogica (`geo.py`, `conditions.py`, `analyse.py`) is puur en zonder netwerk testbaar. Netwerkcode zit alleen in `services.py`.
- **Frontend:** kleuren alleen via de tokens in `web/src/input.css` (`@theme static`). `app.js` leest ze als CSS-variabelen; geen losse hex-waarden in HTML of JS.
- **Commits** alleen op vraag van de gebruiker. Geen API-sleutels of `.env` in git.

## Commando's
| Wat | Commando |
|---|---|
| Frontend-assets bouwen | `cd web && npm install && npm run build` |
| Server starten | `uv run uvicorn zontraject.main:app --reload` → http://127.0.0.1:8000 |
| Tests (Python) | `uv run pytest` |
| Tests (browser-engine) | `cd web && npm test` |
| Lint | `uv run ruff check .` |
