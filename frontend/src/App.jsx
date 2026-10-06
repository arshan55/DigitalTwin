import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import MetricCards from './components/MetricCards';
import MapView from './components/MapView';
import ForecastTab from './components/ForecastTab';
import RiskAtlasTab from './components/RiskAtlasTab';
import ScenarioSandboxTab from './components/ScenarioSandboxTab';
import ExplainabilityTab from './components/ExplainabilityTab';
import { INDIA_CITIES } from './data/cities';
import { checkHealth, getAQI } from './services/api';

export default function App() {
  const [selectedCity, setSelectedCity] = useState(INDIA_CITIES[0]); // Delhi-NCR
  const [selectedDate, setSelectedDate] = useState('2023-11-05');
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'forecast' | 'risk' | 'scenario' | 'explain'
  const [systemHealth, setSystemHealth] = useState(null);
  const [aqiData, setAqiData] = useState(null);

  // Poll / Check System Health
  useEffect(() => {
    checkHealth().then(setSystemHealth);
  }, []);

  // Fetch Live AQI when City or Date changes
  useEffect(() => {
    getAQI(selectedCity.lat, selectedCity.lon, selectedDate).then((data) => {
      if (data) {
        setAqiData(data);
      }
    });
  }, [selectedCity, selectedDate]);

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-900">
      {/* Top HUD Header */}
      <Header
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        systemHealth={systemHealth}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 py-4 space-y-4">
        {/* If not in map tab, show top metric ribbon */}
        {activeTab !== 'map' && (
          <MetricCards
            aqiData={aqiData}
            selectedCity={selectedCity}
            selectedDate={selectedDate}
          />
        )}

        {/* Active Module Tab Content */}
        <div>
          {activeTab === 'map' && (
            <MapView
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              aqiData={aqiData}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastTab
              selectedCity={selectedCity}
              selectedDate={selectedDate}
              aqiData={aqiData}
            />
          )}

          {activeTab === 'risk' && (
            <RiskAtlasTab selectedDate={selectedDate} />
          )}

          {activeTab === 'scenario' && (
            <ScenarioSandboxTab selectedDate={selectedDate} />
          )}

          {activeTab === 'explain' && (
            <ExplainabilityTab />
          )}
        </div>
      </main>

      {/* Futuristic HUD Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070B14]/90 py-3 text-center text-xs font-mono text-slate-500">
        <div className="max-w-[1520px] mx-auto px-4 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold tracking-wider">INDIA CLIMATE & AQ DIGITAL TWIN</span>
            <span className="text-slate-600">•</span>
            <span>REAL-TIME</span>
            <span className="text-slate-600">•</span>
            <span>PREDICTIVE</span>
            <span className="text-slate-600">•</span>
            <span>SMARTER DECISIONS</span>
          </div>
          <div>
            SATELLITE DATA: SENTINEL-5P • NASA MODIS • MERRA-2 • ERA5 • VIIRS • CPCB CAAQMS
          </div>
        </div>
      </footer>
    </div>
  );
}
