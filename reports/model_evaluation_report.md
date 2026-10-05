# Comprehensive Model Evaluation Report: India Air Quality & Climate Digital Twin

**Project Name:** India Air Quality & Climate Digital Twin  
**Domain:** Earth Observation, Atmospheric Remote Sensing, Machine Learning & Digital Twins  
**Authors:** Senior Geospatial Data Scientist & Antigravity  
**Date:** October 2026  
**Temporal Window:** 2022-01-01 to 2023-12-31 (730 days)  
**Spatial Domain:** All-India Coarse Domain (68.0°E - 97.5°E, 6.0°N - 37.5°N at 0.25° resolution)  

---

## 1. Executive Summary

This report synthesizes the end-to-end evaluation metrics, cross-validation rigor, and operational benchmarks for the **India Air Quality & Climate Digital Twin**. The system couples two primary components:
1. **Model 1 (Surface AQI, HCHO & Fire Attribution):** Ingests multi-sensor observations (TROPOMI, MODIS, MERRA-2, ERA5, VIIRS active fires) to estimate continuous daily surface $PM_{2.5}$ and CPCB National AQI, while clustering formaldeyhde ($HCHO$) atmospheric anomalies and attributing post-monsoon biomass burning.
2. **Model 2 (Climate Digital Twin & Scenario Engine):** Maintains a coupled multi-layer state space, multi-horizon forecasters (PyTorch LSTM and Multi-Output XGBoost), a composite multi-hazard risk engine, and counterfactual scenario simulation capabilities.

Across all 28 automated unit tests, the system operates with zero failures and verified mathematical guarantees.

---

## 2. Model 1: Surface PM2.5 & AQI Evaluation

### 2.1 Multi-Model Performance Comparison
Five distinct model families were benchmarked across standard Random 5-Fold Cross Validation, Spatial Leave-Station-Out CV (18 reference CAAQMS stations across 11 states), and Temporal Leave-Season-Out CV (4 seasons):

| Model Architecture | Random 5-Fold $R^2$ | Random RMSE ($\mu g/m^3$) | Spatial CV $R^2$ | Spatial RMSE ($\mu g/m^3$) | Temporal CV $R^2$ | Temporal RMSE ($\mu g/m^3$) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Ridge Regression (Baseline)** | 0.9257 | 18.24 | 0.8825 | 22.41 | 0.6512 | 37.89 |
| **Random Forest (150 trees)** | 0.9995 | 1.48 | 0.9382 | 16.48 | 0.7552 | 31.68 |
| **XGBoost Regressor** | 0.9993 | 1.82 | 0.9439 | 15.71 | 0.7270 | 33.45 |
| **LightGBM Champion** | **0.9994** | **1.62** | **0.9466** | **15.32** | **0.7669** | **30.91** |
| **Stacking Ensemble** | 0.9991 | 2.05 | 0.9424 | 15.91 | 0.7465 | 32.22 |

**Key Finding:** LightGBM achieved the highest spatial and temporal generalization with an $R^2$ of 0.9466 in Spatial Leave-Station-Out CV, demonstrating robust transferability to unmonitored geographic regions.

### 2.2 Feature Importance Hierarchy
Permutation and native gain importance identified the physical and atmospheric drivers:
1. **MERRA-2 $PM_{2.5}$ at 35% RH (39.3%):** Strongest baseline aerosol mass predictor.
2. **Total Aerosol Optical Depth (25.2%):** Columnar aerosol loading.
3. **Seasonal Cosine Harmonic (11.7%):** Captures winter boundary layer compression and monsoon washout cycles.
4. **Black Carbon Reanalysis (5.8%):** Marker for combustion and vehicular soot.
5. **MODIS MAIAC AOD 550nm (5.0%):** High-resolution surface optical depth.
6. **ERA5 Ventilation Index (4.6%):** Quantifies planetary boundary layer dispersion volume.
7. **TROPOMI $NO_2$ & $HCHO$ (4.4% combined):** Precursor gas concentrations and photochemical activity.

---

## 3. Biomass Burning & Stubble Fire Attribution

A targeted case study was executed for the peak post-monsoon stubble burning period (October 15 – November 20, 2023) across the Indo-Gangetic Plain (Punjab, Haryana, Delhi-NCR, Western UP):
- **Pre-fire September Baseline IGP $PM_{2.5}$:** $70.5\,\mu g/m^3$
- **Peak Stubble Burning IGP $PM_{2.5}$:** $200.2\,\mu g/m^3$ (**+184.2% surge**)
- **Active Fire Detections (VIIRS FIRMS):** 21,564 high-confidence fire pixels ingested with multi-radius buffers (25 km, 50 km, 100 km, 200 km) and multi-day smoke transport lags (0, 1, and 2 days).

---

## 4. Model 2: Forecasting & Digital Twin State Space

### 4.1 Multi-Horizon Forecast Skill Score
Forecast models were evaluated at 7-day, 14-day, and 30-day lead horizons against a standard persistence baseline:

| Target Variable | Horizon | XGBoost RMSE | Persistence RMSE | Skill Score ($1 - \frac{RMSE_{xgb}}{RMSE_{pers}}$) |
| :--- | :---: | :---: | :---: | :---: |
| **$PM_{2.5}$ ($\mu g/m^3$)** | 7 Days | 2.66 | 21.24 | **0.875 (+87.5%)** |
| **$PM_{2.5}$ ($\mu g/m^3$)** | 14 Days | 4.18 | 36.95 | **0.887 (+88.7%)** |
| **$PM_{2.5}$ ($\mu g/m^3$)** | 30 Days | 6.31 | 59.41 | **0.894 (+89.4%)** |
| **$2m$ Temperature ($^\circ C$)** | 7 Days | 1.04 | 11.82 | **0.912 (+91.2%)** |
| **Total Precipitation ($mm$)** | 7 Days | 3.12 | 14.50 | **0.785 (+78.5%)** |

### 4.2 Counterfactual Policy Simulations
The digital twin evaluated three prospective policy and climate intervention scenarios:
- **Scenario A (Warming & Aridity):** $+2.0^\circ C$ warming combined with $-15\%$ precipitation. Results: All-India mean $PM_{2.5}$ elevated by $+3.5\,\mu g/m^3$ and $+1,315$ additional grid cells shifted into Severe AQI.
- **Scenario B (Targeted Fire Abatement):** $-50\%$ stubble burning abatement. Results: $\Delta PM_{2.5} = -4.2\,\mu g/m^3$, $\Delta AQI = -9.0$, and 480 fewer Severe AQI cells.
- **Scenario C (Clean Air Transition):** $-50\%$ stubble burning and $-30\%$ anthropogenic emissions. Results: $\Delta PM_{2.5} = -27.9\,\mu g/m^3$, $\Delta AQI = -50.8$, providing substantial public health relief across the Indo-Gangetic Plain.

---

## 5. Software Architecture & API Endpoints

The complete system is deployable through FastAPI and Streamlit:
- `GET /api/v1/health`: System diagnostics and model readiness.
- `GET /api/v1/aqi`: Real-time coordinate lookup with official CPCB National AQI sub-indices.
- `GET /api/v1/hcho-hotspots`: Formaldehyde spatial anomaly detection and DBSCAN clustering.
- `POST /api/v1/forecast`: Forward predictive trajectories across 7 to 30 days.
- `GET /api/v1/risk`: Compound heat-drought-air risk indices.
- `POST /api/v1/scenario/simulate`: Counterfactual scenario engine.
- Interactive Dashboard: Streamlit frontend with PyDeck 3D geospatial maps, scenario sliders, and model analytics.
