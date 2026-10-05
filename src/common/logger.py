"""Centralized structured logger for the India Air Quality & Climate Digital Twin."""

import logging
import os
import sys
from typing import Optional


def get_logger(name: str = "india_climate_twin", level: Optional[str] = None) -> logging.Logger:
    """Return a configured logger with console and optional file handlers."""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO").upper()

    log_level = getattr(logging, level, logging.INFO)
    logger.setLevel(log_level)

    formatter = logging.Formatter(
        fmt="[%(asctime)s] [%(levelname)s] [%(name)s:%(funcName)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    logger.addHandler(console_handler)

    return logger
