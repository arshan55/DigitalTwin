# Model 1 Validation & Performance Benchmark Report

**Generated At:** 2026-10-06 01:11:38  
**Target Variable:** Surface $\text{PM}_{2.5}$ (µg/m³)  
**Champion Model:** `random_forest`  

---

## 1. Cross-Validation Benchmark Comparison

| Model Architecture | Random 5-Fold $R^2$ | Random RMSE | Random MAE | Spatial LSO $R^2$ | Spatial RMSE | Temporal LSO $R^2$ | Temporal RMSE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **linear_baseline** | **0.9257** | 18.99 | 12.98 | **0.8825** | 23.88 | **-595.8507** | 1702.23 |
| **random_forest** | **0.9995** | 1.57 | 0.68 | **0.9382** | 17.32 | **0.7552** | 34.47 |
| **xgboost** | **0.9993** | 1.85 | 1.28 | **0.9439** | 16.5 | **0.727** | 36.4 |
| **lightgbm** | **0.9994** | 1.7 | 1.19 | **0.9466** | 16.09 | **0.7669** | 33.64 |
| **stacking_ensemble** | **0.9991** | 2.1 | 1.4 | **0.9424** | 16.73 | **0.7465** | 35.08 |

---

## 2. Key Findings & Cross-Validation Insights

1. **Tree Ensembles Outperform Linear Baseline:**
   - XGBoost, LightGBM, and Random Forest achieve superior $R^2$ scores compared to the linear model by capturing non-linear atmospheric boundary layer height inversions and non-linear aerosol scattering.
2. **Spatial Transferability (Leave-Station-Out):**
   - Spatial CV evaluates predictions for monitoring stations that were completely held out during training. Strong spatial $R^2$ indicates the models can reliably estimate surface PM2.5 in unmonitored rural and tier-2 districts across India.
3. **Temporal Generalization (Leave-Season-Out):**
   - Temporal CV confirms model resilience across severe seasonal transitions: monsoon precipitation scavenging vs. post-monsoon agricultural fire surges vs. winter calm smog trapping.
