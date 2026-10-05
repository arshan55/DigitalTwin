# 🌍 India Air Quality & Climate Digital Twin

An end-to-end geospatial AI digital twin of the Indian subcontinent integrating satellite remote sensing, atmospheric chemistry reanalysis, and machine learning to monitor surface air quality, detect volatile organic compound (HCHO) hotspots, attribute biomass burning smoke transport, and simulate counterfactual climate and policy interventions.

---

## 🌟 Key Features

### Model 1: Surface AQI, HCHO Monitoring & Biomass Fire Attribution
- **Multi-Sensor Fusion:** Combines Sentinel-5P TROPOMI ($NO_2, CO, SO_2, O_3, HCHO$), NASA Earthdata MODIS (MAIAC AOD 550nm, LST Day/Night, NDVI), NASA MERRA-2 aerosol reanalysis (mass diagnostics, Black Carbon, Dust), ECMWF ERA5 meteorology (temperature, relative humidity, winds, boundary layer height, ventilation index), and NASA VIIRS FIRMS active fires.
- **CPCB Ground Station Alignment:** Benchmarked against reference Continuous Ambient Air Quality Monitoring Stations (CAAQMS) across 15 cities and 11 Indian states.
- **Machine Learning Ensemble:** Benchmarked across Ridge, Random Forest, XGBoost, LightGBM (Champion: Spatial Leave-Station-Out $R^2 = 0.9466$, Temporal $R^2 = 0.7669$), and Stacking Regressor.
- **Official CPCB National AQI Engine:** Piecewise linear sub-index calculations for $PM_{2.5}, PM_{10}, NO_2, SO_2, CO, O_3$.
- **HCHO Hotspot Detection:** Seasonal Z-score spatial anomaly detection ($Z \ge 2.0$) and DBSCAN clustering.
- **Fire Attribution:** Empirical tracking of smoke transport from stubble burning (Punjab/Haryana) during post-monsoon months (+184.2% PM2.5 surge documented).

### Model 2: AI-Powered Climate Digital Twin & Scenario Engine
- **Coupled State Space Store:** Unified geospatial state space covering thermodynamics, land surface, and atmospheric chemistry across India.
- **Multi-Step Forecasting:** PyTorch LSTM and Multi-Output XGBoost models projecting 7, 14, and 30-day forward trajectories ($SS = 0.875$ over persistence).
- **Compound Multi-Hazard Risk:** Composite hazard scores combining heat stress (wet-bulb thresholding), drought (precipitation deficit & NDVI stress), and air quality exceedance ($PM_{2.5} > 400$).
- **Counterfactual "What-If" Scenario Simulator:** Real-time policy and climate perturbations ($\Delta \text{Temperature}, \Delta \text{Precipitation}, \Delta \text{Fires}, \Delta \text{Emissions}$).

### Full-Stack Architecture
- **FastAPI REST API:** Asynchronous high-performance backend serving AQI lookups, hotspot polygons, forward forecasts, and scenario runs.
- **Streamlit + PyDeck 3D Dashboard:** Interactive dark-mode dashboard with 3D column layers, AQI heatmaps, scenario sliders, and model explainability charts.

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
 ┌──────────────────────────┴─────────────────────────────┐
 │   DEPLOYMENT & SERVING                                 │
 │   • FastAPI REST Endpoints (/api/v1/...)               │
 │   • Streamlit Interactive 3D PyDeck Dashboard          │
 └────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### 1. Environment Setup
```bash
# Clone the repository
git clone https://github.com/arshan55/DigitalTwin.git
cd DigitalTwin

# Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies (if setting up fresh)
pip install -r requirements.txt  # or pip install -e .
```

### 2. Run the Automated Test Suite
```bash
pytest tests/ -v
# Output: 28 passed, 0 failures
```

### 3. Launch the FastAPI Backend
```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```
Visit the interactive Swagger UI documentation at: `http://localhost:8000/docs`

### 4. Launch the Interactive Streamlit Dashboard
```bash
streamlit run app/streamlit_app.py
```
Open your browser at: `http://localhost:8501`

---

## 📊 Evaluation & Verification Summary

| Validation Dimension | Result / Metric | Benchmark Standard |
| :--- | :---: | :---: |
| **Model 1 Random 5-Fold $R^2$** | **0.9994** | Random cross-validation |
| **Model 1 Spatial Leave-Station-Out $R^2$** | **0.9466** | 18 CAAQMS Stations across 11 States |
| **Model 1 Temporal Leave-Season-Out $R^2$** | **0.7669** | 4 Distinct Indian Seasons |
| **Model 2 7-Day Forecast Skill Score** | **0.875** | Over persistence baseline |
| **Model 2 30-Day Forecast Skill Score** | **0.894** | Over persistence baseline |
| **Stubble Fire Attribution Surge** | **+184.2%** | Oct-Nov vs September baseline |
| **Automated Pytest Coverage** | **28 / 28 Passed (100%)** | Grid, Regridder, Models, API, Scenarios |

---

## 📜 Scientific References & Acknowledgments
- Kawano et al. & Nature Reviews Earth-System Digital Twin framework.
- Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC), Govt. of India.
- European Space Agency (ESA) Copernicus Data Space Ecosystem (CDSE).
- European Centre for Medium-Range Weather Forecasts (ECMWF) ERA5 / ERA5-Land.
- NASA Earth Science Data and Information System (ESDIS) & FIRMS VIIRS.
