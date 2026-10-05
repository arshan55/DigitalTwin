"""Configuration management for India Air Quality & Climate Digital Twin.

Loads YAML configuration files and resolves environment variables from .env.
"""

from dataclasses import dataclass, field
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml


@dataclass
class SpatialConfig:
    domain_name: str = "all_india_coarse"
    bbox: List[float] = field(default_factory=lambda: [68.0, 6.0, 97.5, 37.5])
    resolution_deg: float = 0.25
    crs: str = "EPSG:4326"

    @property
    def min_lon(self) -> float:
        return self.bbox[0]

    @property
    def min_lat(self) -> float:
        return self.bbox[1]

    @property
    def max_lon(self) -> float:
        return self.bbox[2]

    @property
    def max_lat(self) -> float:
        return self.bbox[3]


@dataclass
class TemporalConfig:
    start_date: str = "2022-01-01"
    end_date: str = "2023-12-31"
    timestep: str = "daily"
    sample_start_date: str = "2023-10-01"
    sample_end_date: str = "2023-11-30"


@dataclass
class DataPathsConfig:
    raw: Path = Path("data/raw")
    interim: Path = Path("data/interim")
    processed: Path = Path("data/processed")
    sample: Path = Path("data/sample")
    reports: Path = Path("reports")


@dataclass
class ProjectConfig:
    project_name: str = "India Air Quality & Climate Digital Twin"
    version: str = "1.0.0"
    random_seed: int = 42
    use_sample_data: bool = False
    spatial: SpatialConfig = field(default_factory=SpatialConfig)
    temporal: TemporalConfig = field(default_factory=TemporalConfig)
    paths: DataPathsConfig = field(default_factory=DataPathsConfig)
    raw_config: Dict[str, Any] = field(default_factory=dict)

    def ensure_directories(self) -> None:
        """Create standard data and report directories if they do not exist."""
        for p in [self.paths.raw, self.paths.interim, self.paths.processed, self.paths.sample, self.paths.reports]:
            p.mkdir(parents=True, exist_ok=True)
            # Create subdirectories in raw
            for sub in ["tropomi", "modis", "merra2", "era5", "cpcb", "viirs"]:
                (self.paths.raw / sub).mkdir(parents=True, exist_ok=True)


def load_env_file(dotenv_path: Optional[Path] = None) -> None:
    """Manually parse .env if python-dotenv is not yet available or as fallback."""
    if dotenv_path is None:
        dotenv_path = Path(".env")
    if not dotenv_path.exists():
        return

    with open(dotenv_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("'\"")
            if key and key not in os.environ:
                os.environ[key] = val


def load_config(config_path: str = "config/pilot.yaml") -> ProjectConfig:
    """Load YAML config and resolve environment variables."""
    load_env_file()
    c_path = Path(config_path)
    if not c_path.exists():
        raise FileNotFoundError(f"Configuration file not found at: {config_path}")

    with open(c_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    # Check env override for use_sample_data
    env_use_sample = os.getenv("USE_SAMPLE_DATA", "").lower()
    if env_use_sample in ("false", "0", "no"):
        use_sample = False
    elif env_use_sample in ("true", "1", "yes"):
        use_sample = True
    else:
        use_sample = raw.get("ingestion", {}).get("use_sample_data", False)

    sp_dict = raw.get("spatial", {})
    tp_dict = raw.get("temporal", {})
    paths_dict = raw.get("data_paths", {})

    cfg = ProjectConfig(
        project_name=raw.get("project", {}).get("name", "India Air Quality & Climate Digital Twin"),
        version=raw.get("project", {}).get("version", "1.0.0"),
        random_seed=raw.get("project", {}).get("random_seed", 42),
        use_sample_data=use_sample,
        spatial=SpatialConfig(
            domain_name=sp_dict.get("domain_name", "all_india_coarse"),
            bbox=sp_dict.get("bbox", [68.0, 6.0, 97.5, 37.5]),
            resolution_deg=sp_dict.get("resolution_deg", 0.25),
            crs=sp_dict.get("crs", "EPSG:4326"),
        ),
        temporal=TemporalConfig(
            start_date=tp_dict.get("start_date", "2022-01-01"),
            end_date=tp_dict.get("end_date", "2023-12-31"),
            timestep=tp_dict.get("timestep", "daily"),
            sample_start_date=tp_dict.get("sample_start_date", "2023-10-01"),
            sample_end_date=tp_dict.get("sample_end_date", "2023-11-30"),
        ),
        paths=DataPathsConfig(
            raw=Path(paths_dict.get("raw", "data/raw")),
            interim=Path(paths_dict.get("interim", "data/interim")),
            processed=Path(paths_dict.get("processed", "data/processed")),
            sample=Path(paths_dict.get("sample", "data/sample")),
            reports=Path(paths_dict.get("reports", "reports")),
        ),
        raw_config=raw,
    )
    cfg.ensure_directories()
    return cfg
