"""Unit tests for HCHO hotspot detection and clustering."""

import numpy as np
import pytest

from src.common.grid import CoordinateGrid
from src.model1.hcho_hotspots import HCHOHotspotDetector


def test_hcho_zscore_calculation():
    grid = CoordinateGrid(bbox=[70.0, 20.0, 75.0, 25.0], resolution_deg=0.5)
    detector = HCHOHotspotDetector(grid, z_threshold=2.0)

    # Background grid ~ 5.0, with a localized plume of 20.0
    hcho_grid = np.full_like(grid.lat_grid, 5.0, dtype=np.float32)
    hcho_grid[5, 5] = 25.0

    z_scores = detector.compute_anomaly_zscore(hcho_grid, baseline_mean=5.0, baseline_std=2.0)

    assert z_scores[0, 0] == 0.0
    assert z_scores[5, 5] == 10.0


def test_hcho_hotspot_detection():
    grid = CoordinateGrid(bbox=[70.0, 20.0, 75.0, 25.0], resolution_deg=0.5)
    detector = HCHOHotspotDetector(grid, z_threshold=2.0, min_samples=2)

    # Inject cluster of 3 adjacent high-HCHO points
    hcho_grid = np.full_like(grid.lat_grid, 4.0, dtype=np.float32)
    hcho_grid[4, 4] = 18.0
    hcho_grid[4, 5] = 19.0
    hcho_grid[5, 4] = 20.0

    results = detector.detect_hotspots(hcho_grid, date_str="2023-11-05", baseline_mean=4.0, baseline_std=2.0)

    assert results["n_hotspots"] >= 3
    assert results["n_clusters"] >= 1
    assert "source_type" in results["clusters"][0]
