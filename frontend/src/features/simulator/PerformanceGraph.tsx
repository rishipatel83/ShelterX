import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Activity } from 'lucide-react';

export default function PerformanceGraph() {
  const { data } = useSimulationStore();
  const { hourlyForecast } = data;

  return (
    <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col h-full min-h-[420px]">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center">
          <Activity className="w-4 h-4 mr-1.5 text-drdo-blue" />
          Thermal Equilibrium (24h)
        </h3>
        <span className="text-[10px] font-mono bg-blue-50 text-drdo-blue px-2 py-0.5 rounded-full font-semibold border border-blue-100">
          Passive Delta
        </span>
      </div>
      
      <div className="flex-1 w-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyForecast} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {/* Glow gradient for Inside Shelter Temp */}
              <linearGradient id="insideTempGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
              </linearGradient>
              {/* Subdued gradient for Ambient Temp */}
              <linearGradient id="ambientTempGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              unit="°" 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                borderRadius: '8px', 
                border: '1px solid #334155', 
                color: '#fff',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' 
              }}
              labelStyle={{ fontWeight: 'bold', color: '#93c5fd', marginBottom: '4px' }}
            />
            
            {/* Ambient Line + Glow Area */}
            <Area 
              type="monotone" 
              dataKey="ambientTemp" 
              name="Ambient Outside" 
              stroke="#94a3b8" 
              strokeWidth={2} 
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#ambientTempGlow)" 
            />

            {/* Inside Stable Line + Glow Area */}
            <Area 
              type="monotone" 
              dataKey="insideTemp" 
              name="Shelter Interior" 
              stroke="#2563eb" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#insideTempGlow)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="w-3 h-0.5 bg-slate-400 border-dashed inline-block"></span> Outside Ambient
        </div>
        <div className="flex items-center gap-1.5 text-drdo-blue font-medium">
          <span className="w-3 h-1 bg-drdo-blue rounded-full inline-block"></span> Shelter Interior
        </div>
      </div>
    </div>
  );
}