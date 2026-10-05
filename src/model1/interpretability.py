"""Model 1 Interpretability and Feature Importance Module.

Computes feature importances, permutation importance, and attribution rankings
for satellite, meteorological, and biomass-burning drivers of surface PM2.5.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance

from src.common.logger import get_logger
from src.model1.features import FeaturePipeline

logger = get_logger("interpretability")


class ModelInterpreter:
    """Extracts feature importances and interpretability rankings from trained models."""

    def __init__(self, model_path: Path):
        self.model_path = Path(model_path)
        self.model = joblib.load(self.model_path)

    def get_tree_feature_importances(self, feature_names: List[str]) -> pd.DataFrame:
        """Extract native feature importances from tree-based estimators."""
        importances = None
        if hasattr(self.model, "feature_importances_"):
            importances = self.model.feature_importances_
        elif hasattr(self.model, "coef_"):
            importances = np.abs(self.model.coef_)
        elif hasattr(self.model, "named_estimators_"):
            # Stacking ensemble: average base estimators
            sub_imps = []
            for _, est in self.model.named_estimators_.items():
                if hasattr(est, "feature_importances_"):
                    sub_imps.append(est.feature_importances_)
            if sub_imps:
                importances = np.mean(sub_imps, axis=0)

        if importances is None:
            importances = np.ones(len(feature_names)) / len(feature_names)

        df_imp = pd.DataFrame({
            "feature": feature_names,
            "importance": np.round(importances, 4),
        }).sort_values(by="importance", ascending=False).reset_index(drop=True)

        # Categorize features by type
        def get_category(f_name: str) -> str:
            if "TROPOMI" in f_name:
                return "Satellite Atmospheric Column"
            elif "MODIS" in f_name:
                return "Satellite Remote Sensing (MODIS)"
            elif "MERRA2" in f_name:
                return "Reanalysis Aerosol Diagnostic"
            elif "ERA5" in f_name:
                return "Meteorology & Boundary Layer"
            elif "fire" in f_name:
                return "Active Fire & FRP Proximity"
            else:
                return "Spatiotemporal Embedding"

        df_imp["category"] = df_imp["feature"].apply(get_category)
        return df_imp

    def compute_permutation_importance(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        n_repeats: int = 5,
        random_state: int = 42,
    ) -> pd.DataFrame:
        """Calculate permutation importance on validation samples."""
        logger.info("Computing permutation feature importance...")
        # Use a representative subset of samples for speed
        if len(X) > 2000:
            idx = np.random.RandomState(random_state).choice(len(X), size=2000, replace=False)
            X_sub = X.iloc[idx]
            y_sub = y.iloc[idx]
        else:
            X_sub = X
            y_sub = y

        perm = permutation_importance(
            self.model,
            X_sub,
            y_sub,
            n_repeats=n_repeats,
            random_state=random_state,
            n_jobs=-1,
        )

        df_perm = pd.DataFrame({
            "feature": X.columns,
            "importance_mean": np.round(perm.importances_mean, 4),
            "importance_std": np.round(perm.importances_std, 4),
        }).sort_values(by="importance_mean", ascending=False).reset_index(drop=True)

        return df_perm
