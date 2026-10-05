"""Counterfactual "What-If" Scenario Simulation Engine.

Enables interactive perturbation of climate and anthropogenic drivers
(temperature offset, rainfall deficit/excess, fire abatement, emissions mitigation)
and calculates spatial delta responses across surface AQI and multi-hazard risk.
"""

from datetime import datetime
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from src.common.config import ProjectConfig, load_config
from src.common.logger import get_logger
from src.model1.aqi_calculator import CPCBAQICalculator
from src.model2.risk_engine import CompoundRiskEngine
from src.model2.state_store import DigitalTwinStateStore

logger = get_logger("scenario_engine")


class ScenarioSimulationEngine:
    """Simulates counterfactual what-if scenarios on the Digital Twin."""

    def __init__(
        self,
        state_store: Optional[DigitalTwinStateStore] = None,
        config: Optional[ProjectConfig] = None,
    ):
        self.config = config or load_config()
        self.state_store = state_store or DigitalTwinStateStore(self.config)
        self.risk_engine = CompoundRiskEngine()
        self.aqi_calc = CPCBAQICalculator()

    def simulate_scenario(
        self,
        date_str: str = "2023-11-05",
        delta_temp_c: float = 0.0,
        delta_precip_pct: float = 0.0,
        delta_fire_pct: float = 0.0,
        delta_emissions_pct: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Execute counterfactual scenario simulation.
        
        Args:
            date_str: Base digital twin state date (e.g. peak fire day 2023-11-05)
            delta_temp_c: Temperature shift in °C (e.g. +2.0°C)
            delta_precip_pct: Precipitation shift in % (e.g. -20.0%)
            delta_fire_pct: Active fire change in % (e.g. -50.0% stubble burning abatement)
            delta_emissions_pct: Anthropogenic emission scaling in % (e.g. -30.0%)
        """
        # Validate slider bounds
        delta_temp_c = float(np.clip(delta_temp_c, -2.0, 5.0))
        delta_precip_pct = float(np.clip(delta_precip_pct, -50.0, 50.0))
        delta_fire_pct = float(np.clip(delta_fire_pct, -100.0, 50.0))
        delta_emissions_pct = float(np.clip(delta_emissions_pct, -50.0, 50.0))

        logger.info(
            f"Simulating scenario for {date_str}: dT={delta_temp_c:+.1f}°C, "
            f"dP={delta_precip_pct:+.1f}%, dFire={delta_fire_pct:+.1f}%, dEmiss={delta_emissions_pct:+.1f}%"
        )

        # 1. Obtain baseline digital twin snapshot
        baseline_state = self.state_store.get_gridded_state(date_str)
        baseline_hazards = self.risk_engine.assess_gridded_hazards(baseline_state)

        # 2. Perturb atmospheric and climate drivers
        perturbed_state = {}
        for k, v in baseline_state.items():
            if isinstance(v, np.ndarray):
                perturbed_state[k] = np.copy(v)
            else:
                perturbed_state[k] = v

        # Apply temperature offset
        perturbed_state["t2m"] = baseline_state["t2m"] + delta_temp_c
        perturbed_state["lst_day"] = baseline_state["lst_day"] + delta_temp_c * 1.15

        # Apply precipitation shift
        p_factor = 1.0 + (delta_precip_pct / 100.0)
        perturbed_state["tp"] = np.maximum(0.0, baseline_state["tp"] * p_factor)

        # Apply emissions and fire attenuation to surface PM2.5 surrogate
        # Atmospheric chemistry response factor:
        # Fire contributes ~15-35% in post-monsoon fire belt, emissions contribute baseline
        fire_factor = 1.0 + (delta_fire_pct / 100.0)
        emiss_factor = 1.0 + (delta_emissions_pct / 100.0)

        # Approximate biomass zone: Punjab, Haryana, Delhi, Western UP
        grid = self.state_store.grid
        stubble_zone = (grid.lat_grid >= 28.0) & (grid.lat_grid <= 32.5) & (grid.lon_grid >= 74.0) & (grid.lon_grid <= 78.0)

        # Scaled PM2.5 response
        base_pm25 = baseline_state["pm25"]
        # Regional fire contribution weight (higher in stubble zone)
        fire_weight = np.where(stubble_zone, 0.35, 0.08)
        emiss_weight = np.where(stubble_zone, 0.65, 0.92)

        perturbed_pm25 = base_pm25 * (fire_weight * fire_factor + emiss_weight * emiss_factor)

        # Thermal stagnation feedback: higher temp slightly weakens boundary layer mixing in winter
        if delta_temp_c > 0 and int(date_str.split("-")[1]) in [11, 12, 1]:
            perturbed_pm25 *= (1.0 + 0.02 * delta_temp_c)

        perturbed_pm25 = np.round(np.clip(perturbed_pm25, 5.0, 750.0), 1)
        perturbed_state["pm25"] = perturbed_pm25

        # Recompute official CPCB AQI
        pert_aqi, pert_cat = self.aqi_calc.vectorize_pm25_to_aqi(perturbed_pm25)
        perturbed_state["cpcb_aqi"] = pert_aqi
        perturbed_state["aqi_category"] = pert_cat

        # 3. Re-evaluate compound climate risks
        perturbed_hazards = self.risk_engine.assess_gridded_hazards(perturbed_state)

        # 4. Compute spatial deltas (Perturbed - Baseline)
        delta_pm25 = np.round(perturbed_pm25 - baseline_state["pm25"], 1)
        delta_aqi = np.round(pert_aqi - baseline_state["cpcb_aqi"], 1)
        delta_risk = np.round(perturbed_hazards["composite_risk"] - baseline_hazards["composite_risk"], 3)

        # Summary Policy Statistics
        baseline_severe_count = int(np.sum(baseline_state["cpcb_aqi"] >= 400.0))
        perturbed_severe_count = int(np.sum(pert_aqi >= 400.0))
        delta_severe_cells = perturbed_severe_count - baseline_severe_count

        mean_pm25_change = float(np.mean(delta_pm25))
        mean_aqi_change = float(np.mean(delta_aqi))
        mean_risk_change = float(np.mean(delta_risk))

        return {
            "scenario_metadata": {
                "date": date_str,
                "delta_temp_c": delta_temp_c,
                "delta_precip_pct": delta_precip_pct,
                "delta_fire_pct": delta_fire_pct,
                "delta_emissions_pct": delta_emissions_pct,
                "disclaimer": (
                    "Statistical surrogate simulation: Delivers fast empirical response estimation. "
                    "Not a coupled 3D Navier-Stokes general circulation model."
                ),
            },
            "summary_metrics": {
                "mean_pm25_delta": round(mean_pm25_change, 2),
                "mean_aqi_delta": round(mean_aqi_change, 2),
                "mean_risk_delta": round(mean_risk_change, 3),
                "baseline_severe_cells": baseline_severe_count,
                "perturbed_severe_cells": perturbed_severe_count,
                "net_severe_cells_avoided": -delta_severe_cells,
            },
            "baseline": {
                "mean_pm25": round(float(np.mean(baseline_state["pm25"])), 1),
                "mean_aqi": round(float(np.mean(baseline_state["cpcb_aqi"])), 1),
                "mean_risk": round(float(np.mean(baseline_hazards["composite_risk"])), 3),
            },
            "perturbed": {
                "mean_pm25": round(float(np.mean(perturbed_pm25)), 1),
                "mean_aqi": round(float(np.mean(pert_aqi)), 1),
                "mean_risk": round(float(np.mean(perturbed_hazards["composite_risk"])), 3),
            },
            "spatial_grids": {
                "delta_pm25": delta_pm25,
                "delta_aqi": delta_aqi,
                "delta_risk": delta_risk,
                "perturbed_pm25": perturbed_pm25,
                "perturbed_aqi": pert_aqi,
            },
        }
