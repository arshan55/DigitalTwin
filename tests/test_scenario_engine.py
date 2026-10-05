"""Unit tests for What-If Scenario Simulation Engine."""

import numpy as np
import pytest

from src.model2.scenario_engine import ScenarioSimulationEngine


def test_scenario_simulation_fire_reduction():
    engine = ScenarioSimulationEngine()
    # Simulate -50% stubble burning fire abatement on peak smog date
    res = engine.simulate_scenario(
        date_str="2023-11-05",
        delta_temp_c=0.0,
        delta_precip_pct=0.0,
        delta_fire_pct=-50.0,
        delta_emissions_pct=0.0,
    )

    assert "summary_metrics" in res
    assert "spatial_grids" in res
    assert "baseline" in res
    assert "perturbed" in res

    # 50% fire reduction must decrease mean PM2.5 and AQI
    assert res["summary_metrics"]["mean_pm25_delta"] < 0.0
    assert res["summary_metrics"]["mean_aqi_delta"] <= 0.0
    assert res["perturbed"]["mean_pm25"] < res["baseline"]["mean_pm25"]


def test_scenario_warming():
    engine = ScenarioSimulationEngine()
    # Simulate +3°C warming scenario
    res = engine.simulate_scenario(
        date_str="2023-11-05",
        delta_temp_c=3.0,
        delta_precip_pct=0.0,
        delta_fire_pct=0.0,
        delta_emissions_pct=0.0,
    )

    # Temperature rise increases thermal/heat risk
    assert res["summary_metrics"]["mean_risk_delta"] >= 0.0
