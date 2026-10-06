import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const checkHealth = async () => {
  try {
    const res = await client.get('/api/v1/health');
    return res.data;
  } catch (err) {
    console.warn('API Health check failed:', err);
    return { status: 'offline', model1_loaded: false };
  }
};

export const getAQI = async (lat, lon, date) => {
  try {
    const res = await client.get('/api/v1/aqi', {
      params: { lat, lon, date },
    });
    return res.data;
  } catch (err) {
    console.warn('API getAQI error:', err);
    return null;
  }
};

export const getHCHOHotspots = async (date, zThreshold = 2.0) => {
  try {
    const res = await client.get('/api/v1/hcho-hotspots', {
      params: { date, z_threshold: zThreshold },
    });
    return res.data;
  } catch (err) {
    console.warn('API getHCHOHotspots error:', err);
    return null;
  }
};

export const getForecast = async (target, horizonDays, lat, lon) => {
  try {
    const res = await client.post('/api/v1/forecast', {
      target,
      horizon_days: horizonDays,
      latitude: lat,
      longitude: lon,
    });
    return res.data;
  } catch (err) {
    console.warn('API getForecast error:', err);
    return null;
  }
};

export const getRisk = async (date) => {
  try {
    const res = await client.get('/api/v1/risk', {
      params: { date },
    });
    return res.data;
  } catch (err) {
    console.warn('API getRisk error:', err);
    return null;
  }
};

export const simulateScenario = async (payload) => {
  try {
    const res = await client.post('/api/v1/scenario/simulate', payload);
    return res.data;
  } catch (err) {
    console.warn('API simulateScenario error:', err);
    return null;
  }
};
