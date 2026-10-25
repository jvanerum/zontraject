---
name: Dutch Solar Vector
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#554336'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#887364'
  outline-variant: '#dbc2b0'
  surface-tint: '#904d00'
  primary: '#8d4b00'
  on-primary: '#ffffff'
  primary-container: '#b15f00'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb77d'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc3'
  primary-fixed-dim: '#ffb77d'
  on-primary-fixed: '#2f1500'
  on-primary-fixed-variant: '#6e3900'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
  sun-amber-light: '#F59E0B'
  sun-amber-deep: '#B45309'
  sky-blue-light: '#38BDF8'
  sky-blue-deep: '#0369A1'
  alert-red: '#EF4444'
  alert-red-bg: '#FEF2F2'
  alert-red-border: '#FCA5A5'
  wind-favorable-green: '#10B981'
  wind-neutral-yellow: '#EAB308'
  slate-surface: '#F8FAFC'
  slate-border: '#E2E8F0'
  slate-muted: '#64748B'
  slate-dark: '#334155'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  metric-display:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.03em
  metric-display-mobile:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  label-data:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  label-ui:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system embodies a modern Dutch engineering philosophy: utilitarian, precise, hyper-legible, and uncompromisingly functional. Designed for cyclists confronting changing environmental conditions—glare, angular solar exposure, and shifting wind vectors—the interface rejects decorative clutter in favor of high-clarity data delivery.

The visual style merges structured **minimalism** with an **instrumentation dashboard** aesthetic. Layouts favor dense, scan-friendly data clusters, precise divider lines, and crisp tabular numbers over soft ornamental decor. It conveys immediate trust, technological reliability, and outdoor legibility under direct sunlight.

## Colors

The color architecture is built around functional status indicators and outdoor optical clarity:

- **Primary (`#D97706` / `#F59E0B`)**: Represents solar elevation, warm daylight, and primary navigational telemetry. Amber is used for core brand presence and solar progression meters.
- **Secondary (`#0284C7`)**: Signifies atmospheric flow, wind paths, and interactive map vectors.
- **Tertiary (`#10B981`)**: Denotes optimal riding conditions (tailwind segments, clear paths, pleasant sun angles).
- **Neutral (`#0F172A` / `#334155` / `#F8FAFC`)**: A cool slate system engineered for crisp contrast under harsh sunlight. Backgrounds remain pure or nearly pure slate-tinted white, ensuring zero eye fatigue.
- **Alert Red (`#EF4444`)**: Reserved strictly for critical trajectory hazards: low blinding solar glare ($0^\circ - 25^\circ$) directly ahead, and punishing headwind vectors.

## Typography

The typography hierarchy pairs the clean geometric neutrality of **Inter** for narrative framing and UI controls with the machine-derived precision of **JetBrains Mono** for all bearings, vectors, percentages, times, and velocities.

Tabular figures (`font-variant-numeric: tabular-nums`) must be enabled on all numerical representations to eliminate visual jitter when route segments dynamically update. Labels are rendered compact and slightly tracked out in uppercase for fast peripheral comprehension on mounted phone holders.

## Layout & Spacing

This design system uses a modular 12-column layout on desktop viewports and a single-column stacked layout on mobile devices.

- **Desktop (1024px+)**: Split-view operational cockpit. The left column (4 columns / 380px fixed-minimum) hosts parameter inputs, departure sliders, and vector gauges. The right column (8 columns) houses the full-bleed interactive telemetry map with segment elevation timelines.
- **Tablet (768px - 1023px)**: Vertically arranged sections with side-by-side metric pairs and a full-width map preview.
- **Mobile (< 768px)**: Stacked sequential flow: Input Drawer $\rightarrow$ Key Alert Bar $\rightarrow$ Sticky Route Map $\rightarrow$ Segment Timeline Breakdown.
- **Vertical Rhythm**: A strict 4px/8px incremental scale guides all spacing to maintain tight visual alignment reminiscent of physical navigation hardware.

## Elevation & Depth

To maximize outdoor contrast and keep rendering overhead minimal, the design system avoids heavy blurred shadows in favor of **structural borders and tonal stepping**:

- **Base Canvas**: Clean solid slate background (`#F8FAFC`).
- **Surface Panels**: `#FFFFFF` with a 1px border of `#E2E8F0`.
- **Active / Alert Containers**: Tinted surface fills (e.g., `#FEF2F2` for glare alerts) bordered by high-contrast saturated edges (`#FCA5A5` or `#EF4444`).
- **Focus & Interaction Depth**: Zero-blur structural offset rings (`2px solid #0284C7`) instead of diffuse drop-shadows. This preserves crispness in variable ambient lighting.

## Shapes

The interface utilizes a disciplined **Soft (`1`)** corner geometry:
- Standard UI panels, input fields, cards, and data meters employ a subtle `0.25rem` (`4px`) radius.
- Larger map overlays, banners, and modal surfaces step up to `rounded-lg` (`0.5rem` / `8px`).
- Badges and numeric status tags use strict structural rectangles with `4px` rounding, preserving the engineered, non-frivolous identity of technical cycling instrumentation.

## Components

### Buttons & Quick Actions
- **Primary Action (e.g., "Analyseer Route")**: Amber background (`#D97706`), crisp white text, bold weight, 4px border radius. Hover states shift to `#B45309`.
- **Secondary / Toggle Action**: Slate border (`#CBD5E1`), transparent background, `#0F172A` text. Hover shifts to `#F1F5F9`.
- **Alternative Time Pill Buttons**: Compact chips displaying `"-30m"`, `"+15m"`, `"+45m"`, displaying live glare delta indicators.

### Metric Cards & Gauges
- **Format**: Dense, bordered white cards containing:
  1. Micro-label in uppercase monospace (`label-data`).
  2. Large primary readout (`metric-display`) with inline unit (e.g., `24 km/u`, `14°`).
  3. Mini condition bar underneath: Segmented bar showing percentage distribution of Sun, Shade, and Blinding Angle in proportionate colors.

### Route Timeline & Segment Legend
- **Color Coding**:
  - `Alert Red` (`#EF4444`): $0^\circ \le \text{elevation} \le 25^\circ$ with heading $\Delta \le 30^\circ$, or relative headwind $< 45^\circ$.
  - `Sun Amber` (`#F59E0B`): Pleasant open sun without glare.
  - `Favorable Green` (`#10B981`): Tailwind $> 135^\circ$.
  - `Slate Muted` (`#94A3B8`): Overcast / neutral crosswind.

### Input Fields & Preferences
- Form inputs feature 1px solid `#CBD5E1` borders, changing to `#0284C7` on focus.
- Filter toggles for *"Vermijd zon in de ogen"* and *"Vermijd tegenwind"* are styled as structured operational switches with high-contrast active states.

### Departure Advisor Banner
- A sticky alert component with a left vertical accent bar (3px solid `#D97706`). Delivers high-priority recommendations: *"Vertrek 40 min later voor 75% minder tegenwind en geen laagstaande zon."*