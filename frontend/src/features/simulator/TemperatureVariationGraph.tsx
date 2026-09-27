
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { DynamicThermalResult } from '@/utils/thermalPhysics';

interface Props {
  data: DynamicThermalResult;
}

const COLOR_OUTSIDE = '#D64550';
const COLOR_TARGET = '#1B4965';
const COLOR_HEATING = '#F2994A';
const COLOR_COOLING = '#2A9D8F';

export default function TemperatureVariationGraph({ data }: Props) {
  const { hourly, targetTempC, location } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const outside = payload.find((p: any) => p.dataKey === 'outsideTempC')?.value;
      const heating = payload.find((p: any) => p.dataKey === 'heatingLoadW')?.value ?? 0;
      const cooling = payload.find((p: any) => p.dataKey === 'coolingLoadW')?.value ?? 0;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 p-4 rounded-xl shadow-2xl font-mono text-xs text-white min-w-[210px]">
          <p className="text-slate-400 font-bold mb-2 pb-1.5 border-b border-slate-800 flex items-center justify-between">
            <span>TIME: {label}</span>
            <span className="text-[10px] text-blue-400 font-normal">24-Hour Cycle</span>
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="flex items-center text-rose-400">
                <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: COLOR_OUTSIDE }} />
                Outside Ambient:
              </span>
              <span className="font-bold text-white">{outside}°C</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center text-blue-300">
                <span className="w-2 h-0.5 border-t border-dashed mr-1.5" style={{ borderColor: COLOR_TARGET }} />
                Target Comfort:
              </span>
              <span className="font-bold text-white">{targetTempC}°C</span>
            </div>
            {heating > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="flex items-center text-amber-400">
                  <span className="w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: COLOR_HEATING }} />
                  Heating Load:
                </span>
                <span className="font-bold text-amber-300">{heating.toLocaleString()} W</span>
              </div>
            )}
            {cooling > 0 && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="flex items-center text-emerald-400">
                  <span className="w-2 h-2 rounded-sm mr-1.5" style={{ backgroundColor: COLOR_COOLING }} />
                  Cooling Load:
                </span>
                <span className="font-bold text-emerald-300">{cooling.toLocaleString()} W</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const hasHeating = hourly.some((h) => h.heatingLoadW > 0);
  const hasCooling = hourly.some((h) => h.coolingLoadW > 0);

  return (
    <div className="w-full h-full flex flex-col justify-between p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Visuals / charts.py
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Dual-Axis Dynamics
            </span>
          </div>
          <h4 className="text-base font-bold text-slate-800 tracking-tight">
            24-Hour Temperature Variation & Conduction Load
          </h4>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Ambient curve vs Conduction requirements · {location}
          </p>
        </div>

        {/* Legend pills matching charts.py */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold">
          <span className="flex items-center text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: COLOR_OUTSIDE }} />
            Outside Temp
          </span>
          <span className="flex items-center text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
            <span className="w-3 h-0.5 border-t-2 border-dashed mr-1.5" style={{ borderColor: COLOR_TARGET }} />
            Target ({targetTempC}°C)
          </span>
          {hasHeating && (
            <span className="flex items-center text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
              <span className="w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: COLOR_HEATING }} />
              Heating Load (W)
            </span>
          )}
          {hasCooling && (
            <span className="flex items-center text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
              <span className="w-2.5 h-2.5 rounded-sm mr-1.5" style={{ backgroundColor: COLOR_COOLING }} />
              Cooling Load (W)
            </span>
          )}
        </div>
      </div>

      {/* Main Dual-Axis Chart */}
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hourly} margin={{ top: 15, right: 30, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

            <XAxis
              dataKey="time"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}
              dy={8}
            />

            {/* Left Y-axis: Temperature in °C */}
            <YAxis
              yAxisId="temp"
              orientation="left"
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}
              unit="°C"
            />

            {/* Right Y-axis: Conduction Load in Watts */}
            <YAxis
              yAxisId="load"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontFamily: 'monospace' }}
              unit=" W"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Target Temperature Reference Line */}
            <ReferenceLine
              yAxisId="temp"
              y={targetTempC}
              stroke={COLOR_TARGET}
              strokeDasharray="4 4"
              strokeWidth={1.8}
              label={{
                value: `Target (${targetTempC}°C)`,
                position: 'insideTopRight',
                fill: COLOR_TARGET,
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            />

            {/* Conduction Load Bars (Right Axis) */}
            <Bar
              yAxisId="load"
              dataKey="heatingLoadW"
              fill={COLOR_HEATING}
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              barSize={24}
              name="Heating Load (W)"
            />

            <Bar
              yAxisId="load"
              dataKey="coolingLoadW"
              fill={COLOR_COOLING}
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              barSize={24}
              name="Cooling Load (W)"
            />

            {/* Outside Ambient Temperature Line (Left Axis) */}
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="outsideTempC"
              stroke={COLOR_OUTSIDE}
              strokeWidth={2.8}
              dot={{ r: 5, fill: COLOR_OUTSIDE, stroke: '#ffffff', strokeWidth: 1.5 }}
              activeDot={{ r: 7, fill: COLOR_OUTSIDE, stroke: '#ffffff', strokeWidth: 2 }}
              name="Outside Temp"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Notes */}
      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono pt-3 border-t border-slate-100">
        <span>Dual-Axis Model: Conduction Load (W) bars sync with temperature gradient</span>
        <span>Peak Heating: {data.peakHeatingLoadW.toLocaleString()} W</span>
      </div>
    </div>
  );
}
