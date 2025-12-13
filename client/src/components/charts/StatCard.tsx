interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  subtitle?: string;
}

export default function StatCard({ title, value, icon, gradient, subtitle }: StatCardProps) {
  return (
    <div className={`${gradient} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white/90 mb-3 tracking-wide uppercase">{title}</p>
          <p className="text-4xl font-bold text-white mb-1">{value}</p>
          {subtitle && <p className="text-sm text-white/80 mt-2 font-medium">{subtitle}</p>}
        </div>
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
