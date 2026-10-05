"""Cross-Validation Framework for Model 1.

Implements Random K-Fold, Spatial (Leave-Station-Out) CV,
and Temporal (Leave-Season-Out) CV to prevent spatial and temporal data leakage.
"""

from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, LeaveOneGroupOut

from src.common.logger import get_logger

logger = get_logger("cross_validator")


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Compute R2, RMSE, MAE, and Mean Bias."""
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)

    r2 = float(r2_score(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mae = float(mean_absolute_error(y_true, y_pred))
    bias = float(np.mean(y_pred - y_true))

    return {
        "r2": round(r2, 4),
        "rmse": round(rmse, 2),
        "mae": round(mae, 2),
        "bias": round(bias, 2),
    }


class ModelEvaluator:
    """Evaluates estimators across standard, spatial, and temporal validation schemes."""

    def __init__(self, n_splits: int = 5, random_seed: int = 42):
        self.n_splits = n_splits
        self.random_seed = random_seed

    def evaluate_random_kfold(
        self,
        model_builder,
        X: pd.DataFrame,
        y: pd.Series,
    ) -> Dict[str, Any]:
        """Standard K-Fold Cross Validation."""
        kf = KFold(n_splits=self.n_splits, shuffle=True, random_state=self.random_seed)
        fold_metrics = []
        oof_preds = np.zeros(len(y))

        for fold, (train_idx, val_idx) in enumerate(kf.split(X, y)):
            X_tr, y_tr = X.iloc[train_idx], y.iloc[train_idx]
            X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

            model = model_builder()
            model.fit(X_tr, y_tr)
            preds = model.predict(X_val)
            oof_preds[val_idx] = preds

            m = compute_regression_metrics(y_val, preds)
            fold_metrics.append(m)

        overall = compute_regression_metrics(y, oof_preds)
        return {
            "strategy": "Random_KFold",
            "overall": overall,
            "folds": fold_metrics,
            "oof_preds": oof_preds,
        }

    def evaluate_spatial_lso(
        self,
        model_builder,
        X: pd.DataFrame,
        y: pd.Series,
        station_groups: pd.Series,
    ) -> Dict[str, Any]:
        """
        Spatial Cross-Validation: Groups held out by station_id.
        Evaluates true geographic generalization to unmonitored locations.
        """
        logo = LeaveOneGroupOut()
        unique_stations = station_groups.unique()
        fold_metrics = []
        oof_preds = np.zeros(len(y))

        for st_name in unique_stations:
            val_mask = station_groups == st_name
            train_mask = ~val_mask

            X_tr, y_tr = X[train_mask], y[train_mask]
            X_val, y_val = X[val_mask], y[val_mask]

            model = model_builder()
            model.fit(X_tr, y_tr)
            preds = model.predict(X_val)
            oof_preds[val_mask] = preds

            m = compute_regression_metrics(y_val, preds)
            m["station"] = str(st_name)
            fold_metrics.append(m)

        overall = compute_regression_metrics(y, oof_preds)
        return {
            "strategy": "Spatial_LSO",
            "overall": overall,
            "station_metrics": fold_metrics,
            "oof_preds": oof_preds,
        }

    def evaluate_temporal_lso(
        self,
        model_builder,
        X: pd.DataFrame,
        y: pd.Series,
        season_groups: pd.Series,
    ) -> Dict[str, Any]:
        """
        Temporal Cross-Validation: Leave-Season-Out.
        Evaluates model resilience against seasonal shifts (Winter, Monsoon, etc.).
        """
        unique_seasons = season_groups.unique()
        fold_metrics = []
        oof_preds = np.zeros(len(y))

        for season in unique_seasons:
            val_mask = season_groups == season
            train_mask = ~val_mask

            X_tr, y_tr = X[train_mask], y[train_mask]
            X_val, y_val = X[val_mask], y[val_mask]

            model = model_builder()
            model.fit(X_tr, y_tr)
            preds = model.predict(X_val)
            oof_preds[val_mask] = preds

            m = compute_regression_metrics(y_val, preds)
            m["season"] = str(season)
            fold_metrics.append(m)

        overall = compute_regression_metrics(y, oof_preds)
        return {
            "strategy": "Temporal_LSO",
            "overall": overall,
            "season_metrics": fold_metrics,
            "oof_preds": oof_preds,
        }
