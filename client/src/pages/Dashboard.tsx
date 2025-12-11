import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import StatCard from '../components/charts/StatCard';
import RevenueChart from '../components/charts/RevenueChart';
import LineChart from '../components/charts/LineChart';
import DonutChart from '../components/charts/DonutChart';
import CircularProgress from '../components/charts/CircularProgress';

interface DashboardStats {
  totalProperties: number;
  totalAssets: number;
  activeRentals: number;
  totalRevenue: number;
  availableAssets: number;
  maintenanceAssets: number;
}

interface ResortRevenue {
  resort_id: string;
  resort_name: string;
  total_revenue: number;
  dku_share: number;
  resort_share: number;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalDkuShare: number;
  totalExpenses: number;
  approvedExpenses: number;
  netProfit: number;
  profitMargin: number;
}

interface AssetPerformance {
  totalAssets: number;
  activeAssets: number;
  maintenanceAssets: number;
  utilizationRate: number;
  avgMaintenanceCost: number;
  totalMaintenanceCost: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalAssets: 0,
    activeRentals: 0,
    totalRevenue: 0,
    availableAssets: 0,
    maintenanceAssets: 0,
  });
  const [resortRevenues, setResortRevenues] = useState<ResortRevenue[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalDkuShare: 0,
    totalExpenses: 0,
    approvedExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
  });
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformance>({
    totalAssets: 0,
    activeAssets: 0,
    maintenanceAssets: 0,
    utilizationRate: 0,
    avgMaintenanceCost: 0,
    totalMaintenanceCost: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const { data: resorts, count: resortsCount } = await supabase
        .from('resorts')
        .select('*', { count: 'exact' });

      const { data: assets } = await supabase
        .from('assets')
        .select('status');

      const activeCount = assets?.filter(a => a.status === 'ACTIVE').length || 0;
      const maintenanceCount = assets?.filter(a => a.status === 'MAINTENANCE').length || 0;

      const { data: revenueRecords } = await supabase
        .from('revenue_records')
        .select('resort_id, amount, asset_category');

      const { data: profitConfigs } = await supabase
        .from('profit_sharing_configs')
        .select('*');

      const revenueByResort: { [key: string]: { total: number; dku: number; resort: number } } = {};
      
      revenueRecords?.forEach((record) => {
        const resortId = record.resort_id;
        const amount = Number(record.amount) || 0;
        
        const config = profitConfigs?.find(
          c => c.resort_id === resortId && c.asset_category === record.asset_category
        );
        
        const dkuPercentage = config?.dku_percentage || 70;
        const resortPercentage = config?.resort_percentage || 30;
        
        const dkuAmount = (amount * dkuPercentage) / 100;
        const resortAmount = (amount * resortPercentage) / 100;

        if (!revenueByResort[resortId]) {
          revenueByResort[resortId] = { total: 0, dku: 0, resort: 0 };
        }
        
        revenueByResort[resortId].total += amount;
        revenueByResort[resortId].dku += dkuAmount;
        revenueByResort[resortId].resort += resortAmount;
      });

      const resortRevenuesList: ResortRevenue[] = resorts?.map(resort => ({
        resort_id: resort.id,
        resort_name: resort.name,
        total_revenue: revenueByResort[resort.id]?.total || 0,
        dku_share: revenueByResort[resort.id]?.dku || 0,
        resort_share: revenueByResort[resort.id]?.resort || 0,
      })) || [];

      setResortRevenues(resortRevenuesList);

      const totalRevenue = Object.values(revenueByResort).reduce((sum, r) => sum + r.total, 0);
      const totalDkuShare = Object.values(revenueByResort).reduce((sum, r) => sum + r.dku, 0);

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, status');

      const totalExpenses = expensesData?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const approvedExpenses = expensesData
        ?.filter(e => e.status === 'APPROVED')
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      const { count: pendingExpenses } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      const netProfit = totalDkuShare - approvedExpenses;
      const profitMargin = totalDkuShare > 0 ? (netProfit / totalDkuShare) * 100 : 0;

      setFinancialMetrics({
        totalRevenue,
        totalDkuShare,
        totalExpenses,
        approvedExpenses,
        netProfit,
        profitMargin,
      });

      const { data: maintenanceRecords } = await supabase
        .from('maintenance_records')
        .select('labor_cost, sparepart_cost');

      const totalMaintenanceCost = maintenanceRecords?.reduce(
        (sum, m) => sum + Number(m.labor_cost) + Number(m.sparepart_cost), 
        0
      ) || 0;

      const avgMaintenanceCost = maintenanceRecords && maintenanceRecords.length > 0
        ? totalMaintenanceCost / maintenanceRecords.length
        : 0;

      const utilizationRate = assets && assets.length > 0
        ? (activeCount / assets.length) * 100
        : 0;

      setAssetPerformance({
        totalAssets: assets?.length || 0,
        activeAssets: activeCount,
        maintenanceAssets: maintenanceCount,
        utilizationRate,
        avgMaintenanceCost,
        totalMaintenanceCost,
      });

      setStats({
        totalProperties: resortsCount || 0,
        totalAssets: assets?.length || 0,
        activeRentals: pendingExpenses || 0,
        totalRevenue,
        availableAssets: activeCount,
        maintenanceAssets: maintenanceCount,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const revenueChartData = resortRevenues.map(r => ({
    name: r.resort_name.substring(0, 10),
    revenue: r.total_revenue,
    dkuShare: r.dku_share,
    resortShare: r.resort_share,
  }));

  const assetStatusData = [
    { name: 'Active', value: assetPerformance.activeAssets },
    { name: 'Maintenance', value: assetPerformance.maintenanceAssets },
    { name: 'Inactive', value: assetPerformance.totalAssets - assetPerformance.activeAssets - assetPerformance.maintenanceAssets },
  ];

  const financialData = [
    { name: 'Revenue', value: financialMetrics.totalDkuShare },
    { name: 'Expenses', value: financialMetrics.approvedExpenses },
    { name: 'Profit', value: financialMetrics.netProfit },
  ];

  const monthlyTrendData = [
    { name: 'Jan', value: 0 },
    { name: 'Feb', value: 0 },
    { name: 'Mar', value: 0 },
    { name: 'Apr', value: 0 },
    { name: 'May', value: 0 },
    { name: 'Jun', value: financialMetrics.totalRevenue },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 bg-purple-600/30 backdrop-blur-sm rounded-lg border border-purple-500/50 hover:bg-purple-600/50 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button className="p-2 bg-purple-600/30 backdrop-blur-sm rounded-lg border border-purple-500/50 hover:bg-purple-600/50 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button className="p-2 bg-purple-600/30 backdrop-blur-sm rounded-lg border border-purple-500/50 hover:bg-purple-600/50 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          <p className="text-white/60">Welcome back, {profile?.name}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <>
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Conversion Rate"
                value="96.5%"
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
              />
              
              <StatCard
                title="Total Users"
                value={stats.activeRentals}
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
                gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              />
              
              <StatCard
                title="Total Views"
                value={stats.totalAssets * 1000}
                icon={
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
                gradient="bg-gradient-to-br from-cyan-500 to-teal-500"
              />
              
              {profile?.role !== 'ENGINEER' && (
                <StatCard
                  title="Total Revenue"
                  value={`Rp ${(stats.totalRevenue / 1000000).toFixed(1)}M`}
                  icon={
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                  gradient="bg-gradient-to-br from-pink-500 to-rose-500"
                />
              )}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Revenue Chart */}
              {profile?.role !== 'ENGINEER' && revenueChartData.length > 0 && (
                <RevenueChart data={revenueChartData} />
              )}

              {/* Line Chart */}
              <LineChart 
                data={monthlyTrendData}
                title="Monthly Trend"
                color="#06b6d4"
              />

              {/* Donut Chart - Asset Status */}
              <DonutChart
                data={assetStatusData}
                title="Asset Status"
                colors={['#10b981', '#f59e0b', '#ef4444']}
              />

              {/* Donut Chart - Financial */}
              {profile?.role !== 'ENGINEER' && (
                <DonutChart
                  data={financialData}
                  title="Financial Overview"
                  colors={['#a855f7', '#ec4899', '#06b6d4']}
                />
              )}
            </div>

            {/* Circular Progress Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Asset Utilization</h3>
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                      <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <CircularProgress
                    value={assetPerformance.activeAssets}
                    max={assetPerformance.totalAssets}
                    label="Active"
                    color="#10b981"
                  />
                </div>
              </div>

              {profile?.role !== 'ENGINEER' && (
                <>
                  <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Revenue Target</h3>
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <CircularProgress
                        value={Math.round(financialMetrics.totalRevenue / 1000000)}
                        max={100}
                        label="Million"
                        color="#fbbf24"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Profit Margin</h3>
                      <div className="flex gap-2">
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <CircularProgress
                        value={Math.round(financialMetrics.profitMargin)}
                        max={100}
                        label="Percent"
                        color="#a855f7"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {profile?.role !== 'ENGINEER' && (
                <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-white/70">Total Resorts</p>
                    <span className="text-2xl">🏨</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalProperties}</p>
                  <p className="text-xs text-white/50 mt-1">Active properties</p>
                </div>
              )}

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/70">Total Assets</p>
                  <span className="text-2xl">🏍️</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalAssets}</p>
                <p className="text-xs text-white/50 mt-1">All equipment</p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/70">Active Assets</p>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.availableAssets}</p>
                <p className="text-xs text-white/50 mt-1">Ready to use</p>
              </div>

              <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-white/70">Maintenance</p>
                  <span className="text-2xl">🔧</span>
                </div>
                <p className="text-3xl font-bold text-white">{stats.maintenanceAssets}</p>
                <p className="text-xs text-white/50 mt-1">Under repair</p>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
