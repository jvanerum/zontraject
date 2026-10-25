# Product Requirements Document (PRD): ZonTraject App

## 1. Project Overview & Objective

Het doel is om een gebruiksvriendelijke webapplicatie te bouwen waarmee een fietser precies kan zien hoeveel zon, schaduw, verblinding én wind (tegenwind/zijwind/wind mee) hij/zij zal ervaren op een fietstocht van willekeurig punt A naar punt B.

Omdat fietstochten meerdere uren kunnen duren en de omstandigheden onderweg veranderen, berekent de app de zonnestand, bewolking en **wind (richting en snelheid)** dynamisch op basis van de **voorspelde fietssnelheid** en de **tijdstippen waarop elk routesegment wordt bereikt**.

De gebruiker kan expliciet instellen of hij/zij **laagstaande zon in de ogen** en/of **tegenwind** wil vermijden. De app analyseert de route en geeft een duidelijke score/waarschuwing en eventueel advies voor een beter vertrektijdstip.

* **Doelgroep:** Recreatieve en functionele fietsers (incl. e-bikes en speed pedelecs) die hun rit willen plannen op basis van zon, verblinding en windomstandigheden.
* **Technologische Stack:** Python (Streamlit / Flask / FastAPI), OpenStreetMap / OSRM (voor fietsrouting), Geopy / Nominatim (voor geocoding), Open-Meteo API (voor dynamische weer-, wind- en zonne-data).

---

## 2. Core Functional Requirements (User Stories)

### 2.1 Input van de Gebruiker
1. **Adresinvoer:**
   * Startadres en Eindadres (via zoekvelden/geocoding).
2. **Ritdetails:**
   * Vertrekdatum en vertrektijd.
   * Gemiddelde fietssnelheid (bijv. 18 km/u stadsfiets, 25 km/u e-bike, 35 km/u speed pedelec).
3. **Voorkeursfilters (Aan/Uit vinkjes):**
   * **[ ] Vermijd zon in de ogen:** Filtert/waarschuwt voor situaties waarin de zon laag staat en recht van voren schijnt.
   * **[ ] Vermijd tegenwind:** Filtert/waarschuwt voor trajectonderdelen met significante tegenwind.

### 2.2 Tijd- en Trajectberekening (Dynamische Tijdlijn)
* De totale route wordt opgedeeld in kleine geografische lijnsegmenten.
* Op basis van de totale afstand en de gekozen snelheid berekent de app voor elk segment de **Geschatte Tijd van Aankomst (ETA)**.
* Voor elk segment berekent de app de juiste **Rijrichting (Heading / Bearing)** in graden ($0^\circ$ tot $360^\circ$).

### 2.3 Zon- & Windberekening per Segment
Voor elk specifiek segment én op de bijbehorende ETA berekent de app:
1. **Zonnestand:**
   * **Solar Azimut ($\alpha$):** Kompasrichting van de zon.
   * **Solar Elevatie ($h$):** Hoogte van de zon boven de horizon.
   * **Verblinding (Zon in ogen):** Als $0^\circ \le h \le 25^\circ$ (laagstaande zon) én het verschil tussen de rijrichting en de zonne-azimut minder dan $30^\circ$ is, stempelt de app dit segment als "Verblinding / Zon in ogen".
2. **Windvector:**
   * **Windrichting & Windsnelheid:** Opgesteld via de Open-Meteo API op het exacte tijdstip en de exacte locatie van het segment.
   * **Relatieve Windhoek:** 
     * Verschil met rijrichting $< 45^\circ$ $\rightarrow$ **Tegenwind**.
     * Verschil met rijrichting $> 135^\circ$ $\rightarrow$ **Wind mee**.
     * Tussen $45^\circ$ en $135^\circ$ $\rightarrow$ **Zijwind**.

---

## 3. UI & Visualisatieresultaten

* **Overzichts-Dashboard:**
  * **Zon-meter:** Percentage van de rit in de volle zon, schaduw/bewolking, en percentage van de rit met de zon recht in de ogen.
  * **Wind-meter:** Percentage tegenwind, zijwind en wind mee, inclusief gemiddelde windsnelheid in km/u of Bft.
* **Tijdlijn & Kaartvisualisatie:**
  * Een interactieve kaart (bijv. met `folium` of `pydeck`) waar de route gekleurd is op basis van de omstandigheden:
    * *Rood:* Verblindende laagstaande zon of zware tegenwind.
    * *Geel:* Aangename zon / Wind mee.
    * *Grijs:* Bewolkt / Schaduw.
* **Vertrektijd Advies (Slimme Tip):**
  * Indien de gekozen voorkeuren ("Vermijd zon in ogen" of "Vermijd tegenwind") geschonden worden, analyseert de app het effect van 30 of 60 minuten eerder/later vertrekken en geeft een aanbeveling (bijv. *"Als je 45 minuten later vertrekt, heb je 80% minder last van laagstaande zon"*).

---

## 4. Technical Architecture & APIs

```
[ Frontend: Streamlit / Web UI ]
               │
               ▼
[ Geocoding (Nominatim API) ] ──► Zet adressen om naar Lat/Lon
               │
               ▼
[ Routing (OSRM / OpenStreetMap) ] ──► Berekent fietstraject & segment-headings
               │
               ▼
[ Tijdlijn & ETA Generator ] ──► Berekent tijdstip per segment op basis van fietssnelheid
               │
               ▼
[ Weer & Zon API (Open-Meteo) ] ──► Ophalen zon-azimut, zonne-hoogte, windrichting & windkracht per ETA
               │
               ▼
[ Analyse Engine ] ──► Matcht headings met zon/wind-hoeken & genereert waarschuwingen
               │
               ▼
[ UI Weergave ] ──► Kaart + Statistieken + Slim Vertrekadvies
```

---

## 5. Non-Functional Requirements
* **Eenvoud:** Geen ingewikkelde instellingen; met minimaal 3 tot 4 inputs moet de analyse direct klaar zijn.
* **Snelheid:** De berekening en API-calls moeten binnen 3 tot 5 seconden afgerond zijn.
* **Mobielvriendelijk:** De Streamlit-interface moet goed leesbaar zijn op smartphone-schermen.