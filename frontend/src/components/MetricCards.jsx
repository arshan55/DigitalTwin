import React from 'react';
import { Wind, Thermometer, ShieldAlert, Activity, Sparkles } from 'lucide-react';

export default function MetricCards({ aqiData, selectedCity, selectedDate }) {
  const pm25 = aqiData?.pm25 ?? 184.5;
  const aqi = aqiData?.cpcb_aqi ?? 345.0;
  const category = aqiData?.aqi_category ?? 'Very Poor';
  const color = aqiData?.category_color ?? '#ff0000';
  const temp = aqiData?.temperature_c ?? 22.4;
  const rh = aqiData?.relative_humidity_pct ?? 62.5;
  const wind = aqiData?.wind_speed_ms ?? 1.85;

  const ventilation = Math.round(wind * 680.0);
  const whoRatio = (pm25 / 15.0).toFixed(1);
  const hazardScore = Math.min(0.95, (aqi / 500.0) * 0.5 + (temp / 45.0) * 0.35 + 0.1).toFixed(3);
  const hazardColor = hazardScore > 0.6 ? '#EF4444' : (hazardScore > 0.35 ? '#F59E0B' : '#10B981');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
      {/* 1. Surface AQI Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span>SURFACE AQI</span>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></span>
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5" style={{ color: color, textShadow: `0 0 15px ${color}60` }}>
          {Math.round(aqi)}
        </div>
        <div className="text-xs font-rajdhani font-semibold text-slate-300">
          <span className="font-bold" style={{ color: color }}>{category}</span> (CPCB Standard)
        </div>
      </div>

      {/* 2. PM2.5 Concentration Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span>PM2.5 DENSITY</span>
          <Activity className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 text-cyan-300 glow-cyan">
          {pm25.toFixed(1)} <span className="text-sm font-rajdhani text-cyan-500 font-normal">µg/m³</span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          <b className="text-rose-400">{whoRatio}x</b> WHO Annual Limit
        </div>
      </div>

      {/* 3. Meteorology & Ambient Temp Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span>ERA5 2M TEMPERATURE</span>
          <Thermometer className="w-4 h-4 text-amber-400" />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 text-amber-300">
          {temp.toFixed(1)}°C
        </div>
        <div className="text-xs font-mono text-slate-400">
          RH: <span className="text-indigo-300 font-bold">{rh.toFixed(0)}%</span> | Dew: 16.8°C
        </div>
      </div>

      {/* 4. Ventilation Index Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span>VENTILATION INDEX</span>
          <Wind className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5 text-emerald-300 glow-emerald">
          {ventilation} <span className="text-sm font-rajdhani text-emerald-500 font-normal">m²/s</span>
        </div>
        <div className="text-xs font-rajdhani font-semibold">
          {ventilation < 2000 ? (
            <span className="text-rose-400">⚠️ Atmospheric Stagnation</span>
          ) : (
            <span className="text-emerald-400">✅ High Dispersion Capacity</span>
          )}
        </div>
      </div>

      {/* 5. Compound Hazard Index Card */}
      <div className="glass-panel rounded-xl p-4 relative overflow-hidden transition-transform duration-200 hover:-translate-y-1">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
          <span>COMPOSITE RISK</span>
          <ShieldAlert className="w-4 h-4 text-purple-400" />
        </div>
        <div className="font-orbitron font-extrabold text-3xl my-1.5" style={{ color: hazardColor }}>
          {hazardScore}
        </div>
        <div className="text-xs font-mono text-slate-400">
          Status: <b style={{ color: hazardColor }}>{hazardScore > 0.6 ? 'HIGH RISK' : (hazardScore > 0.35 ? 'MODERATE' : 'LOW RISK')}</b>
        </div>
      </div>
    </div>
  );
}
