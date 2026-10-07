# Technical Report: Frontend Architecture & 3D WebGL Digital Twin
**Project:** India Air Quality & Climate Digital Twin  
**Document Series:** Capstone Report Materials — Part 1  
**Author:** Geospatial AI & Full-Stack Engineering Team  
**Date:** October 2026  

---

## 1. Architectural Overview & Design Philosophy

The frontend of the **India Air Quality & Climate Digital Twin** is built as a high-performance, responsive geospatial platform using **React 18**, **Vite**, **Deck.gl (WebGL2 GPU-accelerated rendering)**, and **Recharts**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   REACT 18 + VITE WEB APPLICATION RUNTIME              │
│                                                                        │
│ ┌──────────────────┐  ┌──────────────────────────────────────────────┐ │
│ │  HEADER BAR      │  │ TAB 1: 🗺️ 3D Map View (DeckGL Topo Plateau)  │ │
│ │ • City Selector  │  ├──────────────────────────────────────────────┤ │
│ │ • Date / Presets │  │ TAB 2: 📈 Multi-Horizon Climate & AQ Forecast│ │
│ │ • Module Tabs    │  ├──────────────────────────────────────────────┤ │
│ └─────────┬────────┘  │ TAB 3: ⚠️ Compound Multi-Hazard Risk Atlas   │ │
│           │           ├──────────────────────────────────────────────┤ │
│           │           │ TAB 4: 🔬 Counterfactual Scenario Sandbox    │ │
│           │           ├──────────────────────────────────────────────┤ │
│           │           │ TAB 5: 🧠 Model Explainability & Diagnostics │ │
│           │           └──────────────────────────────────────────────┘ │
│           ▼                                   ▲                        │
│   Reactive Hook Bus (useMemo/useState)        │ 60 FPS WebGL Rendering │
│   (Pollutant / Elevation / Camera Pitch) ─────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Aesthetic & UI/UX Standards
- **Theme Paradigm:** Coastal Light Glassmorphism with warm off-white canvas (`#F6F4EE`), Deep Ocean Emerald primary (`#278E7B`), Seafoam Mint secondary (`#5CB7A8`), and translucent white glass panels (`rgba(255,255,255,0.92)`).
- **Typography:** **Comfortaa** rounded geometric typography loaded globally across HUD panels, tooltips, WebGL DeckGL text layers, and chart axes.
- **Dynamic Interaction:** Sub-millisecond client-side re-renders, 3D WebGL pitch/bearing/zoom camera control, raycast collision tooltips, and real-time pollutant switches.

---

## 2. Component Specifications

### 2.1 Tab 1 — 🗺️ 3D Topographic Map View & Spatial Airshed Analytics
- **Rendering Technology:** `@deck.gl/react` with WebGL2 context over ESRI World Light Gray canvas.
- **Geospatial Layers:**
  1. `PolygonLayer (3D Topo Plateau)`: Continuous ultra-dense grid (`step = 0.05°`, ~40,000 quads) with proportional multi-tier altitude scaling ($300\text{m} - 340,000\text{m}$) and continuous ombré mountain gradient.
  2. `ColumnLayer (3D Columns)`: Granular sand-like micro-pillars (`radius = 1800m`) displaying pollutant volume.
  3. `ScatterplotLayer (VIIRS Fires)`: Active thermal anomalies scaled by Fire Radiative Power (FRP).
  4. `GeoJsonLayer (Boundaries)`: Official sovereign outer frontier and state borders.
  5. `TextLayer (City Pins)`: Elevated 3D flagpoles hovering above mountain peaks with city names and AQI status badges.
- **Regional Airshed Breakdown:** Live pollutant loads, NAAQS exceedance percentages, and local hotspot stations for India's 4 major airsheds: *Indo-Gangetic Plain*, *Western Belt*, *Deccan Plateau*, and *Brahmaputra Valley*.

### 2.2 Tab 2 — 📈 Multi-Horizon Forecast Panel
- **Visual Engine:** Recharts responsive Area & Line charts styled with the Coastal Light palette.
- **Features:** 7, 14, and 30-day forward projections with expanding 90% confidence uncertainty bands and small multiple comparative subplots for $\text{PM}_{2.5}$, temperature, and precipitation.

### 2.3 Tab 3 — ⚠️ Compound Multi-Hazard Risk Atlas
- **Visual Engine:** Layered composite risk scores evaluating concurrent heat stress, drought precipitation deficits, and air quality exceedances across Indian districts.

### 2.4 Tab 4 — 🔬 Counterfactual Scenario Sandbox
- **Interactive Controls:** Perturbation sliders for Temperature ($\Delta T$), Precipitation ($\Delta P$), Stubble Fire Abatement ($\Delta \text{Fire}$), and Industrial Emissions ($\Delta \text{Emissions}$).
- **Instant Differential:** Real-time delta maps and category shift bar charts.

### 2.5 Tab 5 — 🧠 Model Explainability & Benchmark Diagnostics
- **Metrics:** Cross-validation comparison matrices (Random 5-Fold, Spatial Leave-Station-Out, Temporal Leave-Season-Out) and feature importance breakdowns.

---

## 3. Deployment & CI/CD Pipeline
- **Bundler:** Vite 6.x with Rollup code-splitting.
- **Automated Workflow:** GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys the static frontend to **GitHub Pages** on every push to `main`.
