"""Unit tests for Digital Twin State Store."""

import numpy as np
import pytest

from src.model2.state_store import DigitalTwinStateStore


def test_state_store_gridded_state():
    store = DigitalTwinStateStore()
    state = store.get_gridded_state("2023-11-05")

    # Verify essential layers exist
    assert "t2m" in state
    assert "rh" in state
    assert "wind_speed" in state
    assert "pm25" in state
    assert "cpcb_aqi" in state
    assert "aqi_category" in state

    # Verify shapes match grid
    assert state["pm25"].shape == (store.grid.n_lat, store.grid.n_lon)
    assert np.all(state["pm25"] >= 0)
    assert np.all(state["cpcb_aqi"] >= 0)
