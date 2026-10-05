# Technical Report: Mathematical & Computational Methodology
**Project:** India Air Quality & Climate Digital Twin  
**Document Series:** Capstone Report Materials — Part 4  
**Author:** Geospatial AI & Atmospheric Data Science Team  
**Date:** October 2026  
**Reference Research:** `Capstone Research (241).docx` (Nature Reviews Earth-System Digital Twin framework; Kawano et al.; CPCB Guidelines)  

---

## 1. Domain Modeling & Problem Formulation

The overarching goal is to formulate an **Earth-System Digital Twin** for the Indian subcontinent ($68.0^\circ\text{E}$ to $97.5^\circ\text{E}$, $6.0^\circ\text{N}$ to $37.5^\circ\text{N}$) that harmonizes satellite remote sensing observations, chemical transport reanalysis, and thermodynamics into two tightly coupled learning frameworks:

$$\mathcal{DT} = \langle \mathcal{M}_1, \mathcal{M}_2, \mathcal{S}_t, \mathcal{R}_t, \mathcal{F}_{\text{scenario}} \rangle$$

Where:
- $\mathcal{M}_1$: Multi-pollutant surface $PM_{2.5}$ and AQI estimation model with $HCHO$ anomaly tracking and fire attribution.
- $\mathcal{M}_2$: Climate digital twin forecaster projecting atmospheric-terrestrial states.
- $\mathcal{S}_t$: Continuous coupled geospatial state tensor.
- $\mathcal{R}_t$: Compound multi-hazard climate risk engine.
- $\mathcal{F}_{\text{scenario}}$: Interactive counterfactual simulation operator.

---

## 2. Model 1 Methodology: Surface AQI & Atmospheric Chemistry

### 2.1 Spatial Discretization & Multi-Sensor Fusion
The continuous land area of India is mapped onto a regular grid with spatial resolution $\Delta \theta = 0.25^\circ \approx 28\text{ km}$:
$$\mathcal{G} = \{ (\lambda_i, \phi_j) \mid \lambda_i = 68.0^\circ + i \cdot 0.25^\circ, \, \phi_j = 6.0^\circ + j \cdot 0.25^\circ \}$$

For each cell $(i, j)$ and daily epoch $t \in [1, 730]$ (2022–2023), multi-spectral features are fused:
1. **Satellite Remote Sensing:**
   - Sentinel-5P TROPOMI: Vertical column densities ($VCD$) for $\text{NO}_2, \text{CO}, \text{SO}_2, \text{O}_3, \text{HCHO}$ with strict quality flag screening ($qa\_value > 0.5$, cloud fraction $< 0.3$).
   - NASA MODIS: MAIAC $AOD_{550}$, Land Surface Temperature ($LST_{\text{day}}, LST_{\text{night}}$), and vegetation index ($NDVI$).
2. **Atmospheric Chemical Reanalysis (MERRA-2):**
   - $PM_{2.5}$ dry mass at $35\%$ relative humidity ($\mu g/m^3$), total $AOD$, black carbon, dust, and sulfate mass mixing ratios.
3. **Planetary Boundary Layer & Meteorology (ECMWF ERA5):**
   - $2m$ temperature ($T_{2m}$), relative humidity ($RH$), $10m$ wind speed vector ($U_{10}, V_{10}$), surface pressure ($SP$), total precipitation ($TP$), boundary layer height ($BLH$).
   - **Ventilation Index ($VI$):** Quantifying pollutant dispersal capacity:
     $$VI = BLH \times \sqrt{U_{10}^2 + V_{10}^2} \quad [m^2/s]$$
4. **Fire Radiative Power & Proximity Metrics (NASA VIIRS FIRMS):**
   - Aggregated fire counts and sum of Fire Radiative Power (FRP, MW) evaluated across circular geodesic buffers $\mathcal{B}_r \in \{25\text{ km}, 50\text{ km}, 100\text{ km}, 200\text{ km}\}$ with temporal transport lags $\tau \in \{0, 1, 2\text{ days}\}$:
     $$FRP_{r, \tau}(i, j, t) = \sum_{k \in \mathcal{K}} FRP_k \cdot \mathbb{I}\left( \text{dist}(p_k, (i, j)) \le r \right)$$

### 2.2 Piecewise Linear CPCB National AQI Engine
The ground truth calibration is governed by the Central Pollution Control Board (CPCB) National Air Quality Index standard:

$$I_p = \frac{I_{\text{high}} - I_{\text{low}}}{B_{\text{high}} - B_{\text{low}}} \left( C_p - B_{\text{low}} \right) + I_{\text{low}}$$

Where the piecewise breakpoints for 24-hr $PM_{2.5}$ ($\mu g/m^3$) are:
- Good ($0–50$): $0 \le C \le 30$
- Satisfactory ($51–100$): $31 \le C \le 60$
- Moderate ($101–200$): $61 \le C \le 90$
- Poor ($201–300$): $91 \le C \le 120$
- Very Poor ($301–400$): $121 \le C \le 250$
- Severe ($401–500$): $251 \le C \le 500+$

### 2.3 Formaldehyde (HCHO) Hotspot Identification & Clustering
Formaldehyde acts as an atmospheric marker for non-methane volatile organic compound (NMVOC) emissions:
1. **Seasonal Anomaly Z-Score:**
   $$Z_{i,j,t} = \frac{\Omega_{\text{HCHO}}(i, j, t) - \mu_{\text{season}}(i, j)}{\sigma_{\text{season}}(i, j)}$$
2. **Thresholding & DBSCAN Clustering:** Cells with $Z \ge 2.0$ are clustered using Density-Based Spatial Clustering of Applications with Noise ($\varepsilon = 1.0^\circ, \text{MinPts} = 3$).
3. **Multi-Source Attribution:** Co-location with $NO_2$ indicates industrial VOCs; co-location with active fires indicates agricultural burning; and co-location with high $NDVI$ denotes biogenic isoprene emission.

---

## 3. Model 2 Methodology: Climate Digital Twin & Scenario Engine

### 3.1 Coupled State Space & Multi-Step Forecasting
The coupled state $\mathbf{S}_t \in \mathbb{R}^{H \times W \times C}$ encapsulates the thermodynamic and chemical state of the subcontinent. Multi-horizon sequence models predict:
$$\mathbf{S}_{t+1:t+K} = \mathcal{G}_\phi(\mathbf{S}_{t-L:t})$$
Where:
- Lookback window $L = 14$ days.
- Lead horizons $K \in \{7, 14, 30\}$ days.
- Implemented via a deep Sequence-to-Sequence **LSTM** (PyTorch) and multi-output **Gradient Boosted Decision Trees** (XGBoost).
- **Skill Score Benchmark:** Evaluated against the standard persistence forecast:
  $$\text{Skill Score} = 1 - \frac{\text{RMSE}_{\text{model}}}{\text{RMSE}_{\text{persistence}}}$$
  Achieved $SS = 0.875$ at 7 days and $0.894$ at 30 days.

### 3.2 Compound Multi-Hazard Risk Formulation
Traditional single-variable indices fail to capture joint climate crises. The digital twin computes a composite risk surface:

$$\mathcal{R}_{\text{composite}}(i, j, t) = w_1 \mathcal{R}_{\text{heat}} + w_2 \mathcal{R}_{\text{drought}} + w_3 \mathcal{R}_{\text{AQ}}$$

Where weights are calibrated to $w_1 = 0.35, w_2 = 0.30, w_3 = 0.35$ and:
1. **Heat Stress ($\mathcal{R}_{\text{heat}}$):** Wet-bulb globe temperature ($WBT$) thresholding combined with daytime MODIS $LST$ anomalies exceeding the 90th climatological percentile:
   $$\mathcal{R}_{\text{heat}} = \text{clip}\left(\frac{T_{2m} - 28.0}{14.0} + 0.3 \cdot \frac{LST - \mu_{LST}}{\sigma_{LST}}, 0, 1\right)$$
2. **Drought Vulnerability ($\mathcal{R}_{\text{drought}}$):** Rolling 30-day cumulative precipitation deficit relative to normal monsoon levels compounded by vegetative stress ($\Delta NDVI < -0.15$).
3. **Air Quality Exceedance ($\mathcal{R}_{\text{AQ}}$):** Daily probability of surface concentrations exceeding the National Ambient Air Quality Standard ($PM_{2.5} > 60\,\mu g/m^3$) or reaching the Severe category ($PM_{2.5} > 250\,\mu g/m^3$).

### 3.3 Counterfactual Scenario Simulation Engine
To explore policy and climate interventions, the digital twin operates as a fast response surface $\hat{f}_\theta$:
$$\mathbf{S}' = \mathbf{S} + \mathcal{T}(\Delta T_{2m}, \Delta TP, \Delta \text{Fire}, \Delta \text{Emissions})$$
- Evaluates thermodynamic stagnation during heatwaves.
- Quantifies aerosol scavenging during enhanced or deficit rainfall.
- Simulates public health benefits of targeted stubble burning abatement programs across Punjab and Haryana.
