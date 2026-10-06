"""FastAPI High-Performance REST API for India Air Quality & Climate Digital Twin.

Exposes endpoints for:
- Surface AQI and PM2.5 estimation (/api/v1/aqi)
- Formaldehyde Hotspot detection (/api/v1/hcho-hotspots)
- Climate and AQ Multi-Horizon Forecasting (/api/v1/forecast)
- Compound Multi-Hazard Risk mapping (/api/v1/risk)
- Real-Time "What-If" Counterfactual Scenario Simulation (/api/v1/scenario/simulate)
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
import xgboost as xgb
from pydantic import BaseModel, Field

from src.common.config import load_config
from src.common.logger import get_logger
from src.model1.aqi_calculator import CPCBAQICalculator
from src.model1.hcho_hotspots import HCHOHotspotDetector
from src.model2.forecasting import ClimateForecastingEngine
from src.model2.risk_engine import CompoundRiskEngine
from src.model2.scenario_engine import ScenarioSimulationEngine
from src.model2.state_store import DigitalTwinStateStore

logger = get_logger("api_main")
cfg = load_config()

app = FastAPI(
    title="India Air Quality & Climate Digital Twin API",
    version="1.0.0",
    description="Operational Geospatial REST API for coupled atmospheric chemistry, climate risk, and counterfactual simulation.",
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
state_store = DigitalTwinStateStore(cfg)
risk_engine = CompoundRiskEngine()
scenario_engine = ScenarioSimulationEngine(state_store=state_store, config=cfg)
aqi_calc = CPCBAQICalculator()
hcho_detector = HCHOHotspotDetector(state_store.grid, z_threshold=2.0)


# --- Request & Response Models ---
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    domain: str
    grid_resolution_deg: float
    model1_loaded: bool


class AQIResponse(BaseModel):
    date: str
    latitude: float
    longitude: float
    pm25: float
    cpcb_aqi: float
    aqi_category: str
    category_color: str
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_ms: float


class ForecastRequest(BaseModel):
    target: str = Field(default="pm25", description="Target variable: pm25, t2m, or tp")
    horizon_days: int = Field(default=7, description="Lead horizon in days: 7, 14, or 30")
    latitude: float = Field(default=28.61, description="Target location latitude")
    longitude: float = Field(default=77.23, description="Target location longitude")


class ScenarioRequest(BaseModel):
    date: str = Field(default="2023-11-05", description="Base digital twin state date (YYYY-MM-DD)")
    delta_temp_c: float = Field(default=0.0, ge=-2.0, le=5.0, description="Temperature perturbation in °C")
    delta_precip_pct: float = Field(default=0.0, ge=-50.0, le=50.0, description="Precipitation perturbation in %")
    delta_fire_pct: float = Field(default=0.0, ge=-100.0, le=50.0, description="Active fire abatement/increase in %")
    delta_emissions_pct: float = Field(default=0.0, ge=-50.0, le=50.0, description="Anthropogenic emissions variation in %")


# --- Endpoints ---
@app.get("/health", response_model=HealthResponse)
@app.get("/api/v1/health", response_model=HealthResponse)
def get_health():
    """System health check and loaded model diagnostics."""
    return {
        "status": "healthy",
        "version": cfg.version,
        "timestamp": datetime.now().isoformat(),
        "domain": cfg.spatial.domain_name,
        "grid_resolution_deg": cfg.spatial.resolution_deg,
        "model1_loaded": state_store.model1 is not None,
    }


@app.get("/api/v1/aqi", response_model=AQIResponse)
def get_surface_aqi(
    lat: float = Query(28.61, description="Latitude (EPSG:4326)"),
    lon: float = Query(77.23, description="Longitude (EPSG:4326)"),
    date: str = Query("2023-11-05", description="Date (YYYY-MM-DD)"),
):
    """Retrieve surface PM2.5 and official CPCB AQI for coordinates on a specific date."""
    lat_idx, lon_idx = state_store.grid.nearest_cell(lat, lon)
    state = state_store.get_gridded_state(date)

    pm25_val = float(state["pm25"][lat_idx, lon_idx])
    aqi_val = float(state["cpcb_aqi"][lat_idx, lon_idx])
    cat_name, cat_color = aqi_calc.get_category(aqi_val)

    return {
        "date": date,
        "latitude": round(float(state_store.grid.lats[lat_idx]), 4),
        "longitude": round(float(state_store.grid.lons[lon_idx]), 4),
        "pm25": round(pm25_val, 1),
        "cpcb_aqi": round(aqi_val, 1),
        "aqi_category": cat_name,
        "category_color": cat_color,
        "temperature_c": round(float(state["t2m"][lat_idx, lon_idx]), 1),
        "relative_humidity_pct": round(float(state["rh"][lat_idx, lon_idx]), 1),
        "wind_speed_ms": round(float(state["wind_speed"][lat_idx, lon_idx]), 2),
    }


@app.get("/api/v1/hcho-hotspots")
def get_hcho_hotspots(
    date: str = Query("2023-11-05", description="Date (YYYY-MM-DD)"),
    z_threshold: float = Query(2.0, ge=1.5, le=5.0, description="Anomaly Z-score threshold"),
):
    """Detect and cluster TROPOMI HCHO (formaldehyde) hotspots across India."""
    tropomi_fields = state_store.tropomi_loader.get_real_gridded_fields(date, state_store.grid)
    hcho_grid = tropomi_fields["TROPOMI_HCHO"]

    hcho_detector.z_threshold = z_threshold
    hotspots = hcho_detector.detect_hotspots(hcho_grid, date_str=date)
    return hotspots


@app.post("/api/v1/forecast")
def generate_forecast(req: ForecastRequest):
    """Generate multi-step forward predictions using PyTorch LSTM and XGBoost."""
    # Load historical point time series for location
    df_ts = state_store.get_point_timeseries(
        lat=req.latitude,
        lon=req.longitude,
        start_date="2022-01-01",
        end_date="2023-12-31",
    )

    if req.target not in df_ts.columns:
        raise HTTPException(status_code=400, detail=f"Target {req.target} not available in point series.")

    series = df_ts[req.target].values
    fc_engine = ClimateForecastingEngine(lookback_days=14, horizons_days=[req.horizon_days])
    fc_eval = fc_engine.evaluate_forecast(series, target_name=req.target, horizon=req.horizon_days)

    # Produce forecast trajectory from the most recent 14 days
    recent_x = series[-14:]
    # Using XGBoost model for fast inference
    xgb_m = xgb.XGBRegressor(n_estimators=100, learning_rate=0.08, max_depth=5, random_state=42)
    X_seq, y_seq = fc_engine.prepare_sequences(series, req.horizon_days)
    xgb_m.fit(X_seq, y_seq)
    pred_trajectory = xgb_m.predict(np.expand_dims(recent_x, axis=0))[0]

    last_date = pd.to_datetime(df_ts["date"].iloc[-1])
    forecast_dates = [(last_date + pd.Timedelta(days=i + 1)).strftime("%Y-%m-%d") for i in range(req.horizon_days)]

    return {
        "target": req.target,
        "horizon_days": req.horizon_days,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "historical_mean": round(float(np.mean(series)), 2),
        "forecast_trajectory": [
            {"date": forecast_dates[i], "predicted_value": round(float(pred_trajectory[i]), 2)}
            for i in range(req.horizon_days)
        ],
        "benchmark_metrics": fc_eval,
    }


@app.get("/api/v1/risk")
def get_risk_assessment(
    date: str = Query("2023-11-05", description="Date (YYYY-MM-DD)"),
):
    """Retrieve compound climate risk index summary across India."""
    state = state_store.get_gridded_state(date)
    hazards = risk_engine.assess_gridded_hazards(state)

    return {
        "date": date,
        "mean_heat_risk": round(float(np.mean(hazards["heat_risk"])), 3),
        "mean_drought_risk": round(float(np.mean(hazards["drought_risk"])), 3),
        "mean_aq_risk": round(float(np.mean(hazards["aq_risk"])), 3),
        "mean_composite_risk": round(float(np.mean(hazards["composite_risk"])), 3),
        "risk_breakdown": {
            "Low Risk (<0.20)": int(np.sum(hazards["composite_risk"] <= 0.20)),
            "Moderate Risk (0.21-0.40)": int(np.sum((hazards["composite_risk"] > 0.20) & (hazards["composite_risk"] <= 0.40))),
            "Elevated Risk (0.41-0.60)": int(np.sum((hazards["composite_risk"] > 0.40) & (hazards["composite_risk"] <= 0.60))),
            "High Risk (0.61-0.80)": int(np.sum((hazards["composite_risk"] > 0.60) & (hazards["composite_risk"] <= 0.80))),
            "Extreme Compound Risk (>0.80)": int(np.sum(hazards["composite_risk"] > 0.80)),
        },
    }


@app.post("/api/v1/scenario/simulate")
def simulate_counterfactual_scenario(req: ScenarioRequest):
    """Simulate what-if counterfactual policy scenario on the Digital Twin."""
    sim_res = scenario_engine.simulate_scenario(
        date_str=req.date,
        delta_temp_c=req.delta_temp_c,
        delta_precip_pct=req.delta_precip_pct,
        delta_fire_pct=req.delta_fire_pct,
        delta_emissions_pct=req.delta_emissions_pct,
    )

    return {
        "metadata": sim_res["scenario_metadata"],
        "summary_metrics": sim_res["summary_metrics"],
        "baseline_averages": sim_res["baseline"],
        "perturbed_averages": sim_res["perturbed"],
    }
