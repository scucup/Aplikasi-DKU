import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import DonutChart from '../components/charts/DonutChart';
import AreaChart from '../components/charts/AreaChart';
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
  dkuShare: number;
  expenses: number;
  profit: number;
}

interface MonthlyChartData {
  [month: string]: Array<{ name: string; value: number }>;
}

interface MonthlyResortStats {
  [month: string]: {
    totalRevenue: number;
    dkuShare: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    maintenanceCost: number;
  };
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
  const [expensesDistribution, setExpensesDistribution] = useState<any[]>([]);
  const [monthlyCategoryRevenueData, setMonthlyCategoryRevenueData] = useState<MonthlyChartData>({});
  const [monthlyExpensesDistData, setMonthlyExpensesDistData] = useState<MonthlyChartData>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [monthlyResortStats, setMonthlyResortStats] = useState<MonthlyResortStats>({});
  const [selectedCardPeriod, setSelectedCardPeriod] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const isFinancialUser = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  useEffect(() => {
    if (!isFinancialUser) {
      navigate('/dashboard');
      return;
    }
    fetchResortAnalytics();
  }, [selectedResortId]);

  const getMonthYearLabel = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
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

      // Fetch expenses per resort
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('resort_id, amount, status, date, category')
        .eq('status', 'APPROVED');

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

        // Expenses for this resort (from expenses table)
        const resortExpenses = expensesData?.filter(e => e.resort_id === resort.id) || [];
        const totalExpenses = resortExpenses.reduce(
          (sum, e) => sum + (Number(e.amount) || 0),
          0
        );

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
        const monthlyDku: { [key: string]: number } = {};

        resortRevenue.forEach(record => {
          const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
          const date = new Date(record.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          const config = profitConfigs?.find(
            c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
          );
          const dkuPercentage = config?.dku_percentage || 0;
          const dkuAmount = (netAmount * dkuPercentage) / 100;
          
          monthlyRev[monthKey] = (monthlyRev[monthKey] || 0) + netAmount;
          monthlyDku[monthKey] = (monthlyDku[monthKey] || 0) + dkuAmount;
        });

        // Calculate monthly expenses for selected resort
        const resortExpensesFiltered = expensesData?.filter(e => e.resort_id === selectedResortId) || [];
        const monthlyExp: { [key: string]: number } = {};
        
        resortExpensesFiltered.forEach(expense => {
          const date = new Date(expense.date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyExp[monthKey] = (monthlyExp[monthKey] || 0) + Number(expense.amount);
        });

        // Build monthly array for last 6 months
        const now = new Date();
        const monthlyArray: MonthlyResortData[] = [];
        const monthlyStatsData: MonthlyResortStats = {};
        
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthYearLabel = getMonthYearLabel(date);
          const dkuShare = monthlyDku[monthKey] || 0;
          const expenses = monthlyExp[monthKey] || 0;
          const revenue = monthlyRev[monthKey] || 0;
          const profit = dkuShare - expenses;
          const margin = dkuShare > 0 ? (profit / dkuShare) * 100 : 0;
          
          monthlyArray.push({
            month: monthYearLabel,
            revenue,
            dkuShare,
            expenses,
            profit,
          });

          // Store monthly stats for cards
          monthlyStatsData[monthYearLabel] = {
            totalRevenue: revenue,
            dkuShare,
            totalExpenses: expenses,
            netProfit: profit,
            profitMargin: margin,
            maintenanceCost: 0, // Will be calculated separately if needed
          };
        }
        setMonthlyData(monthlyArray);
        setMonthlyResortStats(monthlyStatsData);

        // Category revenue for selected resort (all time and by month)
        const catRev: { [key: string]: number } = {};
        const catRevByMonth: { [month: string]: { [cat: string]: number } } = {};
        
        resortRevenue.forEach(record => {
          const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
          const date = new Date(record.date);
          const monthYearLabel = getMonthYearLabel(date);
          
          // All time
          catRev[record.asset_category] = (catRev[record.asset_category] || 0) + netAmount;
          
          // By month (using month-year label)
          if (!catRevByMonth[monthYearLabel]) {
            catRevByMonth[monthYearLabel] = {};
          }
          catRevByMonth[monthYearLabel][record.asset_category] = (catRevByMonth[monthYearLabel][record.asset_category] || 0) + netAmount;
        });

        const catRevArray = Object.entries(catRev).map(([cat, val]) => ({
          name: cat.replace('_', ' '),
          value: val,
        }));
        setCategoryRevenue(catRevArray);

        // Build monthly category revenue data
        const monthlyCatRevData: MonthlyChartData = {};
        Object.entries(catRevByMonth).forEach(([month, cats]) => {
          monthlyCatRevData[month] = Object.entries(cats)
            .map(([cat, amount]) => ({
              name: cat.replace('_', ' '),
              value: amount,
            }))
            .sort((a, b) => b.value - a.value);
        });
        setMonthlyCategoryRevenueData(monthlyCatRevData);

        // Expenses distribution by category for selected resort (all time and by month)
        const resortExpensesForDist = expensesData?.filter(e => e.resort_id === selectedResortId) || [];
        const expByCat: { [key: string]: number } = {};
        const expByCatByMonth: { [month: string]: { [cat: string]: number } } = {};
        
        resortExpensesForDist.forEach(expense => {
          const cat = expense.category || 'OTHER';
          const date = new Date(expense.date);
          const monthYearLabel = getMonthYearLabel(date);
          
          // All time
          expByCat[cat] = (expByCat[cat] || 0) + Number(expense.amount);
          
          // By month (using month-year label)
          if (!expByCatByMonth[monthYearLabel]) {
            expByCatByMonth[monthYearLabel] = {};
          }
          expByCatByMonth[monthYearLabel][cat] = (expByCatByMonth[monthYearLabel][cat] || 0) + Number(expense.amount);
        });

        const expDistArray = Object.entries(expByCat).map(([cat, val]) => ({
          name: cat.replace('_', ' '),
          value: val,
        })).sort((a, b) => b.value - a.value);
        setExpensesDistribution(expDistArray);

        // Build monthly expenses distribution data
        const monthlyExpDistData: MonthlyChartData = {};
        Object.entries(expByCatByMonth).forEach(([month, cats]) => {
          monthlyExpDistData[month] = Object.entries(cats)
            .map(([cat, amount]) => ({
              name: cat.replace('_', ' '),
              value: amount,
            }))
            .sort((a, b) => b.value - a.value);
        });
        setMonthlyExpensesDistData(monthlyExpDistData);

        // Set available months
        setAvailableMonths(monthlyArray.map(m => m.month));
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
    setSelectedCardPeriod('all');
    navigate('/resort-analytics', { replace: true });
  };

  // Get displayed stats based on selected period
  const getDisplayedResortStats = () => {
    if (!selectedResort) return null;
    
    if (selectedCardPeriod === 'all') {
      return selectedResort;
    }
    
    const monthStats = monthlyResortStats[selectedCardPeriod];
    if (!monthStats) {
      return selectedResort;
    }

    return {
      ...selectedResort,
      total_revenue: monthStats.totalRevenue,
      dku_share: monthStats.dkuShare,
      total_expenses: monthStats.totalExpenses,
      net_profit: monthStats.netProfit,
      profit_margin: monthStats.profitMargin,
      maintenance_cost: monthStats.maintenanceCost,
    };
  };

  const displayedResortStats = getDisplayedResortStats();

  // Get chart data based on selected period
  const getCategoryRevenueData = () => {
    if (selectedCardPeriod === 'all') {
      return categoryRevenue;
    }
    return monthlyCategoryRevenueData[selectedCardPeriod] || [];
  };

  const getExpensesDistributionData = () => {
    if (selectedCardPeriod === 'all') {
      return expensesDistribution;
    }
    return monthlyExpensesDistData[selectedCardPeriod] || [];
  };

  const displayedCategoryRevenue = getCategoryRevenueData();
  const displayedExpensesDistribution = getExpensesDistributionData();

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
  if (selectedResort && displayedResortStats) {
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{selectedResort.resort_name}</h1>
                <p className="text-white/70">Detailed Performance Analytics</p>
              </div>
              {/* Card Period Selector */}
              <select
                value={selectedCardPeriod}
                onChange={(e) => setSelectedCardPeriod(e.target.value)}
                className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white font-medium hover:bg-purple-900/50 transition-all focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Assets with Utilization */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30 hover:border-blue-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{displayedResortStats.total_assets}</p>
              <p className="text-sm text-white/70">Total Assets</p>
              <div className="mt-3 flex items-center text-xs">
                <span className="text-green-400 font-semibold">{displayedResortStats.active_assets} Active</span>
                <span className="text-white/50 mx-2">•</span>
                <span className="text-orange-400 font-semibold">{displayedResortStats.maintenance_assets} Maintenance</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white/70">Utilization</span>
                  <span className="text-blue-400 font-semibold">{displayedResortStats.utilization_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${displayedResortStats.utilization_rate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* DKU Share with Total Revenue */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                Rp {(displayedResortStats.dku_share / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-white/70">DKU Share</p>
              <p className="text-xs text-purple-300 mt-2">
                Total Revenue: Rp {(displayedResortStats.total_revenue / 1000000).toFixed(1)}M
              </p>
            </div>

            {/* Total Expenses */}
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-orange-500/20 rounded-xl">
                  <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                Rp {((displayedResortStats.total_expenses + displayedResortStats.maintenance_cost) / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-white/70">Total Expenses</p>
              <p className="text-xs text-orange-300 mt-2">
                Maint: Rp {(displayedResortStats.maintenance_cost / 1000000).toFixed(1)}M
              </p>
            </div>

            {/* Net Profit */}
            <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 hover:border-pink-500/50 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-pink-500/20 rounded-xl">
                  <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                Rp {(displayedResortStats.net_profit / 1000000).toFixed(1)}M
              </p>
              <p className="text-sm text-white/70">Net Profit</p>
              <p className={`text-xs mt-2 font-semibold ${displayedResortStats.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Margin: {displayedResortStats.profit_margin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Charts - Row 1: Monthly DKU Share vs Expenses & Monthly Profit Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {monthlyData.length > 0 && (
              <AreaChart
                data={monthlyData.map(m => ({ name: m.month, dkuShare: m.dkuShare, expenses: m.expenses }))}
                title="Monthly DKU Share vs Expenses"
                dataKeys={[
                  { key: 'dkuShare', color: '#8b5cf6', name: 'DKU Share' },
                  { key: 'expenses', color: '#ec4899', name: 'Expenses' },
                ]}
                highlightPeriod={selectedCardPeriod}
              />
            )}

            {monthlyData.length > 0 && (
              <LineChart
                data={monthlyData.map(m => ({ name: m.month, value: m.profit }))}
                title="Monthly Profit Trend"
                color="#10b981"
                highlightPeriod={selectedCardPeriod}
              />
            )}
          </div>

          {/* Charts - Row 2: Revenue by Category & Expenses Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {displayedCategoryRevenue.length > 0 && (
              <DonutChart
                data={displayedCategoryRevenue}
                title="Revenue by Category"
                colors={['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']}
              />
            )}

            {displayedExpensesDistribution.length > 0 && (
              <DonutChart
                data={displayedExpensesDistribution}
                title="Expenses Distribution"
                colors={['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#6366f1']}
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
