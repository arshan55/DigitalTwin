"""Central Pollution Control Board (CPCB) Official National AQI Calculator.

Implements the official piecewise linear sub-index equations and breakpoints
for Indian ambient air quality standards (CPCB / MoEFCC).
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd

# Official CPCB Breakpoints: (B_lo, B_hi, I_lo, I_hi)
# Contiguous boundaries ensure full coverage across all floating-point values
CPCB_BREAKPOINTS = {
    "PM2.5": [
        (0.0, 30.0, 0, 50),
        (30.0, 60.0, 51, 100),
        (60.0, 90.0, 101, 200),
        (90.0, 120.0, 201, 300),
        (120.0, 250.0, 301, 400),
        (250.0, 500.0, 401, 500),
    ],
    "PM10": [
        (0.0, 50.0, 0, 50),
        (50.0, 100.0, 51, 100),
        (100.0, 250.0, 101, 200),
        (250.0, 350.0, 201, 300),
        (350.0, 430.0, 301, 400),
        (430.0, 600.0, 401, 500),
    ],
    "NO2": [
        (0.0, 40.0, 0, 50),
        (40.0, 80.0, 51, 100),
        (80.0, 180.0, 101, 200),
        (180.0, 280.0, 201, 300),
        (280.0, 400.0, 301, 400),
        (400.0, 800.0, 401, 500),
    ],
    "SO2": [
        (0.0, 40.0, 0, 50),
        (40.0, 80.0, 51, 100),
        (80.0, 380.0, 101, 200),
        (380.0, 800.0, 201, 300),
        (800.0, 1600.0, 301, 400),
        (1600.0, 2400.0, 401, 500),
    ],
    "CO": [
        (0.0, 1.0, 0, 50),
        (1.0, 2.0, 51, 100),
        (2.0, 10.0, 101, 200),
        (10.0, 17.0, 201, 300),
        (17.0, 34.0, 301, 400),
        (34.0, 50.0, 401, 500),
    ],
    "O3": [
        (0.0, 50.0, 0, 50),
        (50.0, 100.0, 51, 100),
        (100.0, 168.0, 101, 200),
        (168.0, 208.0, 201, 300),
        (208.0, 748.0, 301, 400),
        (748.0, 1000.0, 401, 500),
    ],
}

AQI_CATEGORIES = [
    (0, 50, "Good", "#00B050"),
    (51, 100, "Satisfactory", "#92D050"),
    (101, 200, "Moderate", "#FFFF00"),
    (201, 300, "Poor", "#FF9900"),
    (301, 400, "Very Poor", "#FF0000"),
    (401, 500, "Severe", "#C00000"),
]


class CPCBAQICalculator:
    """Calculates official CPCB sub-indices, composite AQI, and classifications."""

    @staticmethod
    def calculate_sub_index(pollutant: str, conc: float) -> Optional[float]:
        """
        Calculate single pollutant sub-index using linear interpolation formula:
        I_p = [(I_hi - I_lo) / (B_hi - B_lo)] * (C_p - B_lo) + I_lo
        """
        if conc is None or np.isnan(conc) or conc < 0:
            return np.nan

        pol = pollutant.upper().replace(" ", "").replace("_", "")
        key = None
        for k in CPCB_BREAKPOINTS:
            if k.upper() == pol:
                key = k
                break

        if key is None:
            return np.nan

        brackets = CPCB_BREAKPOINTS[key]

        # If concentration exceeds highest bracket, cap at 500
        if conc > brackets[-1][1]:
            return 500.0

        for b_lo, b_hi, i_lo, i_hi in brackets:
            if b_lo <= conc <= b_hi:
                sub = ((i_hi - i_lo) / (b_hi - b_lo)) * (conc - b_lo) + i_lo
                return float(np.round(sub, 1))

        return 500.0

    @classmethod
    def calculate_composite_aqi(cls, pollutants_dict: Dict[str, float]) -> Tuple[float, str, str, str]:
        """
        Calculate composite CPCB AQI from a dictionary of pollutant concentrations.
        
        Returns:
            Tuple of (composite_aqi, responsible_pollutant, category_name, category_color)
        """
        sub_indices = {}
        for pol, val in pollutants_dict.items():
            sub = cls.calculate_sub_index(pol, val)
            if not np.isnan(sub):
                sub_indices[pol] = sub

        if not sub_indices:
            return np.nan, "None", "Unknown", "#808080"

        # Responsible pollutant is the one with the maximum sub-index
        resp_pol = max(sub_indices, key=sub_indices.get)
        comp_aqi = float(sub_indices[resp_pol])

        cat_name, cat_color = cls.get_category(comp_aqi)
        return comp_aqi, resp_pol, cat_name, cat_color

    @staticmethod
    def get_category(aqi_val: float) -> Tuple[str, str]:
        """Map numeric AQI value to CPCB category and color."""
        if np.isnan(aqi_val):
            return "Unknown", "#808080"

        val = float(np.clip(aqi_val, 0, 500))
        for lo, hi, name, color in AQI_CATEGORIES:
            if lo <= val <= hi:
                return name, color
        return "Severe", "#C00000"

    @classmethod
    def vectorize_pm25_to_aqi(cls, pm25_array: Union[np.ndarray, pd.Series]) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fast vectorized calculation of CPCB AQI and category for PM2.5 arrays.
        """
        arr = np.asarray(pm25_array, dtype=np.float32)
        aqi = np.full_like(arr, np.nan)
        brackets = CPCB_BREAKPOINTS["PM2.5"]

        for b_lo, b_hi, i_lo, i_hi in brackets:
            mask = (arr >= b_lo) & (arr <= b_hi)
            aqi[mask] = ((i_hi - i_lo) / (b_hi - b_lo)) * (arr[mask] - b_lo) + i_lo

        # Handle exceedance and invalid inputs
        aqi[arr > brackets[-1][1]] = 500.0
        aqi[arr < 0.0] = np.nan

        # Fill any precision edge cases for positive numbers
        nan_positive = np.isnan(aqi) & (arr >= 0.0)
        if np.any(nan_positive):
            aqi[nan_positive] = np.where(arr[nan_positive] > 250.0, 500.0, 50.0)

        # Categorize
        categories = np.empty(arr.shape, dtype=object)
        for lo, hi, name, _ in AQI_CATEGORIES:
            c_mask = (aqi >= lo) & (aqi <= hi)
            categories[c_mask] = name
        categories[aqi > 500.0] = "Severe"

        return np.round(aqi, 1), categories
