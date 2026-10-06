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
    { model: 'Linear Model', randomCV: 92.58, spatialLSO: 88.18, temporalLSO: 17.71 },
    { model: 'Random Forest', randomCV: 99.94, spatialLSO: 93.98, temporalLSO: 74.06 },
    { model: 'XGBoost', randomCV: 99.93, spatialLSO: 94.40, temporalLSO: 79.25 },
    { model: 'LightGBM', randomCV: 99.94, spatialLSO: 94.61, temporalLSO: 76.97 },
    { model: 'Ensemble', randomCV: 99.90, spatialLSO: 94.02, temporalLSO: 74.04 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Horizontal Chart */}
        <div className="glass-panel rounded-xl p-5 border border-[#DDE7E4] bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-[#278E7B]" />
            <h4 className="font-orbitron font-bold text-sm text-[#133B34]">
              Top Predictive Drivers
            </h4>
          </div>
          <p className="text-xs font-mono text-[#527E75] mb-4">
            Feature contribution to air quality predictions
          </p>

          <div className="h-[460px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureImportances} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE7E4" />
                <XAxis type="number" stroke="#9BCDC2" unit="%" tick={{ fill: '#527E75', fontSize: 11, fontFamily: 'Comfortaa' }} />
                <YAxis
                  dataKey="feature"
                  type="category"
                  stroke="#9BCDC2"
                  width={210}
                  interval={0}
                  tick={{ fill: '#133B34', fontSize: 10.5, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                />
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
                <Bar dataKey="importance" fill="#278E7B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cross-Validation Generalization Chart */}
        <div className="glass-panel rounded-xl p-5 border border-[#DDE7E4] bg-white shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-[#5CB7A8]" />
              <h4 className="font-orbitron font-bold text-sm text-[#133B34]">
                Model Generalization Accuracy (R² Score)
              </h4>
            </div>
            <p className="text-xs font-mono text-[#527E75] mb-4">
              Cross-validation across unseen cities and unseen seasons
            </p>
          </div>

          <div className="h-[460px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cvBenchmarks} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE7E4" />
                <XAxis
                  dataKey="model"
                  stroke="#9BCDC2"
                  interval={0}
                  tick={{ fill: '#133B34', fontSize: 11, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                />
                <YAxis domain={[0, 100]} stroke="#9BCDC2" unit="%" tick={{ fill: '#527E75', fontSize: 11, fontFamily: 'Comfortaa' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderColor: '#5CB7A8',
                    borderRadius: '8px',
                    fontFamily: 'Comfortaa',
                    fontSize: '12px',
                    color: '#133B34',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar name="Unseen Cities (Spatial)" dataKey="spatialLSO" fill="#278E7B" radius={[4, 4, 0, 0]} />
                <Bar name="Unseen Seasons (Temporal)" dataKey="temporalLSO" fill="#5CB7A8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Stubble Burning Case Study Banner */}
      <div className="glass-panel rounded-xl p-5 border border-[#F1D3B7] bg-[#F1D3B7]/20 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 font-orbitron font-bold text-[#8C4F18] text-sm">
            <Flame className="w-5 h-5 text-[#DEAC83]" />
            <span>STUBBLE BURNING IMPACT ANALYSIS</span>
          </div>
          <p className="text-xs font-mono text-[#527E75] mt-1 max-w-3xl">
            Post-monsoon tracking documented a <b className="text-[#8C4F18]">+184.2% surge</b> in Indo-Gangetic Plain surface PM2.5 compared to baseline conditions.
          </p>
        </div>
        <div className="text-right">
          <div className="font-orbitron font-extrabold text-2xl text-[#8C4F18]">+184.2%</div>
          <div className="text-[11px] font-mono text-[#527E75] font-bold">SURGE OVER BASELINE</div>
        </div>
      </div>
    </div>
  );
}
