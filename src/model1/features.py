"""Feature Engineering and Selection Pipeline for Model 1."""

from typing import List, Tuple
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

FEATURE_COLUMNS: List[str] = [
    # Satellite Atmospheric Columns
    "TROPOMI_NO2",
    "TROPOMI_CO",
    "TROPOMI_SO2",
    "TROPOMI_O3",
    "TROPOMI_HCHO",
    # MODIS Remote Sensing
    "MODIS_AOD_550",
    "MODIS_LST_Day",
    "MODIS_LST_Night",
    "MODIS_NDVI",
    # MERRA-2 Reanalysis Aerosols
    "MERRA2_PM25_RH35",
    "MERRA2_AOD_TOT",
    "MERRA2_AOD_BC",
    "MERRA2_AOD_DUST",
    # ERA5 Meteorology & Boundary Layer
    "ERA5_T2M",
    "ERA5_RH",
    "ERA5_WIND_SPEED",
    "ERA5_SP",
    "ERA5_TP",
    "ERA5_BLH",
    "ERA5_VENTILATION_INDEX",
    # Fire Proximity Buffers & Lags
    "fire_count_25km_lag0",
    "fire_frp_25km_lag0",
    "fire_count_50km_lag0",
    "fire_frp_50km_lag0",
    "fire_count_100km_lag1",
    "fire_frp_100km_lag1",
    "fire_count_200km_lag2",
    "fire_frp_200km_lag2",
    # Spatiotemporal Embeddings
    "doy_sin",
    "doy_cos",
    "day_of_week",
    "is_weekend",
    "latitude",
    "longitude",
]

TARGET_COLUMN: str = "PM2.5_target"


class FeaturePipeline:
    """Prepares and transforms features for Model 1 estimators."""

    def __init__(self, feature_cols: List[str] = FEATURE_COLUMNS):
        self.feature_cols = feature_cols
        self.scaler = StandardScaler()
        self.is_fitted = False

    def get_features_and_target(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
        """Extract existing feature columns and target series."""
        available_cols = [c for c in self.feature_cols if c in df.columns]
        X = df[available_cols].copy()
        # Impute any missing numerical features with column medians
        X = X.fillna(X.median())
        y = df[TARGET_COLUMN].copy()
        return X, y

    def fit_transform(self, X: pd.DataFrame) -> np.ndarray:
        """Fit scaler and return normalized numpy array."""
        self.is_fitted = True
        return self.scaler.fit_transform(X)

    def transform(self, X: pd.DataFrame) -> np.ndarray:
        """Transform test array using fitted scaler."""
        if not self.is_fitted:
            raise RuntimeError("FeaturePipeline must be fitted before transforming.")
        return self.scaler.transform(X)
