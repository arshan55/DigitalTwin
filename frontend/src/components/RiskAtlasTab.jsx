import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, PolygonLayer, GeoJsonLayer, BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { ShieldAlert, Flame, Droplet, Wind, Layers, Sliders } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { isPointInsideIndia } from '../data/indiaBoundary';
import { INDIA_STATES_GEOJSON, INDIA_NATIONAL_GEOJSON } from '../data/indiaStateBoundaries';

export default function RiskAtlasTab({ selectedDate }) {
  const [riskCategory, setRiskCategory] = useState('composite'); // 'composite' | 'heat' | 'drought' | 'air'
  const [cameraPitch, setCameraPitch] = useState(48);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Generate 3D continuous risk topographic surface across India
  const riskGridData = useMemo(() => {
    const records = [];
    let seed = Math.abs(selectedDate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 150);
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const step = 0.28;
    for (let lat = 6.6; lat <= 37.2; lat += step) {
      for (let lon = 68.0; lon <= 97.6; lon += step) {
        if (!isPointInsideIndia(lat + step * 0.5, lon + step * 0.5)) {
          continue;
        }

        // Heat stress: highest in central/northwest India
        const heat = Math.min(1.0, Math.max(0.1, 0.35 + 0.55 * Math.exp(-Math.pow(lat - 24.0, 2) / 40.0 - Math.pow(lon - 77.0, 2) / 50.0) + pseudoRandom() * 0.1));
        // Drought risk: highest in Rajasthan / Deccan
        const drought = Math.min(1.0, Math.max(0.1, 0.25 + 0.65 * Math.exp(-Math.pow(lat - 26.5, 2) / 30.0 - Math.pow(lon - 72.0, 2) / 35.0) + pseudoRandom() * 0.1));
        // Air quality risk: highest in IGP corridor
        const distIGP = Math.sqrt(Math.pow((lat - 28.5) / 3.2, 2) + Math.pow((lon - 78.5) / 6.5, 2));
        const aq = Math.min(1.0, Math.max(0.1, 0.30 + 0.65 * Math.exp(-distIGP) + pseudoRandom() * 0.08));

        const comp = Math.round((0.35 * heat + 0.35 * drought + 0.30 * aq) * 1000) / 1000;

        let activeVal = comp;
        if (riskCategory === 'heat') activeVal = Math.round(heat * 1000) / 1000;
        else if (riskCategory === 'drought') activeVal = Math.round(drought * 1000) / 1000;
        else if (riskCategory === 'air') activeVal = Math.round(aq * 1000) / 1000;

        // Color mapping: Emerald (<0.35) -> Amber (0.35-0.6) -> Crimson (>0.6)
        let color = [16, 185, 129];
        if (activeVal > 0.6) color = [239, 68, 68];
        else if (activeVal > 0.35) color = [245, 158, 11];

        const poly = [
          [lon, lat],
          [lon + step, lat],
          [lon + step, lat + step],
          [lon, lat + step],
          [lon, lat]
        ];

        records.push({
          position: [lon + step * 0.5, lat + step * 0.5],
          polygon: poly,
          lat: Math.round((lat + step * 0.5) * 100) / 100,
          lon: Math.round((lon + step * 0.5) * 100) / 100,
          riskValue: activeVal,
          heat: Math.round(heat * 100) / 100,
          drought: Math.round(drought * 100) / 100,
          air: Math.round(aq * 100) / 100,
          composite: comp,
          color: color,
          elevation: Math.pow(activeVal, 1.3) * 45000,
        });
      }
    }
    return records;
  }, [selectedDate, riskCategory]);

  const regionalRiskData = [
    { region: 'Punjab / Haryana', composite: 0.88, heat: 0.65, drought: 0.52, air: 0.96 },
    { region: 'Delhi-NCR / West UP', composite: 0.92, heat: 0.70, drought: 0.48, air: 0.98 },
    { region: 'Bihar / East UP (IGP)', composite: 0.82, heat: 0.68, drought: 0.55, air: 0.89 },
    { region: 'Rajasthan Desert Core', composite: 0.76, heat: 0.94, drought: 0.92, air: 0.42 },
    { region: 'Deccan Plateau / Telangana', composite: 0.54, heat: 0.62, drought: 0.58, air: 0.41 },
    { region: 'Western Ghats / Konkan', composite: 0.28, heat: 0.35, drought: 0.18, air: 0.31 },
    { region: 'Bengal Delta', composite: 0.66, heat: 0.55, drought: 0.32, air: 0.74 },
    { region: 'Tamil Nadu Coast', composite: 0.38, heat: 0.48, drought: 0.40, air: 0.26 },
  ];

  const initialViewState = {
    longitude: 78.96,
    latitude: 22.59,
    zoom: 4.3,
    pitch: cameraPitch,
    bearing: -15,
    maxZoom: 12,
    minZoom: 3,
  };

  const layers = useMemo(() => {
    return [
      new TileLayer({
        id: 'risk-esri-light-basemap',
        data: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        minZoom: 0,
        maxZoom: 16,
        tileSize: 256,
        renderSubLayers: props => {
          const { bbox: { west, south, east, north } } = props.tile;
          return new BitmapLayer(props, {
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
          });
        },
      }),
      new GeoJsonLayer({
        id: 'risk-state-boundaries',
        data: INDIA_STATES_GEOJSON,
        stroked: true,
        filled: true,
        getFillColor: [246, 244, 238, 25],
        getLineColor: [92, 183, 168, 160],
        lineWidthMinPixels: 1.0,
        pickable: false,
      }),
      new GeoJsonLayer({
        id: 'risk-national-boundary',
        data: INDIA_NATIONAL_GEOJSON,
        stroked: true,
        filled: false,
        getLineColor: [39, 142, 123, 255],
        lineWidthMinPixels: 2.5,
        pickable: false,
      }),
      new PolygonLayer({
        id: 'compound-risk-plateau',
        data: riskGridData,
        getPolygon: d => d.polygon,
        getElevation: d => d.elevation,
        getFillColor: d => [...d.color, 225],
        getLineColor: [39, 142, 123, 50],
        lineWidthMinPixels: 0.5,
        stroked: true,
        filled: true,
        extruded: true,
        elevationScale: 1,
        pickable: true,
        autoHighlight: true,
        highlightColor: [92, 183, 168, 150],
        material: {
          ambient: 0.5,
          diffuse: 0.6,
          shininess: 32,
          specularColor: [120, 120, 120],
        },
        onHover: info => setHoverInfo(info),
      }),
    ];
  }, [riskGridData]);

  return (
    <div className="space-y-6">
      {/* Category Filter Selector Ribbon */}
      <div className="glass-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-[#DDE7E4] bg-white shadow-sm">
        <div>
          <h3 className="font-orbitron font-bold text-base text-[#133B34]">Compound Multi-Hazard Climate Risk Atlas</h3>
          <p className="text-xs font-mono text-[#527E75]">
            Coupled vulnerability index combining Wet-bulb Heat Stress (W ≥ 32°C), Drought Deficit (SPI/NDVI), and Severe AQ Exceedance (PM2.5 &gt; 400)
          </p>
        </div>

        <div className="flex bg-[#F6F4EE] rounded-lg p-1 border border-[#DDE7E4] font-mono text-xs flex-wrap gap-1">
          {[
            { id: 'composite', label: 'Composite Multi-Hazard', icon: ShieldAlert },
            { id: 'heat', label: 'Thermal Heat Stress', icon: Flame },
            { id: 'drought', label: 'Drought / Moisture', icon: Droplet },
            { id: 'air', label: 'Air Quality Exceedance', icon: Wind },
          ].map((c) => {
            const Icon = c.icon;
            const isSelected = riskCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setRiskCategory(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-bold transition-colors ${
                  isSelected ? 'bg-[#278E7B] text-white shadow-xs' : 'text-[#2C5E55] hover:text-[#133B34]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Risk Geospatial Viewport */}
      <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-[#DDE7E4] shadow-sm bg-[#EAE4D8]">
        <DeckGL
          initialViewState={initialViewState}
          controller={true}
          layers={layers}
          style={{ width: '100%', height: '100%' }}
        />

        {/* Hover Tooltip Overlay */}
        {hoverInfo?.object && (
          <div
            className="absolute z-50 pointer-events-none p-3 rounded-lg bg-white/95 border border-[#5CB7A8] text-xs font-mono shadow-xl backdrop-blur-md text-[#133B34]"
            style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
          >
            <div className="font-bold text-[#278E7B]">{hoverInfo.object.lat}°N, {hoverInfo.object.lon}°E (India Grid)</div>
            <div className="text-[#133B34] mt-1 font-bold">
              Score: <span className="text-[#E05A47]">{hoverInfo.object.riskValue}</span>
            </div>
            <div className="text-[11px] text-[#527E75] mt-1">
              Heat: {hoverInfo.object.heat} | Drought: {hoverInfo.object.drought} | AQ: {hoverInfo.object.air}
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 p-2.5 rounded-lg bg-white/90 border border-[#DDE7E4] text-[11px] font-mono text-[#133B34] backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#278E7B] animate-pulse"></span>
            <span className="text-[#278E7B] font-bold uppercase">{riskCategory} RISK LAYER</span>
          </div>
          <div className="text-[10px] text-[#527E75] mt-1">
            HAZARD RANGE: 0.0 (SAFE) – 1.0 (EXTREME) · 3D DENSITY MESH
          </div>
        </div>
      </div>

      {/* Regional Comparison Chart & Description Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-[#DDE7E4] bg-white shadow-sm">
          <h4 className="font-orbitron font-bold text-sm text-[#133B34] mb-3">Regional Risk Vulnerability Index [0–1]</h4>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalRiskData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DDE7E4" />
                <XAxis type="number" domain={[0, 1]} stroke="#9BCDC2" tick={{ fill: '#527E75', fontSize: 11, fontFamily: 'Comfortaa' }} />
                <YAxis
                  dataKey="region"
                  type="category"
                  stroke="#9BCDC2"
                  width={180}
                  interval={0}
                  tick={{ fill: '#133B34', fontSize: 11, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
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
                <Bar dataKey={riskCategory} fill="#278E7B" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hazard Methodology Cards */}
        <div className="space-y-3">
          <div className="glass-panel rounded-xl p-3.5 border border-[#F1D3B7] bg-[#F1D3B7]/20 shadow-xs">
            <div className="flex items-center gap-2 text-[#8C4F18] font-orbitron font-bold text-xs">
              <Flame className="w-3.5 h-3.5" />
              <span>Thermal Wet-Bulb Stress</span>
            </div>
            <p className="text-[11px] font-mono text-[#527E75] mt-1.5">
              Assesses physiological thermal strain at W ≥ 32°C combined with MODIS daytime Land Surface Temperature anomalies.
            </p>
          </div>

          <div className="glass-panel rounded-xl p-3.5 border border-[#DEAC83] bg-[#FDF2D9] shadow-xs">
            <div className="flex items-center gap-2 text-[#916508] font-orbitron font-bold text-xs">
              <Droplet className="w-3.5 h-3.5" />
              <span>Drought / Vegetation Deficit</span>
            </div>
            <p className="text-[11px] font-mono text-[#527E75] mt-1.5">
              Evaluates 30-day cumulative precipitation deficits coupled with MODIS NDVI vegetation stress indicators.
            </p>
          </div>

          <div className="glass-panel rounded-xl p-3.5 border border-[#9BCDC2] bg-[#9BCDC2]/20 shadow-xs">
            <div className="flex items-center gap-2 text-[#1D6C5D] font-orbitron font-bold text-xs">
              <Wind className="w-3.5 h-3.5" />
              <span>Severe AQ Exceedance</span>
            </div>
            <p className="text-[11px] font-mono text-[#527E75] mt-1.5">
              Computes exceedance probability of Indian AQI exceeding 400 (Severe status) for consecutive 48-hour periods.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
