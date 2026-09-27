
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { DynamicThermalResult } from '@/utils/thermalPhysics';

interface Props {
  data: DynamicThermalResult;
}

const COLOR_WALL = '#2E5EAA';
const COLOR_ROOF = '#F2994A';

export default function HeatTransferPieChart({ data }: Props) {
  const chartData = [
    { name: 'Walls', value: Math.abs(data.wallConductionW), percentage: data.wallPercentage, color: COLOR_WALL },
    { name: 'Roof', value: Math.abs(data.roofConductionW), percentage: data.roofPercentage, color: COLOR_ROOF },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs text-white">
          <p className="font-bold flex items-center gap-2" style={{ color: item.color }}>
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
            {item.name} Conduction
          </p>
          <p className="text-sm font-bold text-white mt-1">
            {item.value.toLocaleString()} W
            <span className="text-xs text-slate-400 font-normal ml-1.5">({item.percentage}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-2">
      {/* Header & Subtitle */}
      <div className="w-full text-center mb-2">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
            Visuals / charts.py
          </span>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Conduction Balance
          </span>
        </div>
        <h4 className="text-base font-bold text-slate-800 tracking-tight">
          Heat Transfer Distribution
        </h4>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          ΔT = {data.deltaTC > 0 ? `+${data.deltaTC}` : data.deltaTC}°C · {data.materialName}
        </p>
      </div>

      {/* Donut Chart Container */}
      <div className="relative w-full h-[240px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="#ffffff"
              strokeWidth={2.5}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-800">
            {Math.abs(data.totalConductionW).toLocaleString()} W
          </span>
          <span className="text-[11px] font-semibold text-slate-500 tracking-wide uppercase mt-0.5">
            Total {data.direction}
          </span>
        </div>
      </div>

      {/* Legend & Breakdown matching charts.py */}
      <div className="w-full grid grid-cols-2 gap-3 mt-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100/70">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLOR_WALL }} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-700 truncate">Walls ({data.wallPercentage}%)</span>
            <span className="text-xs font-mono font-bold text-blue-700">
              {Math.abs(data.wallConductionW).toLocaleString()} W
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100/70">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLOR_ROOF }} />
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-700 truncate">Roof ({data.roofPercentage}%)</span>
            <span className="text-xs font-mono font-bold text-amber-700">
              {Math.abs(data.roofConductionW).toLocaleString()} W
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
