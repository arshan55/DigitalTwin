"""Unit tests for active fire attribution and stubble burning analysis."""

import numpy as np
import pandas as pd
import pytest

from src.model1.fire_attribution import FireSourceAttributor


def test_fire_attribution_case_study():
    # Construct synthetic case study DataFrame
    dates = pd.date_range("2023-09-01", "2023-11-30", freq="D")
    records = []
    for d in dates:
        d_str = d.strftime("%Y-%m-%d")
        doy = d.dayofyear
        # Baseline ~ 40, spike in Nov ~ 180
        is_fire = 290 <= doy <= 325
        pm25 = 180.0 if is_fire else 40.0
        frp = 500.0 if is_fire else 10.0

        records.append({
            "date": d_str,
            "state": "Punjab",
            "PM2.5_target": pm25,
            "fire_frp_100km_lag1": frp,
            "fire_count_100km_lag1": 25 if is_fire else 1,
        })

    df = pd.DataFrame(records)
    attributor = FireSourceAttributor(df)

    case_res = attributor.run_stubble_burning_case_study(
        case_start="2023-10-15",
        case_end="2023-11-20",
        igp_states=["Punjab"],
    )

    assert case_res["mean_pm25_igp"] > case_res["baseline_september_pm25"]
    assert case_res["pct_increase_over_baseline"] > 100.0
    assert case_res["fire_frp_pm25_correlation"] > 0.5
