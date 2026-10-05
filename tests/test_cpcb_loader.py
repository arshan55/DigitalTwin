"""Unit tests for CPCB station data loader and quality filters."""

import pandas as pd
import numpy as np
import pytest

from src.ingestion.cpcb_loader import CPCBStationLoader


def test_standardize_dataframe():
    loader = CPCBStationLoader()
    raw_df = pd.DataFrame({
        "From Date": ["2023-01-01 00:00:00", "2023-01-01 01:00:00"],
        "PM2.5 (ug/m3)": ["45.2", "48.1"],
        "NO2 (ug/m3)": ["25.0", "30.0"],
        "Station": ["Anand Vihar, Delhi", "Anand Vihar, Delhi"],
    })

    std_df = loader.standardize_dataframe(raw_df)

    assert "PM2.5" in std_df.columns
    assert "NO2" in std_df.columns
    assert "station_name" in std_df.columns
    assert "date" in std_df.columns
    assert std_df["PM2.5"].dtype == np.float64


def test_apply_qa_filters():
    loader = CPCBStationLoader()
    df = pd.DataFrame({
        "station_id": ["DEL_ITO", "DEL_ITO", "DEL_ITO"],
        "date": ["2023-01-01", "2023-01-01", "2023-01-01"],
        "PM2.5": [120.0, -10.0, 1500.0],  # -10 and 1500 should be masked out
    })

    filtered = loader.apply_qa_filters(df, min_pm25=0.0, max_pm25=999.0)

    assert filtered.loc[0, "PM2.5"] == 120.0
    assert np.isnan(filtered.loc[1, "PM2.5"])
    assert np.isnan(filtered.loc[2, "PM2.5"])
