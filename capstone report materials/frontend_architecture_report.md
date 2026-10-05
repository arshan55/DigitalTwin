# Technical Report: Frontend Architecture & Interactive Dashboard
**Project:** India Air Quality & Climate Digital Twin  
**Document Series:** Capstone Report Materials — Part 1  
**Author:** Geospatial AI & Full-Stack Engineering Team  
**Date:** October 2026  

---

## 1. Architectural Overview & Design Philosophy

The frontend of the **India Air Quality & Climate Digital Twin** is designed as a state-of-the-art, responsive geospatial intelligence platform built using **Streamlit**, **PyDeck (Deck.gl for Python)**, and **Plotly**.

### 1.1 Aesthetic & UI/UX Standards
- **Theme Paradigm:** Dark Glassmorphism with deep navy and slate base (`#0a0e1a` to `#111827`), translucent glass panels (`backdrop-filter: blur(8px)`), and thin indigo boundary borders (`rgba(99, 102, 241, 0.4)`).
- **Typography:** Contemporary sans-serif (*Inter* from Google Fonts) with strict typographic hierarchy (hero headings, metric badges, monospaced coordinate badges).
- **Dynamic Interaction:** Instant client-side state caching via `@st.cache_data`, reactive sidebar parameter bindings, and GPU-accelerated WebGL vector graphics rendering.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   STREAMLIT WEB APPLICATION RUNTIME                    │
│                                                                        │
│ ┌──────────────────┐  ┌──────────────────────────────────────────────┐ │
│ │ SIDEBAR CONTROLS │  │ TAB 1: 🗺️ AQI Map Explorer (3D Columns/Heatmap)│ │
│ │ • City Selector  │  ├──────────────────────────────────────────────┤ │
│ │ • Date Picker    │  │ TAB 2: 📈 Multi-Horizon Forecast Panel       │ │
│ │ • Lead Horizon   │  ├──────────────────────────────────────────────┤ │
│ │ • Target Var     │  │ TAB 3: ⚠️ Compound Climate Risk Atlas        │ │
│ │ • About Panel    │  ├──────────────────────────────────────────────┤ │
│ └─────────┬────────┘  │ TAB 4: 🔬 Policy Scenario Simulator (What-If)│ │
│           │           ├──────────────────────────────────────────────┤ │
│           │           │ TAB 5: 🧠 Model Explainability & CV Metrics  │ │
│           │           └──────────────────────────────────────────────┘ │
│           ▼                                   ▲                        │
│   Reactive Parameter Bus                      │ Real-time Rerender     │
│   (Session State / Stored Filters) ───────────┘                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component-by-Component Specifications

### 2.1 Tab 1 — 🗺️ Surface AQI & HCHO Hotspot Map Explorer
- **Rendering Technology:** `pydeck.Deck` wrapping Deck.gl layers over Mapbox dark basemaps (`mapbox://styles/mapbox/dark-v11`).
- **Layers Available:**
  1. `ColumnLayer (3D)`: Extruded 3D hexagonal/rectangular prisms where column elevation represents AQI severity ($Elevation = AQI \times 80$) and color follows official CPCB thresholds.
  2. `HeatmapLayer`: Continuous Gaussian density gradient showing pollutant hotspots across northern India and coastal plains.
  3. `ScatterplotLayer`: Scaled circular radii reflecting $PM_{2.5}$ concentration in $\mu g/m^3$.
  4. `TextLayer & City Markers`: Prominent city overlays (Delhi, Mumbai, Kolkata, Chennai, Bangalore, Hyderabad, Ahmedabad, Lucknow, Patna, Jaipur).
- **Interactive Tooltips:** Dynamic HTML tooltips reporting exact latitude, longitude, estimated $PM_{2.5}$, computed CPCB AQI, and risk classification.
- **HCHO Anomaly Matrix:** Tabular clustering output detailing localized anomalous events ($Z \ge 2.0$), identifying industrial plumes vs. biogenic VOC forest emissions.

### 2.2 Tab 2 — 📈 Multi-Horizon Climate & AQ Forecast Panel
- **Visual Engine:** Plotly Graph Objects (`go.Figure`) styled with dark mode grids and transparent canvases.
- **Visualized Elements:**
  - Historical trajectory (solid indigo curve, 90-day historical window).
  - Multi-step XGBoost/LSTM forecast trajectory (dashed violet line with circular markers).
  - **$90\%$ Confidence Band:** Shaded uncertainty ribbon (`rgba(168, 85, 247, 0.15)`) expanding with lead horizon.
  - Interactive forecast trigger line demarcating historical observations from future projections.
- **Small Multiples Subplots:** Synchronized 3-variable comparative panel (`PM2.5`, `2m Temperature`, `Precipitation`) rendered through `plotly.subplots.make_subplots`.

### 2.3 Tab 3 — ⚠️ Compound Climate Risk Atlas
- **Analytical Layers:** Interactive selection between:
  - *Composite Risk Index* ($0.35 \times \text{Heat} + 0.30 \times \text{Drought} + 0.35 \times \text{AQ}$)
  - *Heat Stress Risk* (Wet-bulb temperature $> 32^\circ C$ + MODIS LST anomaly)
  - *Drought Vulnerability* (30-day precipitation deficit + MODIS NDVI vegetation stress)
  - *Air Quality Exceedance Risk* ($P(\text{AQI} > 400)$)
- **Analytical Graphics:** Violin distributions (`go.Violin`) visualizing hazard dispersion, paired with a donut chart breakdown (`go.Pie`) classifying land area into Low, Moderate, Elevated, High, and Extreme risk.

### 2.4 Tab 4 — 🔬 Counterfactual "What-If" Scenario Simulator
- **Interactive Sliders:**
  - Temperature perturbation: $\Delta T \in [-2.0^\circ C, +5.0^\circ C]$
  - Precipitation change: $\Delta P \in [-50\%, +50\%]$
  - Fire abatement / surge: $\Delta \text{Fire} \in [-100\%, +50\%]$
  - Anthropogenic emissions: $\Delta \text{Emissions} \in [-50\%, +50\%]$
- **Quick-Action Presets:** One-click simulations for $+2^\circ C$ Warming, $-50\%$ Stubble Burning Abatement, and Comprehensive Clean Air Policy.
- **Real-Time Visual Differential:**
  - Side-by-side grouped bar charts of AQI category shifts.
  - $\Delta PM_{2.5}$ Anomaly Spatial Map (diverging green-to-red color scale reflecting localized improvements or deteriorations).

### 2.5 Tab 5 — 🧠 Model Explainability & Benchmark Analytics
- **Feature Importance Chart:** Horizontal bar chart highlighting the dominant predictors of surface pollution (MERRA-2 aerosol mass, total AOD, seasonal cosine cycle, black carbon, ventilation index).
- **Cross-Validation Comparison Matrix:** Grouped bar chart comparing Random 5-Fold, Spatial Leave-Station-Out, and Temporal Leave-Season-Out $R^2$ scores across Ridge, Random Forest, XGBoost, LightGBM, and Stacking Regressor.
- **Stubble Burning Surge Visualization:** Bar chart illustrating the $+184.2\%$ post-monsoon pollution spike in the Indo-Gangetic Plain.

---

## 3. Frontend Execution & Serving Parameters

To launch the interactive dashboard:
```bash
streamlit run app/streamlit_app.py --server.port 8501 --server.headless true
```
- **Port:** `8501`
- **Memory Consumption:** $\approx 450 \text{ MB}$ to $800 \text{ MB}$ under active rendering.
- **Browser Compatibility:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (WebGL enabled).
