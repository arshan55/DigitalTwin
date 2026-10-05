"""Unit tests for spatial regridder and QA filters."""

import numpy as np
import pytest

from src.common.grid import CoordinateGrid
from src.preprocessing.regridder import SpatialRegridder


def test_regrid_regular_2d():
    target_grid = CoordinateGrid(bbox=[70.0, 20.0, 75.0, 25.0], resolution_deg=0.5)
    regridder = SpatialRegridder(target_grid)

    src_lons = np.linspace(69.0, 76.0, 8)
    src_lats = np.linspace(19.0, 26.0, 8)
    src_vals = np.ones((8, 8), dtype=np.float32) * 42.0

    res = regridder.regrid_regular_2d(src_lons, src_lats, src_vals, method="linear")

    assert res.shape == target_grid.lat_grid.shape
    assert np.allclose(res, 42.0)


def test_qa_mask():
    vals = np.array([10.0, 20.0, 30.0, 40.0], dtype=np.float32)
    qa = np.array([0.7, 0.4, 0.8, 0.9])  # Index 1 fails QA (<0.5)
    cloud = np.array([0.1, 0.1, 0.5, 0.2])  # Index 2 fails cloud (>0.3)

    masked = SpatialRegridder.apply_qa_mask(
        values=vals,
        qa_array=qa,
        qa_min_threshold=0.5,
        cloud_fraction=cloud,
        max_cloud_fraction=0.3,
    )

    assert not np.isnan(masked[0])
    assert np.isnan(masked[1])  # Failed QA
    assert np.isnan(masked[2])  # Failed Cloud
    assert not np.isnan(masked[3])
