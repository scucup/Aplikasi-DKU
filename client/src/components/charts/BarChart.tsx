import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BarChartProps {
  data: any[];
  title: string;
  dataKeys: { key: string; color: string; name: string }[];
}

export default function BarChart({ data, title, dataKeys }: BarChartProps) {
  return (
    <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
      <h3 className="text-xl font-bold text-white mb-6">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
          <XAxis 
            dataKey="name" 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#ffffff60"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e1b4b', 
              border: '1px solid #6366f1',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Legend />
          {dataKeys.map((item, index) => (
            <Bar
              key={index}
              dataKey={item.key}
              name={item.name}
              fill={item.color}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
