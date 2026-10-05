"""Unit tests for FastAPI endpoints."""

from fastapi.testclient import TestClient
import pytest

from src.api.main import app

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["model1_loaded"] is True


def test_aqi_endpoint():
    res = client.get("/api/v1/aqi?lat=28.61&lon=77.23&date=2023-11-05")
    assert res.status_code == 200
    data = res.json()
    assert "pm25" in data
    assert "cpcb_aqi" in data
    assert "aqi_category" in data
    assert data["pm25"] > 0


def test_hcho_hotspots_endpoint():
    res = client.get("/api/v1/hcho-hotspots?date=2023-11-05&z_threshold=2.0")
    assert res.status_code == 200
    data = res.json()
    assert "n_hotspots" in data
    assert "clusters" in data


def test_risk_endpoint():
    res = client.get("/api/v1/risk?date=2023-11-05")
    assert res.status_code == 200
    data = res.json()
    assert "mean_composite_risk" in data
    assert "risk_breakdown" in data


def test_scenario_simulate_endpoint():
    payload = {
        "date": "2023-11-05",
        "delta_temp_c": 1.5,
        "delta_precip_pct": -10.0,
        "delta_fire_pct": -50.0,
        "delta_emissions_pct": -20.0,
    }
    res = client.post("/api/v1/scenario/simulate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary_metrics" in data
    assert "baseline_averages" in data
    assert "perturbed_averages" in data
