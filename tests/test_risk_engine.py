"""Unit tests for Compound Multi-Hazard Risk Engine."""

import numpy as np
import pytest

from src.model2.risk_engine import CompoundRiskEngine


def test_heat_risk():
    engine = CompoundRiskEngine()
    # 25°C, 40% RH -> No heat stress (0.0)
    r_cool = engine.compute_heat_risk(t2m_c=25.0, rh_pct=40.0)
    assert r_cool == 0.0

    # 44°C, 70% RH -> High heat stress
    r_extreme = engine.compute_heat_risk(t2m_c=44.0, rh_pct=70.0)
    assert r_extreme >= 0.8


def test_composite_risk_weights():
    engine = CompoundRiskEngine(weight_heat=0.35, weight_drought=0.35, weight_aq=0.30)
    score, category = engine.compute_composite_risk(heat_risk=0.5, drought_risk=0.5, aq_risk=0.5)

    assert abs(score - 0.5) <= 0.01
    assert category == "Elevated Risk"
