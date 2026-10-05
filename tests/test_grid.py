"""Unit tests for spatial coordinate grid and transformations."""

import numpy as np
import pytest

from src.common.grid import CoordinateGrid


def test_grid_initialization():
    bbox = [68.0, 6.0, 97.5, 37.5]
    grid = CoordinateGrid(bbox=bbox, resolution_deg=0.25)

    assert grid.lon_min == 68.0
    assert grid.lat_min == 6.0
    assert grid.lon_max == 97.5
    assert grid.lat_max == 37.5

    assert len(grid.lons) > 100
    assert len(grid.lats) > 100
    assert grid.lon_grid.shape == (grid.n_lat, grid.n_lon)
    assert grid.lat_grid.shape == (grid.n_lat, grid.n_lon)


def test_nearest_cell():
    bbox = [68.0, 6.0, 97.5, 37.5]
    grid = CoordinateGrid(bbox=bbox, resolution_deg=0.25)

    # Delhi coordinates: ~28.61, 77.23
    lat_idx, lon_idx = grid.nearest_cell(28.61, 77.23)
    c_lat, c_lon = grid.get_cell_coords(lat_idx, lon_idx)

    assert abs(c_lat - 28.61) <= 0.25
    assert abs(c_lon - 77.23) <= 0.25


def test_contains():
    grid = CoordinateGrid(bbox=[68.0, 6.0, 97.5, 37.5], resolution_deg=0.25)
    assert grid.contains(28.61, 77.23) is True    # Delhi
    assert grid.contains(19.07, 72.87) is True    # Mumbai
    assert grid.contains(51.50, 0.12) is False    # London (outside)


def test_cell_areas():
    grid = CoordinateGrid(bbox=[70.0, 10.0, 80.0, 30.0], resolution_deg=0.25)
    areas = grid.cell_areas_km2()

    assert areas.shape == grid.lat_grid.shape
    assert np.all(areas > 0)
    # Area near 10°N should be larger than area near 30°N due to cos(lat)
    assert np.mean(areas[0, :]) > np.mean(areas[-1, :])
