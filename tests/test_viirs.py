"""Unit tests for VIIRS active fire buffering and spatial calculations."""

import numpy as np
import pandas as pd
import pytest

from src.ingestion.firms_viirs import VIIRSFireLoader


def test_haversine_distance():
    loader = VIIRSFireLoader()
    # Distance between Delhi (28.61, 77.23) and Agra (27.18, 78.01) ~ 180 km
    lat1, lon1 = 28.61, 77.23
    lats = np.array([27.18])
    lons = np.array([78.01])

    dist = loader.haversine_distance_km(lat1, lon1, lats, lons)
    assert 160.0 <= dist[0] <= 210.0


def test_compute_buffers_for_point():
    loader = VIIRSFireLoader()
    fire_df = pd.DataFrame({
        "latitude": [28.65, 29.50, 35.00],
        "longitude": [77.25, 77.50, 80.00],
        "frp": [25.0, 50.0, 100.0],
        "date": ["2023-11-05", "2023-11-05", "2023-11-05"],
    })

    # Receptor point at Delhi (28.61, 77.23)
    # 28.65, 77.25 is ~5 km away (within 25km)
    # 29.50, 77.50 is ~100 km away (within 200km)
    # 35.00, 80.00 is >700 km away
    buffers = loader.compute_buffers_for_point(
        fire_df=fire_df,
        lat=28.61,
        lon=77.23,
        target_date="2023-11-05",
        radii_km=[25, 50, 100, 200],
        lags_days=[0],
    )

    assert buffers["fire_count_25km_lag0"] >= 1
    assert buffers["fire_frp_25km_lag0"] >= 25.0
    assert buffers["fire_count_200km_lag0"] >= 2
    assert buffers["fire_frp_200km_lag0"] >= 75.0
