import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
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
  pending_expenses: number;
}

interface MonthlyResortData {
  month: string;
  dkuShare: number;
  expenses: number;
  profit: number;
}

export default function ResortAnalytics() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [resorts, setResorts] = useState<ResortPerformance[]>([]);
  const [selectedResortId, setSelectedResortId] = useState<string>('');
  const [monthlyData, setMonthlyData] = useState<MonthlyResortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | '6m' | '12m' | 'all'>('current');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  const isFinancialUser = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  useEffect(() => {
    if (!isFinancialUser) {
      navigate('/dashboard');
      return;
    }
    fetchResortAnalytics();
  }, [selectedPeriod, selectedMonth]);

  const getMonthYearLabel = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const fetchResortAnalytics = async () => {
    try {
      setLoading(true);

      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      let monthsBack: number;

      if (selectedPeriod === 'current' && !selectedMonth) {
        // Current month only
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        monthsBack = 1;
      } else if (selectedPeriod === 'current' && selectedMonth) {
        // Specific month selected
        const [year, month] = selectedMonth.split('-').map(Number);
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        monthsBack = 1;
      } else if (selectedPeriod === '6m') {
        monthsBack = 6;
        startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
      } else if (selectedPeriod === '12m') {
        monthsBack = 12;
        startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
      } else {
        // All time
        startDate = new Date(2020, 0, 1);
        monthsBack = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      }

      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);

      // Fetch all resorts
      const { data: resortsData } = await supabase
        .from('resorts')
        .select('id, name')
        .order('name');

      if (!resortsData) return;

      // Fetch ALL revenue records with pagination - SAME AS REVENUE PAGE
      let allRevenueRecords: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('revenue_records')
          .select('resort_id, amount, discount, tax_service, asset_category, date')
          .order('date', { ascending: false })
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);

        if (pageError) {
          console.error('Error fetching revenue data:', pageError);
          throw pageError;
        }

        if (pageData && pageData.length > 0) {
          allRevenueRecords = [...allRevenueRecords, ...pageData];
          from += pageSize;
          hasMore = pageData.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // Fetch profit sharing configs - SAME AS REVENUE PAGE
      const { data: profitConfigs, error: profitError } = await supabase
        .from('profit_sharing_configs')
        .select('id, resort_id, asset_category, dku_percentage, resort_percentage, effective_from');

      if (profitError) {
        console.error('Error fetching profit configs:', profitError);
        throw profitError;
      }

      // Process records with profit sharing data - EXACT SAME LOGIC AS REVENUE PAGE
      const recordsWithSharing = allRevenueRecords.map(record => {
        try {
          const config = profitConfigs?.find(
            c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
          );
          
          const amount = Number(record.amount) || 0;
          const discount = Number(record.discount) || 0;
          const taxService = Number(record.tax_service) || 0;
          
          const netAmount = amount - discount - taxService;
          const dkuPercentage = Number(config?.dku_percentage) || 0;
          const dkuShare = (netAmount * dkuPercentage) / 100;
          
          return {
            ...record,
            netAmount: isNaN(netAmount) ? 0 : netAmount,
            dku_share: isNaN(dkuShare) ? 0 : dkuShare,
            dku_percentage: dkuPercentage,
            hasConfig: !!config
          };
        } catch (error) {
          console.error('Error processing record:', record.id, error);
          return {
            ...record,
            netAmount: Number(record.amount) || 0,
            dkuShare: 0,
            dkuPercentage: 0,
            hasConfig: false
          };
        }
      });

      // Filter by date range - SAME AS REVENUE PAGE
      const filteredRecords = recordsWithSharing.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });

      // Fetch ALL expenses with pagination - SAME AS EXPENSES PAGE
      const { data: allExpensesData } = await supabase
        .from('expenses')
        .select('resort_id, amount, status, date, category');

      // Filter expenses by date range - SAME AS EXPENSES PAGE
      const filteredExpenses = allExpensesData?.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      }) || [];

      // Fetch assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, resort_id, status, category');

      // Fetch available months for dropdown
      if (availableMonths.length === 0) {
        const allMonthsSet = new Set<string>();
        
        allRevenueRecords?.forEach(record => {
          if (record.date) {
            const dateParts = record.date.split('-');
            if (dateParts.length >= 2) {
              const year = parseInt(dateParts[0]);
              const month = dateParts[1].padStart(2, '0');
              if (year >= 2020 && year <= 2030) {
                const monthKey = `${year}-${month}`;
                allMonthsSet.add(monthKey);
              }
            }
          }
        });
        
        const sortedMonths = Array.from(allMonthsSet).sort().reverse();
        setAvailableMonths(sortedMonths);
      }

      // Calculate performance for each resort
      const performanceList: ResortPerformance[] = [];

      for (const resort of resortsData) {
        // Revenue calculation - SAME LOGIC AS REVENUE PAGE
        const resortRevenue = filteredRecords.filter(r => r.resort_id === resort.id);
        const totalRevenue = resortRevenue.reduce((sum, record) => sum + Number(record.amount), 0);
        const totalDkuShare = resortRevenue.reduce((sum, record) => sum + (record.dku_share || 0), 0);

        // Assets calculation
        const resortAssets = assetsData?.filter(a => a.resort_id === resort.id) || [];
        const activeAssets = resortAssets.filter(a => a.status === 'ACTIVE').length;
        const maintenanceAssets = resortAssets.filter(a => a.status === 'MAINTENANCE').length;
        const utilizationRate = resortAssets.length > 0 ? (activeAssets / resortAssets.length) * 100 : 0;

        // Expenses for this resort - SAME LOGIC AS EXPENSES PAGE (APPROVED only)
        const resortExpenses = filteredExpenses.filter(e => e.resort_id === resort.id);
        const approvedExpenses = resortExpenses.filter(e => e.status === 'APPROVED')
          .reduce((sum, e) => sum + Number(e.amount), 0);
        const pendingExpenses = resortExpenses.filter(e => e.status === 'PENDING').length;

        // Net profit calculation - SAME AS DASHBOARD
        const netProfit = totalDkuShare - approvedExpenses;
        const profitMargin = totalDkuShare > 0 ? (netProfit / totalDkuShare) * 100 : 0;

        performanceList.push({
          resort_id: resort.id,
          resort_name: resort.name,
          total_revenue: totalRevenue,
          dku_share: totalDkuShare,
          total_expenses: approvedExpenses,
          net_profit: netProfit,
          profit_margin: profitMargin,
          total_assets: resortAssets.length,
          active_assets: activeAssets,
          maintenance_assets: maintenanceAssets,
          utilization_rate: utilizationRate,
          pending_expenses: pendingExpenses,
        });
      }

      setResorts(performanceList);

      // Calculate monthly data for ALL resorts
      const resortMonthlyData: { [resortId: string]: MonthlyResortData[] } = {};

      for (const resort of resortsData) {
        const resortRevenue = filteredRecords.filter(r => r.resort_id === resort.id);
        const resortExpenses = filteredExpenses.filter(e => e.resort_id === resort.id && e.status === 'APPROVED');

        const monthlyDku: { [key: string]: number } = {};
        const monthlyExp: { [key: string]: number } = {};

        resortRevenue.forEach(record => {
          const dateParts = record.date.split('-');
          const recordDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyDku[monthKey] = (monthlyDku[monthKey] || 0) + (record.dkuShare || 0);
        });

        resortExpenses.forEach(expense => {
          const dateParts = expense.date.split('-');
          const expenseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyExp[monthKey] = (monthlyExp[monthKey] || 0) + Number(expense.amount);
        });

        // Build monthly array
        const monthlyArray: MonthlyResortData[] = [];
        let monthsToDisplay: Date[] = [];

        if (selectedPeriod === 'all') {
          const uniqueMonths = new Set<string>();
          Object.keys(monthlyDku).forEach(key => uniqueMonths.add(key));
          Object.keys(monthlyExp).forEach(key => uniqueMonths.add(key));
          
          monthsToDisplay = Array.from(uniqueMonths)
            .map(key => {
              const [year, month] = key.split('-').map(Number);
              return new Date(year, month - 1, 1);
            })
            .sort((a, b) => a.getTime() - b.getTime());
        } else {
          for (let i = 0; i < monthsBack; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - monthsBack + i + 1, 1);
            monthsToDisplay.push(date);
          }
        }

        monthsToDisplay.forEach(date => {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const monthYearLabel = getMonthYearLabel(date);
          const dkuShare = monthlyDku[monthKey] || 0;
          const expenses = monthlyExp[monthKey] || 0;
          const profit = dkuShare - expenses;

          monthlyArray.push({
            month: monthYearLabel,
            dkuShare,
            expenses,
            profit,
          });
        });

        resortMonthlyData[resort.id] = monthlyArray;
      }

      // Set monthly data for selected resort or first resort
      if (selectedResortId && resortMonthlyData[selectedResortId]) {
        setMonthlyData(resortMonthlyData[selectedResortId]);
      } else if (resortsData.length > 0) {
        setMonthlyData(resortMonthlyData[resortsData[0].id] || []);
      }

      // Store all resort monthly data in state
      (window as any).resortMonthlyData = resortMonthlyData;
    } catch (error) {
      console.error('Error fetching resort analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get selected resort data
  const selectedResort = resorts.find(r => r.resort_id === selectedResortId);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12 py-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">Dashboard Analytics</h1>
              <p className="text-xl text-white/70">Welcome back, <span className="text-purple-400 font-semibold">{profile?.name?.toUpperCase() || 'USER'}</span></p>
            </div>
            
            {/* Period Selection */}
            <div className="flex items-center gap-4">
              {/* Resort Analytics Button */}
              <button
                className="px-8 py-4 bg-gradient-to-br from-pink-600 to-purple-600 text-white rounded-2xl shadow-2xl hover:shadow-pink-500/50 transition-all font-bold text-lg"
              >
                📊 Resort Analytics
              </button>

              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setSelectedPeriod('current');
                }}
                className="px-6 py-4 bg-purple-900/40 border-2 border-purple-500/40 rounded-2xl text-white text-lg font-semibold hover:bg-purple-900/60 transition-all focus:ring-4 focus:ring-purple-500/50 focus:border-purple-400"
              >
                <option value="">Current Month</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>

              {/* Period Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedPeriod(selectedPeriod === '6m' ? 'current' : '6m');
                    setSelectedMonth('');
                  }}
                  className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                    selectedPeriod === '6m'
                      ? 'bg-purple-600 text-white shadow-2xl shadow-purple-500/50 scale-105'
                      : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50 hover:scale-105'
                  }`}
                >
                  6<br/>Months
                </button>
                <button
                  onClick={() => {
                    setSelectedPeriod(selectedPeriod === '12m' ? 'current' : '12m');
                    setSelectedMonth('');
                  }}
                  className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                    selectedPeriod === '12m'
                      ? 'bg-purple-600 text-white shadow-2xl shadow-purple-500/50 scale-105'
                      : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50 hover:scale-105'
                  }`}
                >
                  12<br/>Months
                </button>
                <button
                  onClick={() => {
                    setSelectedPeriod(selectedPeriod === 'all' ? 'current' : 'all');
                    setSelectedMonth('');
                  }}
                  className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
                    selectedPeriod === 'all'
                      ? 'bg-purple-600 text-white shadow-2xl shadow-purple-500/50 scale-105'
                      : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50 hover:scale-105'
                  }`}
                >
                  All<br/>Time
                </button>
              </div>
            </div>
          </div>

          {/* Resort Selector */}
          <div className="flex items-center gap-6 bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
            <label className="text-white font-bold text-xl">Select Resort:</label>
            <select
              value={selectedResortId}
              onChange={(e) => setSelectedResortId(e.target.value)}
              className="flex-1 max-w-md px-6 py-3 bg-purple-900/40 border-2 border-purple-500/40 rounded-xl text-white text-lg font-semibold hover:bg-purple-900/60 transition-all focus:ring-4 focus:ring-purple-500/50 focus:border-purple-400"
            >
              <option value="">-- All Resorts --</option>
              {resorts.map(resort => (
                <option key={resort.resort_id} value={resort.resort_id}>
                  {resort.resort_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Display all resorts in grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {resorts.map((resort) => {
            // Get monthly data for this resort
            const resortMonthly = (window as any).resortMonthlyData?.[resort.resort_id] || [];
            
            // Shorten resort name for display
            const displayName = resort.resort_name.toUpperCase().includes('WATERFRONT HARRIS') 
              ? 'HARRIS RESORT' 
              : resort.resort_name;

            return (
              <div key={resort.resort_id} className="bg-gradient-to-br from-purple-900/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border-2 border-purple-500/30 hover:border-purple-500/60 transition-all shadow-2xl hover:shadow-purple-500/20">
                {/* Resort Header */}
                <div className="mb-8 pb-6 border-b border-purple-500/30">
                  <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">{displayName}</h2>
                  <p className="text-white/60 text-lg">Performance Overview</p>
                </div>

                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  {/* Total Assets */}
                  <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-500/40 hover:border-blue-400/60 transition-all shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-500/30 rounded-xl">
                        <svg className="w-8 h-8 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-5xl font-bold text-white mb-2">{resort.total_assets}</p>
                    <p className="text-sm text-white/70 font-medium mb-3">Total Assets</p>
                    <div className="flex items-center text-sm gap-3 mb-3">
                      <span className="text-green-400 font-bold">{resort.active_assets} Active</span>
                      <span className="text-white/40">•</span>
                      <span className="text-orange-400 font-bold">{resort.maintenance_assets} Maintenance</span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-white/80 font-medium">Utilization</span>
                        <span className="text-blue-300 font-bold text-lg">{resort.utilization_rate.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700 shadow-lg shadow-blue-500/50"
                          style={{ width: `${resort.utilization_rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* DKU Share */}
                  <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-500/40 hover:border-purple-400/60 transition-all shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-500/30 rounded-xl">
                        <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-2">Rp {Math.round(resort.dku_share).toLocaleString('id-ID')}</p>
                    <p className="text-sm text-white/70 font-medium mb-3">DKU Share</p>
                    <div className="mt-4 pt-3 border-t border-purple-400/30">
                      <p className="text-sm text-purple-200 font-medium">
                        Total Revenue: <span className="text-white font-bold">Rp {Math.round(resort.total_revenue).toLocaleString('id-ID')}</span>
                      </p>
                    </div>
                  </div>

                  {/* Total Expenses */}
                  <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-orange-500/40 hover:border-orange-400/60 transition-all shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-orange-500/30 rounded-xl">
                        <svg className="w-8 h-8 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-2">Rp {Math.round(resort.total_expenses).toLocaleString('id-ID')}</p>
                    <p className="text-sm text-white/70 font-medium mb-3">Total Expenses</p>
                    <div className="mt-4 pt-3 border-t border-orange-400/30">
                      <p className="text-sm text-orange-200 font-medium">
                        Approved only • <span className="text-yellow-300 font-bold">{resort.pending_expenses} pending</span>
                      </p>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="bg-gradient-to-br from-pink-600/30 to-pink-800/30 backdrop-blur-sm rounded-2xl p-6 border-2 border-pink-500/40 hover:border-pink-400/60 transition-all shadow-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-pink-500/30 rounded-xl">
                        <svg className="w-8 h-8 text-pink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-2">Rp {Math.round(resort.net_profit).toLocaleString('id-ID')}</p>
                    <p className="text-sm text-white/70 font-medium mb-3">Net Profit</p>
                    <div className="mt-4 pt-3 border-t border-pink-400/30">
                      <p className={`text-sm font-bold text-lg ${resort.profit_margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Margin: {resort.profit_margin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charts - Always show for each resort */}
                {resortMonthly.length > 0 && (
                  <div className="space-y-6 mt-8">
                    <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
                      <AreaChart
                        data={resortMonthly.map(m => ({ name: m.month, dkuShare: m.dkuShare, expenses: m.expenses }))}
                        title="Monthly DKU Share vs Expenses"
                        dataKeys={[
                          { key: 'dkuShare', color: '#8b5cf6', name: 'DKU Share' },
                          { key: 'expenses', color: '#ec4899', name: 'Expenses' },
                        ]}
                      />
                    </div>

                    <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
                      <LineChart
                        data={resortMonthly.map(m => ({ name: m.month, value: m.profit }))}
                        title="Monthly Profit Trend"
                        color="#10b981"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
