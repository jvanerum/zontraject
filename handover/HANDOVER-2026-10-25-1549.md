---
title: Handover — ZonTraject
project: zontraject
date: 2026-10-25
time: 15:49
phase: building
---

<mission>
Een eenvoudige webapp die een fietser per routesegment toont hoeveel zon, verblinding en wind (tegen, zij, mee) hij krijgt op een rit van A naar B, met advies voor een betere vertrektijd (PRD).
**Huidige fase: v0.1 afwerken.** Klaar wanneer:
- verblinding met een zonnige voorspelling geverifieerd is;
- de tijdlijn rustig leest;
- de mobiele weergave werkt;
- de eerste commit gemaakt is.
</mission>

<current_state>
- **Werkt (end-to-end getest in de browser):**
  - formulier → `POST /api/analyse` → zon- en windmeter, vertrekadvies, Leaflet-kaart met OSM-tegels en schakelaar Zon/Wind, segmenttijdlijn;
  - echte rit Amersfoort → Utrecht (26/10, 16:15, 25 km/u): 23,4 km, 100% bewolkt, 24% tegenwind, advies "geen beter vertrektijdstip".
- **Backend:**
  - `geo.py`, `conditions.py`, `analyse.py`: puur;
  - `services.py`: Nominatim met throttle van 1 verzoek/s en cache, OSRM-fiets, Open-Meteo met alle weerpunten in één verzoek.
- **Zwak punt:** in de stad bestaat de tijdlijn uit veel korte stukjes (segmenten van ≥250 m met wisselende rijrichting). Opeenvolgende segmenten met dezelfde toestand worden in de UI al samengevoegd, maar het blijft onrustig.
- **Ontbreekt:**
  - foutafhandeling in de UI is getest noch verfijnd;
  - de mobiele layout is niet nagekeken;
  - er zijn geen commits.
</current_state>

<artifacts>
- repo / branch: `C:\Users\jvane\dev\suninmyeyes` @ main, **nog geen commits** (alles untracked). Geen remote.
- **Specificatie:** `prd_zontraject_app.md`. In `design/stitch_minimalist_web_browser_interface/` staat een identieke kopie die nog weg mag; wacht op akkoord van de gebruiker.
- **Ontwerp:** `design/stitch_minimalist_web_browser_interface/`
  - `dutch_solar_vector/DESIGN.md`: tokens; gebruik de tekst, niet de frontmatter;
  - `zontraject_routeplanner_analyse/{code.html,screen.png}`.
- **Code:**
  - `src/zontraject/{geo,conditions,analyse,services,main}.py`
  - `web/static/{index.html,app.js}`
  - `web/src/input.css` (Tailwind 4, `@theme static`)
  - `web/scripts/vendor.mjs` (kopieert Leaflet en de fonts naar `static/vendor`)
- **Starten:** `cd web && npm install && npm run build`, daarna `uv run uvicorn zontraject.main:app --reload` → http://127.0.0.1:8000
- **Tests:** `uv run pytest` (37, zonder netwerk) en `uv run ruff check .`. Alles in één keer: `bash init.sh`.
</artifacts>

<decisions>
De volledige lijst staat in AGENTS.md. Kort:
- **Stack:** FastAPI + statische HTML/vanilla JS/Tailwind 4/Leaflet. Geen Streamlit, geen frontend-framework. **Eenvoud gaat altijd voor.**
- **Kaart in 2 dimensies** met een schakelaar:
  - Zon: rood = verblinding, amber = zon, slate = bewolkt of donker.
  - Wind: rood = tegen, slate = zij, groen = mee.
- **Berekening:**
  - zonnestand lokaal (`astral`);
  - windrichting = waar de wind vandaan komt;
  - hoekverschillen rond 360°.
- **Assets** lokaal gebundeld via npm. Externe verzoeken alleen naar Nominatim, OSRM (`routing.openstreetmap.de/routed-bike`), Open-Meteo en de OSM-tegels.
- **Vertrekadvies:** −60, −30, +30, +60 min.
- **Niet in v1:** bos/schaduw, hoogteprofiel, UV, extra pagina's, login.
- **Testdata:** de voorbeeldcijfers uit Stitch zijn geen testverwachtingen.
</decisions>

<constraints>
- Python 3.12 via uv. `ruff` met lijnlengte 100; pytest moet groen blijven.
- Kleuren alleen via de tokens in `web/src/input.css`. `app.js` leest ze als CSS-variabelen; geen hex-waarden in HTML of JS.
- Regeleinden zijn LF (`.gitattributes`).
- UI en docs in het Nederlands, code en commits in het Engels.
- Commit alleen op vraag van de gebruiker. Geen secrets in git.
- `web/node_modules`, `web/static/app.css` en `web/static/vendor/` zijn gitignored (build-output).
- Nominatim: max. 1 verzoek/s met een eigen User-Agent; respecteer de gebruiksvoorwaarden van de OSM-tegels.
- Na afgerond werk een regel in de werklog: `C:\dev\claudebrain\logs\YYYY-MM-DD.md` (globale CLAUDE.md).
</constraints>

<verification>
- Uitgevoerd op 2026-10-25 om 15:49: `uv run pytest` → 37 geslaagd; `ruff check` → schoon.
- Eerder deze sessie:
  - `npm run build` werkt (Tailwind v4.3.3);
  - de API is met curl getest (Utrecht → Amersfoort);
  - de UI is in de browser getest (Amersfoort → Utrecht): meters, kaart, schakelaar, tijdlijn en advies werken; de fonts laden lokaal.
- NIET geverifieerd:
  - een segment met echte verblinding in een live rit (alleen unit-tests);
  - de mobiele layout;
  - het foutpad in de UI;
  - `bash init.sh` met de frontend-stap (Node staat mogelijk niet in de Git Bash-PATH);
  - "Pas aan naar …" met een echt advies.
</verification>

<next_steps>
1. Vraag of de eerste commit mag, en of de dubbele PRD in `design/` weg mag. Maak dan de commit met de co-author-trailer.
2. Verifieer verblinding live: kies een zonnige dag (bewolking < 70% in Open-Meteo) en een westwaartse rit 1–2 u voor zonsondergang, bv. Amersfoort → Utrecht. Controleer de rode segmenten in de Zon-weergave en de knop "Pas aan naar …".
3. Maak de tijdlijn rustiger. Twee opties; de eenvoudigste eerst:
   - in `app.js` groepen korter dan ~0,5 km samenvoegen met de buren;
   - of de segmentlengte verhogen in `analyse.MIN_SEGMENT_M`, met een test.
4. Kijk de mobiele layout na (< 768 px): het formulier, dan het advies, de kaart en de tijdlijn (DESIGN.md "Layout & Spacing").
5. Test het foutpad: een onbekend adres, een datum buiten het voorspellingsbereik, een API-storing (`services.ServiceError` → 422, `httpx`-fout → 502).
</next_steps>

<unknowns_and_do_not_assume>
- Of de drempel van 70% bewolking voor "bewolkt" goed aanvoelt: dit was een eigen keuze, niet uit de PRD.
- Of `routing.openstreetmap.de` ook Vlaamse routes goed aankan: alleen NL is getest.
- Klikken in het verborgen Craft-browservenster kwamen niet aan; daarom is getest via `evaluate`/`requestSubmit`. Echte klikken door een gebruiker zijn niet getest.
- Of de werklog-skill bestaat: `~/.claude/skills/werklog` verwijst naar het niet-bestaande `C:\dev\claudebrain\.agents\skills`. Het formaat is overgenomen uit `logs/2026-10-24.md`.
</unknowns_and_do_not_assume>

<source_of_truth_rank>
running code > tests > prd_zontraject_app.md / AGENTS.md > PROGRESS.md > deze HANDOVER > oudere handovers.
</source_of_truth_rank>

<startup_protocol>
1. Lees AGENTS.md, `prd_zontraject_app.md`, PROGRESS.md en deze file. Daarna `src/zontraject/analyse.py` en `web/static/app.js`.
2. Draai `bash init.sh`. Bouw de frontend eventueel apart in PowerShell (`cd web; npm run build`). Start de server en doe één route in de browser.
3. Controleer of current_state klopt en benoem elke afwijking.
4. Begin pas dan aan next_steps[1].
</startup_protocol>
