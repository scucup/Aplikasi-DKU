import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import DonutChart from '../components/charts/DonutChart';
import LineChart from '../components/charts/LineChart';

interface ResortPerformance {
  resort_id: string;
  resort_name: string;
  total_revenue: number;
  dku_share: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  total_assets: number;
  active_assets: number;
  maintenance_assets: number;
  utilization_rate: number;
  maintenance_cost: number;
  revenue_per_asset: number;
}

interface MonthlyResortData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function ResortAnalytics() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedResortId = searchParams.get('resort');
  
  const [resorts, setResorts] = useState<ResortPerformance[]>([]);
  const [selectedResort, setSelectedResort] = useState<ResortPerformance | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyResortData[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isFinancialUser = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  useEffect(() => {
    if (!isFinancialUser) {
      navigate('/dashboard');
      return;
    }
    fetchResortAnalytics();
  }, [selectedResortId]);

  const getMonthName = (monthIndex: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
  };

  const fetchResortAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all resorts
      const { data: resortsData } = await supabase
        .from('resorts')
        .select('*');

      if (!resortsData) return;

      // Fetch revenue records
      const { data: revenueRecords } = await supabase
        .from('revenue_records')
        .select('resort_id, amount, discount, tax_service, asset_category, date');

      const { data: profitConfigs } = await supabase
        .from('profit_sharing_configs')
        .select('*');

      // Fetch assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, resort_id, status, category');

      // Fetch maintenance records
      const { data: maintenanceData } = await supabase
        .from('maintenance_records')
        .select('asset_id, labor_cost, sparepart_cost, start_date');

      // Calculate performance for each resort
      const performanceList: ResortPerformance[] = [];

      for (const resort of resortsData) {
        // Revenue calculation
        const resortRevenue = revenueRecords?.filter(r => r.resort_id === resort.id) || [];
        let totalRevenue = 0;
        let totalDkuShare = 0;
        const categoryRev: { [key: string]: number } = {};

        resortRevenue.forEach(record => {
          const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
          const config = profitConfigs?.find(
            c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
          );
          const dkuPercentage = config?.dku_percentage || 0;
          const dkuAmount = (netAmount * dkuPercentage) / 100;

          totalRevenue += netAmount;
          totalDkuShare += dkuAmount;

          categoryRev[record.asset_category] = (categoryRev[record.asset_category] || 0) + netAmount;
        });

        // Assets calculation
        const resortAssets = assetsData?.filter(a => a.resort_id === resort.id) || [];
        const activeAssets = resortAssets.filter(a => a.status === 'ACTIVE').length;
        const maintenanceAssets = resortAssets.filter(a => a.status === 'MAINTENANCE').length;
        const utilizationRate = resortAssets.length > 0 ? (activeAssets / resortAssets.length) * 100 : 0;

        // Maintenance cost (for assets in this resort)
        const resortAssetIds = resortAssets.map(a => a.id);
        const resortMaintenance = maintenanceData?.filter(m => resortAssetIds.includes(m.asset_id)) || [];
        const maintenanceCost = resortMaintenance.reduce(
          (sum, m) => sum + (Number(m.labor_cost) || 0) + (Number(m.sparepart_cost) || 0),
          0
        );

        // Expenses (simplified - divide equally or skip for now)
        const totalExpenses = 0; // We don't have resort-specific expenses in schema

        const netProfit = totalDkuShare - totalExpenses - maintenanceCost;
        const profitMargin = totalDkuShare > 0 ? (netProfit / totalDkuShare) * 100 : 0;
        const revenuePerAsset = resortAssets.length > 0 ? totalRevenue / resortAssets.length : 0;

        performanceList.push({
          resort_id: resort.id,
          resort_name: resort.name,
          total_revenue: totalRevenue,
          dku_share: totalDkuShare,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          profit_margin: profitMargin,
          total_assets: resortAssets.length,
          active_assets: activeAssets,
          maintenance_assets: maintenanceAssets,
          utilization_rate: utilizationRate,
          maintenance_cost: maintenanceCost,
          revenue_per_asset: revenuePerAsset,
        });
      }

      // Sort by revenue
      performanceList.sort((a, b) => b.total_revenue - a.total_revenue);
      setResorts(performanceList);

      // If a resort is selected, fetch detailed monthly data
      if (selectedResortId) {
        const resort = performanceList.find(r => r.resort_id === selectedResortId);
        setSelectedResort(resort || null);

        // Calculate monthly data for selected resort
        const resortRevenue = revenueRecords?.filter(r => r.resort_id === selectedResortId) || [];
        const monthlyRev: { [key: string]: number } = {};

        resortRevenue.forEach(record => {
          const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
          const date = new Date(record.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + netAmount;
        });

        // Build monthly array for last 6 months
        const now = new Date();
        const monthlyArray: MonthlyResortData[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyArray.push({
            month: getMonthName(date.getMonth()),
            revenue: monthlyRev[monthKey] || 0,
            expenses: 0,
            profit: monthlyRev[monthKey] || 0,
          });
        }
        setMonthlyData(monthlyArray);

        // Category revenue for selected resort
        const catRev: { [key: string]: number } = {};
        resortRevenue.forEach(record => {
          const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
          catRev[record.asset_category] = (catRev[record.asset_category] || 0) + netAmount;
        });

        const catRevArray = Object.entries(catRev).map(([cat, val]) => ({
          name: cat.replace('_', ' '),
          value: val,
        }));
        setCategoryRevenue(catRevArray);
      }
    } catch (error) {
      console.error('Error fetching resort analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResortClick = (resortId: string) => {
    navigate(`/resort-analytics?resort=${resortId}`);
  };

  const handleBackToComparison = () => {
    setSelectedResort(null);
    navigate('/resort-analytics', { replace: true });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
        </div>
      </Layout>
    );
  }

  // Detailed view for selected resort
  if (selectedResort) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBackToComparison}
              className="flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Comparison
            </button>
            <h1 className="text-4xl font-bold text-white mb-2">{selectedResort.resort_name}</h1>
            <p className="text-white/70">Detailed Performance Analytics</p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
              <p className="text-sm text-white/70 mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-white">
                Rp {(selectedResort.total_revenue / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-purple-300 mt-2">
                DKU Share: Rp {(selectedResort.dku_share / 1000000).toFixed(1)}M
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
              <p className="text-sm text-white/70 mb-2">Net Profit</p>
              <p className="text-3xl font-bold text-white">
                Rp {(selectedResort.net_profit / 1000000).toFixed(1)}M
              </p>
              <p className={`text-xs mt-2 font-semibold ${selectedResort.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Margin: {selectedResort.profit_margin.toFixed(1)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
              <p className="text-sm text-white/70 mb-2">Asset Utilization</p>
              <p className="text-3xl font-bold text-white">{selectedResort.utilization_rate.toFixed(1)}%</p>
              <p className="text-xs text-blue-300 mt-2">
                {selectedResort.active_assets}/{selectedResort.total_assets} Active
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30">
              <p className="text-sm text-white/70 mb-2">Revenue per Asset</p>
              <p className="text-3xl font-bold text-white">
                Rp {(selectedResort.revenue_per_asset / 1000000).toFixed(1)}M
              </p>
              <p className="text-xs text-orange-300 mt-2">Per unit average</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {monthlyData.length > 0 && (
              <LineChart
                data={monthlyData.map(m => ({ name: m.month, value: m.revenue }))}
                title="Monthly Revenue Trend"
                color="#8b5cf6"
              />
            )}

            {categoryRevenue.length > 0 && (
              <DonutChart
                data={categoryRevenue}
                title="Revenue by Category"
                colors={['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']}
              />
            )}
          </div>

          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🏍️</div>
                <div>
                  <p className="text-3xl font-bold text-white">{selectedResort.total_assets}</p>
                  <p className="text-sm text-white/70">Total Assets</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">✅</div>
                <div>
                  <p className="text-3xl font-bold text-white">{selectedResort.active_assets}</p>
                  <p className="text-sm text-white/70">Active Assets</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🔧</div>
                <div>
                  <p className="text-3xl font-bold text-white">
                    Rp {(selectedResort.maintenance_cost / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-sm text-white/70">Maintenance Cost</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Comparison view
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Resort Performance Comparison</h1>
          <p className="text-white/70">Compare performance metrics across all partner resorts</p>
        </div>

        {/* Comparison Table */}
        <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mb-8 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-purple-500/20">
                <th className="text-left py-3 px-4 text-white/90 font-semibold">Resort</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Revenue</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">DKU Share</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Net Profit</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Margin</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Assets</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Utilization</th>
                <th className="text-right py-3 px-4 text-white/90 font-semibold">Rev/Asset</th>
                <th className="text-center py-3 px-4 text-white/90 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {resorts.map((resort, index) => (
                <tr 
                  key={resort.resort_id}
                  className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-purple-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-white font-medium">{resort.resort_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-white">
                    Rp {(resort.total_revenue / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-4 px-4 text-right text-purple-300">
                    Rp {(resort.dku_share / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-4 px-4 text-right text-green-400 font-semibold">
                    Rp {(resort.net_profit / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-semibold ${resort.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {resort.profit_margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-white/70">
                    {resort.total_assets}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-blue-400 font-semibold">
                      {resort.utilization_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-white/70">
                    Rp {(resort.revenue_per_asset / 1000000).toFixed(1)}M
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleResortClick(resort.resort_id)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {resorts.slice(0, 3).map((resort, index) => (
            <div
              key={resort.resort_id}
              onClick={() => handleResortClick(resort.resort_id)}
              className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{resort.resort_name}</h3>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                }`}>
                  {index + 1}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Revenue:</span>
                  <span className="text-white font-semibold">Rp {(resort.total_revenue / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Utilization:</span>
                  <span className="text-blue-400 font-semibold">{resort.utilization_rate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70 text-sm">Profit Margin:</span>
                  <span className={`font-semibold ${resort.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {resort.profit_margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
