# Methodology & Limitations: India Air Quality & Climate Digital Twin

**Project:** India Air Quality & Climate Digital Twin  
**Reference Document:** `Capstone Research (241).docx` (Kawano et al., Nature Reviews Earth-system digital twin, CPCB National AQI guidelines)  
**Date:** October 2026  

---

## 1. Mathematical & Algorithmic Methodology

### 1.1 Multi-Pollutant Surface PM2.5 Estimation (Model 1)
Model 1 infers daily surface concentrations of fine particulate matter ($PM_{2.5}$) by fusing satellite remote sensing products, atmospheric reanalyses, and meteorological variables:

$$\hat{y}_{i,t} = f_\theta\left(\mathbf{X}_{\text{satellite}}, \mathbf{X}_{\text{reanalysis}}, \mathbf{X}_{\text{meteo}}, \mathbf{X}_{\text{fire}}, \mathbf{X}_{\text{spatial}}, \mathbf{X}_{\text{temporal}}\right)$$

Where:
- $\mathbf{X}_{\text{satellite}}$: Sentinel-5P TROPOMI tropospheric vertical column densities ($NO_2, CO, SO_2, O_3, HCHO$) filtered with $qa\_value > 0.5$ and cloud fraction $< 0.3$; MODIS MAIAC Aerosol Optical Depth ($AOD_{550}$), Land Surface Temperature ($LST_{\text{day}}, LST_{\text{night}}$), and $NDVI$.
- $\mathbf{X}_{\text{reanalysis}}$: NASA MERRA-2 aerosol diagnostics ($PM_{2.5}$ at 35% RH, total AOD, black carbon, dust, sulfate).
- $\mathbf{X}_{\text{meteo}}$: ECMWF ERA5 reanalysis variables ($2m$ temperature, relative humidity, $10m$ wind speed, surface pressure, total precipitation, boundary layer height $BLH$, and ventilation index $VI = BLH \times \text{wind\_speed}$).
- $\mathbf{X}_{\text{fire}}$: NASA VIIRS FIRMS active fire counts and Fire Radiative Power (FRP) computed over multi-radius buffers (25, 50, 100, 200 km) and lagged across 0, 1, and 2 days.
- $\mathbf{X}_{\text{spatial}}, \mathbf{X}_{\text{temporal}}$: Latitude, longitude, cyclic day-of-year harmonic encoding ($\sin, \cos$), day-of-week, and weekend indicators.

### 1.2 Official CPCB National Air Quality Index (AQI) Formulation
Continuous sub-indices are derived using the official piecewise linear interpolation standard defined by the Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC):

$$I_p = \frac{I_{\text{high}} - I_{\text{low}}}{B_{\text{high}} - B_{\text{low}}} \times \left(C_p - B_{\text{low}}\right) + I_{\text{low}}$$

Where:
- $C_p$: 24-hour average concentration of pollutant $p$.
- $[B_{\text{low}}, B_{\text{high}}]$: Breakpoint range containing $C_p$.
- $[I_{\text{low}}, I_{\text{high}}]$: Corresponding sub-index breakpoint range.

The composite AQI represents the maximum of all valid individual sub-indices:
$$\text{AQI} = \max\left(I_{\text{PM2.5}}, I_{\text{PM10}}, I_{\text{NO2}}, I_{\text{SO2}}, I_{\text{CO}}, I_{\text{O3}}\right)$$

### 1.3 Formaldehyde (HCHO) Hotspot Identification & Clustering
Formaldehyde is an established atmospheric proxy for volatile organic compound (VOC) emissions:
1. Spatial baseline normalization: For each grid cell $(i, j)$ and day $t$, the localized Z-score is calculated relative to the seasonal baseline:
   $$Z_{i,j,t} = \frac{\text{HCHO}_{i,j,t} - \mu_{\text{season}, i, j}}{\sigma_{\text{season}, i, j}}$$
2. Cells satisfying $Z \ge 2.0$ are flagged as anomalous.
3. Density-Based Spatial Clustering of Applications with Noise (DBSCAN, $\varepsilon = 1.0^\circ$, $\text{min\_samples} = 3$) groups contiguous anomalies into coherent emission hotspots.
4. Source characterization: Co-located fire detections classify the cluster as Biomass Burning; high MODIS NDVI indicates biogenic isoprene emission; elevated $NO_2$ classifies it as an industrial/urban hotspot.

### 1.4 Coupled Climate Digital Twin & Scenario Engine (Model 2)
The digital twin maintains a continuous coupled state $\mathbf{S}_t \in \mathbb{R}^{H \times W \times C}$ capturing atmospheric chemistry, thermodynamics, and biophysical dynamics:
1. **Multi-Horizon Forecasting:** An encoder-decoder Long Short-Term Memory (LSTM) network and multi-output Gradient Boosted Decision Trees predict future states $\mathbf{S}_{t+1:t+K}$ for $K \in \{7, 14, 30\}$ days based on historical sequences $\mathbf{S}_{t-L:t}$ ($L = 14$ days).
2. **Compound Multi-Hazard Risk:**
   $$\mathcal{R}_{\text{composite}} = 0.35 \times \mathcal{R}_{\text{heat}} + 0.30 \times \mathcal{R}_{\text{drought}} + 0.35 \times \mathcal{R}_{\text{AQ}}$$
3. **Counterfactual Policy Simulator:** Evaluates perturbations $(\Delta T, \Delta P, \Delta \text{Fire}, \Delta \text{Emissions})$ through the trained physical surrogate model.

---

## 2. Limitations & Caveats

1. **Resolution Scale:** The pilot implementation operates on a $0.25^\circ \times 0.25^\circ$ ($\approx 28 \text{ km} \times 28 \text{ km}$) regular grid. Hyper-local urban street canyon micro-climates require higher resolution downscaling (e.g., $1 \text{ km}$ or street-level sensor integration).
2. **Ground Truth Station Density:** While the 18 reference CAAQMS stations cover major metropolitan centers across 11 Indian states, rural coverage across peninsular India and the Himalayan foothills remains sparse.
3. **Statistical Surrogate Nature of Scenarios:** The counterfactual scenario engine acts as a fast machine-learning response surface rather than a full Navier-Stokes numerical fluid dynamics model (e.g., WRF-Chem). It captures first-order statistical sensitivities but does not resolve tertiary chemical feedback loops.
4. **Cloud Masking in Satellite Optical Sensors:** Optical sensors (MODIS, TROPOMI) experience data gaps during active monsoon cloud cover (June–September), which are mitigated via MERRA-2 and ERA5 reanalysis interpolation.
