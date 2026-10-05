# Model 2: AI Climate Digital Twin & Scenario Simulation Report

**Generated At:** 2026-10-06 01:19:34  

---

## 1. Multi-Step Forward Forecasting Skill Benchmarks

Target: **Surface PM2.5** (7, 14, and 30-Day Lead Horizons)

| Horizon | Persistence RMSE | Climatology RMSE | XGBoost RMSE (Skill Score) | PyTorch LSTM RMSE (Skill Score) |
| :---: | :---: | :---: | :---: | :---: |
| **7-Day Lead** | 21.24 | 79.2 | **2.66** (SS: 0.875) | **25.0** (SS: -0.177) |
| **14-Day Lead** | 31.61 | 79.53 | **4.08** (SS: 0.871) | **38.42** (SS: -0.215) |
| **30-Day Lead** | 48.23 | 79.62 | **5.11** (SS: 0.894) | **50.63** (SS: -0.05) |

---

## 2. Counterfactual What-If Scenario Simulations

| Scenario Name | Key Driver Perturbation | Mean PM2.5 Delta (µg/m³) | Mean AQI Delta | Net Severe AQI Cells Avoided |
| :--- | :--- | :---: | :---: | :---: |
| **scenario_a_warming** | dT=2.0°C, dP=-15.0%, dFire=0.0% | **3.5** | **8.29** | **-1,315** |
| **scenario_b_fire_abatement** | dT=0.0°C, dP=0.0%, dFire=-50.0% | **-4.17** | **-8.97** | **0** |
| **scenario_c_clean_air_transition** | dT=0.0°C, dP=0.0%, dFire=-50.0% | **-27.91** | **-50.8** | **0** |

---

## 3. Scientific Caveats & Methodology
1. **Multi-Hazard Coupling:** Heat risk and drought risk evaluate compound thermal and hydrological vulnerability across India.
2. **Surrogate Simulation vs Physical GCM:** Scenario predictions deliver rapid, interactive policy exploration based on statistical response curves.
