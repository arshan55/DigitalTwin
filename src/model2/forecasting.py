"""Multi-Horizon Forecasting Engine for Climate and Air Quality.

Implements Sequence-to-Sequence PyTorch LSTM, Autoregressive XGBoost,
Persistence, and Climatology baselines for 7, 14, and 30-day ahead forecasts.
"""

from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
import xgboost as xgb

from src.common.logger import get_logger

logger = get_logger("forecasting")


class PyTorchLSTM(nn.Module):
    """Sequence-to-Sequence LSTM for multi-step ahead continuous forecasting."""

    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 2, output_horizon: int = 7, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, output_horizon),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch_size, seq_len, input_dim)
        out, (hn, cn) = self.lstm(x)
        # Use last hidden state: out[:, -1, :]
        last_hidden = out[:, -1, :]
        pred = self.fc(last_hidden)
        return pred


class ClimateForecastingEngine:
    """Trains and benchmarks multi-step forecasting models for T2M, TP, and PM2.5."""

    def __init__(
        self,
        lookback_days: int = 14,
        horizons_days: List[int] = [7, 14, 30],
        random_seed: int = 42,
    ):
        self.lookback = lookback_days
        self.horizons = horizons_days
        self.random_seed = random_seed
        torch.manual_seed(random_seed)
        np.random.seed(random_seed)

    def prepare_sequences(
        self,
        series: np.ndarray,
        horizon: int,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Create sliding window (X: lookback, y: horizon) sequences."""
        X, y = [], []
        n = len(series)
        for i in range(n - self.lookback - horizon + 1):
            X.append(series[i : i + self.lookback])
            y.append(series[i + self.lookback : i + self.lookback + horizon])
        return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)

    def train_lstm(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        horizon: int,
        epochs: int = 25,
        batch_size: int = 32,
        lr: float = 0.005,
    ) -> PyTorchLSTM:
        """Train sequence-to-sequence LSTM on historical series."""
        # Ensure 3D input: (N, seq_len, 1)
        if len(X_train.shape) == 2:
            X_train = np.expand_dims(X_train, axis=-1)

        dataset = TensorDataset(torch.from_numpy(X_train), torch.from_numpy(y_train))
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

        model = PyTorchLSTM(input_dim=1, hidden_dim=48, num_layers=2, output_horizon=horizon)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=lr)

        model.train()
        for epoch in range(epochs):
            for bx, by in loader:
                optimizer.zero_grad()
                pred = model(bx)
                loss = criterion(pred, by)
                loss.backward()
                optimizer.step()

        return model

    def evaluate_forecast(
        self,
        series: np.ndarray,
        target_name: str = "PM2.5",
        horizon: int = 7,
    ) -> Dict[str, Any]:
        """
        Evaluate LSTM, XGBoost, Persistence, and Climatology for a specific horizon.
        """
        X, y = self.prepare_sequences(series, horizon)
        if len(X) < 30:
            raise ValueError(f"Time series too short ({len(series)} points) for lookback={self.lookback} + horizon={horizon}")

        # Time-aware split: 80% train, 20% test
        split_idx = int(len(X) * 0.8)
        X_train, y_train = X[:split_idx], y[:split_idx]
        X_test, y_test = X[split_idx:], y[split_idx:]

        # 1. Baseline: Persistence (forecast equals the last observed value)
        # Persistence prediction across horizon: repeat the last lookback point
        y_pred_persist = np.repeat(X_test[:, -1:], horizon, axis=1)

        # 2. Baseline: Climatology (historical train mean)
        train_mean = float(np.mean(y_train))
        y_pred_clim = np.full_like(y_test, train_mean)

        # 3. Model: XGBoost Regressor (multi-output)
        xgb_model = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=5,
            random_state=self.random_seed,
            n_jobs=-1,
        )
        xgb_model.fit(X_train, y_train)
        y_pred_xgb = xgb_model.predict(X_test)

        # 4. Model: PyTorch LSTM
        lstm_model = self.train_lstm(X_train, y_train, horizon=horizon, epochs=25)
        lstm_model.eval()
        with torch.no_grad():
            X_test_tensor = torch.from_numpy(np.expand_dims(X_test, axis=-1))
            y_pred_lstm = lstm_model(X_test_tensor).numpy()

        # Compute Metrics
        def get_m(y_true, y_pred):
            rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
            mae = float(mean_absolute_error(y_true, y_pred))
            r2 = float(r2_score(y_true.ravel(), y_pred.ravel()))
            return {"rmse": round(rmse, 2), "mae": round(mae, 2), "r2": round(r2, 4)}

        m_persist = get_m(y_test, y_pred_persist)
        m_clim = get_m(y_test, y_pred_clim)
        m_xgb = get_m(y_test, y_pred_xgb)
        m_lstm = get_m(y_test, y_pred_lstm)

        # Skill score over persistence: SS = 1 - (RMSE_model / RMSE_persistence)
        ss_xgb = round(1.0 - (m_xgb["rmse"] / max(1e-3, m_persist["rmse"])), 3)
        ss_lstm = round(1.0 - (m_lstm["rmse"] / max(1e-3, m_persist["rmse"])), 3)

        return {
            "target": target_name,
            "horizon_days": horizon,
            "test_samples": len(y_test),
            "persistence": m_persist,
            "climatology": m_clim,
            "xgboost": {**m_xgb, "skill_score_vs_persistence": ss_xgb},
            "lstm": {**m_lstm, "skill_score_vs_persistence": ss_lstm},
        }

    def run_multi_horizon_benchmarks(
        self,
        df_timeseries: pd.DataFrame,
        targets: List[str] = ["pm25", "t2m", "tp"],
    ) -> Dict[str, Any]:
        """Run complete benchmark suite across multiple variables and forecast horizons."""
        results = {}
        for target in targets:
            if target not in df_timeseries.columns:
                continue
            series = df_timeseries[target].values
            results[target] = {}
            for h in self.horizons:
                logger.info(f"Evaluating {target} forecasting for {h}-day lead time...")
                res = self.evaluate_forecast(series, target_name=target, horizon=h)
                results[target][f"{h}_day"] = res
        return results
