import { AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

interface AreaChartProps {
  data: any[];
  title: string;
  dataKeys: { key: string; color: string; name: string }[];
  highlightPeriod?: string;
}

export default function AreaChart({ data, title, dataKeys, highlightPeriod }: AreaChartProps) {
  return (
    <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <h3 className="text-xl font-bold text-white mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart data={data}>
          <defs>
            {dataKeys.map((item, index) => (
              <linearGradient key={index} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={item.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={item.color} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis 
            dataKey="name" 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e1b4b', 
              border: '1px solid #6366f1',
              borderRadius: '8px',
              color: '#fff'
            }}
            formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`}
          />
          <Legend />
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
          {dataKeys.map((item, index) => (
            <Area
              key={index}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              fillOpacity={1}
              fill={`url(#color${index})`}
              strokeWidth={2}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
