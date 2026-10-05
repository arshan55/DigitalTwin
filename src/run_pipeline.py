"""Master Pipeline Orchestrator for India Air Quality & Climate Digital Twin.

Usage:
    python -m src.run_pipeline --phase 1 --config config/pilot.yaml
"""

import argparse
from datetime import datetime
from pathlib import Path
import sys
import numpy as np

from src.common.config import load_config
from src.common.logger import get_logger
from src.preprocessing.harmonizer import DataHarmonizer

logger = get_logger("master_pipeline")


def run_phase1(config_path: str = "config/pilot.yaml", start_date: str = None, end_date: str = None):
    """Execute Phase 1: Ingestion, QA filtering, and Dataset Collocation."""
    logger.info("==================================================")
    logger.info("=== PHASE 1: DATA INGESTION & PREPROCESSING ===")
    logger.info("==================================================")
    cfg = load_config(config_path)

    # Allow custom dates or use config dates
    if start_date is None:
        start_date = cfg.temporal.start_date
    if end_date is None:
        end_date = cfg.temporal.end_date

    harmonizer = DataHarmonizer(cfg)
    matched_df, report_path = harmonizer.run_pipeline(start_date=start_date, end_date=end_date)

    logger.info(f"Phase 1 successfully finished!")
    logger.info(f"Collocated records: {len(matched_df):,}")
    logger.info(f"Dataset path: {cfg.paths.processed / 'model1_train_dataset.parquet'}")
    logger.info(f"Data Quality Report: {report_path}")
    return matched_df, report_path


def run_phase2(config_path: str = "config/pilot.yaml"):
    """Execute Phase 2: Model 1 Training, Cross-Validation, CPCB AQI, HCHO & Fire Attribution."""
    logger.info("==================================================")
    logger.info("=== PHASE 2: MODEL 1 (SURFACE AQI & HCHO) ===")
    logger.info("==================================================")
    cfg = load_config(config_path)

    from src.common.grid import CoordinateGrid
    from src.ingestion.cdse_tropomi import TROPOMILoader
    from src.model1.aqi_calculator import CPCBAQICalculator
    from src.model1.fire_attribution import FireSourceAttributor
    from src.model1.hcho_hotspots import HCHOHotspotDetector
    from src.model1.interpretability import ModelInterpreter
    from src.model1.train_pm25 import Model1Trainer
    import pandas as pd

    # 1. Model Training & Cross-Validation
    trainer = Model1Trainer(cfg)
    metrics_meta = trainer.train_and_evaluate_all()

    # 2. Fire Source Attribution & Stubble Burning Case Study
    df_data = pd.read_parquet(cfg.paths.processed / "model1_train_dataset.parquet")
    attributor = FireSourceAttributor(df_data)
    case_study = attributor.run_stubble_burning_case_study(
        case_start=cfg.raw_config.get("model1", {}).get("fire_attribution", {}).get("case_study_start", "2023-10-15"),
        case_end=cfg.raw_config.get("model1", {}).get("fire_attribution", {}).get("case_study_end", "2023-11-20"),
    )
    case_study_file = cfg.paths.reports / "stubble_burning_case_study.json"
    import json
    with open(case_study_file, "w", encoding="utf-8") as f:
        json.dump(case_study, f, indent=2)
    logger.info(f"Saved stubble burning case study to: {case_study_file}")

    # 3. HCHO Hotspot Detection
    grid = CoordinateGrid(bbox=cfg.spatial.bbox, resolution_deg=cfg.spatial.resolution_deg)
    tropomi_loader = TROPOMILoader(cfg.paths.raw / "tropomi")
    hcho_detector = HCHOHotspotDetector(grid, z_threshold=2.0)

    # Detect hotspots on peak fire day (Nov 5, 2023)
    tropomi_fields = tropomi_loader.get_real_gridded_fields("2023-11-05", grid)
    hotspots = hcho_detector.detect_hotspots(tropomi_fields["TROPOMI_HCHO"], date_str="2023-11-05")
    hotspot_file = cfg.paths.reports / "hcho_hotspots_sample.json"
    with open(hotspot_file, "w", encoding="utf-8") as f:
        json.dump(hotspots, f, indent=2)
    logger.info(f"Saved HCHO hotspot clusters ({hotspots['n_clusters']} clusters) to: {hotspot_file}")

    # 4. Feature Importance & Interpretability
    best_model_path = cfg.paths.processed / "models" / "best_model1.joblib"
    interpreter = ModelInterpreter(best_model_path)
    feat_df = interpreter.get_tree_feature_importances(metrics_meta["feature_columns"])
    feat_file = cfg.paths.reports / "model1_feature_importances.csv"
    feat_df.to_csv(feat_file, index=False)
    logger.info(f"Saved feature importances to: {feat_file}")

    logger.info("=== Phase 2 Execution Complete! Champion: %s (R2=%.4f) ===", metrics_meta["best_model"], metrics_meta["best_r2"])
    return metrics_meta


def run_phase3(config_path: str = "config/pilot.yaml"):
    """Execute Phase 3: Model 2 (Climate Digital Twin, Forecasting, Risk & Scenarios)."""
    logger.info("==================================================")
    logger.info("=== PHASE 3: MODEL 2 (CLIMATE DIGITAL TWIN) ===")
    logger.info("==================================================")
    cfg = load_config(config_path)

    import json
    import pandas as pd
    from src.model2.forecasting import ClimateForecastingEngine
    from src.model2.risk_engine import CompoundRiskEngine
    from src.model2.scenario_engine import ScenarioSimulationEngine
    from src.model2.state_store import DigitalTwinStateStore

    state_store = DigitalTwinStateStore(cfg)

    # 1. Extract Historical Point Time Series for Delhi-NCR (28.61, 77.23)
    logger.info("Extracting digital twin state time-series for Delhi-NCR (2022-2023)...")
    df_ts = state_store.get_point_timeseries(lat=28.61, lon=77.23, start_date="2022-01-01", end_date="2023-12-31")
    ts_file = cfg.paths.processed / "digital_twin_delhi_timeseries.parquet"
    df_ts.to_parquet(ts_file, index=False)
    logger.info(f"Saved point time series ({len(df_ts)} days) to: {ts_file}")

    # 2. Multi-Horizon Forecasting Engine (LSTM vs XGBoost vs Persistence vs Climatology)
    logger.info("Running Multi-Horizon Forecasting Benchmarks (7, 14, 30 days)...")
    fc_engine = ClimateForecastingEngine(lookback_days=14, horizons_days=[7, 14, 30], random_seed=42)
    fc_results = fc_engine.run_multi_horizon_benchmarks(df_ts, targets=["pm25", "t2m", "tp"])

    fc_file = cfg.paths.reports / "model2_forecast_metrics.json"
    with open(fc_file, "w", encoding="utf-8") as f:
        json.dump(fc_results, f, indent=2)
    logger.info(f"Saved forecasting metrics to: {fc_file}")

    # 3. Compound Climate Risk Assessment Snapshot
    logger.info("Evaluating compound climate hazard risks across India...")
    risk_engine = CompoundRiskEngine()
    state_snap = state_store.get_gridded_state("2023-11-05")
    hazard_snap = risk_engine.assess_gridded_hazards(state_snap)
    logger.info(
        f"Assessed multi-hazard risk: Mean Heat Risk={np.mean(hazard_snap['heat_risk']):.3f}, "
        f"Mean AQ Risk={np.mean(hazard_snap['aq_risk']):.3f}, "
        f"Mean Composite Risk={np.mean(hazard_snap['composite_risk']):.3f}"
    )

    # 4. Counterfactual What-If Scenario Simulations
    logger.info("Simulating counterfactual policy and climate scenarios...")
    scenario_engine = ScenarioSimulationEngine(state_store=state_store, config=cfg)

    scenarios = {
        "scenario_a_warming": scenario_engine.simulate_scenario(
            date_str="2023-11-05", delta_temp_c=2.0, delta_precip_pct=-15.0, delta_fire_pct=0.0, delta_emissions_pct=0.0
        ),
        "scenario_b_fire_abatement": scenario_engine.simulate_scenario(
            date_str="2023-11-05", delta_temp_c=0.0, delta_precip_pct=0.0, delta_fire_pct=-50.0, delta_emissions_pct=0.0
        ),
        "scenario_c_clean_air_transition": scenario_engine.simulate_scenario(
            date_str="2023-11-05", delta_temp_c=0.0, delta_precip_pct=0.0, delta_fire_pct=-50.0, delta_emissions_pct=-30.0
        ),
    }

    # Remove large 2D arrays before saving JSON summary
    scenario_summary = {}
    for sc_name, sc_data in scenarios.items():
        scenario_summary[sc_name] = {
            "metadata": sc_data["scenario_metadata"],
            "summary_metrics": sc_data["summary_metrics"],
            "baseline": sc_data["baseline"],
            "perturbed": sc_data["perturbed"],
        }

    sc_file = cfg.paths.reports / "model2_scenarios.json"
    with open(sc_file, "w", encoding="utf-8") as f:
        json.dump(scenario_summary, f, indent=2)
    logger.info(f"Saved scenario simulations to: {sc_file}")

    # Generate Markdown Report for Model 2
    _generate_model2_markdown(cfg, fc_results, scenario_summary)
    logger.info("=== Phase 3 Execution Complete! ===")
    return fc_results


def _generate_model2_markdown(cfg, fc_results, scenarios):
    """Generate Markdown report for Model 2 benchmarks."""
    out_file = cfg.paths.reports / "model2_digital_twin_report.md"
    md = f"""# Model 2: AI Climate Digital Twin & Scenario Simulation Report

**Generated At:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}  

---

## 1. Multi-Step Forward Forecasting Skill Benchmarks

Target: **Surface PM2.5** (7, 14, and 30-Day Lead Horizons)

| Horizon | Persistence RMSE | Climatology RMSE | XGBoost RMSE (Skill Score) | PyTorch LSTM RMSE (Skill Score) |
| :---: | :---: | :---: | :---: | :---: |
"""
    for h in [7, 14, 30]:
        key = f"{h}_day"
        if "pm25" in fc_results and key in fc_results["pm25"]:
            d = fc_results["pm25"][key]
            md += (
                f"| **{h}-Day Lead** | {d['persistence']['rmse']} | {d['climatology']['rmse']} | "
                f"**{d['xgboost']['rmse']}** (SS: {d['xgboost']['skill_score_vs_persistence']}) | "
                f"**{d['lstm']['rmse']}** (SS: {d['lstm']['skill_score_vs_persistence']}) |\n"
            )

    md += """
---

## 2. Counterfactual What-If Scenario Simulations

| Scenario Name | Key Driver Perturbation | Mean PM2.5 Delta (µg/m³) | Mean AQI Delta | Net Severe AQI Cells Avoided |
| :--- | :--- | :---: | :---: | :---: |
"""
    for sc_name, sc in scenarios.items():
        m = sc["summary_metrics"]
        meta = sc["metadata"]
        md += (
            f"| **{sc_name}** | dT={meta['delta_temp_c']}°C, dP={meta['delta_precip_pct']}%, dFire={meta['delta_fire_pct']}% | "
            f"**{m['mean_pm25_delta']}** | **{m['mean_aqi_delta']}** | **{m['net_severe_cells_avoided']:,}** |\n"
        )

    md += """
---

## 3. Scientific Caveats & Methodology
1. **Multi-Hazard Coupling:** Heat risk and drought risk evaluate compound thermal and hydrological vulnerability across India.
2. **Surrogate Simulation vs Physical GCM:** Scenario predictions deliver rapid, interactive policy exploration based on statistical response curves.
"""
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(md)
    logger.info(f"Wrote Model 2 report to: {out_file}")


def main():
    parser = argparse.ArgumentParser(description="India Air Quality & Climate Digital Twin Pipeline")
    parser.add_argument("--config", type=str, default="config/pilot.yaml", help="Path to config YAML")
    parser.add_argument("--phase", type=str, default="1", choices=["1", "2", "3", "all"], help="Pipeline phase to execute")
    parser.add_argument("--start-date", type=str, default=None, help="Optional override start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, default=None, help="Optional override end date (YYYY-MM-DD)")

    args = parser.parse_args()

    if args.phase in ["1", "all"]:
        run_phase1(args.config, args.start_date, args.end_date)

    if args.phase in ["2", "all"]:
        run_phase2(args.config)

    if args.phase in ["3", "all"]:
        run_phase3(args.config)


if __name__ == "__main__":
    main()
