"""Sentinel-5P TROPOMI HCHO Hotspot Detection and Spatial Clustering Module.

Detects formaldehyde anomalies using seasonal Z-scores and DBSCAN / spatial clustering
to delineate industrial and biogenic volatile organic compound (VOC) emission hotspots.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN

from src.common.grid import CoordinateGrid
from src.common.logger import get_logger

logger = get_logger("hcho_hotspots")


class HCHOHotspotDetector:
    """Detects and clusters spatial HCHO hotspots from TROPOMI observations."""

    def __init__(
        self,
        grid: CoordinateGrid,
        z_threshold: float = 2.0,
        eps_degrees: float = 0.6,
        min_samples: int = 3,
    ):
        self.grid = grid
        self.z_threshold = z_threshold
        self.eps = eps_degrees
        self.min_samples = min_samples

    def compute_anomaly_zscore(
        self,
        hcho_grid: np.ndarray,
        baseline_mean: Optional[np.ndarray] = None,
        baseline_std: Optional[np.ndarray] = None,
    ) -> np.ndarray:
        """
        Compute spatial z-score anomaly: Z = (X - mu) / sigma
        """
        if baseline_mean is None:
            baseline_mean = np.nanmean(hcho_grid)
        if baseline_std is None or np.all(baseline_std == 0):
            baseline_std = np.nanstd(hcho_grid)
            if baseline_std < 1e-4:
                baseline_std = 1.0

        z_scores = (hcho_grid - baseline_mean) / baseline_std
        return np.round(z_scores, 2)

    def detect_hotspots(
        self,
        hcho_grid: np.ndarray,
        date_str: str,
        baseline_mean: Optional[np.ndarray] = None,
        baseline_std: Optional[np.ndarray] = None,
    ) -> Dict[str, Any]:
        """
        Detect and cluster discrete HCHO hotspots for a target date.
        
        Returns:
            Dictionary containing detected hotspot points, clusters, and summary metrics.
        """
        z_grid = self.compute_anomaly_zscore(hcho_grid, baseline_mean, baseline_std)
        hotspot_mask = z_grid >= self.z_threshold

        hotspot_lats = self.grid.lat_grid[hotspot_mask]
        hotspot_lons = self.grid.lon_grid[hotspot_mask]
        hotspot_z = z_grid[hotspot_mask]
        hotspot_hcho = hcho_grid[hotspot_mask]

        n_hotspots = len(hotspot_lats)
        logger.info(f"Date {date_str}: detected {n_hotspots} grid cells exceeding Z-score >= {self.z_threshold}")

        if n_hotspots == 0:
            return {
                "date": date_str,
                "n_hotspots": 0,
                "n_clusters": 0,
                "clusters": [],
                "points": [],
            }

        # Cluster points using DBSCAN on coordinates (degrees)
        coords = np.column_stack([hotspot_lats, hotspot_lons])
        db = DBSCAN(eps=self.eps, min_samples=self.min_samples).fit(coords)
        labels = db.labels_

        unique_labels = set(labels) - {-1}
        clusters = []

        for cid in sorted(unique_labels):
            c_mask = labels == cid
            c_lats = hotspot_lats[c_mask]
            c_lons = hotspot_lons[c_mask]
            c_z = hotspot_z[c_mask]
            c_hcho = hotspot_hcho[c_mask]

            centroid_lat = float(np.mean(c_lats))
            centroid_lon = float(np.mean(c_lons))
            max_z = float(np.max(c_z))
            mean_hcho = float(np.mean(c_hcho))

            # Classify source type based on geography
            # Western Ghats / Northeast / Central Forest: Biogenic VOC
            # Singrauli / Gujarat / Delhi-NCR / Mumbai: Industrial / Petrochemical
            # Punjab / Haryana during Oct-Nov: Biomass Combustion
            source_type = "Industrial / Urban VOC"
            month = int(date_str.split("-")[1])
            if (month in [10, 11]) and (28.5 <= centroid_lat <= 32.5) and (74.0 <= centroid_lon <= 78.0):
                source_type = "Biomass Burning / Agricultural Smoke"
            elif (10.0 <= centroid_lat <= 16.0 and 74.0 <= centroid_lon <= 77.0) or (24.0 <= centroid_lat <= 28.0 and centroid_lon >= 90.0):
                source_type = "Biogenic Forest VOC"
            elif 23.5 <= centroid_lat <= 25.0 and 81.5 <= centroid_lon <= 84.0:
                source_type = "Thermal Power / Coal Mining VOC"

            clusters.append({
                "cluster_id": int(cid),
                "centroid_lat": round(centroid_lat, 3),
                "centroid_lon": round(centroid_lon, 3),
                "n_cells": int(np.sum(c_mask)),
                "max_z_score": round(max_z, 2),
                "mean_hcho": round(mean_hcho, 2),
                "source_type": source_type,
                "bbox": [
                    float(np.min(c_lons)),
                    float(np.min(c_lats)),
                    float(np.max(c_lons)),
                    float(np.max(c_lats)),
                ],
            })

        points = [
            {
                "latitude": float(hotspot_lats[i]),
                "longitude": float(hotspot_lons[i]),
                "z_score": float(hotspot_z[i]),
                "hcho": float(hotspot_hcho[i]),
                "cluster_id": int(labels[i]),
            }
            for i in range(n_hotspots)
        ]

        return {
            "date": date_str,
            "n_hotspots": n_hotspots,
            "n_clusters": len(clusters),
            "clusters": clusters,
            "points": points,
        }
