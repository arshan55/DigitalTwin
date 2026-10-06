import React from 'react';
import { Wind, Thermometer, ShieldAlert, Activity, Sparkles } from 'lucide-react';
import { pm25ToAQI } from '../utils/aqi';

export default function MetricCards({ aqiData, selectedCity, selectedDate }) {
  const pm25 = aqiData?.pm25 ?? 184.5;
  const aqiInfo = pm25ToAQI(pm25);
  const aqi = aqiData?.cpcb_aqi ?? aqiInfo.aqi;
  const category = aqiData?.aqi_category ?? aqiInfo.category;
  
  const getAqiColor = (aqiVal) => {
    if (aqiVal <= 50) return '#16A34A';
    if (aqiVal <= 100) return '#65A30D';
    if (aqiVal <= 200) return '#D97706';
    if (aqiVal <= 300) return '#EA580C';
    if (aqiVal <= 400) return '#DC2626';
    return '#991B1B';
  };
  const color = getAqiColor(aqi);

  const temp = aqiData?.temperature_c ?? 22.4;
  const rh = aqiData?.relative_humidity_pct ?? 62.5;
  const dew = (temp - ((100 - rh) / 5)).toFixed(1);
  const wind = aqiData?.wind_speed_ms ?? 1.85;

  const tempColor = temp >= 36 ? '#DC2626' : (temp >= 28 ? '#EA580C' : (temp >= 20 ? '#D97706' : (temp >= 14 ? '#278E7B' : '#2563EB')));
  const ventilation = Math.round(wind * 680.0) || 1061;
  const isStagnant = ventilation < 2000;
  const ventColor = isStagnant ? '#DC2626' : '#16A34A';

  const whoRatio = (pm25 / 15.0).toFixed(1);
  const hazardScore = Math.min(0.98, Math.max(0.08, (aqi / 500.0) * 0.58 + (temp / 45.0) * 0.22 + (isStagnant ? 0.14 : 0.02))).toFixed(3);
  const hazardColor = hazardScore > 0.6 ? '#DC2626' : (hazardScore > 0.35 ? '#D97706' : '#16A34A');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {/* 1. Surface AQI Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 bg-white border border-[#DDE7E4]">
        <div className="flex items-center justify-between text-xs font-mono text-[#527E75] mb-1 font-bold">
          <span>SURFACE AQI</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></span>
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 transition-colors duration-300" style={{ color: color }}>
          {Math.round(aqi)}
        </div>
        <div className="text-xs font-rajdhani font-semibold text-[#2C5E55]">
          <span className="font-bold" style={{ color: color }}>{category}</span> (CPCB Standard)
        </div>
      </div>

      {/* 2. PM2.5 Concentration Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 bg-white border border-[#DDE7E4]">
        <div className="flex items-center justify-between text-xs font-mono text-[#527E75] mb-1 font-bold">
          <span>PM2.5 DENSITY</span>
          <Activity className="w-4 h-4" style={{ color }} />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 transition-colors duration-300" style={{ color }}>
          {pm25.toFixed(1)} <span className="text-sm font-rajdhani text-[#527E75] font-normal">µg/m³</span>
        </div>
        <div className="text-xs font-mono text-[#527E75]">
          <b className="font-bold" style={{ color }}>{whoRatio}x</b> WHO Annual Limit
        </div>
      </div>

      {/* 3. Meteorology & Ambient Temp Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 bg-white border border-[#DDE7E4]">
        <div className="flex items-center justify-between text-xs font-mono text-[#527E75] mb-1 font-bold">
          <span>ERA5 2M TEMPERATURE</span>
          <Thermometer className="w-4 h-4" style={{ color: tempColor }} />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 transition-colors duration-300" style={{ color: tempColor }}>
          {temp.toFixed(1)}°C
        </div>
        <div className="text-xs font-mono text-[#527E75]">
          RH: <span className="text-[#278E7B] font-bold">{rh.toFixed(0)}%</span> | Dew: {dew}°C
        </div>
      </div>

      {/* 4. Ventilation Index Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 bg-white border border-[#DDE7E4]">
        <div className="flex items-center justify-between text-xs font-mono text-[#527E75] mb-1 font-bold">
          <span>VENTILATION INDEX</span>
          <Wind className="w-4 h-4" style={{ color: ventColor }} />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 transition-colors duration-300" style={{ color: ventColor }}>
          {ventilation} <span className="text-sm font-rajdhani text-[#527E75] font-normal">m²/s</span>
        </div>
        <div className="text-xs font-rajdhani font-semibold">
          {isStagnant ? (
            <span className="font-bold" style={{ color: ventColor }}>⚠️ Atmospheric Stagnation</span>
          ) : (
            <span className="font-bold" style={{ color: ventColor }}>✅ High Dispersion Capacity</span>
          )}
        </div>
      </div>

      {/* 5. Compound Hazard Index Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1 bg-white border border-[#DDE7E4]">
        <div className="flex items-center justify-between text-xs font-mono text-[#527E75] mb-1 font-bold">
          <span>COMPOSITE RISK</span>
          <ShieldAlert className="w-4 h-4" style={{ color: hazardColor }} />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 font-bold transition-colors duration-300" style={{ color: hazardColor }}>
          {hazardScore}
        </div>
        <div className="text-xs font-mono text-[#527E75]">
          Status: <b style={{ color: hazardColor }}>{hazardScore > 0.6 ? 'HIGH RISK' : (hazardScore > 0.35 ? 'MODERATE' : 'LOW RISK')}</b>
        </div>
      </div>
    </div>
  );
}
