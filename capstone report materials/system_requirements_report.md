# Technical Report: System Requirements & Infrastructure Specifications
**Project:** India Air Quality & Climate Digital Twin  
**Document Series:** Capstone Report Materials — Part 3  
**Author:** Geospatial AI & Full-Stack Engineering Team  
**Date:** October 2026  

---

## 1. Hardware Requirements

The system has been engineered to run efficiently on standard developer workstations as well as enterprise cloud virtual machines:

| Parameter | Minimum (Inference & Dashboard) | Recommended (Training & Ingestion) | High-Resolution Enterprise Scaling (0.05°) |
| :--- | :--- | :--- | :--- |
| **CPU Architecture** | x86_64 or ARM64 (Apple Silicon / Graviton) | x86_64 (Intel Core i7/i9 or AMD Ryzen 7/9) | 16+ Core Intel Xeon / AMD EPYC |
| **CPU Cores** | 4 Physical Cores | 8 Physical Cores | 16 to 32 Cores |
| **System Memory (RAM)** | 8 GB RAM | 16 GB to 32 GB RAM | 64 GB to 128 GB RAM |
| **Storage Capacity** | 10 GB Available SSD Space | 50 GB to 100 GB NVMe SSD | 500 GB+ High IOPS NVMe SSD |
| **GPU Acceleration** | Not required (CPU Fallback implemented) | NVIDIA GPU (RTX 3060/4060, 8 GB VRAM) | NVIDIA A100 / H100 (40/80 GB VRAM) |
| **Network Bandwidth** | 10 Mbps (for interactive tiles) | 50+ Mbps (satellite bulk downloads) | 1 Gbps Dedicated Cloud Pipe |

---

## 2. Software & Operating System Specifications

### 2.1 Supported Operating Systems
- **Microsoft Windows:** Windows 10 / Windows 11 (64-bit), PowerShell 7+ or Windows Terminal.
- **Linux:** Ubuntu 20.04 / 22.04 LTS, Debian 11+, RHEL / Rocky Linux 9.
- **macOS:** macOS Monterey (12.0) or higher (Native Apple Silicon & Intel support).

### 2.2 Python Runtime Environment
- **Python Version:** **Python 3.10 to 3.13** (Tested and verified on Python 3.13.0 64-bit).
- **Virtual Environment Tool:** `venv` or `conda` / `mamba`.

### 2.3 Core Library Stack & Versions
- **Numerical & Tabular:**
  - `numpy >= 1.26.0`
  - `pandas >= 2.2.0`
  - `scipy >= 1.12.0`
  - `pyarrow >= 14.0.0`
- **Machine Learning & Deep Learning:**
  - `scikit-learn >= 1.4.0`
  - `xgboost >= 2.0.0`
  - `lightgbm >= 4.3.0`
  - `torch >= 2.1.0` (PyTorch CPU / CUDA)
  - `joblib >= 1.3.0`
- **Geospatial & Remote Sensing:**
  - `shapely >= 2.0.0`
  - `scipy.spatial` / `scipy.interpolate`
- **Web & API Framework:**
  - `fastapi >= 0.110.0`
  - `uvicorn >= 0.28.0`
  - `pydantic >= 2.6.0`
  - `requests >= 2.31.0`
  - `python-dotenv >= 1.0.0`
- **Interactive Visualization:**
  - `streamlit >= 1.32.0`
  - `pydeck >= 0.8.0`
  - `plotly >= 5.19.0`
- **Testing & Quality Assurance:**
  - `pytest >= 8.0.0`

---

## 3. External API Credentials & Accounts (Optional / Live Mode)

The digital twin includes complete offline and simulated operational fallbacks. To run live data synchronization from orbital satellites, the following free research accounts are supported:

1. **Copernicus Data Space Ecosystem (CDSE):**
   - Access to Sentinel-5P TROPOMI Level 2 & Level 3 products.
   - Credentials configured in `.env`: `CDSE_USERNAME`, `CDSE_PASSWORD`.
2. **ECMWF Climate Data Store (CDS):**
   - Access to ERA5 hourly and daily reanalysis products.
   - Credentials configured in `.env`: `CDSAPI_URL`, `CDSAPI_KEY`.
3. **NASA Earthdata Login:**
   - Access to MODIS MAIAC AOD (MCD19A2), LST (MOD11A1), and MERRA-2.
   - Credentials configured in `.env`: `EARTHDATA_USERNAME`, `EARTHDATA_PASSWORD`.
4. **NASA FIRMS (Fire Information for Resource Management System):**
   - Access to near-real-time VIIRS active fire detections.
   - Credentials configured in `.env`: `FIRMS_MAP_KEY`.
