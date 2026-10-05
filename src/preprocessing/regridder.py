"""Spatial Regridding, Resampling and QA Masking Module."""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from scipy.interpolate import RegularGridInterpolator

from src.common.grid import CoordinateGrid
from src.common.logger import get_logger

logger = get_logger("regridder")


class SpatialRegridder:
    """Regrids arbitrary 2D spatial fields to the target CoordinateGrid."""

    def __init__(self, target_grid: CoordinateGrid):
        self.target_grid = target_grid

    def regrid_regular_2d(
        self,
        src_lons: np.ndarray,
        src_lats: np.ndarray,
        src_values: np.ndarray,
        method: str = "linear",
        fill_value: Optional[float] = np.nan,
    ) -> np.ndarray:
        """
        Regrid a 2D regular grid to target_grid using RegularGridInterpolator.
        
        Args:
            src_lons: 1D strictly ascending array of longitudes
            src_lats: 1D strictly ascending array of latitudes
            src_values: 2D array of shape (len(src_lats), len(src_lons))
        """
        # Ensure lat order is ascending
        if src_lats[0] > src_lats[-1]:
            src_lats = src_lats[::-1]
            src_values = src_values[::-1, :]

        if src_lons[0] > src_lons[-1]:
            src_lons = src_lons[::-1]
            src_values = src_values[:, ::-1]

        interpolator = RegularGridInterpolator(
            (src_lats, src_lons),
            src_values,
            method=method,
            bounds_error=False,
            fill_value=fill_value,
        )

        # Target points: (N, 2) array of (lat, lon)
        pts = np.column_stack([self.target_grid.lat_grid.ravel(), self.target_grid.lon_grid.ravel()])
        regridded_flat = interpolator(pts)
        return regridded_flat.reshape(self.target_grid.lat_grid.shape)

    @staticmethod
    def apply_qa_mask(
        values: np.ndarray,
        qa_array: np.ndarray,
        qa_min_threshold: float = 0.5,
        cloud_fraction: Optional[np.ndarray] = None,
        max_cloud_fraction: float = 0.3,
    ) -> np.ndarray:
        """
        Mask invalid pixels where qa_array < qa_min_threshold or cloud_fraction > max_cloud_fraction.
        """
        masked = np.copy(values).astype(np.float32)
        invalid = qa_array < qa_min_threshold
        if cloud_fraction is not None:
            invalid = invalid | (cloud_fraction > max_cloud_fraction)
        masked[invalid] = np.nan
        return masked
