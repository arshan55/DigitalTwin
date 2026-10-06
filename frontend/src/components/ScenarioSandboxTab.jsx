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
        <div className="glass-panel rounded-xl p-5 border border-cyan-500/20 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-orbitron font-bold text-sm text-cyan-400">
              <Sliders className="w-4 h-4" />
              <span>COUNTERFACTUAL CONTROLS</span>
            </div>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(0); setDeltaEmissions(0); }}
              className="text-xs font-mono text-slate-500 hover:text-cyan-400"
            >
              Reset
            </button>
          </div>

          {/* Slider 1: Temperature */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">🌡️ Temperature Perturbation</span>
              <span className="text-amber-400 font-bold">{deltaTemp > 0 ? `+${deltaTemp}` : deltaTemp}°C</span>
            </div>
            <input
              type="range" min="-2.0" max="5.0" step="0.5"
              value={deltaTemp} onChange={(e) => setDeltaTemp(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Slider 2: Precipitation */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">🌧️ Precipitation Variation</span>
              <span className="text-blue-400 font-bold">{deltaPrecip > 0 ? `+${deltaPrecip}` : deltaPrecip}%</span>
            </div>
            <input
              type="range" min="-50.0" max="50.0" step="5.0"
              value={deltaPrecip} onChange={(e) => setDeltaPrecip(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Slider 3: Fire Abatement */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">🔥 Biomass Fire Abatement</span>
              <span className="text-orange-400 font-bold">{deltaFire > 0 ? `+${deltaFire}` : deltaFire}%</span>
            </div>
            <input
              type="range" min="-100.0" max="50.0" step="10.0"
              value={deltaFire} onChange={(e) => setDeltaFire(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Slider 4: Anthropogenic Emissions */}
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-slate-300">🏭 Anthropogenic Emissions</span>
              <span className="text-purple-400 font-bold">{deltaEmissions > 0 ? `+${deltaEmissions}` : deltaEmissions}%</span>
            </div>
            <input
              type="range" min="-50.0" max="50.0" step="5.0"
              value={deltaEmissions} onChange={(e) => setDeltaEmissions(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Quick Benchmark Presets */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="text-xs font-mono text-slate-500">POLICY BENCHMARKS:</div>
            <button
              onClick={() => { setDeltaTemp(2.0); setDeltaPrecip(-15.0); setDeltaFire(0); setDeltaEmissions(0); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300 text-xs font-mono hover:bg-amber-950/40 transition-colors"
            >
              🌡️ Climate Shock (+2°C, -15% Rain)
            </button>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(-100); setDeltaEmissions(0); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-orange-500/30 text-orange-300 text-xs font-mono hover:bg-orange-950/40 transition-colors"
            >
              🔥 Stubble Elimination (-100% Fires)
            </button>
            <button
              onClick={() => { setDeltaTemp(0); setDeltaPrecip(0); setDeltaFire(-50); setDeltaEmissions(-30); }}
              className="w-full text-left px-3 py-2 rounded-lg bg-slate-900 border border-emerald-500/30 text-emerald-300 text-xs font-mono hover:bg-emerald-950/40 transition-colors"
            >
              ✅ Clean Air Act 2025 (-50% fires, -30% emissions)
            </button>
          </div>
        </div>

        {/* Right Counterfactual Simulation Output */}
        <div className="lg:col-span-2 space-y-6">
          {/* Simulated Impact KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel rounded-xl p-4 border border-cyan-500/20">
              <div className="text-xs font-mono text-slate-400 mb-1">MEAN PM2.5 SHIFT</div>
              <div className="font-orbitron font-extrabold text-2xl" style={{ color: pm25Delta > 0 ? '#EF4444' : '#10B981' }}>
                {pm25Delta > 0 ? `+${pm25Delta.toFixed(1)}` : pm25Delta.toFixed(1)} <span className="text-xs font-normal">µg/m³</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">All-India Averaged Response</div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-cyan-500/20">
              <div className="text-xs font-mono text-slate-400 mb-1">NATIONAL AQI DELTA</div>
              <div className="font-orbitron font-extrabold text-2xl" style={{ color: aqiDelta > 0 ? '#EF4444' : '#10B981' }}>
                {aqiDelta > 0 ? `+${aqiDelta.toFixed(0)}` : aqiDelta.toFixed(0)} <span className="text-xs font-normal">pts</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">CPCB Sub-Index Impact</div>
            </div>

            <div className="glass-panel rounded-xl p-4 border border-cyan-500/20">
              <div className="text-xs font-mono text-slate-400 mb-1">SEVERE CELLS AVOIDED</div>
              <div className="font-orbitron font-extrabold text-2xl text-cyan-300">
                {severeCellsAvoided > 0 ? `+${severeCellsAvoided}` : severeCellsAvoided}
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">0.25° Sub-grid Cells</div>
            </div>
          </div>

          {/* Baseline vs Scenario Distribution Bar Chart */}
          <div className="glass-panel rounded-xl p-5 border border-cyan-500/20">
            <h4 className="font-orbitron font-bold text-sm text-cyan-300 mb-3">
              Grid Cell AQI Category Distribution: Baseline vs Counterfactual Scenario
            </h4>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.08)" />
                  <XAxis dataKey="category" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(7, 11, 20, 0.95)',
                      borderColor: '#00F0FF',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono',
                      fontSize: '12px',
                    }}
                  />
                  <Legend />
                  <Bar name="Baseline State" dataKey="baseline" fill="rgba(99, 102, 241, 0.6)" radius={[4, 4, 0, 0]} />
                  <Bar name="Perturbed Counterfactual" dataKey="perturbed" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
