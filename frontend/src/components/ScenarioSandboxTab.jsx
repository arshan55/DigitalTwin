import React, { useState } from 'react';
import { Sliders, Flame, Sparkles, RefreshCw, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { simulateScenario } from '../services/api';

export default function ScenarioSandboxTab({ selectedDate }) {
  const [deltaTemp, setDeltaTemp] = useState(0.0);
  const [deltaPrecip, setDeltaPrecip] = useState(0.0);
  const [deltaFire, setDeltaFire] = useState(0.0);
  const [deltaEmissions, setDeltaEmissions] = useState(0.0);
  const [isLoading, setIsLoading] = useState(false);

  // Computed metrics
  const pm25Delta = (deltaTemp * 2.8) - (deltaPrecip * 0.12) + (deltaFire * 0.065) + (deltaEmissions * 0.35);
  const aqiDelta = pm25Delta * 1.6;
  const severeCellsAvoided = Math.round(-pm25Delta * 85);

  const categoryData = [
    { category: 'Good', baseline: 120, perturbed: Math.max(10, Math.round(120 - pm25Delta * 3)) },
    { category: 'Satisfactory', baseline: 240, perturbed: Math.max(20, Math.round(240 - pm25Delta * 4)) },
    { category: 'Moderate', baseline: 410, perturbed: Math.max(40, Math.round(410 - pm25Delta * 2)) },
    { category: 'Poor', baseline: 360, perturbed: Math.max(30, Math.round(360 + pm25Delta * 3)) },
    { category: 'Very Poor', baseline: 280, perturbed: Math.max(20, Math.round(280 + pm25Delta * 5)) },
    { category: 'Severe', baseline: 190, perturbed: Math.max(10, Math.round(190 + pm25Delta * 7)) },
  ];

  const handleRunSim = async () => {
    setIsLoading(true);
    await simulateScenario({
      date: selectedDate,
      delta_temp_c: deltaTemp,
      delta_precip_pct: deltaPrecip,
      delta_fire_pct: deltaFire,
      delta_emissions_pct: deltaEmissions,
    });
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Slider Console */}
        <div className="glass-panel rounded-xl p-5 border border-[#DDE7E4] bg-white shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#DDE7E4] pb-3">
            <div className="flex items-center gap-2 font-orbitron font-bold text-sm text-[#278E7B]">
              <Sliders className="w-4 h-4" />
              <span>COUNTERFACTUAL CONTROLS</span>
            </div>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(0); setDeltaEmissions(0); }}
              className="text-xs font-mono text-[#527E75] hover:text-[#278E7B] font-bold"
            >
              Reset
            </button>
          </div>

          {/* Slider 1: Temperature */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[#133B34] font-bold">🌡️ Temperature Perturbation</span>
              <span className="text-[#DEAC83] font-bold">{deltaTemp > 0 ? `+${deltaTemp}` : deltaTemp}°C</span>
            </div>
            <input
              type="range" min="-2.0" max="5.0" step="0.5"
              value={deltaTemp} onChange={(e) => setDeltaTemp(Number(e.target.value))}
              className="w-full accent-[#DEAC83] cursor-pointer h-1.5 bg-[#EAE4D8] rounded-lg"
            />
          </div>

          {/* Slider 2: Precipitation */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[#133B34] font-bold">🌧️ Precipitation Variation</span>
              <span className="text-[#5CB7A8] font-bold">{deltaPrecip > 0 ? `+${deltaPrecip}` : deltaPrecip}%</span>
            </div>
            <input
              type="range" min="-50.0" max="50.0" step="5.0"
              value={deltaPrecip} onChange={(e) => setDeltaPrecip(Number(e.target.value))}
              className="w-full accent-[#5CB7A8] cursor-pointer h-1.5 bg-[#EAE4D8] rounded-lg"
            />
          </div>

          {/* Slider 3: Fire Abatement */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[#133B34] font-bold">🔥 Biomass Fire Abatement</span>
              <span className="text-[#E05A47] font-bold">{deltaFire > 0 ? `+${deltaFire}` : deltaFire}%</span>
            </div>
            <input
              type="range" min="-100.0" max="50.0" step="10.0"
              value={deltaFire} onChange={(e) => setDeltaFire(Number(e.target.value))}
              className="w-full accent-[#E05A47] cursor-pointer h-1.5 bg-[#EAE4D8] rounded-lg"
            />
          </div>

          {/* Slider 4: Anthropogenic Emissions */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-[#133B34] font-bold">🏭 Anthropogenic Emissions</span>
              <span className="text-[#278E7B] font-bold">{deltaEmissions > 0 ? `+${deltaEmissions}` : deltaEmissions}%</span>
            </div>
            <input
              type="range" min="-50.0" max="50.0" step="5.0"
              value={deltaEmissions} onChange={(e) => setDeltaEmissions(Number(e.target.value))}
              className="w-full accent-[#278E7B] cursor-pointer h-1.5 bg-[#EAE4D8] rounded-lg"
            />
          </div>

          {/* Quick Benchmark Presets */}
          <div className="pt-2 border-t border-[#DDE7E4] space-y-2">
            <div className="text-xs font-mono text-[#527E75] font-bold">POLICY BENCHMARKS:</div>
            <button
              onClick={() => { setDeltaTemp(2.0); setDeltaPrecip(-15.0); setDeltaFire(0); setDeltaEmissions(0); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-[#FDF2D9] border border-[#E8C56A] text-[#916508] text-xs font-mono font-bold hover:bg-[#FDF2D9]/80 transition-colors shadow-xs"
            >
              🌡️ Climate Shock (+2°C, -15% Rain)
            </button>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(-100); setDeltaEmissions(0); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-[#F1D3B7]/40 border border-[#DEAC83] text-[#8C4F18] text-xs font-mono font-bold hover:bg-[#F1D3B7]/70 transition-colors shadow-xs"
            >
              🔥 Stubble Elimination (-100% Fires)
            </button>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(-50); setDeltaEmissions(-30); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-[#9BCDC2]/30 border border-[#5CB7A8] text-[#1D6C5D] text-xs font-mono font-bold hover:bg-[#9BCDC2]/60 transition-colors shadow-xs"
            >
              ✅ Clean Air Act 2025 (-50% fires, -30% emissions)
            </button>
          </div>
        </div>

        {/* Right Counterfactual Simulation Output */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulated Impact KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-4 border border-[#DDE7E4] bg-white shadow-sm">
              <div className="text-xs font-mono text-[#527E75] mb-1 font-bold">MEAN PM2.5 SHIFT</div>
              <div className="font-orbitron font-extrabold text-2xl" style={{ color: pm25Delta > 0 ? '#E05A47' : '#278E7B' }}>
                {pm25Delta > 0 ? `+${pm25Delta.toFixed(1)}` : pm25Delta.toFixed(1)} <span className="text-xs font-normal">µg/m³</span>
              </div>
              <div className="text-[11px] font-mono text-[#527E75] mt-1">All-India Averaged Response</div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[#DDE7E4] bg-white shadow-sm">
              <div className="text-xs font-mono text-[#527E75] mb-1 font-bold">NATIONAL AQI DELTA</div>
              <div className="font-orbitron font-extrabold text-2xl" style={{ color: aqiDelta > 0 ? '#E05A47' : '#278E7B' }}>
                {aqiDelta > 0 ? `+${aqiDelta.toFixed(0)}` : aqiDelta.toFixed(0)} <span className="text-xs font-normal">pts</span>
              </div>
              <div className="text-[11px] font-mono text-[#527E75] mt-1">CPCB Sub-Index Impact</div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-[#DDE7E4] bg-white shadow-sm">
              <div className="text-xs font-mono text-[#527E75] mb-1 font-bold">SEVERE CELLS AVOIDED</div>
              <div className="font-orbitron font-extrabold text-2xl text-[#278E7B]">
                {severeCellsAvoided > 0 ? `+${severeCellsAvoided}` : severeCellsAvoided}
              </div>
              <div className="text-[11px] font-mono text-[#527E75] mt-1">0.25° Sub-grid Cells</div>
            </div>
          </div>

          {/* Baseline vs Scenario Distribution Bar Chart */}
          <div className="glass-panel rounded-xl p-5 border border-[#DDE7E4] bg-white shadow-sm">
            <h4 className="font-orbitron font-bold text-sm text-[#133B34] mb-3">
              Grid Cell AQI Category Distribution: Baseline vs Counterfactual Scenario
            </h4>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DDE7E4" />
                  <XAxis dataKey="category" stroke="#9BCDC2" tick={{ fill: '#527E75', fontSize: 11, fontFamily: 'Comfortaa' }} />
                  <YAxis stroke="#9BCDC2" tick={{ fill: '#527E75', fontSize: 11, fontFamily: 'Comfortaa' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderColor: '#278E7B',
                      borderRadius: '8px',
                      fontFamily: 'Comfortaa',
                      fontSize: '12px',
                      color: '#133B34',
                    }}
                  />
                  <Legend />
                  <Bar name="Baseline State" dataKey="baseline" fill="#9BCDC2" radius={[4, 4, 0, 0]} />
                  <Bar name="Perturbed Counterfactual" dataKey="perturbed" fill="#278E7B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
