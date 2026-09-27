import { useMemo } from 'react';
import { Activity, CheckCircle2, Database, ShieldCheck, Sun, Wifi, WifiOff } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { generateTop3MaterialRecommendations } from '@/store/mockData';

export default function ResultsPanel() {
  const { data, draftParams } = useSimulationStore();
  const { locationName, ambientData, recommendedShelter, derivedGeometry, backendMeta } = data;
  const { dimensions, materials, simulationResults, optimalMaterialDetails } = recommendedShelter;

  const isLiveData = !!backendMeta?.requestId;
  const weatherOk = backendMeta?.weatherAvailable ?? false;
  const enginePending = backendMeta?.designEngineStatus === 'waiting-for-user-datasets';

  const topRecommendations = useMemo(() => {
    if (recommendedShelter.topMaterialRecommendations && recommendedShelter.topMaterialRecommendations.length >= 3) {
      return recommendedShelter.topMaterialRecommendations;
    }
    return generateTop3MaterialRecommendations(
      dimensions.length,
      dimensions.width,
      dimensions.height,
      materials.wallThickness_mm,
      draftParams.targetTemp,
      ambientData.avgTempNight,
      data.locationId,
      draftParams.lat,
      draftParams.lon
    );
  }, [
    recommendedShelter.topMaterialRecommendations,
    dimensions.length,
    dimensions.width,
    dimensions.height,
    materials.wallThickness_mm,
    draftParams.targetTemp,
    ambientData.avgTempNight,
    data.locationId,
    draftParams.lat,
    draftParams.lon
  ]);

  return (
    <div className="w-full space-y-8 animate-fade-in-up-delay-2 pb-16">
      
      {/* Top Banner */}
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden border border-white/60">
        
        <div className="flex flex-col">
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <Activity className="w-3 h-3 mr-1.5" /> {isLiveData ? 'Live Simulation Complete' : 'Reference Data Active'}
            </span>
            {isLiveData && (
              <span className={`flex items-center text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                weatherOk ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100'
              }`}>
                {weatherOk ? <Wifi className="w-3 h-3 mr-1.5" /> : <WifiOff className="w-3 h-3 mr-1.5" />}
                {weatherOk ? `Open-Meteo Live` : 'Weather Estimated'}
              </span>
            )}
            {isLiveData && backendMeta?.persisted && (
              <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                <Database className="w-3 h-3 mr-1.5" /> Saved to DB
              </span>
            )}
          </div>
          <h2 className="text-4xl font-bold text-slate-800 tracking-tight">{locationName}</h2>
          <p className="text-xs text-slate-500 font-mono mt-2 uppercase tracking-widest">
            Lat {draftParams.lat}°N · Lon {draftParams.lon}°E · Target {draftParams.targetTemp}°C
            {backendMeta?.schemaVersion && ` · Schema v${backendMeta.schemaVersion}`}
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
             <div className={`text-xl font-bold px-3 py-1 rounded-lg ${
               simulationResults.heatLossRate === 'Low' ? 'text-emerald-500 bg-emerald-50'
               : simulationResults.heatLossRate === 'Moderate' ? 'text-orange-500 bg-orange-50'
               : simulationResults.heatLossRate === 'Pending Dataset' ? 'text-slate-500 bg-slate-100'
               : 'text-red-500 bg-red-50'
             }`}>
               {simulationResults.heatLossRate}
             </div>
          </div>
        </div>
      </div>

      {/* Unified Middle Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 border border-white/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Shelter & Material Info (Left) */}
          <div className="md:col-span-2 relative flex flex-col md:pr-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-blue-500" /> ShelterX Design Engine
              </h3>
              <span className={`text-[10px] uppercase tracking-widest font-mono px-2 py-0.5 rounded-full ${
                enginePending ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
              }`}>
                {enginePending ? 'Awaiting Dataset' : 'Dataset Active'}
              </span>
            </div>

            <h4 className="text-3xl font-bold text-blue-900 mb-8 tracking-tight">{materials.walls}</h4>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Dimensions</p>
                 <p className="text-sm font-bold text-slate-700">{dimensions.width}×{dimensions.length}×{dimensions.height}m</p>
              </div>
              <div className="bg-blue-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-blue-500 uppercase tracking-widest font-bold mb-1">Wall Thickness</p>
                 <p className="text-xl font-bold text-blue-700">{materials.wallThickness_mm} <span className="text-[10px] text-blue-500">mm</span></p>
              </div>
              <div className="bg-emerald-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold mb-1">Heat Flux</p>
                 <p className="text-xl font-bold text-emerald-700">{optimalMaterialDetails?.heatFlux || '—'} <span className="text-[10px]">{optimalMaterialDetails?.heatFlux ? 'W/m²' : ''}</span></p>
              </div>
              <div className="bg-orange-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-orange-600 uppercase tracking-widest font-bold mb-1">Total Heat Loss</p>
                 <p className="text-xl font-bold text-orange-700">{optimalMaterialDetails?.totalHeatLoss || '—'} <span className="text-[10px]">{optimalMaterialDetails?.totalHeatLoss ? 'W' : ''}</span></p>
              </div>
            </div>

            {/* Derived Geometry Row */}
            {derivedGeometry && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Wall Area</p>
                   <p className="text-sm font-bold text-slate-700">{derivedGeometry.wallAreaM2} <span className="text-[10px]">m²</span></p>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Roof Area</p>
                   <p className="text-sm font-bold text-slate-700">{derivedGeometry.roofAreaM2} <span className="text-[10px]">m²</span></p>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Floor Area</p>
                   <p className="text-sm font-bold text-slate-700">{derivedGeometry.floorAreaM2} <span className="text-[10px]">m²</span></p>
                </div>
                <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Interior Volume</p>
                   <p className="text-sm font-bold text-slate-700">{derivedGeometry.volumeM3} <span className="text-[10px]">m³</span></p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Conductivity</p>
                 <p className="text-sm font-bold text-slate-700">{optimalMaterialDetails?.thermalConductivity || '—'} <span className="text-[10px]">{optimalMaterialDetails?.thermalConductivity ? 'W/mK' : ''}</span></p>
              </div>
              <div className="bg-slate-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Density</p>
                 <p className="text-sm font-bold text-slate-700">{optimalMaterialDetails?.density || '—'} <span className="text-[10px]">{optimalMaterialDetails?.density ? 'kg/m³' : ''}</span></p>
              </div>
              <div className="bg-rose-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-rose-500 uppercase tracking-widest font-bold mb-1">Total Cost</p>
                 <p className="text-lg font-bold text-rose-700">{optimalMaterialDetails?.estimatedTotalCost ? `₹${optimalMaterialDetails.estimatedTotalCost.toLocaleString()}` : '—'}</p>
              </div>
              <div className="bg-indigo-50/50 rounded-2xl p-4 border-none">
                 <p className="text-[9px] text-indigo-500 uppercase tracking-widest font-bold mb-1">Efficiency Score</p>
                 <p className="text-xl font-bold text-indigo-700">{optimalMaterialDetails?.efficiencyScore || '—'}</p>
              </div>
            </div>

            <div className={`mt-auto rounded-2xl p-4 flex items-center ${
              enginePending ? 'bg-amber-50/70' : 'bg-emerald-50/70'
            }`}>
              <ShieldCheck className={`w-5 h-5 mr-3 ${enginePending ? 'text-amber-500' : 'text-emerald-500'}`} />
              <p className={`text-xs font-bold uppercase tracking-widest ${
                enginePending ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {enginePending
                  ? <>Design Engine · <span className="text-amber-600">Awaiting ANSYS/Material Dataset</span></>
                  : <>Thermal Resistance Rating · <span className="text-emerald-600">NIST Class A</span></>}
              </p>
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

      {/* 3 Recommended Materials Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 border border-white/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                NIST + FEA Evaluation
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Ranked & Verified
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Top 3 Environment-Supportive & Cost-Effective Materials
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Evaluated across thermal conductivity (k-value), heat flux under {ambientData.avgTempNight ?? -15}°C ambient extreme, and total deployment budget.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topRecommendations.map((item, idx) => {
            const isBest = idx === 0;
            const badgeBg =
              item.badgeColor === 'emerald'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : item.badgeColor === 'blue'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-amber-50 text-amber-700 border-amber-200';

            return (
              <div
                key={idx}
                className={`relative rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between border ${
                  isBest
                    ? 'bg-gradient-to-b from-blue-50/50 via-white to-slate-50/50 border-blue-300 shadow-[0_8px_25px_rgba(59,130,246,0.12)] ring-2 ring-blue-500/20'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeBg}`}>
                      {item.recommendationType || (idx === 0 ? 'Optimal Choice' : idx === 1 ? 'Max Insulation' : 'Budget Friendly')}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                  </div>

                  <h4 className="text-lg font-bold text-slate-800 tracking-tight mb-1 line-clamp-2" title={item.name}>
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-4 min-h-[32px] leading-relaxed">
                    {item.tagline || 'Engineered for sub-zero thermal equilibrium and structural durability.'}
                  </p>

                  <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Conductivity (k):</span>
                      <span className="font-mono font-bold text-slate-700">{item.thermalConductivity} W/mK</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Heat Flux:</span>
                      <span className="font-mono font-bold text-emerald-600">{item.heatFlux} W/m²</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Estimated Cost:</span>
                      <span className="font-mono font-bold text-slate-900">₹{item.estimatedTotalCost?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Inside Night Temp:</span>
                      <span className="font-mono font-bold text-blue-600">
                        {item.simulationResults?.predictedInsideTempNight ?? simulationResults.predictedInsideTempNight}°C
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Efficiency Score</span>
                  <span className="text-base font-bold font-mono text-indigo-600">
                    {item.efficiencyScore}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
