"""CPCB Station-to-Grid Matcher and Multi-Sensor Feature Assembler.

Collocates ground-truth monitoring stations with gridded satellite,
reanalysis, and active fire proximity buffers to construct the training dataset.
"""

from datetime import datetime, timedelta
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

from src.common.config import ProjectConfig, load_config
from src.common.grid import CoordinateGrid
from src.common.logger import get_logger
from src.ingestion.cdse_tropomi import TROPOMILoader
from src.ingestion.cds_era5 import ERA5Loader
from src.ingestion.cpcb_loader import CPCBStationLoader, fetch_real_cpcb_reference_data
from src.ingestion.earthdata_modis import MODISLoader
from src.ingestion.firms_viirs import VIIRSFireLoader, fetch_real_viirs_active_fires
from src.ingestion.merra2 import MERRA2Loader

logger = get_logger("station_matching")


class StationGridMatcher:
    """Collocates ground station coordinates onto gridded observation fields."""

    def __init__(self, config: ProjectConfig):
        self.config = config
        self.grid = CoordinateGrid(
            bbox=config.spatial.bbox,
            resolution_deg=config.spatial.resolution_deg,
        )
        self.cpcb_loader = CPCBStationLoader(config.paths.raw / "cpcb")
        self.viirs_loader = VIIRSFireLoader(config.paths.raw / "viirs")
        self.tropomi_loader = TROPOMILoader(config.paths.raw / "tropomi")
        self.modis_loader = MODISLoader(config.paths.raw / "modis")
        self.merra2_loader = MERRA2Loader(config.paths.raw / "merra2")
        self.era5_loader = ERA5Loader(config.paths.raw / "era5")

    def assemble_matched_dataset(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        save_path: Optional[Path] = None,
    ) -> pd.DataFrame:
        """
        Assemble the complete daily collocated dataset for all CPCB stations.
        """
        if start_date is None:
            start_date = self.config.temporal.start_date
        if end_date is None:
            end_date = self.config.temporal.end_date

        logger.info(f"Assembling collocated dataset from {start_date} to {end_date}...")

        # 1. Ensure real raw CPCB and VIIRS data are present
        fetch_real_cpcb_reference_data(self.config.paths.raw / "cpcb", start_date, end_date)
        fetch_real_viirs_active_fires(self.config.paths.raw / "viirs", start_date, end_date)

        # 2. Load CPCB ground truth
        cpcb_df = self.cpcb_loader.load_all_local_files()
        if cpcb_df.empty:
            raise RuntimeError("No CPCB station data available.")

        # Filter date range
        cpcb_df = cpcb_df[(cpcb_df["date"] >= start_date) & (cpcb_df["date"] <= end_date)]

        # 3. Load VIIRS fires
        fire_df = self.viirs_loader.load_fire_data()

        # Cache unique station locations and find grid cells
        unique_stations = cpcb_df[["station_id", "latitude", "longitude"]].drop_duplicates()
        station_grid_map: Dict[str, Tuple[int, int]] = {}
        for _, row in unique_stations.iterrows():
            sid = str(row["station_id"])
            lat = float(row["latitude"])
            lon = float(row["longitude"])
            lat_idx, lon_idx = self.grid.nearest_cell(lat, lon)
            station_grid_map[sid] = (lat_idx, lon_idx)

        # 4. Group by date and collocate with daily satellite/reanalysis fields
        all_dates = sorted(cpcb_df["date"].unique())
        matched_rows: List[Dict] = []

        logger.info(f"Processing {len(all_dates)} dates across {len(unique_stations)} stations...")

        for dt_idx, d_str in enumerate(all_dates):
            day_stations = cpcb_df[cpcb_df["date"] == d_str]
            if day_stations.empty:
                continue

            # Ingest/generate gridded fields for this date
            tropomi_fields = self.tropomi_loader.get_real_gridded_fields(d_str, self.grid)
            modis_fields = self.modis_loader.get_real_gridded_fields(d_str, self.grid)
            merra2_fields = self.merra2_loader.get_real_gridded_fields(d_str, self.grid)
            era5_fields = self.era5_loader.get_real_gridded_fields(d_str, self.grid)

            dt = pd.to_datetime(d_str)
            doy = dt.dayofyear
            doy_sin = np.sin(2 * np.pi * doy / 365.25)
            doy_cos = np.cos(2 * np.pi * doy / 365.25)
            dow = dt.dayofweek
            is_weekend = 1 if dow >= 5 else 0

            # Season assignment
            # 0: Winter (Dec-Feb), 1: Pre-monsoon (Mar-May), 2: Monsoon (Jun-Sep), 3: Post-monsoon (Oct-Nov)
            month = dt.month
            if month in [12, 1, 2]:
                season_id = 0
                season_name = "Winter"
            elif month in [3, 4, 5]:
                season_id = 1
                season_name = "Pre-monsoon"
            elif month in [6, 7, 8, 9]:
                season_id = 2
                season_name = "Monsoon"
            else:
                season_id = 3
                season_name = "Post-monsoon"

            for _, st_row in day_stations.iterrows():
                sid = st_row["station_id"]
                lat = float(st_row["latitude"])
                lon = float(st_row["longitude"])
                lat_idx, lon_idx = station_grid_map[sid]

                # Compute active fire proximity buffers
                fire_features = self.viirs_loader.compute_buffers_for_point(
                    fire_df=fire_df,
                    lat=lat,
                    lon=lon,
                    target_date=d_str,
                    radii_km=[25, 50, 100, 200],
                    lags_days=[0, 1, 2],
                )

                row_data = {
                    "date": d_str,
                    "station_id": sid,
                    "station_name": st_row["station_name"],
                    "city": st_row["city"],
                    "state": st_row["state"],
                    "latitude": lat,
                    "longitude": lon,
                    "grid_lat": self.grid.lats[lat_idx],
                    "grid_lon": self.grid.lons[lon_idx],
                    "day_of_year": doy,
                    "doy_sin": doy_sin,
                    "doy_cos": doy_cos,
                    "day_of_week": dow,
                    "is_weekend": is_weekend,
                    "season_id": season_id,
                    "season_name": season_name,
                    # Ground Truth
                    "PM2.5_target": float(st_row["PM2.5"]),
                    "PM10_observed": float(st_row.get("PM10", np.nan)),
                    "NO2_observed": float(st_row.get("NO2", np.nan)),
                    "SO2_observed": float(st_row.get("SO2", np.nan)),
                    "CO_observed": float(st_row.get("CO", np.nan)),
                    "O3_observed": float(st_row.get("O3", np.nan)),
                }

                # Extract collocated satellite values from grid cells
                for group in [tropomi_fields, modis_fields, merra2_fields, era5_fields]:
                    for k, v in group.items():
                        if hasattr(v, "shape") and len(v.shape) == 2:
                            row_data[k] = float(v[lat_idx, lon_idx])
                        else:
                            row_data[k] = float(v)

                # Attach fire buffers
                row_data.update(fire_features)
                matched_rows.append(row_data)

            if (dt_idx + 1) % 100 == 0 or (dt_idx + 1) == len(all_dates):
                logger.info(f"Collocated {dt_idx + 1}/{len(all_dates)} days ({len(matched_rows)} matched records)")

        dataset = pd.DataFrame(matched_rows)

        if save_path is None:
            save_path = self.config.paths.processed / "model1_train_dataset.parquet"
        save_path.parent.mkdir(parents=True, exist_ok=True)
        dataset.to_parquet(save_path, index=False)
        logger.info(f"Saved analysis-ready matched dataset with {len(dataset):,} records to: {save_path}")
        return dataset
