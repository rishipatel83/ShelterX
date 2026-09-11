import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, MapPin, Zap } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ position, setPosition }: { position: [number, number], setPosition: (p: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 12, { animate: true, duration: 1.5 });
  }, [position, map]);

  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function StudioControls() {
  const { draftParams, setDraftParam, setLocationPreset, fetchSimulation } = useSimulationStore();
  const position: [number, number] = [draftParams.lat, draftParams.lon];

  const handleSetPosition = (p: [number, number]) => {
    setDraftParam('lat', parseFloat(p[0].toFixed(6)));
    setDraftParam('lon', parseFloat(p[1].toFixed(6)));
  };

  const handleFetchLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        handleSetPosition([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  };

  return (
    <div className="w-full bg-white/70 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 p-8 flex flex-col space-y-8 animate-fade-in-up-delay-1 border border-white/60">
      
      {/* Top Section: Presets & Map Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left: Presets and GPS */}
        <div className="flex flex-col space-y-6">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 block">Preset Environments</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'laddakh', name: 'Laddakh', subtitle: '-15°C night', icon: '🏔️' },
                { id: 'siachen', name: 'Siachen', subtitle: 'Glacier -30°C', icon: '❄️' },
                { id: 'dras', name: 'Dras', subtitle: 'Coldest town', icon: '🥶' },
                { id: 'leh', name: 'Leh', subtitle: 'Alpine plateau', icon: '⛺' }
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setLocationPreset(preset.id)}
                  className="flex flex-col items-start p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all text-left min-w-[120px] shadow-sm"
                >
                  <span className="text-xl mb-1">{preset.icon}</span>
                  <span className="text-sm font-bold text-slate-700">{preset.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">{preset.subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 block">Custom Coordinates</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-medium">Latitude °N</label>
                <input 
                  type="number" 
                  value={draftParams.lat} 
                  onChange={(e) => setDraftParam('lat', parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-medium">Longitude °E</label>
                <input 
                  type="number" 
                  value={draftParams.lon} 
                  onChange={(e) => setDraftParam('lon', parseFloat(e.target.value))}
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none"
                />
              </div>
            </div>
            
            <button 
              onClick={handleFetchLocation}
              className="w-full flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl px-4 py-3 transition-colors text-sm font-semibold"
            >
              <Crosshair className="w-4 h-4 text-blue-500" />
              <span>Fetch GPS Location</span>
            </button>
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex flex-col h-full min-h-[300px]">
           <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3 flex items-center">
             <MapPin className="w-3 h-3 mr-1.5" /> Interactive Map
           </label>
           <div className="flex-1 w-full rounded-2xl overflow-hidden relative z-0 border border-slate-100 shadow-sm">
             <MapContainer center={position} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={true}>
               <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
               <Marker position={position} />
               <MapController position={position} setPosition={handleSetPosition} />
             </MapContainer>
           </div>
        </div>
      </div>

      {/* Middle Section: Sliders and Params */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-100">
        <div>
          <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center mb-5">
            <Zap className="w-3 h-3 mr-1.5 text-blue-500" /> Target Comfort Temp
          </label>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] text-slate-400 font-mono">10°C</span>
            <span className="text-2xl font-bold text-slate-800">{draftParams.targetTemp}°C</span>
            <span className="text-[10px] text-slate-400 font-mono">28°C</span>
          </div>
          <input 
            type="range" min="10" max="28" step="1" 
            value={draftParams.targetTemp} onChange={(e) => setDraftParam('targetTemp', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div>
           <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center mb-4">
             Shelter Dimensions (M)
           </label>
           <div className="grid grid-cols-3 gap-3">
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
               <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 text-center">Length</label>
               <input type="number" value={draftParams.length} onChange={(e) => setDraftParam('length', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-lg font-bold text-slate-800 outline-none" />
             </div>
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
               <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 text-center">Width</label>
               <input type="number" value={draftParams.width} onChange={(e) => setDraftParam('width', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-lg font-bold text-slate-800 outline-none" />
             </div>
             <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
               <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1 text-center">Height</label>
               <input type="number" value={draftParams.height} onChange={(e) => setDraftParam('height', parseFloat(e.target.value))} className="w-full bg-transparent border-none text-center text-lg font-bold text-slate-800 outline-none" />
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
        <div>
           <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 block">Shelter Model</label>
           <select value={draftParams.shelterModel} onChange={(e) => setDraftParam('shelterModel', e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
             <option value="Modular Box">Modular Box (Standard)</option>
             <option value="Dome">Dome Shelter (Arctic)</option>
             <option value="Quonset">Quonset Hut (Army Arch)</option>
             <option value="A-Frame">A-Frame Hut</option>
           </select>
        </div>
        <div>
           <label className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2 block">Solar Orientation</label>
           <select value={draftParams.orientation} onChange={(e) => setDraftParam('orientation', e.target.value)} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100">
             <option value="South-Facing">South-Facing (Max Solar Gain)</option>
             <option value="North-Facing">North-Facing</option>
             <option value="East-West">East-West Alignment</option>
           </select>
        </div>
      </div>

      {/* Execute Button */}
      <div className="pt-8 border-t border-slate-100 flex justify-center">
        <button 
          onClick={fetchSimulation}
          className="group flex items-center justify-center space-x-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-12 py-4 transition-all shadow-[0_8px_30px_rgba(15,23,42,0.15)] border border-slate-800 w-full md:w-auto min-w-[300px]"
        >
          <div className="bg-emerald-500/10 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
             <Zap className="w-4 h-4 text-emerald-400" fill="currentColor" />
          </div>
          <span className="font-bold tracking-wide uppercase text-sm">Execute Simulation</span>
        </button>
      </div>

    </div>
  );
}
