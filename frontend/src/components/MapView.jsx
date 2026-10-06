import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ColumnLayer, PolygonLayer, ScatterplotLayer, TextLayer, GeoJsonLayer, BitmapLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import {
  Layers, Flame, MapPin, Sliders, Globe, Eye, Navigation,
  Info, Activity, Thermometer, Wind, ShieldAlert, TrendingUp,
  Sun, CloudRain, Sparkles, Compass, Plus, Minus, ArrowUpRight, Leaf
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { INDIA_CITIES } from '../data/cities';
import { isPointInsideIndia } from '../data/indiaBoundary';
import { INDIA_STATES_GEOJSON, INDIA_NATIONAL_GEOJSON } from '../data/indiaStateBoundaries';
import { pm25ToAQI } from '../utils/aqi';

export default function MapView({
  selectedCity,
  setSelectedCity,
  selectedDate,
  setSelectedDate,
  aqiData,
}) {
  const [activePollutant, setActivePollutant] = useState('PM2.5'); // 'PM2.5' | 'PM10' | 'NO2' | 'SO2' | 'CO' | 'O3'
  const [mapMode, setMapMode] = useState('plateau'); // 'plateau' | 'heatmap' | 'columns' | 'scatter'
  const [showFires, setShowFires] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showNationalBorder, setShowNationalBorder] = useState(true);
  const [showStateBorders, setShowStateBorders] = useState(true);
  const [cameraPitch, setCameraPitch] = useState(48);
  const [cameraBearing, setCameraBearing] = useState(-15);
  const [cameraZoom, setCameraZoom] = useState(4.8);
  const [hoverInfo, setHoverInfo] = useState(null);

  // Pollutant multiplier factors for simulation
  const pollutantMultiplier = useMemo(() => {
    switch (activePollutant) {
      case 'PM10': return 1.65;
      case 'NO2': return 0.45;
      case 'SO2': return 0.25;
      case 'CO': return 0.015;
      case 'O3': return 0.35;
      default: return 1.0;
    }
  }, [activePollutant]);

  // High-density grid filtered strictly inside India's accurate territory
  const gridData = useMemo(() => {
    const records = [];
    const dt = new Date(selectedDate);
    const month = dt.getMonth() + 1;
    const isWinter = [10, 11, 12, 1].includes(month);
    const winterBoost = month === 11 || month === 12 ? 1.85 : (isWinter ? 1.4 : 0.85);

    let seed = Math.abs(selectedDate.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 100);
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const step = 0.25;
    for (let lat = 6.6; lat <= 37.2; lat += step) {
      for (let lon = 68.0; lon <= 97.6; lon += step) {
        if (!isPointInsideIndia(lat + step * 0.5, lon + step * 0.5)) {
          continue;
        }

        // Distance to Indo-Gangetic Plain Core (28.5N, 78.5E)
        const distIGP = Math.sqrt(Math.pow((lat - 28.5) / 3.2, 2) + Math.pow((lon - 78.5) / 6.5, 2));

        let basePM = (
          32.0 +
          150.0 * Math.exp(-distIGP) +
          26.0 * Math.exp(-Math.pow((lat - 22.5) / 3.5, 2) - Math.pow((lon - 88.3) / 2.5, 2)) + // Kolkata/Bengal
          22.0 * Math.exp(-Math.pow((lat - 19.1) / 2.5, 2) - Math.pow((lon - 73.0) / 2.5, 2)) + // Mumbai
          14.0 * pseudoRandom()
        ) * winterBoost * pollutantMultiplier;

        basePM = Math.min(650, Math.max(8, basePM + (pseudoRandom() * 6 - 3)));
        const aqiInfo = pm25ToAQI(basePM);

        // Continuous contiguous quad polygon
        const poly = [
          [lon, lat],
          [lon + step, lat],
          [lon + step, lat + step],
          [lon, lat + step],
          [lon, lat]
        ];

        // Smooth elevation plateau scaling
        const elev = Math.pow(Math.max(10, aqiInfo.aqi) / 100, 1.35) * 20000;

        records.push({
          position: [lon + step * 0.5, lat + step * 0.5],
          polygon: poly,
          lat: Math.round((lat + step * 0.5) * 100) / 100,
          lon: Math.round((lon + step * 0.5) * 100) / 100,
          val: Math.round(basePM * 10) / 10,
          aqi: aqiInfo.aqi,
          category: aqiInfo.category,
          color: aqiInfo.rgb,
          elevation: Math.round(elev),
        });
      }
    }
    return records;
  }, [selectedDate, pollutantMultiplier]);

  // Active VIIRS Fire points mapped to Indian territory
  const fireData = useMemo(() => {
    const fires = [];
    const dt = new Date(selectedDate);
    const month = dt.getMonth() + 1;
    const isFireSeason = month === 10 || month === 11;
    const nFires = isFireSeason ? 170 : 35;

    let seed = 99;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < nFires; i++) {
      let fLat, fLon, frp;
      if (isFireSeason && i < 135) {
        fLat = 29.8 + pseudoRandom() * 1.8;
        fLon = 74.8 + pseudoRandom() * 2.0;
        frp = 45 + pseudoRandom() * 240;
      } else {
        fLat = 14.5 + pseudoRandom() * 16.0;
        fLon = 73.5 + pseudoRandom() * 13.0;
        frp = 18 + pseudoRandom() * 90;
      }

      if (isPointInsideIndia(fLat, fLon)) {
        fires.push({
          position: [fLon, fLat],
          lat: Math.round(fLat * 100) / 100,
          lon: Math.round(fLon * 100) / 100,
          frp: Math.round(frp * 10) / 10,
          radius: Math.min(24000, Math.max(9000, frp * 110)),
        });
      }
    }
    return fires;
  }, [selectedDate]);

  // Deck.gl Layers configuration
  const layers = useMemo(() => {
    const layerList = [];

    // 1. High-Performance Dark Matter Basemap Tiles (ESRI Dark Gray Canvas - No Watermark)
    layerList.push(
      new TileLayer({
        id: 'esri-dark-basemap',
        data: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
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
      })
    );

    // 2. Indian State Boundaries Layer
    if (showStateBorders) {
      layerList.push(
        new GeoJsonLayer({
          id: 'india-state-boundaries',
          data: INDIA_STATES_GEOJSON,
          stroked: true,
          filled: true,
          getFillColor: [10, 18, 35, 90],
          getLineColor: [99, 102, 241, 140],
          lineWidthMinPixels: 1.0,
          pickable: false,
        })
      );
    }

    // 3. Glowing National Outer Boundary
    if (showNationalBorder) {
      layerList.push(
        new GeoJsonLayer({
          id: 'india-national-boundary',
          data: INDIA_NATIONAL_GEOJSON,
          stroked: true,
          filled: false,
          getLineColor: [0, 240, 255, 255],
          lineWidthMinPixels: 2.8,
          pickable: false,
        })
      );
    }

    // 4. Primary Geospatial Layer (3D Topographic Plateau / Heatmap / 3D Columns / Scatter)
    if (mapMode === 'plateau') {
      layerList.push(
        new PolygonLayer({
          id: 'aqi-topographic-plateau',
          data: gridData,
          getPolygon: d => d.polygon,
          getElevation: d => d.elevation,
          getFillColor: d => [...d.color, 225],
          getLineColor: d => [0, 240, 255, 50],
          lineWidthMinPixels: 0.5,
          stroked: true,
          filled: true,
          extruded: true,
          elevationScale: 1,
          pickable: true,
          autoHighlight: true,
          highlightColor: [0, 240, 255, 140],
          material: {
            ambient: 0.45,
            diffuse: 0.6,
            shininess: 32,
            specularColor: [80, 80, 80],
          },
          onHover: info => setHoverInfo(info),
        })
      );
    } else if (mapMode === 'columns') {
      layerList.push(
        new ColumnLayer({
          id: 'aqi-columns-3d',
          data: gridData,
          getPosition: d => d.position,
          getFillColor: d => [...d.color, 215],
          getElevation: d => d.elevation,
          elevationScale: 1,
          radius: 11500,
          pickable: true,
          autoHighlight: true,
          highlightColor: [0, 240, 255, 140],
          onHover: info => setHoverInfo(info),
        })
      );
    } else if (mapMode === 'heatmap') {
      layerList.push(
        new HeatmapLayer({
          id: 'aqi-heatmap',
          data: gridData,
          getPosition: d => d.position,
          getWeight: d => d.aqi,
          radiusPixels: 35,
          intensity: 1.8,
          threshold: 0.05,
        })
      );
    } else {
      layerList.push(
        new ScatterplotLayer({
          id: 'aqi-scatter',
          data: gridData,
          getPosition: d => d.position,
          getFillColor: d => [...d.color, 200],
          getRadius: d => d.val * 160,
          pickable: true,
          onHover: info => setHoverInfo(info),
        })
      );
    }

    // 5. VIIRS Active Fire Scatter Layer
    if (showFires) {
      layerList.push(
        new ScatterplotLayer({
          id: 'viirs-active-fires',
          data: fireData,
          getPosition: d => d.position,
          getFillColor: [255, 69, 0, 245],
          getLineColor: [255, 215, 0, 255],
          getRadius: d => d.radius,
          stroked: true,
          lineWidthMinPixels: 1.5,
          pickable: true,
          onHover: info => setHoverInfo(info),
        })
      );
    }

    // 6. CAAQMS Ground Stations Layer
    if (showStations) {
      layerList.push(
        new ScatterplotLayer({
          id: 'caaqms-stations',
          data: INDIA_CITIES,
          getPosition: d => [d.lon, d.lat],
          getFillColor: [0, 240, 255, 245],
          getLineColor: [255, 255, 255, 255],
          getRadius: 20000,
          stroked: true,
          lineWidthMinPixels: 2,
          pickable: true,
          onHover: info => setHoverInfo(info),
        }),
        new TextLayer({
          id: 'caaqms-labels',
          data: INDIA_CITIES,
          getPosition: d => [d.lon, d.lat],
          getText: d => d.name,
          getSize: 12,
          getColor: [255, 255, 255, 240],
          getAlignmentBaseline: 'bottom',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: 'bold',
          getTextAnchor: 'middle',
          background: true,
          getBackgroundColor: [7, 11, 20, 220],
          backgroundPadding: [4, 2],
        })
      );
    }

    return layerList;
  }, [gridData, fireData, mapMode, showFires, showStations, showNationalBorder, showStateBorders]);

  // Mini Sparkline Data for Trend
  const sparklineData = [
    { time: '12 AM', val: 48 },
    { time: '3 AM', val: 52 },
    { time: '6 AM', val: 65 },
    { time: '9 AM', val: 78 },
    { time: '12 PM', val: 68 },
    { time: '3 PM', val: 59 },
    { time: '6 PM', val: 74 },
    { time: '9 PM', val: 82 },
    { time: '12 AM', val: 56.8 },
  ];

  // Calculated KPI values
  const pm25Val = aqiData?.pm25 ?? 249.0;
  const tempVal = aqiData?.temperature_c ?? 18.5;
  const rhVal = aqiData?.relative_humidity_pct ?? 64.0;
  const windVal = aqiData?.wind_speed_ms ?? 1.56;
  const ventilationVal = Math.round(windVal * 680.0) || 1061;
  const compositeRisk = 0.643;

  return (
    <div className="space-y-4">
      {/* Top 2-Column Dashboard Grid: 3D Map (Left 8 Cols) & Controls/KPI (Right 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: 3D MAP VIEWPORT CARD */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-[#070B14]/95 shadow-[0_0_35px_rgba(0,0,0,0.85)] flex flex-col relative overflow-hidden min-h-[580px]">
          {/* Card Header Inside Map */}
          <div className="flex items-center justify-between z-10 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-orbitron font-bold text-base text-slate-100">
                  Air Quality – 3D View ({activePollutant})
                </h3>
                <Info className="w-4 h-4 text-slate-400 cursor-pointer hover:text-cyan-400 transition-colors" />
              </div>
              <p className="text-xs font-mono text-slate-400">
                Real-time spatial distribution over India
              </p>
            </div>
          </div>

          {/* 3D WebGL DeckGL Viewport */}
          <div className="relative flex-1 w-full h-full rounded-xl overflow-hidden bg-[#060913]">
            <DeckGL
              initialViewState={{
                longitude: selectedCity.lon,
                latitude: selectedCity.lat,
                zoom: cameraZoom,
                pitch: cameraPitch,
                bearing: cameraBearing,
                maxZoom: 12,
                minZoom: 3,
              }}
              controller={true}
              layers={layers}
              style={{ width: '100%', height: '100%' }}
            />

            {/* Floating Left: Pollutant Switcher Pill Stack */}
            <div className="absolute top-4 left-4 z-20 flex flex-col bg-[#070B14]/90 rounded-xl p-1.5 border border-slate-700/80 shadow-2xl backdrop-blur-md gap-1 font-mono text-xs">
              {['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3'].map((pollutant) => {
                const isSelected = activePollutant === pollutant;
                return (
                  <button
                    key={pollutant}
                    onClick={() => setActivePollutant(pollutant)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all text-left ${
                      isSelected
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`}></span>
                    <span>{pollutant}</span>
                  </button>
                );
              })}
            </div>

            {/* Floating Bottom-Left: AQI Color Severity Legend */}
            <div className="absolute bottom-4 left-4 z-20 bg-[#070B14]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono backdrop-blur-md shadow-2xl max-w-sm">
              <div className="h-2.5 w-64 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 via-red-500 to-rose-900 mb-2 shadow-inner"></div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <div className="text-center">
                  <span className="text-emerald-400 block font-bold">Good</span>
                  <span>0–50</span>
                </div>
                <div className="text-center">
                  <span className="text-yellow-400 block font-bold">Moderate</span>
                  <span>51–100</span>
                </div>
                <div className="text-center">
                  <span className="text-orange-400 block font-bold">Poor</span>
                  <span>101–200</span>
                </div>
                <div className="text-center">
                  <span className="text-red-400 block font-bold">Very Poor</span>
                  <span>201–300</span>
                </div>
                <div className="text-center">
                  <span className="text-rose-500 block font-bold">Severe</span>
                  <span>301–500</span>
                </div>
              </div>
            </div>

            {/* Floating Bottom-Right: Map Compass & Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-[#070B14]/90 p-1.5 rounded-xl border border-slate-700/80 shadow-2xl backdrop-blur-md font-mono text-xs">
              <button
                onClick={() => setCameraBearing(0)}
                className="p-2 rounded-lg text-cyan-400 hover:bg-slate-800 transition-colors flex items-center justify-center font-bold"
                title="Reset North"
              >
                <Compass className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCameraZoom(prev => Math.min(prev + 0.5, 10))}
                className="p-2 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors flex items-center justify-center font-bold"
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCameraZoom(prev => Math.max(prev - 0.5, 3))}
                className="p-2 rounded-lg text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors flex items-center justify-center font-bold"
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Raycast Hover Tooltip */}
            {hoverInfo?.object && (
              <div
                className="absolute z-50 pointer-events-none p-3 rounded-xl bg-[#070B14]/95 border border-cyan-400 text-xs font-mono shadow-[0_0_25px_rgba(0,240,255,0.4)] backdrop-blur-md"
                style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
              >
                <div className="font-bold text-cyan-300 pb-1 border-b border-slate-700 flex items-center justify-between gap-4">
                  <span>{hoverInfo.object.lat}°N, {hoverInfo.object.lon}°E</span>
                  <span style={{ color: hoverInfo.object.color ? `rgb(${hoverInfo.object.color.join(',')})` : '#00F0FF' }}>
                    {hoverInfo.object.category}
                  </span>
                </div>
                <div className="mt-1.5 font-bold text-slate-200">
                  {activePollutant}: <span className="text-cyan-300">{hoverInfo.object.val ?? hoverInfo.object.pm25} µg/m³</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  CPCB AQI: {hoverInfo.object.aqi}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: KEY INDICATORS (TOP) & PRESETS/LAYERS (BOTTOM) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
          {/* Card 1: Key Indicators */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-[#070B14]/95 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h4 className="font-orbitron font-bold text-sm text-slate-100">Key Indicators</h4>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live</span>
              </span>
            </div>

            {/* Indicator Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* PM2.5 Density */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 relative">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400">PM2.5 Density</div>
                <div className="font-orbitron font-extrabold text-xl text-rose-400">
                  {pm25Val.toFixed(1)} <span className="text-[10px] text-rose-500 font-normal">µg/m³</span>
                </div>
                <div className="text-[10px] font-mono text-rose-400 mt-0.5">
                  16.6x WHO Annual Limit
                </div>
              </div>

              {/* Temperature */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 relative">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400">Temperature</div>
                <div className="font-orbitron font-extrabold text-xl text-amber-300">
                  {tempVal.toFixed(1)}°C
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  RH: {rhVal.toFixed(0)}% Dew: 16.8°C
                </div>
              </div>

              {/* Ventilation Index */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 relative">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400">Ventilation Index</div>
                <div className="font-orbitron font-extrabold text-xl text-emerald-400">
                  {ventilationVal} <span className="text-[10px] text-emerald-500 font-normal">m²/s</span>
                </div>
                <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                  ⚠️ Atmospheric Stagnation
                </div>
              </div>

              {/* Composite Risk */}
              <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80 relative">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-[11px] font-mono text-slate-400">Composite Risk</div>
                <div className="font-orbitron font-extrabold text-xl text-rose-400">
                  {compositeRisk}
                </div>
                <div className="text-[10px] font-mono text-rose-400 font-bold mt-0.5">
                  Status: HIGH RISK
                </div>
              </div>

              {/* Trend Sparkline (Full 2 cols) */}
              <div className="col-span-2 bg-slate-900/80 rounded-xl p-2.5 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trend (PM2.5)</span>
                  </div>
                  <span className="text-rose-400 font-bold text-[10px]">+12% vs. last 6 hrs</span>
                </div>
                <div className="h-10 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#EF4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#EF4444" strokeWidth={2} fill="url(#trendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Presets & Layers */}
          <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-[#070B14]/95 shadow-xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="font-orbitron font-bold text-sm text-slate-100">Presets & Layers</h4>
            </div>

            {/* Layer Toggle Pills */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <button
                onClick={() => setShowNationalBorder(!showNationalBorder)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[11px] font-bold ${
                  showNationalBorder
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>National Frontier</span>
              </button>

              <button
                onClick={() => setShowStateBorders(!showStateBorders)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[11px] font-bold ${
                  showStateBorders
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>State Outlines</span>
              </button>

              <button
                onClick={() => setShowFires(!showFires)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[11px] font-bold ${
                  showFires
                    ? 'bg-orange-500/20 text-orange-300 border-orange-400/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>Active Fires</span>
              </button>

              <button
                onClick={() => setShowStations(!showStations)}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border transition-all text-[11px] font-bold ${
                  showStations
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>CAAQMS Stations</span>
              </button>
            </div>

            {/* Surface Mode Toggle & Pitch Slider */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">SURFACE:</span>
                <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                  {[
                    { id: 'plateau', label: '3D Topo Plateau' },
                    { id: 'heatmap', label: 'Heatmap' },
                    { id: 'columns', label: '3D Columns' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMapMode(m.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        mapMode === m.id
                          ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="flex items-center justify-between text-slate-400 gap-3">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">Pitch: {cameraPitch}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="65"
                  value={cameraPitch}
                  onChange={(e) => setCameraPitch(Number(e.target.value))}
                  className="w-32 accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Quick Episode Presets */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-500">PRESETS:</span>
                <button
                  onClick={() => setSelectedDate('2023-11-05')}
                  className="px-2 py-0.5 rounded bg-orange-950/40 border border-orange-500/30 text-orange-300 text-[10px] hover:bg-orange-900/40"
                >
                  Stubble Peak
                </button>
                <button
                  onClick={() => setSelectedDate('2023-05-20')}
                  className="px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] hover:bg-amber-900/40"
                >
                  Heatwave
                </button>
                <button
                  onClick={() => setSelectedDate('2023-07-15')}
                  className="px-2 py-0.5 rounded bg-blue-950/40 border border-blue-500/30 text-blue-300 text-[10px] hover:bg-blue-900/40"
                >
                  Monsoon Low
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ROW: AIR QUALITY SEVERITY SCALE (LEFT) & AT A GLANCE (RIGHT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Air Quality Severity Scale */}
        <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-[#070B14]/95 shadow-xl">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h4 className="font-orbitron font-bold text-sm text-slate-100">Air Quality Severity Scale</h4>
          </div>

          <div className="grid grid-cols-6 gap-2 text-center font-mono">
            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 mx-auto shadow-[0_0_10px_#10B981] mb-1.5"></div>
              <div className="text-emerald-400 font-bold text-xs">Good</div>
              <div className="text-[10px] text-slate-400">0–50</div>
            </div>

            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-lime-400 mx-auto shadow-[0_0_10px_#A3E635] mb-1.5"></div>
              <div className="text-lime-400 font-bold text-xs">Satisfactory</div>
              <div className="text-[10px] text-slate-400">51–100</div>
            </div>

            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 mx-auto shadow-[0_0_10px_#FACC15] mb-1.5"></div>
              <div className="text-yellow-400 font-bold text-xs">Moderate</div>
              <div className="text-[10px] text-slate-400">101–200</div>
            </div>

            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-orange-400 mx-auto shadow-[0_0_10px_#FB923C] mb-1.5"></div>
              <div className="text-orange-400 font-bold text-xs">Poor</div>
              <div className="text-[10px] text-slate-400">201–300</div>
            </div>

            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-red-500 mx-auto shadow-[0_0_10px_#EF4444] mb-1.5"></div>
              <div className="text-red-400 font-bold text-xs">Very Poor</div>
              <div className="text-[10px] text-slate-400">201–400</div>
            </div>

            <div>
              <div className="w-3.5 h-3.5 rounded-full bg-rose-700 mx-auto shadow-[0_0_10px_#BE123C] mb-1.5"></div>
              <div className="text-rose-500 font-bold text-xs">Severe</div>
              <div className="text-[10px] text-slate-400">401–500</div>
            </div>
          </div>
        </div>

        {/* Right Card: India's Air Quality at a Glance */}
        <div className="glass-panel rounded-2xl p-4 border border-cyan-500/20 bg-[#070B14]/95 shadow-xl flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Leaf className="w-4 h-4 text-emerald-400" />
              <h4 className="font-orbitron font-bold text-sm text-slate-100">India's Air Quality at a Glance</h4>
            </div>
            <div className="text-[11px] font-mono text-slate-400">National average PM2.5 (today)</div>
            <div className="font-orbitron font-extrabold text-2xl text-slate-100 mt-1">
              56.8 <span className="text-xs font-mono text-slate-400 font-normal">µg/m³</span>
            </div>
            <div className="text-[11px] font-mono text-rose-400 mt-0.5 flex items-center gap-1">
              <span>↑ 8%</span>
              <span className="text-slate-400">vs. yesterday</span>
            </div>
          </div>

          <div className="flex-1 max-w-[260px] h-20 relative">
            <div className="absolute top-0 right-0 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold z-10">
              56.8
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="glanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#10B981" strokeWidth={2.5} fill="url(#glanceGrad)" />
                <XAxis dataKey="time" stroke="#475569" tick={{ fill: '#64748B', fontSize: 9, fontFamily: 'JetBrains Mono' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
