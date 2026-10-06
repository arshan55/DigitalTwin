import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Award, Brain, TrendingUp, Flame } from 'lucide-react';

export default function ExplainabilityTab() {
  const featureImportances = [
    { feature: 'MERRA-2 PM2.5 Diagnostic', importance: 38.5, category: 'Reanalysis Aerosol' },
    { feature: 'MERRA-2 Total AOD', importance: 27.4, category: 'Reanalysis Aerosol' },
    { feature: 'Seasonal Cosine Embedding', importance: 11.7, category: 'Spatiotemporal' },
    { feature: 'MODIS MAIAC AOD 550nm', importance: 5.8, category: 'Satellite Optical' },
    { feature: 'ERA5 Ventilation Index', importance: 4.6, category: 'Boundary Layer Met' },
    { feature: 'MERRA-2 Black Carbon', importance: 3.7, category: 'Reanalysis Aerosol' },
    { feature: 'TROPOMI HCHO Column', importance: 1.5, category: 'Satellite Chemistry' },
    { feature: 'ERA5 Boundary Layer Ht', importance: 0.7, category: 'Boundary Layer Met' },
    { feature: 'TROPOMI CO Column', importance: 0.6, category: 'Satellite Chemistry' },
    { feature: 'TROPOMI NO2 Column', importance: 0.4, category: 'Satellite Chemistry' },
  ];

  const cvBenchmarks = [
    { model: 'Linear Baseline', randomCV: 92.58, spatialLSO: 88.18, temporalLSO: 17.71 },
    { model: 'Random Forest', randomCV: 99.94, spatialLSO: 93.98, temporalLSO: 74.06 },
    { model: 'XGBoost', randomCV: 99.93, spatialLSO: 94.40, temporalLSO: 79.25 },
    { model: 'LightGBM (Champion)', randomCV: 99.94, spatialLSO: 94.61, temporalLSO: 76.97 },
    { model: 'Stacking Ensemble', randomCV: 99.90, spatialLSO: 94.02, temporalLSO: 74.04 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Horizontal Chart */}
        <div className="glass-panel rounded-xl p-5 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-cyan-400" />
            <h4 className="font-orbitron font-bold text-sm text-cyan-300">
              Top Predictive Drivers (LightGBM Champion)
            </h4>
          </div>
          <p className="text-xs font-mono text-slate-400 mb-4">
            Percentage of total variance explained across 13,140 multi-sensor samples
          </p>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureImportances} layout="vertical" margin={{ top: 5, right: 30, left: 110, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.08)" />
                <XAxis type="number" stroke="#64748B" unit="%" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis dataKey="feature" type="category" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 'bold' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    borderColor: '#00F0FF',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="importance" fill="#00F0FF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cross-Validation Generalization Chart */}
        <div className="glass-panel rounded-xl p-5 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-purple-400" />
            <h4 className="font-orbitron font-bold text-sm text-purple-300">
              Spatial & Temporal Generalization Accuracy ($R^2$ %)
            </h4>
          </div>
          <p className="text-xs font-mono text-slate-400 mb-4">
            Leave-Station-Out (18 stations) vs Leave-Season-Out (4 seasons)
          </p>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cvBenchmarks} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 240, 255, 0.08)" />
                <XAxis dataKey="model" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 'bold' }} />
                <YAxis domain={[0, 100]} stroke="#64748B" unit="%" tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(7, 11, 20, 0.95)',
                    borderColor: '#A855F7',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar name="Spatial LSO CV (Unseen Cities)" dataKey="spatialLSO" fill="#00F0FF" radius={[4, 4, 0, 0]} />
                <Bar name="Temporal LSO CV (Unseen Seasons)" dataKey="temporalLSO" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stubble Burning Case Study Banner */}
      <div className="glass-panel rounded-xl p-5 border border-orange-500/30 bg-orange-950/15 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-orbitron font-bold text-orange-400 text-sm">
            <Flame className="w-5 h-5" />
            <span>POST-MONSOON STUBBLE BURNING ATTRIBUTION CASE STUDY</span>
          </div>
          <p className="text-xs font-mono text-slate-300 mt-1 max-w-3xl">
            Empirical tracking during Oct 15 – Nov 20, 2023 documented a <b className="text-orange-300">+184.2% surge</b> in Indo-Gangetic Plain surface PM2.5 (200.2 µg/m³ vs 70.5 µg/m³ baseline). VIIRS Fire Radiative Power (FRP) lagged correlation: <b className="text-orange-300">r = 0.230</b>.
          </p>
        </div>
        <div className="text-right">
          <div className="font-orbitron font-extrabold text-2xl text-orange-400">+184.2%</div>
          <div className="text-[11px] font-mono text-slate-400">SURGE OVER BASELINE</div>
        </div>
      </div>
    </div>
  );
}
