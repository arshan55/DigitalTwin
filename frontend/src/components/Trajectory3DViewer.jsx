import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sparkles, Eye, RotateCcw, Play, Pause, Layers, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';

export default function Trajectory3DViewer({
  forecastSeries,
  selectedCity,
  targetVar,
  horizon,
  unit,
  aqiData,
}) {
  const mountRef = useRef(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [showHazardPlanes, setShowHazardPlanes] = useState(true);
  const [showConfidenceTube, setShowConfidenceTube] = useState(true);
  const [activeModelHighlight, setActiveModelHighlight] = useState('all'); // 'all' | 'xgboost' | 'lstm' | 'groundTruth'

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const nodesRef = useRef([]);
  const animFrameId = useRef(null);
  const controlsState = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 45,
    target: new THREE.Vector3(0, 10, 0),
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF6F4EE);
    scene.fog = new THREE.FogExp2(0xF6F4EE, 0.008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 2. Lighting (Warm Sun & Coastal Sky Glow)
    const ambientLight = new THREE.AmbientLight(0xEAE4D8, 1.8);
    scene.add(ambientLight);

    const sunPointLight = new THREE.PointLight(0xF1D3B7, 2.5, 120);
    sunPointLight.position.set(-20, 35, 20);
    scene.add(sunPointLight);

    const tealPointLight = new THREE.PointLight(0x5CB7A8, 2.0, 100);
    tealPointLight.position.set(20, 35, -10);
    scene.add(tealPointLight);

    // 3. Clean Coastal Grid Floor
    const gridHelper = new THREE.GridHelper(60, 30, 0x278E7B, 0xDDE7E4);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Floor Base Disc
    const floorGeo = new THREE.CircleGeometry(32, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xEAE4D8,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.05;
    scene.add(floorMesh);

    // 4. Data Processing & Geometry Construction
    const count = forecastSeries.length;
    const xStep = 44 / (count - 1);
    const xStart = -22;

    const maxVal = Math.max(...forecastSeries.map(d => Math.max(d.upperBand ?? d.groundTruth ?? d.xgboost ?? 100, 150)));
    const yScale = 24 / (maxVal || 1);

    // Prepare point coordinates
    const histPoints = [];
    const xgbPoints = [];
    const lstmPoints = [];
    const upperPoints = [];
    const lowerPoints = [];
    const interactiveNodes = [];

    forecastSeries.forEach((d, i) => {
      const x = xStart + i * xStep;

      // Historical Ground Truth
      if (d.groundTruth !== null) {
        const y = d.groundTruth * yScale;
        const pt = new THREE.Vector3(x, y, 0);
        histPoints.push(pt);

        interactiveNodes.push({
          pos: pt,
          data: d,
          type: 'Historical Observation',
          color: '#278E7B',
          val: d.groundTruth,
        });
      }

      // Forecast Points
      if (d.isForecast || i === 14) {
        if (d.xgboost !== null) {
          const yXgb = d.xgboost * yScale;
          const ptXgb = new THREE.Vector3(x, yXgb, -2);
          xgbPoints.push(ptXgb);

          if (d.isForecast) {
            interactiveNodes.push({
              pos: ptXgb,
              data: d,
              type: 'XGBoost Champion',
              color: '#5CB7A8',
              val: d.xgboost,
            });
          }
        }

        if (d.lstm !== null) {
          const yLstm = d.lstm * yScale;
          const ptLstm = new THREE.Vector3(x, yLstm, 2);
          lstmPoints.push(ptLstm);

          if (d.isForecast) {
            interactiveNodes.push({
              pos: ptLstm,
              data: d,
              type: 'PyTorch LSTM',
              color: '#DEAC83',
              val: d.lstm,
            });
          }
        }

        if (d.upperBand !== null && d.lowerBand !== null) {
          upperPoints.push(new THREE.Vector3(x, d.upperBand * yScale, -2));
          lowerPoints.push(new THREE.Vector3(x, d.lowerBand * yScale, -2));
        }
      }
    });

    // 5. Build Smooth Continuous Tubes (Curves)
    if (histPoints.length > 1) {
      const histCurve = new THREE.CatmullRomCurve3(histPoints);
      const histTubeGeo = new THREE.TubeGeometry(histCurve, 64, 0.45, 12, false);
      const histTubeMat = new THREE.MeshStandardMaterial({
        color: 0x278e7b,
        emissive: 0x1d6c5d,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.6,
      });
      const histTube = new THREE.Mesh(histTubeGeo, histTubeMat);
      scene.add(histTube);

      // Historical Translucent Curtain Area down to floor
      const shape = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i < histPoints.length - 1; i++) {
        const p1 = histPoints[i];
        const p2 = histPoints[i + 1];
        vertices.push(
          p1.x, p1.y, p1.z,  p1.x, 0, p1.z,  p2.x, p2.y, p2.z,
          p2.x, p2.y, p2.z,  p1.x, 0, p1.z,  p2.x, 0, p2.z
        );
      }
      shape.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const curtainMat = new THREE.MeshBasicMaterial({
        color: 0x278e7b,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
      });
      scene.add(new THREE.Mesh(shape, curtainMat));
    }

    if (xgbPoints.length > 1) {
      const xgbCurve = new THREE.CatmullRomCurve3(xgbPoints);
      const xgbTubeGeo = new THREE.TubeGeometry(xgbCurve, 64, 0.55, 12, false);
      const xgbTubeMat = new THREE.MeshStandardMaterial({
        color: 0x5cb7a8,
        emissive: 0x3d8d80,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.7,
      });
      const xgbTube = new THREE.Mesh(xgbTubeGeo, xgbTubeMat);
      scene.add(xgbTube);
    }

    if (lstmPoints.length > 1) {
      const lstmCurve = new THREE.CatmullRomCurve3(lstmPoints);
      const lstmTubeGeo = new THREE.TubeGeometry(lstmCurve, 64, 0.35, 12, false);
      const lstmTubeMat = new THREE.MeshStandardMaterial({
        color: 0xdeac83,
        emissive: 0xb57847,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.5,
      });
      const lstmTube = new THREE.Mesh(lstmTubeGeo, lstmTubeMat);
      scene.add(lstmTube);
    }

    // 6. 3D Confidence Ribbon Mesh (90% predictive interval)
    if (upperPoints.length > 1 && lowerPoints.length > 1 && showConfidenceTube) {
      const ribbonGeo = new THREE.BufferGeometry();
      const ribbonVertices = [];
      for (let i = 0; i < upperPoints.length - 1; i++) {
        const u1 = upperPoints[i];
        const u2 = upperPoints[i + 1];
        const l1 = lowerPoints[i];
        const l2 = lowerPoints[i + 1];
        ribbonVertices.push(
          u1.x, u1.y, u1.z,  l1.x, l1.y, l1.z,  u2.x, u2.y, u2.z,
          u2.x, u2.y, u2.z,  l1.x, l1.y, l1.z,  l2.x, l2.y, l2.z
        );
      }
      ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVertices, 3));
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0x9bcdc2,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
      });
      scene.add(new THREE.Mesh(ribbonGeo, ribbonMat));
    }

    // 7. Cutoff Plane Marker ("Nowcast Horizon")
    const cutoffX = xStart + 14 * xStep;
    const cutoffGeo = new THREE.PlaneGeometry(12, 26);
    const cutoffMat = new THREE.MeshBasicMaterial({
      color: 0x278e7b,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const cutoffMesh = new THREE.Mesh(cutoffGeo, cutoffMat);
    cutoffMesh.rotation.y = Math.PI / 2;
    cutoffMesh.position.set(cutoffX, 13, 0);
    scene.add(cutoffMesh);

    // 8. CPCB Reference Hazard Horizontal Wireframe Planes
    if (showHazardPlanes && targetVar === 'PM2.5') {
      const createHazardPlane = (val, colorHex) => {
        const planeGeo = new THREE.PlaneGeometry(50, 16);
        const planeMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.12,
          wireframe: true,
          side: THREE.DoubleSide,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = Math.PI / 2;
        plane.position.set(0, val * yScale, 0);
        return plane;
      };

      scene.add(createHazardPlane(60, 0x278e7b));  // Satisfactory
      scene.add(createHazardPlane(120, 0xdeac83)); // Moderate
      scene.add(createHazardPlane(250, 0xe05a47)); // Severe
    }

    // 9. Interactive 3D Sphere Data Nodes
    const sphereGeo = new THREE.SphereGeometry(0.55, 16, 16);
    const sphereMeshList = [];

    interactiveNodes.forEach((node) => {
      const color = new THREE.Color(node.color);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.7,
        roughness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.copy(node.pos);
      sphere.userData = node;
      scene.add(sphere);
      sphereMeshList.push(sphere);
    });
    nodesRef.current = sphereMeshList;

    // 10. Animation & Camera Orbit Loop
    const updateCamera = () => {
      const cs = controlsState.current;
      camera.position.x = cs.target.x + cs.radius * Math.sin(cs.phi) * Math.sin(cs.theta);
      camera.position.y = cs.target.y + cs.radius * Math.cos(cs.phi);
      camera.position.z = cs.target.z + cs.radius * Math.sin(cs.phi) * Math.cos(cs.theta);
      camera.lookAt(cs.target);
    };

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameId.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (isAutoRotate && !controlsState.current.isDragging) {
        controlsState.current.theta += delta * 0.18;
      }
      updateCamera();
      renderer.render(scene, camera);
    };
    animate();

    // 11. Mouse & Raycasting Event Listeners
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      mouse.x = (x / rect.width) * 2 - 1;
      mouse.y = -(y / rect.height) * 2 + 1;

      if (controlsState.current.isDragging) {
        const dx = e.clientX - controlsState.current.prevX;
        const dy = e.clientY - controlsState.current.prevY;
        controlsState.current.prevX = e.clientX;
        controlsState.current.prevY = e.clientY;

        controlsState.current.theta -= dx * 0.008;
        controlsState.current.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, controlsState.current.phi - dy * 0.008));
        return;
      }

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesRef.current);

      if (intersects.length > 0) {
        const obj = intersects[0].object;
        setHoveredPoint({
          ...obj.userData,
          screenX: x,
          screenY: y,
        });
      } else {
        setHoveredPoint(null);
      }
    };

    const onPointerDown = (e) => {
      controlsState.current.isDragging = true;
      controlsState.current.prevX = e.clientX;
      controlsState.current.prevY = e.clientY;
    };

    const onPointerUp = () => {
      controlsState.current.isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      controlsState.current.radius = Math.max(15, Math.min(90, controlsState.current.radius + e.deltaY * 0.05));
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameId.current);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [forecastSeries, targetVar, horizon, isAutoRotate, showHazardPlanes, showConfidenceTube]);

  const resetView = () => {
    controlsState.current.theta = Math.PI / 4;
    controlsState.current.phi = Math.PI / 3;
    controlsState.current.radius = 45;
  };

  return (
    <div className="relative w-full h-[460px] rounded-xl overflow-hidden border border-[#DDE7E4] bg-[#F6F4EE] shadow-sm">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Telemetry Readout */}
      <div className="absolute top-4 left-4 p-3.5 rounded-xl bg-white/95 border border-[#DDE7E4] text-xs font-mono text-[#133B34] backdrop-blur-md shadow-lg max-w-sm">
        <div className="flex items-center gap-2 font-orbitron font-bold text-[#278E7B] pb-1.5 border-b border-[#DDE7E4]">
          <Sparkles className="w-4 h-4 text-[#278E7B]" />
          <span>3D SPACE-TIME DISPERSION</span>
        </div>
        <div className="mt-2 space-y-1 text-[11px]">
          <div className="flex justify-between text-[#527E75]">
            <span>DOMAIN:</span>
            <span className="text-[#133B34] font-bold">{selectedCity.name}</span>
          </div>
          <div className="flex justify-between text-[#527E75]">
            <span>VARIABLE:</span>
            <span className="text-[#278E7B] font-bold">{targetVar} ({unit})</span>
          </div>
          <div className="flex justify-between text-[#527E75]">
            <span>HORIZON:</span>
            <span className="text-[#5CB7A8] font-bold">+{horizon}-Day Forward Lead</span>
          </div>
        </div>
      </div>

      {/* Top Right 3D Interactive Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/95 p-1.5 rounded-xl border border-[#DDE7E4] font-mono text-xs backdrop-blur-md shadow-lg">
        <button
          onClick={() => setIsAutoRotate(!isAutoRotate)}
          className={`p-2 rounded-lg transition-colors ${
            isAutoRotate ? 'bg-[#278E7B] text-white shadow-xs' : 'text-[#527E75] hover:text-[#133B34]'
          }`}
          title={isAutoRotate ? 'Pause Rotation' : 'Auto Rotate'}
        >
          {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setShowHazardPlanes(!showHazardPlanes)}
          className={`p-2 rounded-lg transition-colors ${
            showHazardPlanes ? 'bg-[#E05A47] text-white shadow-xs' : 'text-[#527E75] hover:text-[#133B34]'
          }`}
          title="Toggle CPCB Threshold Planes"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowConfidenceTube(!showConfidenceTube)}
          className={`p-2 rounded-lg transition-colors ${
            showConfidenceTube ? 'bg-[#5CB7A8] text-white shadow-xs' : 'text-[#527E75] hover:text-[#133B34]'
          }`}
          title="Toggle 90% Confidence Tube"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetView}
          className="p-2 rounded-lg text-[#527E75] hover:text-[#133B34] hover:bg-[#9BCDC2]/20 transition-colors"
          title="Reset Camera Angle"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom 3D Tracks Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-white/95 border border-[#DDE7E4] text-xs font-mono backdrop-blur-md shadow-md">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#278E7B] shadow-xs"></span>
            <span className="text-[#278E7B] font-bold">Historical Ground Truth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#5CB7A8] shadow-xs"></span>
            <span className="text-[#133B34] font-bold">XGBoost Champion (Prediction)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#DEAC83] shadow-xs"></span>
            <span className="text-[#8C4F18] font-bold">PyTorch LSTM Track</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-2 rounded bg-[#9BCDC2]/50 border border-[#5CB7A8]"></span>
            <span className="text-[#527E75] font-bold">90% Confidence Tube</span>
          </div>
        </div>

        <div className="text-[11px] text-[#527E75] hidden sm:block font-bold">
          LEFT CLICK + DRAG TO ORBIT · SCROLL TO ZOOM
        </div>
      </div>

      {/* Interactive 3D Node Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-50 pointer-events-none p-3 rounded-xl bg-white/95 border border-[#5CB7A8] text-xs font-mono shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-3 text-[#133B34]"
          style={{ left: hoveredPoint.screenX, top: hoveredPoint.screenY }}
        >
          <div className="font-bold text-[#278E7B] pb-1 border-b border-[#DDE7E4]">
            {hoveredPoint.data.date} · {hoveredPoint.type}
          </div>
          <div className="mt-1.5 font-bold text-[#133B34]">
            Value: <span style={{ color: hoveredPoint.color }}>{hoveredPoint.val} {unit}</span>
          </div>
          {hoveredPoint.data.upperBand && (
            <div className="text-[11px] text-[#527E75] mt-1">
              90% Interval: [{hoveredPoint.data.lowerBand} – {hoveredPoint.data.upperBand}]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
