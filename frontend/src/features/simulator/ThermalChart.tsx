import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSimulationStore } from '@/store/useSimulationStore';

export default function ThermalChart() {
  const { data, draftParams } = useSimulationStore();
  const { hourlyForecast } = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] font-mono text-xs">
          <p className="text-slate-500 mb-2 font-bold">{label}</p>
          <p className="text-blue-600 font-bold tracking-widest">INSIDE : {payload[1].value}°C</p>
          <p className="text-slate-400 font-bold tracking-widest mt-1">OUTSIDE: {payload[0].value}°C</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">24-Hour Thermal Drift Forecast</h3>
        <div className="flex space-x-4 text-[10px] font-bold uppercase tracking-widest">
          <span className="flex items-center text-blue-600"><span className="w-2 h-2 bg-blue-500 rounded-full mr-1.5"></span>Inside Temp</span>
          <span className="flex items-center text-slate-400"><span className="w-2 h-2 bg-slate-300 rounded-full mr-1.5"></span>Ambient</span>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInside" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#f1f5f9" />
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace', fontWeight: 600 }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'monospace', fontWeight: 600 }} unit="°" />
            <Tooltip content={<CustomTooltip />} />
            
            <ReferenceLine y={draftParams.targetTemp} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideBottomRight', value: 'Target', fill: '#f59e0b', fontSize: 10, fontWeight: 600 }} />

            {/* Ambient Outside Temp */}
            <Area 
              type="monotone" 
              dataKey="ambientTemp" 
              stroke="#cbd5e1" 
              strokeWidth={2}
              fillOpacity={0} 
              activeDot={{ r: 4, fill: '#cbd5e1', strokeWidth: 0 }}
            />
            
            {/* Inside Shelter Temp */}
            <Area 
              type="monotone" 
              dataKey="insideTemp" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fill="url(#colorInside)" 
              activeDot={{ r: 6, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}