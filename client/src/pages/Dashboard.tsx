import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

interface DashboardStats {
  totalProperties: number; // Resorts
  totalAssets: number;
  activeRentals: number; // Pending Expenses
  totalRevenue: number;
  availableAssets: number; // Active Assets
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
      // Fetch resorts
      const { data: resorts, count: resortsCount } = await supabase
        .from('resorts')
        .select('*', { count: 'exact' });

      // Fetch assets count and status
      const { data: assets } = await supabase
        .from('assets')
        .select('status');

      const activeCount = assets?.filter(a => a.status === 'ACTIVE').length || 0;
      const maintenanceCount = assets?.filter(a => a.status === 'MAINTENANCE').length || 0;

      // Fetch revenue records grouped by resort
      const { data: revenueRecords } = await supabase
        .from('revenue_records')
        .select('resort_id, amount, asset_category');

      // Fetch profit sharing configs
      const { data: profitConfigs } = await supabase
        .from('profit_sharing_configs')
        .select('*');

      // Calculate revenue per resort
      const revenueByResort: { [key: string]: { total: number; dku: number; resort: number } } = {};
      
      revenueRecords?.forEach((record) => {
        const resortId = record.resort_id;
        const amount = Number(record.amount) || 0;
        
        // Find profit sharing config for this resort and asset category
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

      // Map resort revenues
      const resortRevenuesList: ResortRevenue[] = resorts?.map(resort => ({
        resort_id: resort.id,
        resort_name: resort.name,
        total_revenue: revenueByResort[resort.id]?.total || 0,
        dku_share: revenueByResort[resort.id]?.dku || 0,
        resort_share: revenueByResort[resort.id]?.resort || 0,
      })) || [];

      setResortRevenues(resortRevenuesList);

      // Calculate total revenue and DKU share
      const totalRevenue = Object.values(revenueByResort).reduce((sum, r) => sum + r.total, 0);
      const totalDkuShare = Object.values(revenueByResort).reduce((sum, r) => sum + r.dku, 0);

      // Fetch expenses
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

      // Calculate financial metrics
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

      // Fetch maintenance costs
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

      // Calculate asset utilization
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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-indigo-600"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Total Resorts (Hidden for Engineer) */}
              {profile?.role !== 'ENGINEER' && (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Resorts</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalProperties}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>
              )}

              {/* Total Assets */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Assets</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.totalAssets}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pending Expenses (Hidden for Engineer) */}
              {profile?.role !== 'ENGINEER' && (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Pending Expenses</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.activeRentals}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                </div>
              </div>
              )}

              {/* Total Revenue (Hidden for Engineer) */}
              {profile?.role !== 'ENGINEER' && (
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-800">
                      Rp {stats.totalRevenue.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              )}

              {/* Active Assets */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Active Assets</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.availableAssets}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Maintenance Assets */}
              <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">In Maintenance</p>
                    <p className="text-3xl font-bold text-gray-800">{stats.maintenanceAssets}</p>
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-neumorphic-inset flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Overview - Financial Health (Hidden for Engineer) */}
            {profile?.role !== 'ENGINEER' && (
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Executive Overview - Financial Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    Rp {financialMetrics.totalRevenue.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Gross revenue from all resorts</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">DKU Share</p>
                    <span className="text-2xl">💵</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    Rp {financialMetrics.totalDkuShare.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {financialMetrics.totalRevenue > 0 
                      ? `${((financialMetrics.totalDkuShare / financialMetrics.totalRevenue) * 100).toFixed(1)}% of total revenue`
                      : '0% of total revenue'}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Approved Expenses</p>
                    <span className="text-2xl">💸</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">
                    Rp {financialMetrics.approvedExpenses.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total: Rp {financialMetrics.totalExpenses.toLocaleString('id-ID')}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-green-700 font-medium">Net Profit</p>
                    <span className="text-2xl">📈</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">
                    Rp {financialMetrics.netProfit.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-green-700 mt-1">DKU Share - Approved Expenses</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-blue-700 font-medium">Profit Margin</p>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">
                    {financialMetrics.profitMargin.toFixed(1)}%
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {financialMetrics.profitMargin >= 50 ? 'Excellent' : 
                     financialMetrics.profitMargin >= 30 ? 'Good' : 
                     financialMetrics.profitMargin >= 10 ? 'Fair' : 'Needs Improvement'}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-purple-700 font-medium">Financial Health</p>
                    <span className="text-2xl">❤️</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {financialMetrics.netProfit > 0 ? 'Healthy' : 'At Risk'}
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    {financialMetrics.netProfit > 0 
                      ? 'Positive cash flow' 
                      : 'Review expenses'}
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* Asset Performance */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏍️ Asset Performance & Utilization</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Total Assets</p>
                    <span className="text-2xl">🏍️</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{assetPerformance.totalAssets}</p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <span className="text-green-600">✓ {assetPerformance.activeAssets} Active</span>
                    <span className="text-orange-600">⚙️ {assetPerformance.maintenanceAssets} Maintenance</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-teal-700 font-medium">Utilization Rate</p>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-3xl font-bold text-teal-900">
                    {assetPerformance.utilizationRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-teal-700 mt-1">
                    {assetPerformance.utilizationRate >= 80 ? 'Excellent' : 
                     assetPerformance.utilizationRate >= 60 ? 'Good' : 
                     assetPerformance.utilizationRate >= 40 ? 'Fair' : 'Low'}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Total Maintenance Cost</p>
                    <span className="text-2xl">🔧</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    Rp {assetPerformance.totalMaintenanceCost.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">All maintenance records</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-medium">Avg Maintenance Cost</p>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    Rp {assetPerformance.avgMaintenanceCost.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Per maintenance record</p>
                </div>
              </div>

              {/* ROI Indicator */}
              <div className="mt-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-indigo-700 font-medium mb-1">Asset ROI Indicator</p>
                    <p className="text-xs text-indigo-600">
                      Revenue vs Maintenance Cost Ratio
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-900">
                      {assetPerformance.totalMaintenanceCost > 0
                        ? `${(financialMetrics.totalDkuShare / assetPerformance.totalMaintenanceCost).toFixed(2)}x`
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-indigo-700">
                      {assetPerformance.totalMaintenanceCost > 0 && 
                       (financialMetrics.totalDkuShare / assetPerformance.totalMaintenanceCost) >= 5
                        ? 'Excellent ROI'
                        : assetPerformance.totalMaintenanceCost > 0 &&
                          (financialMetrics.totalDkuShare / assetPerformance.totalMaintenanceCost) >= 3
                        ? 'Good ROI'
                        : 'Monitor closely'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue by Resort (Hidden for Engineer) */}
            {profile?.role !== 'ENGINEER' && (
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">🏨 Revenue by Resort</h2>
              <div className="space-y-4">
                {resortRevenues.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">No revenue data available</p>
                ) : (
                  resortRevenues.map((resort) => (
                    <div
                      key={resort.resort_id}
                      className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-800">{resort.resort_name}</h3>
                        <span className="text-sm text-gray-600">Total Revenue</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                          <p className="text-xs text-blue-600 font-medium mb-1">Total Revenue</p>
                          <p className="text-xl font-bold text-blue-900">
                            Rp {resort.total_revenue.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                          <p className="text-xs text-green-600 font-medium mb-1">DKU Share</p>
                          <p className="text-xl font-bold text-green-900">
                            Rp {resort.dku_share.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-green-700 mt-1">
                            {resort.total_revenue > 0 
                              ? `${((resort.dku_share / resort.total_revenue) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
                          <p className="text-xs text-purple-600 font-medium mb-1">Resort Share</p>
                          <p className="text-xl font-bold text-purple-900">
                            Rp {resort.resort_share.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-purple-700 mt-1">
                            {resort.total_revenue > 0 
                              ? `${((resort.resort_share / resort.total_revenue) * 100).toFixed(1)}%`
                              : '0%'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/expenses')}
                  className="p-4 bg-gray-200 rounded-xl shadow-neumorphic-inset hover:shadow-neumorphic transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">New Expense</span>
                </button>
                <button 
                  onClick={() => navigate('/assets')}
                  className="p-4 bg-gray-200 rounded-xl shadow-neumorphic-inset hover:shadow-neumorphic transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">View Assets</span>
                </button>
                <button 
                  onClick={() => navigate('/resorts')}
                  className="p-4 bg-gray-200 rounded-xl shadow-neumorphic-inset hover:shadow-neumorphic transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Resorts</span>
                </button>
                <button 
                  onClick={() => navigate('/expenses')}
                  className="p-4 bg-gray-200 rounded-xl shadow-neumorphic-inset hover:shadow-neumorphic transition-all duration-200 flex flex-col items-center gap-2"
                >
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Expenses</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
