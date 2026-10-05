"""Unit tests for Climate and Air Quality Forecasting Engine."""

import numpy as np
import pytest

from src.model2.forecasting import ClimateForecastingEngine, PyTorchLSTM


def test_prepare_sequences():
    engine = ClimateForecastingEngine(lookback_days=5, horizons_days=[3])
    series = np.arange(20, dtype=np.float32)

    X, y = engine.prepare_sequences(series, horizon=3)

    assert len(X) == 20 - 5 - 3 + 1  # 13 sequences
    assert X.shape[1] == 5
    assert y.shape[1] == 3
    assert np.array_equal(X[0], [0, 1, 2, 3, 4])
    assert np.array_equal(y[0], [5, 6, 7])


def test_evaluate_forecast():
    engine = ClimateForecastingEngine(lookback_days=7, horizons_days=[3])
    # Generate smooth sinusoidal synthetic time series with trend
    t = np.linspace(0, 50, 120)
    series = 50.0 + 20.0 * np.sin(t) + np.random.normal(0, 1.0, len(t))

    res = engine.evaluate_forecast(series, target_name="PM2.5", horizon=3)

    assert "persistence" in res
    assert "climatology" in res
    assert "xgboost" in res
    assert "lstm" in res
    assert res["lstm"]["rmse"] >= 0.0
    assert "skill_score_vs_persistence" in res["lstm"]
