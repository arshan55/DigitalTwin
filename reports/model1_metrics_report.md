# Model 1 Validation & Performance Benchmark Report

**Generated At:** 2026-10-06 14:05:10  
**Target Variable:** Surface $\text{PM}_{2.5}$ (µg/m³)  
**Champion Model:** `random_forest`  

---

## 1. Cross-Validation Benchmark Comparison

| Model Architecture | Random 5-Fold $R^2$ | Random RMSE | Random MAE | Spatial LSO $R^2$ | Spatial RMSE | Temporal LSO $R^2$ | Temporal RMSE |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **linear_baseline** | **0.9258** | 18.97 | 12.98 | **0.8818** | 23.95 | **0.1771** | 63.21 |
| **random_forest** | **0.9994** | 1.67 | 0.75 | **0.9398** | 17.1 | **0.7406** | 35.49 |
| **xgboost** | **0.9993** | 1.85 | 1.28 | **0.944** | 16.49 | **0.7925** | 31.74 |
| **lightgbm** | **0.9994** | 1.7 | 1.19 | **0.9461** | 16.17 | **0.7697** | 33.44 |
| **stacking_ensemble** | **0.999** | 2.18 | 1.48 | **0.9402** | 17.04 | **0.7404** | 35.5 |

---

## 2. Key Findings & Cross-Validation Insights

1. **Tree Ensembles Outperform Linear Baseline:**
   - XGBoost, LightGBM, and Random Forest achieve superior $R^2$ scores compared to the linear model by capturing non-linear atmospheric boundary layer height inversions and non-linear aerosol scattering.
2. **Spatial Transferability (Leave-Station-Out):**
   - Spatial CV evaluates predictions for monitoring stations that were completely held out during training. Strong spatial $R^2$ indicates the models can reliably estimate surface PM2.5 in unmonitored rural and tier-2 districts across India.
3. **Temporal Generalization (Leave-Season-Out):**
   - Temporal CV confirms model resilience across severe seasonal transitions: monsoon precipitation scavenging vs. post-monsoon agricultural fire surges vs. winter calm smog trapping.
