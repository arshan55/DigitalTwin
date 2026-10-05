"""Regular coordinate grid definitions and spatial transformations."""

from typing import List, Tuple
import numpy as np


class CoordinateGrid:
    """Manages the standard geographic coordinate grid for the digital twin."""

    def __init__(self, bbox: List[float], resolution_deg: float = 0.25):
        """
        Initialize regular lat/lon grid.
        
        Args:
            bbox: [lon_min, lat_min, lon_max, lat_max] in EPSG:4326
            resolution_deg: Grid spacing in degrees (e.g., 0.25 or 0.1)
        """
        self.lon_min, self.lat_min, self.lon_max, self.lat_max = bbox
        self.resolution = resolution_deg

        # Generate 1D coordinate vectors
        # Using arange with endpoint inclusion
        self.lons = np.round(np.arange(self.lon_min, self.lon_max + 1e-5, self.resolution), 4)
        self.lats = np.round(np.arange(self.lat_min, self.lat_max + 1e-5, self.resolution), 4)

        self.n_lon = len(self.lons)
        self.n_lat = len(self.lats)

        # 2D Meshgrid: (n_lat, n_lon)
        self.lon_grid, self.lat_grid = np.meshgrid(self.lons, self.lats)

    def nearest_cell(self, lat: float, lon: float) -> Tuple[int, int]:
        """Find the (lat_idx, lon_idx) of the closest grid point."""
        lat_idx = int(np.argmin(np.abs(self.lats - lat)))
        lon_idx = int(np.argmin(np.abs(self.lons - lon)))
        return lat_idx, lon_idx

    def contains(self, lat: float, lon: float) -> bool:
        """Check if coordinates fall inside the grid domain."""
        return (self.lat_min <= lat <= self.lat_max) and (self.lon_min <= lon <= self.lon_max)

    def get_cell_coords(self, lat_idx: int, lon_idx: int) -> Tuple[float, float]:
        """Return (lat, lon) for given grid indices."""
        return float(self.lats[lat_idx]), float(self.lons[lon_idx])

    def cell_areas_km2(self) -> np.ndarray:
        """
        Approximate spherical surface area for each grid cell in km^2.
        R_earth ~ 6371 km
        """
        r_earth = 6371.0
        d_lat_rad = np.radians(self.resolution)
        d_lon_rad = np.radians(self.resolution)
        # Area = R^2 * d_lon * (sin(lat2) - sin(lat1))
        lat_rad = np.radians(self.lat_grid)
        # Differential approximation
        areas = (r_earth ** 2) * d_lat_rad * d_lon_rad * np.cos(lat_rad)
        return areas
