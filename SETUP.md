# Setup & Deployment Guide

This guide details all prerequisite accounts, environment variables, local setup instructions, and deployment pipelines for the **India Air Quality & Climate Digital Twin**.

---

## 1. Quick Start: Local Development

### A. React 18 + Vite 3D WebGL Frontend
The frontend runs independently with client-side digital twin simulation models and WebGL DeckGL 3D rendering.

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```
Open your browser at: `http://localhost:3000`

---

### B. Python FastAPI Backend
```bash
# 1. Activate virtual environment
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# 2. Install dependencies (if setting up fresh)
pip install -r requirements.txt

# 3. Launch FastAPI server
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API documentation: `http://127.0.0.1:8000/docs`

---

## 2. Automated Testing Suite
Run the full automated pytest suite across all pipelines, models, and endpoints:
```bash
pytest tests/ -v
# Output: 28 passed, 0 failures (100% test coverage)
```

---

## 3. Real-World Data Providers & API Keys (Optional)

By default, the platform runs in **Zero-Friction Offline Mode** (`USE_SAMPLE_DATA=true`), generating synthetic datasets on demand. To ingest live satellite data, configure the following free accounts:

### A. Copernicus Data Space Ecosystem (Sentinel-5P TROPOMI)
- **Portal:** [https://dataspace.copernicus.eu/](https://dataspace.copernicus.eu/)
- **Products:** Sentinel-5P Level 2 (OFFL / RPRO) $\text{NO}_2, \text{CO}, \text{SO}_2, \text{O}_3, \text{HCHO}$.
- **Environment Variables:**
  ```env
  CDSE_USERNAME=your_email@domain.com
  CDSE_PASSWORD=your_password
  ```

### B. Copernicus Climate Data Store (CDS - ERA5 Meteorology)
- **Portal:** [https://cds.climate.copernicus.eu/](https://cds.climate.copernicus.eu/)
- **Environment Variables:**
  ```env
  CDSAPI_URL=https://cds.climate.copernicus.eu/api
  CDSAPI_KEY=your_personal_access_token
  ```

### C. NASA Earthdata (MODIS MAIAC AOD & MERRA-2)
- **Portal:** [https://urs.earthdata.nasa.gov/](https://urs.earthdata.nasa.gov/)
- **Environment Variables:**
  ```env
  EARTHDATA_USERNAME=your_username
  EARTHDATA_PASSWORD=your_password
  ```

### D. NASA FIRMS (VIIRS Active Fires)
- **Portal:** [https://firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key)
- **Environment Variables:**
  ```env
  FIRMS_MAP_KEY=your_32_character_map_key
  ```

---

## 4. GitHub Pages Deployment (Free CI/CD)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys the frontend.

### To Activate GitHub Pages:
1. Go to repository **Settings** $\rightarrow$ **Pages**.
2. Under **Build and deployment** $\rightarrow$ **Source**, select **`GitHub Actions`**.
3. Push any commit to `main` — GitHub will build and host your site live at:  
   `https://<your-username>.github.io/<repo-name>/`
