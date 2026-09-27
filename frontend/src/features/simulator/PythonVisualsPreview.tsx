import { useState, useEffect } from 'react';
import { RefreshCw, Download, FileCode, AlertCircle, ExternalLink, Image as ImageIcon } from 'lucide-react';
import api from '@/services/api';
import type { DynamicThermalResult } from '@/utils/thermalPhysics';
import { buildChartsPyPayload } from '@/utils/thermalPhysics';

interface Props {
  data: DynamicThermalResult;
  lastGeneratedTime?: number | null;
  onGenerated: (time: number) => void;
}

export default function PythonVisualsPreview({ data, onGenerated }: Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api/v1';
  // Image URLs linking to backend static/served visual output
  const pieChartUrl = `${baseUrl}/visuals/heat_transfer_pie_chart.png?t=${cacheBuster}`;
  const graphUrl = `${baseUrl}/visuals/temperature_variation_graph.png?t=${cacheBuster}`;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const payload = buildChartsPyPayload(data);
      const res = await api.post('/visuals/generate', payload);
      if (res.data?.success) {
        const now = Date.now();
        setCacheBuster(now);
        onGenerated(now);
      } else {
        setError(res.data?.message || 'Failed to generate charts.');
      }
    } catch (err: any) {
      console.warn('[Python Visuals] Execution note:', err);
      setError(err?.response?.data?.message || err?.message || 'Backend charts.py runner unavailable');
    } finally {
      setIsGenerating(false);
    }
  };

  // Automatically generate charts once on mount with current parameters
  useEffect(() => {
    handleGenerate();
  }, []);

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Top Bar with Status and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">visuals/charts.py Engine</span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Matplotlib 3.10.6 Active
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Generates 220 DPI publication-grade vector PNGs in visuals/output/
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Running charts.py...' : 'Run charts.py with Current Values'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error} - displaying latest rendered charts or reference render.</span>
        </div>
      )}

      {/* Grid of Generated Charts from visuals/output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heat Transfer Pie Chart Image */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <h5 className="font-bold text-sm text-slate-800">heat_transfer_pie_chart.png</h5>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              visuals/output/
            </span>
          </div>

          <div
            className="relative w-full aspect-square max-h-[340px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer group"
            onClick={() => setPreviewModal(pieChartUrl)}
          >
            <img
              src={pieChartUrl}
              alt="Heat Transfer Distribution"
              className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                // Fallback gracefully
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Run charts.py" to generate</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-xs">
              <ExternalLink className="w-4 h-4" /> Click to Expand
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-mono">
              Output: visuals/output/heat_transfer_pie_chart.png
            </span>
            <a
              href={pieChartUrl}
              download="heat_transfer_pie_chart.png"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        </div>

        {/* Temperature Variation Graph Image */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <h5 className="font-bold text-sm text-slate-800">temperature_variation_graph.png</h5>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
              visuals/output/
            </span>
          </div>

          <div
            className="relative w-full aspect-square max-h-[340px] rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer group"
            onClick={() => setPreviewModal(graphUrl)}
          >
            <img
              src={graphUrl}
              alt="24-Hour Temperature Variation"
              className="w-full h-full object-contain p-2 group-hover:scale-102 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="12">Click "Run charts.py" to generate</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-xs">
              <ExternalLink className="w-4 h-4" /> Click to Expand
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 font-mono">
              Output: visuals/output/temperature_variation_graph.png
            </span>
            <a
              href={graphUrl}
              download="temperature_variation_graph.png"
              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          </div>
        </div>
      </div>

      {/* Modal for Expanded Image View */}
      {previewModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h4 className="font-bold text-base text-slate-800">High-Resolution Python Output</h4>
              <button
                onClick={() => setPreviewModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <img src={previewModal} alt="Expanded Preview" className="max-w-full max-h-[70vh] object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
