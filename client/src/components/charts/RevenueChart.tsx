import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueChartProps {
  data: Array<{
    name: string;
    revenue: number;
    dkuShare: number;
    resortShare: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border-2 border-purple-400 rounded-xl p-4 shadow-2xl">
        <p className="text-purple-300 font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-300 text-sm">{entry.name}:</span>
            <span className="text-white font-bold text-sm">
              Rp {Number(entry.value).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">Revenue Distribution</h3>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.6)" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
          <YAxis stroke="rgba(255,255,255,0.6)" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 12 }} width={80} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#fff' }} />
          <Bar dataKey="dkuShare" fill="#a855f7" name="DKU Share" radius={[8, 8, 0, 0]} />
          <Bar dataKey="resortShare" fill="#06b6d4" name="Resort Share" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
