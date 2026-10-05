# Setup & Data Providers Guide

This guide details all prerequisite accounts, API keys, and environment variables needed to operate the **India Air Quality & Climate Digital Twin**.

---

## 1. Zero-Friction Offline Mode (Default)
By default, the platform is configured with:
```bash
USE_SAMPLE_DATA=true
```
In this mode, realistic synthetic datasets are generated on demand via `src/ingestion/synthetic_generator.py`. This allows full end-to-end testing, model training, cross-validation, API serving, and dashboard exploration without requiring immediate downloads or active API credentials.

---

## 2. Real Data Accounts & Credentials

To enable real satellite, reanalysis, and fire data ingestion, create free scientific accounts on the following platforms and record credentials in your `.env` file:

### A. Copernicus Data Space Ecosystem (Sentinel-5P TROPOMI)
- **Portal:** [https://dataspace.copernicus.eu/](https://dataspace.copernicus.eu/)
- **Registration:** Click "Register" at top right.
- **Products:** Sentinel-5P Level 2 (OFFL / RPRO) NO2, CO, SO2, O3, HCHO.
- **Config:**
  ```env
  CDSE_USERNAME=your_email@domain.com
  CDSE_PASSWORD=your_password
  ```

### B. Copernicus Climate Data Store (CDS - ERA5 / ERA5-Land)
- **Portal:** [https://cds.climate.copernicus.eu/](https://cds.climate.copernicus.eu/)
- **Registration:** Create an account and accept the ECMWF License to Use Copernicus Products.
- **API Key:** Navigate to your user profile page, copy your Personal Access Token.
- **Config:**
  ```env
  CDSAPI_URL=https://cds.climate.copernicus.eu/api
  CDSAPI_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  ```

### C. NASA Earthdata Login (MODIS MAIAC AOD, LST, NDVI & MERRA-2)
- **Portal:** [https://urs.earthdata.nasa.gov/](https://urs.earthdata.nasa.gov/)
- **Registration:** Free academic/scientific account.
- **DAAC Authorizations:** In Applications -> Authorized Apps, ensure access is granted to:
  - *NASA GES DISC DATA ARCHIVE* (MERRA-2)
  - *LP DAAC* (MODIS Land)
  - *LAADS DAAC* (MODIS Atmosphere / MAIAC)
- **Config:**
  ```env
  EARTHDATA_USERNAME=your_username
  EARTHDATA_PASSWORD=your_password
  ```

### D. NASA FIRMS (VIIRS Active Fires & FRP)
- **Portal:** [https://firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key)
- **Registration:** Instant free key sent via email upon submitting email address.
- **Config:**
  ```env
  FIRMS_MAP_KEY=your_firms_32_character_map_key
  ```

### E. CPCB Ground Station Data
- **Official Portal:** [https://airquality.cpcb.gov.in/](https://airquality.cpcb.gov.in/) (Central Pollution Control Board CCR)
- **Data Ingestion:** Place exported station CSV files into `data/raw/cpcb/`. The built-in loader parses standard CPCB CCR export formats and OpenAQ format.

---

## 3. Python Environment Setup

```bash
# Activate virtual environment
.\.venv\Scripts\activate      # Windows PowerShell / CMD
# or: source .venv/bin/activate  (Linux/macOS)

# Run full pipeline with pilot configuration
python -m src.run_pipeline --config config/pilot.yaml

# Run tests
pytest tests/ -v

# Launch FastAPI backend
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload

# Launch Streamlit dashboard
streamlit run app/streamlit_app.py
```
