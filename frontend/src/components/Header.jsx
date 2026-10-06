import React, { useMemo } from 'react';
import { Activity, Calendar, MapPin, Radio, Satellite, ShieldCheck, Flame, Sliders } from 'lucide-react';
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
  // Sort cities alphabetically for clean dropdown experience
  const sortedCities = useMemo(() => {
    return [...INDIA_CITIES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Preset episodes sorted alphabetically
  const sortedPresets = useMemo(() => {
    const presets = [
      { label: 'Dust Storm (Jun 10)', date: '2023-06-10' },
      { label: 'Heatwave Peak (May 20)', date: '2023-05-20' },
      { label: 'Monsoon Clean Air (Jul 15)', date: '2023-07-15' },
      { label: 'Post-Diwali Smog (Nov 14)', date: '2023-11-14' },
      { label: 'Stubble Burning Peak (Nov 05)', date: '2023-11-05' },
      { label: 'Winter Stagnation (Dec 25)', date: '2023-12-25' },
    ];
    return presets.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const currentPresetMatch = sortedPresets.find(p => p.date === selectedDate);

  return (
    <header className="border-b border-[#DDE7E4] bg-[#FFFFFF]/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      {/* Top Ticker / Status Bar */}
      <div className="max-w-[1520px] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#9BCDC2]/20 border border-[#5CB7A8]/50 text-[#278E7B] shadow-[0_0_15px_rgba(92,183,168,0.2)]">
            <Satellite className="w-6 h-6 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-orbitron font-extrabold text-xl tracking-wider bg-gradient-to-r from-[#278E7B] via-[#5CB7A8] to-[#133B34] bg-clip-text text-transparent">
              INDIA AIR QUALITY & CLIMATE DIGITAL TWIN
            </h1>
            <p className="text-xs font-mono text-[#527E75]">
              COUPLED STATE SPACE · GEOSPATIAL REMOTE SENSING · AI FORECASTING · WHAT-IF SIMULATOR
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* City Selector (Alphabetical & Compact) */}
          <div className="flex items-center gap-1.5 bg-[#F6F4EE] border border-[#DDE7E4] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#133B34] shadow-xs max-w-[160px]">
            <MapPin className="w-3.5 h-3.5 text-[#278E7B] shrink-0" />
            <select
              value={selectedCity.id}
              onChange={(e) => {
                const found = INDIA_CITIES.find(c => c.id === e.target.value);
                if (found) setSelectedCity(found);
              }}
              className="bg-transparent text-[#133B34] focus:outline-none cursor-pointer font-bold w-full truncate"
            >
              {sortedCities.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-[#133B34]">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-[#F6F4EE] border border-[#DDE7E4] rounded-lg px-2.5 py-1.5 text-xs font-mono text-[#133B34] shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#5CB7A8]" />
            <input
              type="date"
              value={selectedDate}
              min="2022-01-01"
              max="2023-12-31"
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-[#133B34] focus:outline-none cursor-pointer font-bold"
            />
          </div>
        </div>
      </div>

      {/* Episode Presets & Tab Navigation Bar */}
      <div className="max-w-[1520px] mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#DDE7E4] bg-[#FAF8F5]/80">
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
                    ? 'bg-[#278E7B] text-white shadow-[0_2px_10px_rgba(39,142,123,0.3)]'
                    : 'text-[#2C5E55] hover:text-[#133B34] hover:bg-[#9BCDC2]/20'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#527E75]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Quick Episode Presets Dropdown (Alphabetical) */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#F6F4EE] border border-[#DDE7E4] rounded-lg px-2.5 py-1.5 text-xs text-[#133B34] shadow-xs">
            <Sliders className="w-3.5 h-3.5 text-[#278E7B]" />
            <span className="text-[#527E75] font-bold">PRESET:</span>
            <select
              value={currentPresetMatch ? currentPresetMatch.date : ''}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="bg-transparent text-[#133B34] focus:outline-none cursor-pointer font-bold pr-1"
            >
              <option value="" disabled className="bg-white text-[#527E75]">
                {currentPresetMatch ? currentPresetMatch.label : 'Select Episode Preset...'}
              </option>
              {sortedPresets.map((p) => (
                <option key={p.date + p.label} value={p.date} className="bg-white text-[#133B34]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
