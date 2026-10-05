"""Unit tests for official CPCB National AQI Calculator."""

import numpy as np
import pytest

from src.model1.aqi_calculator import CPCBAQICalculator


def test_sub_index_pm25():
    calc = CPCBAQICalculator()

    # PM2.5 = 15.0 -> Good (0-50) -> expected 25.0
    sub_15 = calc.calculate_sub_index("PM2.5", 15.0)
    assert 20.0 <= sub_15 <= 30.0

    # PM2.5 = 60.0 -> Satisfactory threshold -> expected 100.0
    sub_60 = calc.calculate_sub_index("PM2.5", 60.0)
    assert abs(sub_60 - 100.0) <= 1.0

    # PM2.5 = 120.0 -> Poor threshold -> expected 300.0
    sub_120 = calc.calculate_sub_index("PM2.5", 120.0)
    assert abs(sub_120 - 300.0) <= 1.0

    # PM2.5 = 350.0 -> Severe -> expected > 400.0
    sub_350 = calc.calculate_sub_index("PM2.5", 350.0)
    assert sub_350 >= 400.0


def test_composite_aqi():
    calc = CPCBAQICalculator()

    # PM2.5 is high (120 ug/m3 -> AQI 300), other pollutants moderate
    pollutants = {
        "PM2.5": 120.0,
        "PM10": 80.0,
        "NO2": 35.0,
        "SO2": 15.0,
    }

    comp_aqi, resp_pol, cat_name, cat_color = calc.calculate_composite_aqi(pollutants)

    assert abs(comp_aqi - 300.0) <= 2.0
    assert resp_pol == "PM2.5"
    assert cat_name == "Poor"


def test_vectorize_pm25():
    calc = CPCBAQICalculator()
    arr = np.array([20.0, 50.0, 80.0, 110.0, 200.0, 350.0])
    aqi_vals, categories = calc.vectorize_pm25_to_aqi(arr)

    assert len(aqi_vals) == 6
    assert categories[0] == "Good"
    assert categories[1] == "Satisfactory"
    assert categories[2] == "Moderate"
    assert categories[3] == "Poor"
    assert categories[4] == "Very Poor"
    assert categories[5] == "Severe"
