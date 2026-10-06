import React from 'react';
import { Activity, Calendar, MapPin, Radio, Satellite, ShieldCheck, Flame, Sun, CloudRain } from 'lucide-react';
import { INDIA_CITIES } from '../data/cities';

export default function Header({
  selectedCity,
  setSelectedCity,
  selectedDate,
  setSelectedDate,
  activeTab,
  setActiveTab,
  systemHealth
}) {
  return (
    <header className="border-b border-cyan-500/20 bg-[#070B14]/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top Ticker / Status Bar */}
      <div className="max-w-[1520px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-400/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Satellite className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-orbitron font-extrabold text-xl tracking-wider bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                INDIA AIR QUALITY & CLIMATE DIGITAL TWIN
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                v1.0.0
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400">
              COUPLED STATE SPACE · GEOSPATIAL REMOTE SENSING · AI FORECASTING · WHAT-IF SIMULATOR
            </p>
          </div>
        </div>

        {/* Live Controls & Telemetry Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* City Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs font-mono">
            <MapPin className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedCity.id}
              onChange={(e) => {
                const found = INDIA_CITIES.find(c => c.id === e.target.value);
                if (found) setSelectedCity(found);
              }}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-bold"
            >
              {INDIA_CITIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <input
              type="date"
              value={selectedDate}
              min="2022-01-01"
              max="2023-12-31"
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Live Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{systemHealth?.status === 'healthy' ? 'ONLINE' : 'ONLINE'}</span>
          </div>
        </div>
      </div>

      {/* Episode Presets & Tab Navigation Bar */}
      <div className="max-w-[1520px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1">
          {[
            { id: 'map', label: '3D Viewport', icon: Radio },
            { id: 'forecast', label: 'AI Forecaster', icon: Activity },
            { id: 'risk', label: 'Risk Atlas', icon: ShieldCheck },
            { id: 'scenario', label: 'What-If Sandbox', icon: Flame },
            { id: 'explain', label: 'Model Diagnostics', icon: Satellite },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-rajdhani font-bold uppercase tracking-wider transition-all duration-200 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Episode Presets */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 hidden sm:inline">PRESETS:</span>
          <button
            onClick={() => setSelectedDate('2023-11-05')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-orange-950/40 border border-orange-500/30 text-orange-300 hover:bg-orange-900/40 transition-colors"
          >
            <Flame className="w-3 h-3 text-orange-400" />
            <span>Stubble Peak (Nov 5)</span>
          </button>
          <button
            onClick={() => setSelectedDate('2023-05-20')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/40 transition-colors"
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>Heatwave (May 20)</span>
          </button>
          <button
            onClick={() => setSelectedDate('2023-07-15')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 hover:bg-blue-900/40 transition-colors"
          >
            <CloudRain className="w-3 h-3 text-blue-400" />
            <span>Monsoon Low (Jul 15)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
