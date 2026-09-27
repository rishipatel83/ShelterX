import { useState, useMemo, useEffect } from 'react';
import {
  Sliders,
  Thermometer,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Box,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { calculateDynamicConduction, buildChartsPyPayload } from '@/utils/thermalPhysics';
import api from '@/services/api';

type ViewMode = 'dual' | 'pie' | 'diurnal';

export default function VisualsPanel() {
  const { draftParams, setDraftParam, updateWallThickness, data } = useSimulationStore();
  const { recommendedShelter, ambientData, hourlyForecast, locationName } = data;

  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [showTuningDeck, setShowTuningDeck] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());
  const [error, setError] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [selectedMaterialPreset, setSelectedMaterialPreset] = useState<string>('puf');

  // Derive outside ambient temperature baseline
  const outsideTempC = useMemo(() => {
    if (data.backendMeta?.averageTemperatureC != null) {
      return Number(data.backendMeta.averageTemperatureC);
    }
    if (hourlyForecast && hourlyForecast.length > 0) {
      return Math.min(...hourlyForecast.map((h) => h.ambientTemp));
    }
    return ambientData?.avgTempNight ?? -15;
  }, [data.backendMeta?.averageTemperatureC, hourlyForecast, ambientData]);

  // Active thermal conductivity (k)
  const k = useMemo(() => {
    if (selectedMaterialPreset === 'aerogel') return 0.016;
    if (selectedMaterialPreset === 'rockwool') return 0.040;
    if (selectedMaterialPreset === 'pcm') return 0.032;
    return recommendedShelter?.optimalMaterialDetails?.thermalConductivity ?? 0.026;
  }, [selectedMaterialPreset, recommendedShelter]);

  // Live computed thermal physics
  const thermalResult = useMemo(() => {
    const roofThicknessMm: number =
      (recommendedShelter?.materials as any)?.insulationThickness_mm ??
      draftParams.insulationThickness_mm ??
      130;

    let materialLabel = 'PUF Composite (k = 0.026 W/m·K)';
    if (selectedMaterialPreset === 'aerogel') materialLabel = 'Aerogel VIP (k = 0.016 W/m·K)';
    if (selectedMaterialPreset === 'rockwool') materialLabel = 'Rockwool Sandwich (k = 0.040 W/m·K)';
    if (selectedMaterialPreset === 'pcm') materialLabel = 'PCM Composite (k = 0.032 W/m·K)';

    return calculateDynamicConduction({
      length: draftParams.length,
      width: draftParams.width,
      height: draftParams.height,
      wallThicknessMm: draftParams.wallThickness,
      roofThicknessMm,
      targetTempC: draftParams.targetTemp,
      outsideTempC,
      thermalConductivityWmK: k,
      materialName: materialLabel,
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
    outsideTempC,
    k,
    selectedMaterialPreset,
    hourlyForecast,
    locationName,
    draftParams.locationName,
    recommendedShelter,
  ]);

  // URLs for the Python generated charts
  const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api/v1';
  const pieChartUrl = `${baseUrl}/visuals/heat_transfer_pie_chart.png?t=${cacheBuster}`;
  const graphUrl = `${baseUrl}/visuals/temperature_variation_graph.png?t=${cacheBuster}`;

  // Execute visuals/charts.py in backend with current values
  const handleGenerateCharts = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const payload = buildChartsPyPayload(thermalResult);
      const res = await api.post('/visuals/generate', payload);
      if (res.data?.success) {
        setCacheBuster(Date.now());
      } else {
        setError(res.data?.message || 'Server chart render warning.');
      }
    } catch (err: any) {
      console.warn('[ShelterX Charts] Execution note:', err);
      setError(err?.response?.data?.message || err?.message || 'Generated via local server fallback.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate on initial load
  useEffect(() => {
    handleGenerateCharts();
  }, []);

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
              200 DPI Vector Output
            </span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
            Thermal Analysis & Chart Studio
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Adjust the habitat parameters below to recalculate real-time conduction and re-render Python charts dynamically.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowTuningDeck(!showTuningDeck)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>{showTuningDeck ? 'Hide Control Deck' : 'Tune Parameters'}</span>
            {showTuningDeck ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleGenerateCharts}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Rendering...' : 'Update Charts'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Parameter Control Deck */}
      {showTuningDeck && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700/80 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-5 border-b border-slate-700/60 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Interactive Parameter Tuning Deck</h4>
                <p className="text-[11px] text-slate-400 font-mono">Tweak sliders to immediately recalculate thermal physics and regenerate charts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Active Target:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                {draftParams.targetTemp}°C
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono ml-2">Wall:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-500/30">
                {draftParams.wallThickness}mm
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Target Temperature Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-400" /> Inside Target Temp
                </label>
                <span className="font-mono font-bold text-emerald-400">{draftParams.targetTemp}°C</span>
              </div>
              <input
                type="range"
                min="12"
                max="28"
                step="0.5"
                value={draftParams.targetTemp}
                onChange={(e) => setDraftParam('targetTemp', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>12°C (Arctic min)</span>
                <span>20°C (Standard)</span>
                <span>28°C (Warm)</span>
              </div>
            </div>

            {/* Wall Thickness Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" /> Wall Thickness
                </label>
                <span className="font-mono font-bold text-blue-400">{draftParams.wallThickness} mm</span>
              </div>
              <input
                type="range"
                min="60"
                max="300"
                step="10"
                value={draftParams.wallThickness}
                onChange={(e) => updateWallThickness(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>80mm</span>
                <span>150mm (Standard)</span>
                <span>300mm (Ultra)</span>
              </div>
            </div>

            {/* Habitat Dimensions (L x W) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-amber-400" /> Footprint (L × W)
                </label>
                <span className="font-mono font-bold text-amber-400">
                  {draftParams.length}m × {draftParams.width}m
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-slate-400">L:</span>
                  <input
                    type="number"
                    min="3"
                    max="15"
                    step="0.5"
                    value={draftParams.length}
                    onChange={(e) => setDraftParam('length', parseFloat(e.target.value) || 5)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
                  <span className="text-[10px] text-slate-400">W:</span>
                  <input
                    type="number"
                    min="2"
                    max="10"
                    step="0.5"
                    value={draftParams.width}
                    onChange={(e) => setDraftParam('width', parseFloat(e.target.value) || 4)}
                    className="w-full bg-transparent text-xs font-mono font-bold text-white focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400">m</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-right">
                Floor Area: {(draftParams.length * draftParams.width).toFixed(1)} m²
              </p>
            </div>

            {/* Insulation Material Quick Presets */}
            <div className="space-y-2">
              <label className="text-slate-300 font-medium text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-violet-400" /> Insulation Preset
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'puf', label: 'PUF', sub: 'k=0.026' },
                  { id: 'aerogel', label: 'Aerogel VIP', sub: 'k=0.016' },
                  { id: 'rockwool', label: 'Rockwool', sub: 'k=0.040' },
                  { id: 'pcm', label: 'PCM', sub: 'k=0.032' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedMaterialPreset(preset.id)}
                    className={`px-2 py-1.5 rounded-lg text-left transition-all border ${
                      selectedMaterialPreset === preset.id
                        ? 'bg-blue-600/30 border-blue-400 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <p className="text-[11px] font-bold leading-tight">{preset.label}</p>
                    <p className="text-[9px] font-mono opacity-80">{preset.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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
          <span>Output: visuals/output/*.png</span>
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
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Update Charts" to generate</text></svg>';
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
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Update Charts" to generate</text></svg>';
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
