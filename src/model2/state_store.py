"""Coupled Climate and Air Quality Digital Twin State Space Store.

Harmonizes climate reanalysis (ERA5), satellite land products (MODIS LST/NDVI),
and Model 1 atmospheric predictions (PM2.5, CPCB AQI, HCHO) into a unified state space.
"""

from datetime import datetime, timedelta
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import joblib
import numpy as np
import pandas as pd

from src.common.config import ProjectConfig, load_config
from src.common.grid import CoordinateGrid
from src.common.logger import get_logger
from src.ingestion.cdse_tropomi import TROPOMILoader
from src.ingestion.cds_era5 import ERA5Loader
from src.ingestion.earthdata_modis import MODISLoader
from src.ingestion.firms_viirs import VIIRSFireLoader
from src.ingestion.merra2 import MERRA2Loader
from src.model1.aqi_calculator import CPCBAQICalculator

logger = get_logger("state_store")


class DigitalTwinStateStore:
    """Manages the coupled geospatial state space of the climate-air digital twin."""

    def __init__(self, config: Optional[ProjectConfig] = None):
        self.config = config or load_config()
        self.grid = CoordinateGrid(
            bbox=self.config.spatial.bbox,
            resolution_deg=self.config.spatial.resolution_deg,
        )
        self.era5_loader = ERA5Loader(self.config.paths.raw / "era5")
        self.modis_loader = MODISLoader(self.config.paths.raw / "modis")
        self.merra2_loader = MERRA2Loader(self.config.paths.raw / "merra2")
        self.tropomi_loader = TROPOMILoader(self.config.paths.raw / "tropomi")
        self.viirs_loader = VIIRSFireLoader(self.config.paths.raw / "viirs")
        self.aqi_calc = CPCBAQICalculator()

        # Load trained Model 1 champion model
        model_path = self.config.paths.processed / "models" / "best_model1.joblib"
        if model_path.exists():
            self.model1 = joblib.load(model_path)
            logger.info(f"Loaded Model 1 champion estimator from: {model_path}")
        else:
            self.model1 = None
            logger.warning(f"No Model 1 champion found at: {model_path}")

        # Cache of fire data
        self.fire_df = self.viirs_loader.load_fire_data()

    def get_gridded_state(self, date_str: str) -> Dict[str, np.ndarray]:
        """
        Produce complete multi-layer state arrays for a given date across the grid:
        - Climate: t2m, rh, wind_speed, sp, tp, blh, ventilation_index
        - Remote sensing: lst_day, lst_night, ndvi
        - Atmospheric chemistry: hcho, no2, co, so2, o3, merra2_pm25
        - Model 1 Outputs: pm25_predicted, cpcb_aqi, aqi_category
        """
        era5 = self.era5_loader.get_real_gridded_fields(date_str, self.grid)
        modis = self.modis_loader.get_real_gridded_fields(date_str, self.grid)
        merra2 = self.merra2_loader.get_real_gridded_fields(date_str, self.grid)
        tropomi = self.tropomi_loader.get_real_gridded_fields(date_str, self.grid)

        # Predict surface PM2.5 using Model 1 surrogate
        dt = pd.to_datetime(date_str)
        doy = dt.dayofyear
        doy_sin = np.sin(2 * np.pi * doy / 365.25)
        doy_cos = np.cos(2 * np.pi * doy / 365.25)
        dow = dt.dayofweek
        is_weekend = 1.0 if dow >= 5 else 0.0

        n_pts = self.grid.n_lat * self.grid.n_lon

        # Build feature DataFrame matching Model 1 columns
        feature_dict = {
            "TROPOMI_NO2": tropomi["TROPOMI_NO2"].ravel(),
            "TROPOMI_CO": tropomi["TROPOMI_CO"].ravel(),
            "TROPOMI_SO2": tropomi["TROPOMI_SO2"].ravel(),
            "TROPOMI_O3": tropomi["TROPOMI_O3"].ravel(),
            "TROPOMI_HCHO": tropomi["TROPOMI_HCHO"].ravel(),
            "MODIS_AOD_550": modis["MODIS_AOD_550"].ravel(),
            "MODIS_LST_Day": modis["MODIS_LST_Day"].ravel(),
            "MODIS_LST_Night": modis["MODIS_LST_Night"].ravel(),
            "MODIS_NDVI": modis["MODIS_NDVI"].ravel(),
            "MERRA2_PM25_RH35": merra2["MERRA2_PM25_RH35"].ravel(),
            "MERRA2_AOD_TOT": merra2["MERRA2_AOD_TOT"].ravel(),
            "MERRA2_AOD_BC": merra2["MERRA2_AOD_BC"].ravel(),
            "MERRA2_AOD_DUST": merra2["MERRA2_AOD_DUST"].ravel(),
            "ERA5_T2M": era5["ERA5_T2M"].ravel(),
            "ERA5_RH": era5["ERA5_RH"].ravel(),
            "ERA5_WIND_SPEED": era5["ERA5_WIND_SPEED"].ravel(),
            "ERA5_SP": era5["ERA5_SP"].ravel(),
            "ERA5_TP": era5["ERA5_TP"].ravel(),
            "ERA5_BLH": era5["ERA5_BLH"].ravel(),
            "ERA5_VENTILATION_INDEX": era5["ERA5_VENTILATION_INDEX"].ravel(),
            # Fire buffers
            "fire_count_25km_lag0": np.zeros(n_pts, dtype=np.float32),
            "fire_frp_25km_lag0": np.zeros(n_pts, dtype=np.float32),
            "fire_count_50km_lag0": np.zeros(n_pts, dtype=np.float32),
            "fire_frp_50km_lag0": np.zeros(n_pts, dtype=np.float32),
            "fire_count_100km_lag1": np.zeros(n_pts, dtype=np.float32),
            "fire_frp_100km_lag1": np.zeros(n_pts, dtype=np.float32),
            "fire_count_200km_lag2": np.zeros(n_pts, dtype=np.float32),
            "fire_frp_200km_lag2": np.zeros(n_pts, dtype=np.float32),
            "doy_sin": np.full(n_pts, doy_sin, dtype=np.float32),
            "doy_cos": np.full(n_pts, doy_cos, dtype=np.float32),
            "day_of_week": np.full(n_pts, dow, dtype=np.float32),
            "is_weekend": np.full(n_pts, is_weekend, dtype=np.float32),
            "latitude": self.grid.lat_grid.ravel(),
            "longitude": self.grid.lon_grid.ravel(),
        }

        X_grid = pd.DataFrame(feature_dict)

        if self.model1 is not None:
            pm25_pred = self.model1.predict(X_grid).reshape(self.grid.lat_grid.shape)
            pm25_pred = np.clip(pm25_pred, 5.0, 600.0)
        else:
            # Fallback to empirical aerosol scaled PM2.5
            pm25_pred = merra2["MERRA2_PM25_RH35"] * 1.4

        # Compute official vectorized CPCB AQI
        aqi_grid, cat_grid = self.aqi_calc.vectorize_pm25_to_aqi(pm25_pred)

        return {
            "t2m": era5["ERA5_T2M"],
            "rh": era5["ERA5_RH"],
            "wind_speed": era5["ERA5_WIND_SPEED"],
            "sp": era5["ERA5_SP"],
            "tp": era5["ERA5_TP"],
            "blh": era5["ERA5_BLH"],
            "ventilation_index": era5["ERA5_VENTILATION_INDEX"],
            "lst_day": modis["MODIS_LST_Day"],
            "lst_night": modis["MODIS_LST_Night"],
            "ndvi": modis["MODIS_NDVI"],
            "hcho": tropomi["TROPOMI_HCHO"],
            "no2": tropomi["TROPOMI_NO2"],
            "co": tropomi["TROPOMI_CO"],
            "so2": tropomi["TROPOMI_SO2"],
            "o3": tropomi["TROPOMI_O3"],
            "pm25": np.round(pm25_pred, 1),
            "cpcb_aqi": aqi_grid,
            "aqi_category": cat_grid,
        }

    def get_point_timeseries(
        self,
        lat: float,
        lon: float,
        start_date: str = "2023-10-01",
        end_date: str = "2023-11-30",
    ) -> pd.DataFrame:
        """Extract multi-variable time series for a specific geographic coordinate."""
        lat_idx, lon_idx = self.grid.nearest_cell(lat, lon)
        actual_lat, actual_lon = self.grid.get_cell_coords(lat_idx, lon_idx)

        # Check if pre-assembled parquet dataset has a nearby monitoring station
        dataset_path = self.config.paths.processed / "model1_train_dataset.parquet"
        if dataset_path.exists():
            df_all = pd.read_parquet(dataset_path)
            # Find closest station
            dists = np.sqrt((df_all["latitude"] - lat)**2 + (df_all["longitude"] - lon)**2)
            min_dist = dists.min()
            if min_dist < 0.35:
                closest_sid = df_all.loc[dists.idxmin(), "station_id"]
                sub = df_all[df_all["station_id"] == closest_sid].copy()
                sub = sub[(sub["date"] >= start_date) & (sub["date"] <= end_date)].sort_values("date")
                
                aqi_arr, cat_arr = self.aqi_calc.vectorize_pm25_to_aqi(sub["PM2.5_target"].values)
                res_df = pd.DataFrame({
                    "date": sub["date"].values,
                    "latitude": actual_lat,
                    "longitude": actual_lon,
                    "t2m": sub["ERA5_T2M"].values,
                    "rh": sub["ERA5_RH"].values,
                    "wind_speed": sub["ERA5_WIND_SPEED"].values,
                    "tp": sub["ERA5_TP"].values,
                    "lst_day": sub["MODIS_LST_Day"].values,
                    "ndvi": sub["MODIS_NDVI"].values,
                    "hcho": sub["TROPOMI_HCHO"].values,
                    "pm25": sub["PM2.5_target"].values,
                    "cpcb_aqi": aqi_arr,
                    "aqi_category": cat_arr,
                })
                return res_df

        # Fallback: single cell evaluation without full grid expansion
        dates = pd.date_range(start_date, end_date, freq="D")
        rows = []
        for d in dates:
            d_str = d.strftime("%Y-%m-%d")
            era5 = self.era5_loader.get_real_gridded_fields(d_str, self.grid)
            modis = self.modis_loader.get_real_gridded_fields(d_str, self.grid)
            tropomi = self.tropomi_loader.get_real_gridded_fields(d_str, self.grid)
            merra2 = self.merra2_loader.get_real_gridded_fields(d_str, self.grid)

            pm25_val = float(merra2["MERRA2_PM25_RH35"][lat_idx, lon_idx] * 1.5)
            aqi_val, cat_val = self.aqi_calc.get_category(pm25_val)

            rows.append({
                "date": d_str,
                "latitude": actual_lat,
                "longitude": actual_lon,
                "t2m": float(era5["ERA5_T2M"][lat_idx, lon_idx]),
                "rh": float(era5["ERA5_RH"][lat_idx, lon_idx]),
                "wind_speed": float(era5["ERA5_WIND_SPEED"][lat_idx, lon_idx]),
                "tp": float(era5["ERA5_TP"][lat_idx, lon_idx]),
                "lst_day": float(modis["MODIS_LST_Day"][lat_idx, lon_idx]),
                "ndvi": float(modis["MODIS_NDVI"][lat_idx, lon_idx]),
                "hcho": float(tropomi["TROPOMI_HCHO"][lat_idx, lon_idx]),
                "pm25": pm25_val,
                "cpcb_aqi": pm25_val,
                "aqi_category": cat_val,
            })
        return pd.DataFrame(rows)
