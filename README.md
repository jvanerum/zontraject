# ZonTraject

Een webapp voor fietsers. Ze toont hoeveel zon, verblinding en wind (tegenwind, zijwind, wind mee) je onderweg krijgt op een rit van A naar B, berekend per routesegment en per tijdstip waarop je dat segment bereikt.

## Documenten
| Bestand | Inhoud |
|---|---|
| [prd_zontraject_app.md](prd_zontraject_app.md) | Productspecificatie |
| [AGENTS.md](AGENTS.md) | Werkafspraken voor AI-assistenten |
| [PROGRESS.md](PROGRESS.md) | Chronologisch logboek |
| `HANDOVER.md` | Stand van zaken voor de volgende sessie (gemaakt door `/handover`) |
| `design/` | UI-ontwerp (`UI.md`, Stitch) |

## Starten
**Eenvoudigst (Windows):** voer `.\start.ps1` uit in PowerShell. Dat bouwt de frontend (eenmalig), start de server en opent de browser. Je hebt `uv` en Node nodig.

Of met de hand:
```bash
cd web && npm install && npm run build && cd ..   # Tailwind, Leaflet en fonts lokaal bundelen
uv run uvicorn zontraject.main:app --reload       # http://127.0.0.1:8000
```
Of alles in één keer controleren: `bash init.sh`.

## Online zetten
Er zijn twee manieren. De pagina kiest zelf: draait de Python-server mee, dan rekent die, anders de browser.

| | **A. Netlify (statisch)** | **B. Render (Python-server)** |
|---|---|---|
| Rekenen | in de browser (`web/static/engine/`) | op de server (`src/zontraject/`) |
| Instellingen | `netlify.toml` (wordt automatisch gelezen) | `Dockerfile` + `render.yaml` |
| Hoe | Netlify → *Add new site* → *Import from Git* → deze repo. Laat de velden leeg; `netlify.toml` regelt base, build en publish. | Render → *New* → *Blueprint* → deze repo. |
| Kosten | gratis | gratis plan; de server slaapt na inactiviteit (eerste keer laden ±1 min) |

## Structuur
| Pad | Rol |
|---|---|
| `src/zontraject/geo.py` | Afstand, rijrichting, hoekverschil (rond 360°) |
| `src/zontraject/conditions.py` | Zonnestand (lokaal, `astral`), verblinding, wind tegen/zij/mee |
| `src/zontraject/analyse.py` | Segmenten, ETA, samenvatting, vertrekadvies (±30/60 min) |
| `src/zontraject/services.py` | Nominatim, OSRM-fiets, Open-Meteo |
| `src/zontraject/main.py` | FastAPI: `POST /api/analyse` + de statische frontend |
| `web/static/` | `index.html` + `app.js` (Leaflet-kaart met schakelaar Zon/Wind) |
| `web/static/engine/` | Dezelfde rekenlogica in JavaScript (voor statische hosting) |
| `web/test/` | Tests voor de browser-engine (`npm test`) |
| `web/src/input.css` | Tailwind 4 + design tokens |
| `tests/` | pytest, zonder netwerk |
