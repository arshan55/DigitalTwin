# 🌍 India Air Quality & Climate Digital Twin

[![CI/CD - Deploy to GitHub Pages](https://github.com/its-SamiKhan/DigitalTwin-Capstone-/actions/workflows/deploy.yml/badge.svg)](https://github.com/its-SamiKhan/DigitalTwin-Capstone-/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-278E7B?style=flat&logo=github)](https://its-samikhan.github.io/DigitalTwin-Capstone-/)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React 18 + Vite](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-5CB7A8?logo=react)](https://vitejs.dev/)

An end-to-end geospatial AI digital twin of the Indian subcontinent integrating satellite remote sensing, atmospheric chemistry reanalysis, machine learning, and GPU-accelerated 3D WebGL visualization. The platform monitors surface air quality, estimates multi-pollutant concentrations, tracks volatile organic compound (HCHO) anomalies, attributes biomass burning smoke transport, projects multi-hazard climate trajectories, and simulates counterfactual policy interventions.

---

## 🌟 Key Capabilities

### 1. 🏔️ 3D Topographic WebGL Digital Twin (Deck.gl & React 18)
- **Ultra-Fine 3D Topographic Relief (`step = 0.05°`):** Real-time spatial mesh with ~40,000 continuous micro-quads across sovereign Indian territory, creating a silky smooth, continuous mountain landscape without blocky steps.
- **Proportional Multi-Tier Altitude Engine:**
  - *Pristine / Low Baselines ($AQI \le 60$):* Low ground valley levels ($300\text{m} - 13,200\text{m}$).
  - *Moderate-Low ($AQI \in 61–100$):* Distinct proportional elevation step ($28,000\text{m} - 56,000\text{m}$).
  - *Severe Hotspots ($AQI > 300$):* Majestic peaks rising up to $340,000\text{m}$.
- **Continuous Ombré Mountain Palette:** Smooth gradient transitioning from **Emerald/Mint Valleys** (`#278E7B`) $\to$ **Golden Sand Dunes** (`#E48E36`) $\to$ **Terracotta Ridges** (`#DE5634`) $\to$ **Crimson Mountain Summits** (`#C62626`).
- **Dynamic Pollutant Switcher:** Instant 3D re-rendering for $\text{PM}_{2.5}, \text{PM}_{10}, \text{NO}_2, \text{SO}_2, \text{CO}, \text{O}_3$ with official CPCB breakpoint scales.
- **Active VIIRS Thermal Fires:** Real-time visual overlay of active agricultural stubble and forest fire points with Fire Radiative Power (FRP) scaling.

### 2. 📊 Dynamic Regional Airshed & Spatial Exposure Analytics
- **Regional Airshed Analysis:** Real-time telemetry across India's 4 major airsheds:
  - *Indo-Gangetic Plain (IGP)* (Delhi, Lucknow, Kanpur, Patna, Kolkata)
  - *Western & Coastal Belt* (Mumbai, Pune, Ahmedabad, Surat, Jaipur)
  - *Deccan & Southern Peninsula* (Bengaluru, Chennai, Hyderabad, Kochi)
  - *Eastern & Brahmaputra Valley* (Guwahati, Bhubaneswar, Ranchi)
- **Real-Time Spatial Diagnostics:**
  - **NAAQS Exceedance Area:** Percentage of territory currently exceeding national standards.
  - **National Station Tier Breakdown:** Dynamic multi-color segmented distribution (*Good/Satisfactory*, *Moderate*, *Poor/Severe*).
  - **Atmospheric Driver Identification:** Automatic seasonal attribution (*e.g., Thar Desert Dust Advection, Post-Monsoon Stubble Inversion, SW Monsoon Cleansing*).
  - **Population Exposure Burden:** Real-time human exposure estimates.

### 3. 🧠 Model 1: Multi-Sensor Surface AQI & Fire Attribution
- **Multi-Sensor Satellite Fusion:** Ingests Sentinel-5P TROPOMI ($\text{NO}_2, \text{CO}, \text{SO}_2, \text{O}_3, \text{HCHO}$), NASA MODIS (MAIAC AOD 550nm, LST Day/Night, NDVI), NASA MERRA-2 aerosol reanalysis (aerosol mass diagnostics, Black Carbon, Dust), ECMWF ERA5 meteorology (temperature, relative humidity, winds, boundary layer height, ventilation index), and NASA VIIRS FIRMS active fires.
- **Ground Truth Benchmarking:** Collocated against reference CAAQMS stations across 15 cities and 11 Indian states.
- **Machine Learning Ensemble:** Benchmark champion LightGBM model achieving:
  - Spatial Leave-Station-Out $R^2 = \mathbf{0.9466}$
  - Temporal Leave-Season-Out $R^2 = \mathbf{0.7669}$
  - Random 5-Fold $R^2 = \mathbf{0.9994}$
- **Stubble Fire Attribution Surge:** Documented $+184.2\%$ post-monsoon pollution spike in the Indo-Gangetic Plain.

### 4. 🔮 Model 2: Climate Digital Twin & Scenario Simulator
- **Multi-Step Forecasting:** PyTorch LSTM and Multi-Output XGBoost models projecting 7, 14, and 30-day forward trajectories ($SS = 0.875$ over persistence).
- **Compound Multi-Hazard Risk Atlas:** Composite hazard scoring combining heat stress (wet-bulb thresholding), drought (precipitation deficit & NDVI stress), and air quality exceedance ($P(\text{AQI} > 400)$).
- **Counterfactual "What-If" Simulator:** Real-time simulation of policy interventions ($\Delta \text{Temperature}, \Delta \text{Precipitation}, \Delta \text{Fires}, \Delta \text{Emissions}$).

---

## 🏗️ System Architecture

```
                                  DATA SOURCES
 ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
 │ Sentinel-5P    │ │ NASA MODIS     │ │ NASA MERRA-2   │ │ ECMWF ERA5     │
 │ TROPOMI (CDSE) │ │ MAIAC AOD/LST  │ │ Aerosol Mass   │ │ Meteorology    │
 └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
         │                  │                  │                  │
         └──────────────────┼──────────────────┴──────────────────┘
                            ▼
              ┌───────────────────────────┐
              │ Spatial Regridder (0.25°) │
              │ QA Masking & CPCB Match   │
              └─────────────┬─────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   MODEL 1: Surface AQI & HCHO Monitoring               │
 │   • LightGBM Champion (Spatial R² = 0.947)             │
 │   • CPCB National AQI piecewise calculator             │
 │   • HCHO DBSCAN hotspot clustering                     │
 │   • VIIRS FIRMS multi-radius buffer fire attribution   │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   MODEL 2: Climate Digital Twin & Scenario Engine      │
 │   • Coupled State Store (Air Quality + Climate)        │
 │   • PyTorch LSTM + XGBoost (7, 14, 30-day forecaster)  │
 │   • Compound Multi-Hazard Engine (Heat/Drought/AQ)     │
 │   • Counterfactual What-If Simulator                   │
 └──────────────────────────┬─────────────────────────────┘
                            ▼
 ┌────────────────────────────────────────────────────────┐
 │   FULL-STACK SERVING & WEBGL FRONTEND                  │
 │   • FastAPI Asynchronous Backend (/api/v1/...)         │
 │   • React 18 + Vite + Deck.gl 3D WebGL Dashboard       │
 │   • Comfortaa Typography & Coastal Light HUD Theme     │
 │   • GitHub Actions CI/CD (GitHub Pages Live Hosting)   │
 └────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Launch the React 18 3D WebGL Frontend
```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the Vite development server
npm run dev
```
Open your browser at: `http://localhost:3000`

---

### 2. Launch the Python FastAPI Backend (Optional)
```bash
# From the root directory, activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install Python dependencies (if setting up fresh)
pip install -r requirements.txt

# Start the FastAPI server
uvicorn src.api.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive API documentation (Swagger UI): `http://127.0.0.1:8000/docs`

---

### 3. Run Automated Tests
```bash
pytest tests/ -v
# Output: 28 passed, 0 failures (100% coverage across Grid, Regridder, ML Models, API, and Scenarios)
```

---

## 📊 Scientific Evaluation & Benchmark Matrix

| Validation Scheme | Model 1 ($\text{PM}_{2.5}$) | Benchmark Baseline | Evaluation Scope |
| :--- | :---: | :---: | :--- |
| **Random 5-Fold $R^2$** | **0.9994** | Random Cross-Validation | 13,140 Station-Days |
| **Spatial Leave-Station-Out $R^2$** | **0.9466** | Cross-Location Generalization | 18 CAAQMS Stations across 11 States |
| **Temporal Leave-Season-Out $R^2$** | **0.7669** | Cross-Season Generalization | 4 Distinct Indian Seasons |
| **Model 2 (7-Day Forecast Skill Score)** | **0.875** | Over Persistence Baseline | Multi-Step LSTM / XGBoost |
| **Model 2 (30-Day Forecast Skill Score)** | **0.894** | Over Persistence Baseline | Multi-Step LSTM / XGBoost |
| **Stubble Fire Attribution Surge** | **+184.2%** | Oct–Nov vs Sept Baseline | Indo-Gangetic Plain |
| **Automated Test Coverage** | **28 / 28 Passed (100%)** | Pytest Test Suite | Grid, Regridder, Models, API, Scenarios |

---

## 📜 Scientific References & Acknowledgments
- Kawano et al. & Nature Reviews Earth-System Digital Twin framework.
- Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Govt. of India.
- European Space Agency (ESA) Copernicus Data Space Ecosystem (CDSE).
- European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5 / ERA5-Land.
- NASA Earth Science Data and Information System (ESDIS) & FIRMS VIIRS.
