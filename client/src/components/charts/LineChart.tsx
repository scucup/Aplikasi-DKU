import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';

interface LineChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  title: string;
  color: string;
  highlightPeriod?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-gray-900 border-2 border-emerald-400 rounded-xl p-4 shadow-2xl">
        <p className="text-emerald-300 font-semibold text-sm mb-1">{label}</p>
        <p className="text-white font-bold text-lg">
          Rp {Number(value).toLocaleString('id-ID')}
        </p>
      </div>
    );
  }
  return null;
};

export default function LineChart({ data, title, color, highlightPeriod }: LineChartProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
          <YAxis stroke="rgba(255,255,255,0.6)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          {highlightPeriod && highlightPeriod !== 'all' && (
            <ReferenceLine 
              x={highlightPeriod} 
              stroke="#fbbf24" 
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{ 
                value: '●', 
                position: 'top', 
                fill: '#fbbf24',
                fontSize: 20
              }}
            />
          )}
          <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill={`url(#gradient-${color})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
