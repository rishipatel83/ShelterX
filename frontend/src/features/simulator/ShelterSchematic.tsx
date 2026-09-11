import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Loader2 } from 'lucide-react';

function ModularBox({ w, h, l, t, viewMode }: { w: number, h: number, l: number, t: number, viewMode: string }) {
  const wallMat = new THREE.MeshPhysicalMaterial({ 
    color: viewMode === 'thermal' ? '#f43f5e' : (viewMode === 'blueprint' ? '#3b82f6' : '#e2e8f0'),
    wireframe: viewMode === 'blueprint',
    transparent: true,
    opacity: viewMode === 'insulation' ? 0.3 : 0.85,
    roughness: 0.4,
    transmission: viewMode === 'blueprint' ? 0 : 0.2, // Gives a glassy/plastic look
    side: THREE.DoubleSide
  });

  return (
    <group position={[0, h/2, 0]}>
      {/* Front Wall */}
      <mesh position={[0, 0, l/2]} material={wallMat}>
        <boxGeometry args={[w + t*2, h, t]} />
      </mesh>
      {/* Back Wall */}
      <mesh position={[0, 0, -l/2]} material={wallMat}>
        <boxGeometry args={[w + t*2, h, t]} />
      </mesh>
      {/* Left Wall */}
      <mesh position={[-w/2, 0, 0]} material={wallMat}>
        <boxGeometry args={[t, h, l]} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[w/2, 0, 0]} material={wallMat}>
        <boxGeometry args={[t, h, l]} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, h/2, 0]} material={wallMat}>
        <boxGeometry args={[w + t*2, t, l + t*2]} />
      </mesh>
    </group>
  );
}

function DomeShelter({ r, t, viewMode }: { r: number, t: number, viewMode: string }) {
  const wallMat = new THREE.MeshPhysicalMaterial({ 
    color: viewMode === 'thermal' ? '#f43f5e' : (viewMode === 'blueprint' ? '#3b82f6' : '#e2e8f0'),
    wireframe: viewMode === 'blueprint',
    transparent: true,
    opacity: viewMode === 'insulation' ? 0.3 : 0.85,
    roughness: 0.4,
    transmission: viewMode === 'blueprint' ? 0 : 0.2,
    side: THREE.DoubleSide
  });

  return (
    <group position={[0, 0, 0]}>
      <mesh material={wallMat} position={[0, 0, 0]}>
         <sphereGeometry args={[r + t, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function QuonsetHut({ w, l, t, viewMode }: { w: number, l: number, t: number, viewMode: string }) {
  const r = w / 2;
  const wallMat = new THREE.MeshPhysicalMaterial({ 
    color: viewMode === 'thermal' ? '#f43f5e' : (viewMode === 'blueprint' ? '#3b82f6' : '#e2e8f0'),
    wireframe: viewMode === 'blueprint',
    transparent: true,
    opacity: viewMode === 'insulation' ? 0.3 : 0.85,
    roughness: 0.4,
    transmission: viewMode === 'blueprint' ? 0 : 0.2,
    side: THREE.DoubleSide
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Arch */}
      <mesh material={wallMat} position={[0, 0, 0]} rotation={[0, 0, 0]}>
         <cylinderGeometry args={[r + t, r + t, l, 32, 1, false, 0, Math.PI]} />
         <group rotation={[Math.PI/2, Math.PI/2, 0]} />
      </mesh>
      
      {/* Front and Back caps */}
      <mesh material={wallMat} position={[0, 0, l/2]}>
         <circleGeometry args={[r + t, 32, 0, Math.PI]} />
      </mesh>
      <mesh material={wallMat} position={[0, 0, -l/2]} rotation={[0, Math.PI, 0]}>
         <circleGeometry args={[r + t, 32, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

function AFrameHut({ w, l, h, t, viewMode }: { w: number, l: number, h: number, t: number, viewMode: string }) {
  const wallMat = new THREE.MeshPhysicalMaterial({ 
    color: viewMode === 'thermal' ? '#f43f5e' : (viewMode === 'blueprint' ? '#3b82f6' : '#e2e8f0'),
    wireframe: viewMode === 'blueprint',
    transparent: true,
    opacity: viewMode === 'insulation' ? 0.3 : 0.85,
    roughness: 0.4,
    transmission: viewMode === 'blueprint' ? 0 : 0.2,
    side: THREE.DoubleSide
  });

  const sideLength = Math.sqrt(Math.pow(w/2, 2) + Math.pow(h, 2));
  const angle = Math.atan2(h, w/2);

  return (
    <group position={[0, 0, 0]}>
      <mesh material={wallMat} position={[-w/4, h/2, 0]} rotation={[0, 0, angle]}>
         <boxGeometry args={[sideLength + t, t, l]} />
      </mesh>
      <mesh material={wallMat} position={[w/4, h/2, 0]} rotation={[0, 0, -angle]}>
         <boxGeometry args={[sideLength + t, t, l]} />
      </mesh>
      <mesh material={wallMat} position={[0, h/2, l/2]} rotation={[Math.PI/2, 0, Math.PI/2]}>
         <cylinderGeometry args={[w/2, w/2, h, 3, 1, false, 0, Math.PI]} />
      </mesh>
      <mesh material={wallMat} position={[0, h/2, -l/2]} rotation={[Math.PI/2, 0, Math.PI/2]}>
         <cylinderGeometry args={[w/2, w/2, h, 3, 1, false, 0, Math.PI]} />
      </mesh>
    </group>
  );
}

export default function ShelterSchematic() {
  const { draftParams, data } = useSimulationStore();
  const { ambientData } = data;
  const [viewMode, setViewMode] = useState<'solid' | 'blueprint' | 'thermal' | 'insulation'>('solid');

  const w = draftParams.width;
  const l = draftParams.length;
  const h = draftParams.height;
  const t = draftParams.wallThickness / 1000;

  return (
    <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 p-8 flex flex-col h-[600px] border border-white/60 animate-fade-in-up-delay-2">
      
      <div className="flex justify-between items-center z-10 relative">
        <div className="flex flex-col">
          <h2 className="text-sm font-bold tracking-widest text-slate-800 uppercase flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></span> WEBGL 3D HABITAT ENGINE
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            {draftParams.shelterModel} | {w}m x {l}m x {h}m
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mb-0.5">🌡 OUT</span>
            <span className="text-sm font-bold text-slate-700">{ambientData.avgTempNight}°C</span>
          </div>
          <div className="flex flex-col items-center bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
            <span className="text-[8px] text-blue-600 uppercase tracking-widest font-bold mb-0.5">🌡 IN</span>
            <span className="text-sm font-bold text-blue-700">{data.recommendedShelter.simulationResults.predictedInsideTempNight}°C</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full mt-6 bg-[#fafafa] rounded-2xl overflow-hidden cursor-move relative border border-slate-100/50 inset-shadow-sm">
        <Suspense fallback={<div className="flex flex-col items-center justify-center h-full text-slate-400 font-mono"><Loader2 className="w-6 h-6 animate-spin mb-3 text-blue-500" />LOADING ENGINE</div>}>
          <Canvas camera={{ position: [6, 5, 8], fov: 45 }}>
            <ambientLight intensity={1.5} color="#ffffff" />
            <directionalLight position={[10, 10, 5]} intensity={2} color="#ffffff" />
            
            <group rotation-y={draftParams.orientation === 'South-Facing' ? 0 : draftParams.orientation === 'North-Facing' ? Math.PI : Math.PI/2}>
               {draftParams.shelterModel === 'Modular Box' && <ModularBox w={w} h={h} l={l} t={t} viewMode={viewMode} />}
               {draftParams.shelterModel === 'Dome' && <DomeShelter r={Math.max(w, l)/2} t={t} viewMode={viewMode} />}
               {draftParams.shelterModel === 'Quonset' && <QuonsetHut w={w} l={l} t={t} viewMode={viewMode} />}
               {draftParams.shelterModel === 'A-Frame' && <AFrameHut w={w} l={l} h={h} t={t} viewMode={viewMode} />}
            </group>
            
            <mesh position={[0, -0.01, 0]} rotation={[-Math.PI/2, 0, 0]}>
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#f1f5f9" transparent opacity={0.6} roughness={1} />
            </mesh>

            <Grid infiniteGrid fadeDistance={40} sectionColor="#cbd5e1" cellColor="#f1f5f9" sectionThickness={1} cellThickness={0.5} position={[0, 0, 0]} />
            <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} autoRotate autoRotateSpeed={0.5} />
          </Canvas>
        </Suspense>

        <div className="absolute bottom-4 right-4 flex space-x-2 bg-white/80 backdrop-blur px-2 py-1.5 rounded-xl border border-slate-200/50 shadow-sm">
          {['solid', 'blueprint', 'thermal', 'insulation'].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`text-[9px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-lg transition-colors ${
                viewMode === mode ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/50 shadow-sm">
          <span className="text-[10px] text-slate-500 font-mono tracking-wide">Orientation: {draftParams.orientation}</span>
        </div>
      </div>
    </div>
  );
}