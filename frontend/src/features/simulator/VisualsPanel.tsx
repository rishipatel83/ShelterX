import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  Download,
  Maximize2,
  AlertCircle,
  MapPin,
  Thermometer,
  Layers,
  Box,
  ShieldCheck
} from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { calculateDynamicConduction, buildChartsPyPayload } from '@/utils/thermalPhysics';
import api from '@/services/api';

type ViewMode = 'dual' | 'pie' | 'diurnal';

export default function VisualsPanel() {
  const { draftParams, data } = useSimulationStore();
  const { recommendedShelter, ambientData, hourlyForecast, locationName } = data;

  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Outside ambient temperature baseline directly derived from user's location & weather
  const outsideTempC = useMemo(() => {
    if ((data as any).backendMeta?.averageTemperatureC != null) {
      return Number((data as any).backendMeta.averageTemperatureC);
    }
    if ((ambientData as any)?.currentTempC != null) {
      return Number((ambientData as any).currentTempC);
    }
    if (hourlyForecast && hourlyForecast.length > 0) {
      return Math.min(...hourlyForecast.map((h) => h.ambientTemp));
    }
    return ambientData?.avgTempNight ?? -15;
  }, [data, ambientData, hourlyForecast]);

  // Thermal conductivity (k) linked directly to the shelter's selected or optimal material
  const activeMaterial = useMemo(() => {
    const optimal = recommendedShelter?.optimalMaterialDetails;
    if (optimal?.thermalConductivity) {
      return {
        name: optimal.name,
        k: optimal.thermalConductivity
      };
    }
    const roofName = draftParams.roof || 'PUF Insulated Panels';
    return {
      name: roofName,
      k: 0.024
    };
  }, [recommendedShelter, draftParams.roof]);

  // Live computed thermal physics linked directly to user's initial values
  const thermalResult = useMemo(() => {
    const roofThicknessMm: number =
      (recommendedShelter?.materials as any)?.insulationThickness_mm ??
      draftParams.insulationThickness_mm ??
      draftParams.wallThickness ??
      130;

    return calculateDynamicConduction({
      length: draftParams.length,
      width: draftParams.width,
      height: draftParams.height,
      wallThicknessMm: draftParams.wallThickness,
      roofThicknessMm,
      targetTempC: draftParams.targetTemp,
      outsideTempC,
      thermalConductivityWmK: activeMaterial.k,
      materialName: activeMaterial.name,
      locationName: locationName || draftParams.locationName,
      hourlyForecast,
    });
  }, [
    draftParams.length,
    draftParams.width,
    draftParams.height,
    draftParams.wallThickness,
    draftParams.insulationThickness_mm,
    draftParams.targetTemp,
    draftParams.locationName,
    locationName,
    outsideTempC,
    activeMaterial,
    hourlyForecast,
    recommendedShelter,
  ]);

  // URLs for the Python generated charts
  const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api/v1';
  const pieChartUrl = `${baseUrl}/visuals/heat_transfer_pie_chart.png?t=${cacheBuster}`;
  const graphUrl = `${baseUrl}/visuals/temperature_variation_graph.png?t=${cacheBuster}`;

  // Execute visuals/charts.py in backend with current user-defined parameters
  const handleGenerateCharts = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const payload = buildChartsPyPayload(thermalResult);
      const res = await api.post('/visuals/generate', payload);
      if (res.data?.success) {
        setCacheBuster(Date.now());
      } else {
        setError(res.data?.message || 'Server chart render note.');
      }
    } catch (err: any) {
      console.warn('[ShelterX Charts] Render notice:', err);
      setError(err?.response?.data?.message || err?.message || 'Generated via local server fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically update the charts when the user's primary inputs change (debounced)
  const debounceTimer = useRef<any>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleGenerateCharts();
    }, 600);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [
    draftParams.length,
    draftParams.width,
    draftParams.height,
    draftParams.wallThickness,
    draftParams.targetTemp,
    draftParams.locationName,
    outsideTempC,
    activeMaterial.k,
    activeMaterial.name
  ]);

  return (
    <div className="w-full space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center text-[10px] font-bold uppercase tracking-widest text-violet-700 bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
              <Sparkles className="w-3 h-3 mr-1.5 text-violet-600" />
              Matplotlib 3.10 Engine · visuals/charts.py
            </span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Linked to User Inputs
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Thermal Analysis & Chart Studio
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Charts are automatically rendered from your shelter dimensions, comfort target, and environment specified above.
          </p>
        </div>

        {/* Refresh Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleGenerateCharts}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Rendering...' : 'Refresh Charts'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active User Input Linked Summary Bar */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-slate-300">Active Inputs Linked to Visuals:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Location */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono">
            <MapPin className="w-3 h-3 text-blue-400" />
            {draftParams.locationName || locationName || 'Ladakh'}
          </span>

          {/* Footprint */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono">
            <Box className="w-3 h-3 text-amber-400" />
            {draftParams.length}m × {draftParams.width}m × {draftParams.height}m
          </span>

          {/* Wall Thickness */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono">
            <Layers className="w-3 h-3 text-indigo-400" />
            {draftParams.wallThickness}mm Wall
          </span>

          {/* Target Comfort */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono">
            <Thermometer className="w-3 h-3 text-emerald-400" />
            Target: {draftParams.targetTemp}°C
          </span>

          {/* Outside Ambient */}
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
            Ambient: {outsideTempC}°C
          </span>
        </div>
      </div>

      {/* Live Physics Telemetry Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'ΔT Temperature Gradient',
            value: `${thermalResult.deltaTC > 0 ? '+' : ''}${thermalResult.deltaTC}°C`,
            sub: `Inside ${draftParams.targetTemp}°C vs Outside ${outsideTempC}°C`,
            color: 'blue'
          },
          {
            label: 'Total Conduction Rate',
            value: `${Math.abs(thermalResult.totalConductionW).toLocaleString()} W`,
            sub: thermalResult.direction === 'Heat Loss' ? 'Heat escaping to ambient' : 'Ambient heat infiltrating',
            color: thermalResult.direction === 'Heat Loss' ? 'rose' : 'emerald'
          },
          {
            label: 'Wall Heat Share',
            value: `${thermalResult.wallPercentage}%`,
            sub: `${Math.abs(thermalResult.wallConductionW).toLocaleString()} W (${thermalResult.wallAreaM2} m²)`,
            color: 'blue'
          },
          {
            label: 'Roof Heat Share',
            value: `${thermalResult.roofPercentage}%`,
            sub: `${Math.abs(thermalResult.roofConductionW).toLocaleString()} W (${thermalResult.roofAreaM2} m²)`,
            color: 'amber'
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                stat.color === 'blue' ? 'text-blue-600' :
                stat.color === 'rose' ? 'text-rose-600' :
                stat.color === 'emerald' ? 'text-emerald-600' :
                'text-amber-600'
              }`}>
                {stat.value}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1 pt-2 border-t border-slate-100">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setViewMode('dual')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              viewMode === 'dual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual Studio Grid (Both)
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              viewMode === 'pie'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Heat Loss Donut
          </button>
          <button
            onClick={() => setViewMode('diurnal')}
            className={`px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
              viewMode === 'diurnal'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            24-Hour Diurnal Timeline
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>charts.py · 200 DPI Vector Output</span>
        </div>
      </div>

      {/* Chart Visualizer Cards */}
      <div className={`grid gap-6 ${
        viewMode === 'dual' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
      }`}>
        {/* Pie Chart Card */}
        {(viewMode === 'dual' || viewMode === 'pie') && (
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.07)] p-6 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                <h4 className="font-bold text-sm text-slate-800 tracking-tight">Heat Conduction Distribution</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                heat_transfer_pie_chart.png
              </span>
            </div>

            <div
              className={`relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer ${
                viewMode === 'pie' ? 'h-[500px]' : 'h-[360px]'
              }`}
              onClick={() => setLightboxImg(pieChartUrl)}
            >
              <img
                src={pieChartUrl}
                alt="Heat Transfer Distribution"
                className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Refresh Charts" to render</text></svg>';
                }}
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-xs">
                <Maximize2 className="w-4 h-4" /> Click to Expand Lightbox
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">200 DPI Vector Output</span>
              <a
                href={pieChartUrl}
                download="heat_transfer_pie_chart.png"
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </a>
            </div>
          </div>
        )}

        {/* 24-Hour Diurnal Graph Card */}
        {(viewMode === 'dual' || viewMode === 'diurnal') && (
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_35px_rgb(0,0,0,0.07)] p-6 transition-all flex flex-col justify-between group">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
                <h4 className="font-bold text-sm text-slate-800 tracking-tight">24-Hour Diurnal Temperature Profile</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                temperature_variation_graph.png
              </span>
            </div>

            <div
              className={`relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer ${
                viewMode === 'diurnal' ? 'h-[500px]' : 'h-[360px]'
              }`}
              onClick={() => setLightboxImg(graphUrl)}
            >
              <img
                src={graphUrl}
                alt="24-Hour Temperature Variation"
                className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Refresh Charts" to render</text></svg>';
                }}
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-xs">
                <Maximize2 className="w-4 h-4" /> Click to Expand Lightbox
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-mono">Conduction Load + Ambient Curve</span>
              <a
                href={graphUrl}
                download="temperature_variation_graph.png"
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                  visuals/output/
                </span>
                <h4 className="font-bold text-base text-slate-800">High-Resolution Python Render (200 DPI)</h4>
              </div>
              <button
                onClick={() => setLightboxImg(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50/50 rounded-2xl my-4">
              <img src={lightboxImg} alt="Lightbox Preview" className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-xs" />
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Publication-grade raster output generated by Matplotlib headless Agg backend</span>
              <a
                href={lightboxImg}
                download="shelterx_chart.png"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Save Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
