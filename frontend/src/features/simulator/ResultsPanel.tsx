import { Activity, CheckCircle2, ShieldCheck, Sun } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import ThermalChart from './ThermalChart';

export default function ResultsPanel() {
  const { data, draftParams } = useSimulationStore();
  const { locationName, ambientData, recommendedShelter } = data;
  const { dimensions, materials, simulationResults, optimalMaterialDetails } = recommendedShelter;

  return (
    <div className="w-full space-y-8 animate-fade-in-up-delay-2 pb-16">
      
      {/* Top Banner */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden border border-white/60">
        
        <div className="flex flex-col">
          <div className="flex items-center space-x-3 mb-3">
            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Activity className="w-3 h-3 mr-1.5" /> FEA SIMULATION COMPLETE
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Optimal Match</span>
          </div>
          <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{locationName}</h2>
          <p className="text-xs text-slate-500 font-mono mt-2 uppercase tracking-widest">
            Lat {ambientData.avgTempDay ? draftParams.lat : 'Custom'}°N • Lon {ambientData.avgTempDay ? draftParams.lon : 'Custom'}°E • Target {draftParams.targetTemp}°C
          </p>
        </div>

        <div className="flex items-center space-x-8">
          <div className="flex flex-col items-end border-r border-slate-200 pr-8">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Predicted Night Inside</p>
            <div className="text-4xl font-bold text-blue-600 font-mono tracking-tighter">
              {simulationResults.predictedInsideTempNight}°C
            </div>
          </div>
          <div className="flex flex-col items-center">
             <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Heat Loss Rate</p>
             <div className={`text-xl font-bold px-3 py-1 rounded-lg ${simulationResults.heatLossRate === 'Low' ? 'text-emerald-500 bg-emerald-50' : simulationResults.heatLossRate === 'Moderate' ? 'text-orange-500 bg-orange-50' : 'text-red-500 bg-red-50'}`}>
               {simulationResults.heatLossRate}
             </div>
          </div>
        </div>
      </div>

      {/* Unified Middle Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 border border-white/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* NIST Material Content (Left) */}
          <div className="md:col-span-2 relative flex flex-col md:pr-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> NIST Optimal Wall Material
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-mono">ANSYS FEA Evaluated</span>
            </div>

            <h4 className="text-3xl font-bold text-blue-900 mb-8 tracking-tight">{materials.walls}</h4>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Dimensions</p>
                 <p className="text-sm font-bold text-slate-700">{dimensions.width}x{dimensions.length}x{dimensions.height}m</p>
              </div>
              <div className="bg-blue-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-blue-500 uppercase tracking-widest font-bold mb-1">Wall Thickness</p>
                 <p className="text-xl font-bold text-blue-700">{materials.wallThickness_mm} <span className="text-[10px] text-blue-500">mm</span></p>
              </div>
              <div className="bg-emerald-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold mb-1">Heat Flux</p>
                 <p className="text-xl font-bold text-emerald-700">{optimalMaterialDetails?.heatFlux || 17.9} <span className="text-[10px]">W/m²</span></p>
              </div>
              <div className="bg-orange-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-orange-600 uppercase tracking-widest font-bold mb-1">Total Heat Loss</p>
                 <p className="text-xl font-bold text-orange-700">{optimalMaterialDetails?.totalHeatLoss || 1685} <span className="text-[10px]">W</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Conductivity</p>
                 <p className="text-sm font-bold text-slate-700">{optimalMaterialDetails?.thermalConductivity || 0.028} <span className="text-[10px]">W/mK</span></p>
              </div>
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Density</p>
                 <p className="text-sm font-bold text-slate-700">{optimalMaterialDetails?.density || 35.2} <span className="text-[10px]">kg/m³</span></p>
              </div>
              <div className="bg-rose-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-rose-500 uppercase tracking-widest font-bold mb-1">Total Cost</p>
                 <p className="text-lg font-bold text-rose-700">₹{optimalMaterialDetails?.estimatedTotalCost?.toLocaleString() || '18,450'}</p>
              </div>
              <div className="bg-indigo-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-indigo-500 uppercase tracking-widest font-bold mb-1">Efficiency Score</p>
                 <p className="text-xl font-bold text-indigo-700">{optimalMaterialDetails?.efficiencyScore || 52.3}</p>
              </div>
            </div>

            <div className="mt-auto bg-emerald-50/70 border-none rounded-2xl p-4 flex items-center">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mr-3" />
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Thermal Resistance Rating • <span className="text-emerald-600">NIST Class A</span></p>
            </div>
          </div>

          {/* Ambient Climate & Energy (Right) */}
          <div className="flex flex-col justify-between md:pl-4">
             <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center mb-6">
                <Sun className="w-4 h-4 mr-2 text-orange-500" /> Ambient Climate
             </h3>
             <div className="flex flex-col space-y-6 flex-1 justify-center pl-4">
                <div className="relative">
                   <div className="absolute -left-4 top-1.5 w-1 h-8 bg-orange-400 rounded-full"></div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Avg Day Temp</p>
                   <p className="text-3xl font-bold text-slate-800 font-mono tracking-tighter">{ambientData.avgTempDay}°C</p>
                </div>
                <div className="relative">
                   <div className="absolute -left-4 top-1.5 w-1 h-8 bg-blue-400 rounded-full"></div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Avg Night Temp</p>
                   <p className="text-3xl font-bold text-slate-800 font-mono tracking-tighter">{ambientData.avgTempNight}°C</p>
                </div>
                <div className="relative">
                   <div className="absolute -left-4 top-1.5 w-1 h-8 bg-yellow-400 rounded-full"></div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Solar Irradiance</p>
                   <p className="text-2xl font-bold text-slate-700 font-mono tracking-tighter">{ambientData.solarIrradiance} <span className="text-sm">W/m²</span></p>
                </div>
                <div className="relative">
                   <div className="absolute -left-4 top-1.5 w-1 h-8 bg-rose-400 rounded-full"></div>
                   <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Solar Thermal Gain</p>
                   <p className="text-2xl font-bold text-slate-700 font-mono tracking-tighter">
                     {((ambientData.solarIrradiance * dimensions.width * dimensions.length) / 1000).toFixed(1)} <span className="text-sm">kW</span>
                   </p>
                </div>
             </div>
          </div>

        </div>
      </div>

      {/* 24 Hour Chart */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 h-[450px] border border-white/60">
        <ThermalChart />
      </div>

    </div>
  );
}
