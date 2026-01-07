import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  title: string;
  colors: string[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-gray-900 border-2 border-purple-400 rounded-xl p-4 shadow-2xl">
        <p className="text-purple-300 font-semibold text-sm mb-1">{data.name}</p>
        <p className="text-white font-bold text-lg">
          Rp {Number(data.value).toLocaleString('id-ID')}
        </p>
        <p className="text-gray-400 text-xs mt-1">
          {((data.value / payload[0].payload.total) * 100 || data.percent * 100).toFixed(1)}% of total
        </p>
      </div>
    );
  }
  return null;
};

export default function DonutChart({ data, title, colors }: DonutChartProps) {
  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const dataWithTotal = data.map(item => ({ ...item, total }));

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      {dataWithTotal.length > 0 && total > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={dataWithTotal}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {dataWithTotal.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#fff' }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-white/50">
          No data for selected period
        </div>
      )}
    </div>
  );
}
