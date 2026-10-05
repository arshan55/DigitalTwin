"""Compound Multi-Hazard Climate Risk Engine.

Computes Heat Risk, Drought Risk (SPI-30), and Air Quality Risk indices,
combining them into a weighted, normalized Digital Twin Composite Hazard Index.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

from src.common.logger import get_logger

logger = get_logger("risk_engine")

RISK_LEVELS = [
    (0.00, 0.20, "Low Risk", "#2ECC71"),
    (0.21, 0.40, "Moderate Risk", "#F1C40F"),
    (0.41, 0.60, "Elevated Risk", "#E67E22"),
    (0.61, 0.80, "High Risk", "#E74C3C"),
    (0.81, 1.00, "Extreme Compound Risk", "#8E44AD"),
]


class CompoundRiskEngine:
    """Calculates individual hazard sub-indices and composite digital twin risk scores."""

    def __init__(
        self,
        weight_heat: float = 0.35,
        weight_drought: float = 0.35,
        weight_aq: float = 0.30,
        heat_base_temp_c: float = 32.0,
        severe_aqi_threshold: float = 400.0,
    ):
        # Ensure weights sum to 1.0
        tot_w = weight_heat + weight_drought + weight_aq
        self.w_heat = weight_heat / tot_w
        self.w_drought = weight_drought / tot_w
        self.w_aq = weight_aq / tot_w

        self.heat_base_temp = heat_base_temp_c
        self.severe_aqi = severe_aqi_threshold

    def compute_heat_risk(
        self,
        t2m_c: Union[np.ndarray, float],
        rh_pct: Union[np.ndarray, float],
        lst_c: Optional[Union[np.ndarray, float]] = None,
    ) -> Union[np.ndarray, float]:
        """
        Compute Heat Risk Index [0.0, 1.0] from 2m Temperature, RH, and LST.
        Captures heatwave stress amplified by humidity and thermal surface radiation.
        """
        # Apparent temperature / Heat index approximation
        # Steadman simplified: AT = T + 0.33 * vapor_pressure - 0.70 * wind - 4.00
        # Practical thermal comfort scaling
        t_excess = np.maximum(0.0, t2m_c - self.heat_base_temp)
        # Humidity penalty above 50% RH
        rh_factor = 1.0 + np.maximum(0.0, (rh_pct - 50.0) / 100.0)
        apparent_t = t_excess * rh_factor

        base_risk = apparent_t / 15.0  # Scales 0 to 1 as apparent temp exceeds base by 15°C

        if lst_c is not None:
            lst_excess = np.maximum(0.0, lst_c - 35.0) / 15.0
            heat_risk = 0.7 * base_risk + 0.3 * lst_excess
        else:
            heat_risk = base_risk

        return np.clip(heat_risk, 0.0, 1.0)

    def compute_drought_risk(
        self,
        precip_30d_mm: Union[np.ndarray, float],
        clim_precip_30d_mm: Union[np.ndarray, float],
        ndvi: Optional[Union[np.ndarray, float]] = None,
    ) -> Union[np.ndarray, float]:
        """
        Compute Drought Risk Index [0.0, 1.0] based on 30-day precipitation deficit
        (Standardized Precipitation proxy) and NDVI vegetation stress.
        """
        # Deficit fraction: (Clim - Actual) / Clim
        deficit = (clim_precip_30d_mm - precip_30d_mm) / np.maximum(10.0, clim_precip_30d_mm)
        precip_deficit_risk = np.clip(deficit, 0.0, 1.0)

        if ndvi is not None:
            # Low NDVI (< 0.25) during growing season exacerbates agricultural drought
            veg_stress = np.clip((0.45 - ndvi) / 0.35, 0.0, 1.0)
            drought_risk = 0.65 * precip_deficit_risk + 0.35 * veg_stress
        else:
            drought_risk = precip_deficit_risk

        return np.clip(drought_risk, 0.0, 1.0)

    def compute_aqi_risk(
        self,
        cpcb_aqi: Union[np.ndarray, float],
    ) -> Union[np.ndarray, float]:
        """
        Compute Air Quality Health Risk [0.0, 1.0] from CPCB National AQI.
        AQI 0-100: Low (<0.25)
        AQI 100-200: Moderate (0.25 - 0.50)
        AQI 200-300: High (0.50 - 0.75)
        AQI 300+: Severe / Extreme (0.75 - 1.00)
        """
        aq_risk = cpcb_aqi / self.severe_aqi
        return np.clip(aq_risk, 0.0, 1.0)

    def compute_composite_risk(
        self,
        heat_risk: Union[np.ndarray, float],
        drought_risk: Union[np.ndarray, float],
        aq_risk: Union[np.ndarray, float],
    ) -> Tuple[Union[np.ndarray, float], Union[np.ndarray, str]]:
        """
        Compute weighted composite risk score:
        R_comp = w_heat * R_heat + w_drought * R_drought + w_aq * R_aq
        """
        comp_score = (
            self.w_heat * heat_risk
            + self.w_drought * drought_risk
            + self.w_aq * aq_risk
        )
        comp_score = np.round(np.clip(comp_score, 0.0, 1.0), 3)

        # Categorize
        if isinstance(comp_score, np.ndarray):
            categories = np.empty(comp_score.shape, dtype=object)
            for lo, hi, label, _ in RISK_LEVELS:
                mask = (comp_score >= lo) & (comp_score <= hi)
                categories[mask] = label
            categories[comp_score > 1.0] = "Extreme Compound Risk"
            return comp_score, categories
        else:
            for lo, hi, label, _ in RISK_LEVELS:
                if lo <= comp_score <= hi:
                    return float(comp_score), label
            return float(comp_score), "Extreme Compound Risk"

    def assess_gridded_hazards(self, state_dict: Dict[str, np.ndarray]) -> Dict[str, np.ndarray]:
        """Assess compound risk across all grid points in a DigitalTwinStateStore snapshot."""
        t2m = state_dict["t2m"]
        rh = state_dict["rh"]
        lst = state_dict.get("lst_day")
        tp = state_dict["tp"]
        ndvi = state_dict.get("ndvi")
        aqi = state_dict["cpcb_aqi"]

        # Approximate 30-day precipitation baseline (15mm dry season, 250mm monsoon)
        clim_tp = np.full_like(tp, 65.0)

        r_heat = self.compute_heat_risk(t2m, rh, lst)
        r_drought = self.compute_drought_risk(tp * 30.0, clim_tp, ndvi)
        r_aq = self.compute_aqi_risk(aqi)

        r_comp, cat_comp = self.compute_composite_risk(r_heat, r_drought, r_aq)

        return {
            "heat_risk": np.round(r_heat, 3),
            "drought_risk": np.round(r_drought, 3),
            "aq_risk": np.round(r_aq, 3),
            "composite_risk": r_comp,
            "composite_category": cat_comp,
        }
