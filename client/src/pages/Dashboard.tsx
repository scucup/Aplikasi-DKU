import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import RevenueChart from '../components/charts/RevenueChart';
import DonutChart from '../components/charts/DonutChart';
import AreaChart from '../components/charts/AreaChart';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';

interface DashboardStats {
  totalResorts: number;
  totalAssets: number;
  activeAssets: number;
  maintenanceAssets: number;
  totalRevenue: number;
  totalDkuShare: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  utilizationRate: number;
  pendingExpenses: number;
  totalMaintenanceCost: number;
}

interface MonthlyStats {
  [month: string]: {
    totalRevenue: number;
    totalDkuShare: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    totalMaintenanceCost: number;
  };
}

interface MonthlyData {
  month: string;
  revenue: number;
  dkuShare: number;
  expenses: number;
  profit: number;
  maintenanceCost: number;
}

interface ResortRevenue {
  resort_name: string;
  total_revenue: number;
  dku_share: number;
  resort_share: number;
}

interface CategoryRevenue {
  category: string;
  revenue: number;
  count: number;
}

interface ExpensesByCategory {
  category: string;
  amount: number;
}

interface MonthlyChartData {
  [month: string]: Array<{ name: string; value: number }>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalResorts: 0,
    totalAssets: 0,
    activeAssets: 0,
    maintenanceAssets: 0,
    totalRevenue: 0,
    totalDkuShare: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    utilizationRate: 0,
    pendingExpenses: 0,
    totalMaintenanceCost: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({});
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [resortRevenues, setResortRevenues] = useState<ResortRevenue[]>([]);
  const [categoryRevenues, setCategoryRevenues] = useState<CategoryRevenue[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpensesByCategory[]>([]);
  const [monthlyExpensesData, setMonthlyExpensesData] = useState<MonthlyChartData>({});
  const [monthlyCategoryRevenueData, setMonthlyCategoryRevenueData] = useState<MonthlyChartData>({});
  const [monthlyResortRevenueData, setMonthlyResortRevenueData] = useState<{ [month: string]: ResortRevenue[] }>({});
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | '12m' | null>(null);
  const [selectedCardPeriod, setSelectedCardPeriod] = useState<string>('all');
  const [startingMonth, setStartingMonth] = useState<string>(''); // Format: YYYY-MM
  const [availableStartMonths, setAvailableStartMonths] = useState<string[]>([]);

  const isFinancialUser = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  // Get displayed stats based on selected period
  const getDisplayedStats = () => {
    if (selectedCardPeriod === 'all') {
      return stats;
    }
    
    const monthStats = monthlyStats[selectedCardPeriod];
    if (!monthStats) {
      return stats;
    }

    return {
      ...stats,
      totalRevenue: monthStats.totalRevenue,
      totalDkuShare: monthStats.totalDkuShare,
      totalExpenses: monthStats.totalExpenses,
      netProfit: monthStats.netProfit,
      profitMargin: monthStats.profitMargin,
      totalMaintenanceCost: monthStats.totalMaintenanceCost,
    };
  };

  const displayedStats = getDisplayedStats();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, startingMonth]);

  const getMonthYearLabel = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const fetchDashboardData = async () => {
    try {
      // First, fetch ALL available months from database to populate the dropdown
      // This is done on initial load to get the complete list of months with data
      if (availableStartMonths.length === 0) {
        // Fetch ALL revenue dates with pagination
        let allRevenueMonths: any[] = [];
        let revenueFrom = 0;
        const pageSize = 1000;
        let hasMoreRevenue = true;
        
        while (hasMoreRevenue) {
          const { data: revenuePage, error: revenueError } = await supabase
            .from('revenue_records')
            .select('date')
            .range(revenueFrom, revenueFrom + pageSize - 1);
          
          if (revenueError) {
            console.error('Error fetching revenue dates:', revenueError);
            break;
          }
          
          if (revenuePage && revenuePage.length > 0) {
            allRevenueMonths = [...allRevenueMonths, ...revenuePage];
            revenueFrom += pageSize;
            hasMoreRevenue = revenuePage.length === pageSize;
          } else {
            hasMoreRevenue = false;
          }
        }
        
        // Fetch ALL expense dates with pagination
        let allExpenseMonths: any[] = [];
        let expenseFrom = 0;
        let hasMoreExpense = true;
        
        while (hasMoreExpense) {
          const { data: expensePage, error: expenseError } = await supabase
            .from('expenses')
            .select('date')
            .range(expenseFrom, expenseFrom + pageSize - 1);
          
          if (expenseError) {
            console.error('Error fetching expense dates:', expenseError);
            break;
          }
          
          if (expensePage && expensePage.length > 0) {
            allExpenseMonths = [...allExpenseMonths, ...expensePage];
            expenseFrom += pageSize;
            hasMoreExpense = expensePage.length === pageSize;
          } else {
            hasMoreExpense = false;
          }
        }
        
        console.log(`📊 Fetched ${allRevenueMonths.length} revenue records and ${allExpenseMonths.length} expense records`);
        
        console.log(`📊 Fetched ${allRevenueMonths.length} revenue records and ${allExpenseMonths.length} expense records`);
        
        // Extract unique months
        const allMonthsSet = new Set<string>();
        
        allRevenueMonths?.forEach(record => {
          if (record.date) {
            const dateParts = record.date.split('-');
            if (dateParts.length >= 2) {
              const year = parseInt(dateParts[0]);
              const month = dateParts[1].padStart(2, '0');
              // Only include valid years (2020 onwards)
              if (year >= 2020 && year <= 2030) {
                const monthKey = `${year}-${month}`;
                allMonthsSet.add(monthKey);
              }
            }
          }
        });
        
        allExpenseMonths?.forEach(record => {
          if (record.date) {
            const dateParts = record.date.split('-');
            if (dateParts.length >= 2) {
              const year = parseInt(dateParts[0]);
              const month = dateParts[1].padStart(2, '0');
              // Only include valid years (2020 onwards)
              if (year >= 2020 && year <= 2030) {
                const monthKey = `${year}-${month}`;
                allMonthsSet.add(monthKey);
              }
            }
          }
        });
        
        // Sort descending (newest first)
        const sortedMonths = Array.from(allMonthsSet).sort().reverse();
        console.log('📅 Available months for dropdown:', sortedMonths);
        setAvailableStartMonths(sortedMonths);
      }
      
      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate: Date;
      let monthsBack: number;
      
      if (selectedPeriod === 'all') {
        // For "All Time", fetch from earliest possible date (e.g., 2020-01-01)
        startDate = new Date(2020, 0, 1);
        endDate = now;
        monthsBack = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      } else if (selectedPeriod === null && startingMonth) {
        // No period selected, show only the specific month
        const [year, month] = startingMonth.split('-').map(Number);
        
        // First day of the month at 00:00:00 UTC
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        
        // Last day of the same month at 23:59:59 UTC
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        
        monthsBack = 1;
        
        console.log('🔍 Single month view:', {
          startingMonth,
          year,
          month,
          startDateUTC: startDate.toISOString(),
          endDateUTC: endDate.toISOString()
        });
      } else if (startingMonth && selectedPeriod) {
        // User selected a specific starting month with period
        const [year, month] = startingMonth.split('-').map(Number);
        
        // Create dates using UTC to avoid timezone issues
        // First day of starting month at 00:00:00 UTC
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        
        monthsBack = selectedPeriod === '6m' ? 6 : 12;
        
        // Last day of the ending month
        // Example: Jan 2025 (month=1) + 12 months = Dec 2025
        // Date.UTC(2025, 0 + 12, 0) = Date.UTC(2025, 12, 0) = last day of Dec 2025
        endDate = new Date(Date.UTC(year, month - 1 + monthsBack, 0, 23, 59, 59, 999));
        
        console.log('🔍 Starting month parsing:', {
          startingMonth,
          year,
          month,
          monthsBack,
          startDateUTC: startDate.toISOString(),
          endDateUTC: endDate.toISOString()
        });
      } else if (selectedPeriod) {
        // Default: from current month backwards
        monthsBack = selectedPeriod === '6m' ? 6 : 12;
        startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
        endDate = now;
      } else {
        // No period and no month selected - default to current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        monthsBack = 1;
      }

      console.log('📅 Date Range Calculation:', {
        selectedPeriod,
        startingMonth,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        monthsBack
      });

      // Fetch resorts
      const { data: resorts, count: resortsCount } = await supabase
        .from('resorts')
        .select('id, name', { count: 'exact' });

      // Fetch assets
      const { data: assets } = await supabase
        .from('assets')
        .select('status, category');

      const activeCount = assets?.filter(a => a.status === 'ACTIVE').length || 0;
      const maintenanceCount = assets?.filter(a => a.status === 'MAINTENANCE').length || 0;
      const utilizationRate = assets && assets.length > 0 ? (activeCount / assets.length) * 100 : 0;

      // Fetch revenue records with pagination - SAME AS REVENUE PAGE
      let allRevenueRecords: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      // Format dates as YYYY-MM-DD in local timezone
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const startDateStr = formatDate(startDate);
      const endDateStr = formatDate(endDate);
      
      console.log('📅 Query date range:', { startDateStr, endDateStr });
      
      // Fetch ALL records with pagination - SAME QUERY AS REVENUE PAGE
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('revenue_records')
          .select('*, resort:resorts(name)')
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
      
      console.log(`📊 Fetched ${allRevenueRecords.length} total revenue records`);

      // Fetch profit sharing configs - SAME AS REVENUE PAGE - only required columns
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
          
          // Safe number conversion with fallback to 0
          const amount = Number(record.amount) || 0;
          const discount = Number(record.discount) || 0;
          const taxService = Number(record.tax_service) || 0;
          
          // Calculate net amount safely
          const netAmount = amount - discount - taxService;
          
          // Use default DKU percentage if config not found
          const dkuPercentage = config?.dku_percentage || 0;
          const dkuShare = (netAmount * dkuPercentage) / 100;
          
          return {
            ...record,
            netAmount: isNaN(netAmount) ? 0 : netAmount,
            dkuShare: isNaN(dkuShare) ? 0 : dkuShare,
            dkuPercentage: dkuPercentage,
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

      console.log(`✅ Processed ${recordsWithSharing.length} revenue records`);
      
      // Filter by date range - SAME AS REVENUE PAGE FILTER
      const filteredRecords = recordsWithSharing.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate >= startDate && recordDate <= endDate;
      });
      
      console.log(`📊 Filtered to ${filteredRecords.length} records for period ${startDateStr} to ${endDateStr}`);

      // Calculate totals - SAME AS REVENUE PAGE
      const totalRevenue = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
      const totalNetAmount = filteredRecords.reduce((sum, record) => sum + (record.netAmount || 0), 0);
      const totalDkuShare = filteredRecords.reduce((sum, record) => sum + (record.dkuShare || 0), 0);
      
      console.log('💰 Totals (SAME CALCULATION AS REVENUE PAGE):', {
        recordCount: filteredRecords.length,
        totalRevenue,
        totalNetAmount,
        totalDkuShare
      });
      
      // Now build monthly aggregations from filtered records
      const monthlyRevenue: { [key: string]: number } = {};
      const monthlyDkuShare: { [key: string]: number } = {};
      const revenueByResort: { [key: string]: { total: number; dku: number; resort: number } } = {};
      const revenueByResortByMonth: { [month: string]: { [resortId: string]: { total: number; dku: number; resort: number } } } = {};
      const revenueByCategory: { [key: string]: { total: number; count: number } } = {};
      const revenueByCatByMonth: { [month: string]: { [cat: string]: number } } = {};

      filteredRecords?.forEach((record) => {
        // Use pre-calculated values from recordsWithSharing (SAME AS REVENUE PAGE)
        const netAmount = record.netAmount || 0;
        const dkuAmount = record.dkuShare || 0;
        
        // Parse date as UTC to avoid timezone issues
        const dateParts = record.date.split('-');
        const recordDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        const monthYearLabel = getMonthYearLabel(recordDate);
        
        const config = profitConfigs?.find(
          c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
        );
        
        const resortPercentage = config?.resort_percentage || 0;
        const resortAmount = (netAmount * resortPercentage) / 100;

        // Monthly aggregation
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + netAmount;
        monthlyDkuShare[monthKey] = (monthlyDkuShare[monthKey] || 0) + dkuAmount;

        // By resort
        if (!revenueByResort[record.resort_id]) {
          revenueByResort[record.resort_id] = { total: 0, dku: 0, resort: 0 };
        }
        revenueByResort[record.resort_id].total += netAmount;
        revenueByResort[record.resort_id].dku += dkuAmount;
        revenueByResort[record.resort_id].resort += resortAmount;

        // By resort by month
        if (!revenueByResortByMonth[monthYearLabel]) {
          revenueByResortByMonth[monthYearLabel] = {};
        }
        if (!revenueByResortByMonth[monthYearLabel][record.resort_id]) {
          revenueByResortByMonth[monthYearLabel][record.resort_id] = { total: 0, dku: 0, resort: 0 };
        }
        revenueByResortByMonth[monthYearLabel][record.resort_id].total += netAmount;
        revenueByResortByMonth[monthYearLabel][record.resort_id].dku += dkuAmount;
        revenueByResortByMonth[monthYearLabel][record.resort_id].resort += resortAmount;

        // By category
        if (!revenueByCategory[record.asset_category]) {
          revenueByCategory[record.asset_category] = { total: 0, count: 0 };
        }
        revenueByCategory[record.asset_category].total += netAmount;
        revenueByCategory[record.asset_category].count += 1;

        // By category by month (using month-year label)
        if (!revenueByCatByMonth[monthYearLabel]) {
          revenueByCatByMonth[monthYearLabel] = {};
        }
        revenueByCatByMonth[monthYearLabel][record.asset_category] = (revenueByCatByMonth[monthYearLabel][record.asset_category] || 0) + netAmount;

        // Don't accumulate totals here - already calculated above
      });

      // Fetch expenses - SAME AS EXPENSES PAGE
      const { data: allExpensesData } = await supabase
        .from('expenses')
        .select('amount, status, date, category');
      
      console.log(`📊 Fetched ${allExpensesData?.length || 0} total expense records`);
      
      // Filter by date range - SAME AS EXPENSES PAGE
      const filteredExpenses = allExpensesData?.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      }) || [];
      
      console.log(`📊 Filtered to ${filteredExpenses.length} expense records for period`);
      
      // Calculate totals - SAME AS EXPENSES PAGE (APPROVED only for net profit)
      const approvedExpenses = filteredExpenses
        .filter(e => e.status === 'APPROVED')
        .reduce((sum, e) => sum + Number(e.amount), 0);
      
      const totalExpensesAll = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      
      console.log('💰 Expenses totals:', {
        filteredCount: filteredExpenses.length,
        approvedCount: filteredExpenses.filter(e => e.status === 'APPROVED').length,
        approvedExpenses,
        totalExpensesAll
      });

      const monthlyExpenses: { [key: string]: number } = {};
      const expensesByCat: { [key: string]: number } = {};
      const expensesByCatByMonth: { [month: string]: { [cat: string]: number } } = {};

      filteredExpenses?.forEach((expense) => {
        const expenseAmount = Number(expense.amount);
        
        if (expense.status === 'APPROVED') {
          // Parse date as UTC to avoid timezone issues
          const dateParts = expense.date.split('-');
          const expenseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
          const monthYearLabel = getMonthYearLabel(expenseDate);
          monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + expenseAmount;
          
          // Group by category
          const cat = expense.category || 'OTHER';
          expensesByCat[cat] = (expensesByCat[cat] || 0) + expenseAmount;
          
          // Group by category by month (using month-year label)
          if (!expensesByCatByMonth[monthYearLabel]) {
            expensesByCatByMonth[monthYearLabel] = {};
          }
          expensesByCatByMonth[monthYearLabel][cat] = (expensesByCatByMonth[monthYearLabel][cat] || 0) + expenseAmount;
        }
      });

      // Prepare expenses by category list
      const expensesByCategoryList: ExpensesByCategory[] = Object.entries(expensesByCat)
        .map(([category, amount]) => ({
          category: category.replace('_', ' '),
          amount,
        }))
        .sort((a, b) => b.amount - a.amount);

      setExpensesByCategory(expensesByCategoryList);

      const { count: pendingExpenses } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

      // Fetch maintenance costs
      let maintenanceQuery = supabase
        .from('maintenance_records')
        .select('labor_cost, sparepart_cost, start_date')
        .gte('start_date', startDateStr)
        .lte('start_date', endDateStr);
      
      const { data: maintenanceRecords } = await maintenanceQuery;

      const monthlyMaintenance: { [key: string]: number } = {};
      let totalMaintenanceCost = 0;

      maintenanceRecords?.forEach((record) => {
        const cost = (Number(record.labor_cost) || 0) + (Number(record.sparepart_cost) || 0);
        // Parse date as UTC to avoid timezone issues
        const dateParts = record.start_date.split('-');
        const recordDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
        const monthKey = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyMaintenance[monthKey] = (monthlyMaintenance[monthKey] || 0) + cost;
        totalMaintenanceCost += cost;
      });

      // Build monthly data array
      const monthlyDataArray: MonthlyData[] = [];
      const monthlyStatsData: MonthlyStats = {};
      
      // For "All Time", we need to dynamically determine the months to display
      let monthsToDisplay: Date[] = [];
      
      if (selectedPeriod === 'all') {
        // Get all unique months from the data
        const uniqueMonths = new Set<string>();
        Object.keys(monthlyRevenue).forEach(key => uniqueMonths.add(key));
        Object.keys(monthlyExpenses).forEach(key => uniqueMonths.add(key));
        Object.keys(monthlyMaintenance).forEach(key => uniqueMonths.add(key));
        
        // Convert to dates and sort
        monthsToDisplay = Array.from(uniqueMonths)
          .map(key => {
            const [year, month] = key.split('-').map(Number);
            return new Date(year, month - 1, 1);
          })
          .sort((a, b) => a.getTime() - b.getTime());
      } else if (startingMonth) {
        // User selected a specific starting month - show exactly the period they selected
        const [startYear, startMonth] = startingMonth.split('-').map(Number);
        for (let i = 0; i < monthsBack; i++) {
          const date = new Date(startYear, startMonth - 1 + i, 1);
          monthsToDisplay.push(date);
        }
      } else {
        // Default: from current month backwards
        for (let i = 0; i < monthsBack; i++) {
          const date = new Date(now.getFullYear(), now.getMonth() - monthsBack + i + 1, 1);
          monthsToDisplay.push(date);
        }
      }
      
      monthsToDisplay.forEach(date => {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthYearLabel = getMonthYearLabel(date);
        const revenue = monthlyRevenue[monthKey] || 0;
        const dkuShare = monthlyDkuShare[monthKey] || 0;
        const expenses = monthlyExpenses[monthKey] || 0;
        const maintenanceCost = monthlyMaintenance[monthKey] || 0;
        const profit = dkuShare - expenses;
        const margin = dkuShare > 0 ? (profit / dkuShare) * 100 : 0;
        
        monthlyDataArray.push({
          month: monthYearLabel,
          revenue,
          dkuShare,
          expenses,
          profit,
          maintenanceCost,
        });

        // Store monthly stats for cards
        monthlyStatsData[monthYearLabel] = {
          totalRevenue: revenue,
          totalDkuShare: dkuShare,
          totalExpenses: expenses,
          netProfit: profit,
          profitMargin: margin,
          totalMaintenanceCost: maintenanceCost,
        };
      });

      setMonthlyData(monthlyDataArray);
      setMonthlyStats(monthlyStatsData);

      // Build available months list for card period selector
      const monthsList = monthlyDataArray.map(m => m.month);
      setAvailableMonths(monthsList);

      // Build monthly expenses distribution data
      const monthlyExpDistData: MonthlyChartData = {};
      Object.entries(expensesByCatByMonth).forEach(([month, cats]) => {
        monthlyExpDistData[month] = Object.entries(cats)
          .map(([cat, amount]) => ({
            name: cat.replace('_', ' '),
            value: amount,
          }))
          .sort((a, b) => b.value - a.value);
      });
      setMonthlyExpensesData(monthlyExpDistData);

      // Build monthly category revenue data
      const monthlyCatRevData: MonthlyChartData = {};
      Object.entries(revenueByCatByMonth).forEach(([month, cats]) => {
        monthlyCatRevData[month] = Object.entries(cats)
          .map(([cat, amount]) => ({
            name: cat.replace('_', ' '),
            value: amount,
          }))
          .sort((a, b) => b.value - a.value);
      });
      setMonthlyCategoryRevenueData(monthlyCatRevData);

      // Prepare resort revenue list
      const resortRevenuesList: ResortRevenue[] = resorts?.map(resort => ({
        resort_name: resort.name,
        total_revenue: revenueByResort[resort.id]?.total || 0,
        dku_share: revenueByResort[resort.id]?.dku || 0,
        resort_share: revenueByResort[resort.id]?.resort || 0,
      })).filter(r => r.total_revenue > 0).sort((a, b) => b.total_revenue - a.total_revenue) || [];

      setResortRevenues(resortRevenuesList);

      // Build monthly resort revenue data
      const monthlyResortRevData: { [month: string]: ResortRevenue[] } = {};
      Object.entries(revenueByResortByMonth).forEach(([month, resortData]) => {
        monthlyResortRevData[month] = resorts?.map(resort => ({
          resort_name: resort.name,
          total_revenue: resortData[resort.id]?.total || 0,
          dku_share: resortData[resort.id]?.dku || 0,
          resort_share: resortData[resort.id]?.resort || 0,
        })).filter(r => r.total_revenue > 0).sort((a, b) => b.total_revenue - a.total_revenue) || [];
      });
      setMonthlyResortRevenueData(monthlyResortRevData);

      // Prepare category revenue list
      const categoryRevenuesList: CategoryRevenue[] = Object.entries(revenueByCategory).map(([category, data]) => ({
        category: category.replace('_', ' '),
        revenue: data.total,
        count: data.count,
      })).sort((a, b) => b.revenue - a.revenue);

      setCategoryRevenues(categoryRevenuesList);

      // Calculate financial metrics
      const netProfit = totalDkuShare - approvedExpenses;
      const profitMargin = totalDkuShare > 0 ? (netProfit / totalDkuShare) * 100 : 0;

      console.log('💰 Dashboard Financial Summary:', {
        period: selectedPeriod,
        startingMonth,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${selectedPeriod === 'all' || !startingMonth ? 'now' : endDate.toISOString().split('T')[0]}`,
        totalRevenue,
        totalDkuShare,
        approvedExpenses,
        netProfit,
        profitMargin: profitMargin.toFixed(2) + '%'
      });

      setStats({
        totalResorts: resortsCount || 0,
        totalAssets: assets?.length || 0,
        activeAssets: activeCount,
        maintenanceAssets: maintenanceCount,
        totalRevenue,
        totalDkuShare,
        totalExpenses: approvedExpenses,
        netProfit,
        profitMargin,
        utilizationRate,
        pendingExpenses: pendingExpenses || 0,
        totalMaintenanceCost,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data based on selected period
  const getRevenueChartData = () => {
    if (selectedCardPeriod === 'all') {
      return resortRevenues.slice(0, 5).map(r => ({
        name: r.resort_name.length > 15 ? r.resort_name.substring(0, 15) + '...' : r.resort_name,
        revenue: r.total_revenue,
        dkuShare: r.dku_share,
        resortShare: r.resort_share,
      }));
    }
    const monthlyData = monthlyResortRevenueData[selectedCardPeriod] || [];
    return monthlyData.slice(0, 5).map(r => ({
      name: r.resort_name.length > 15 ? r.resort_name.substring(0, 15) + '...' : r.resort_name,
      revenue: r.total_revenue,
      dkuShare: r.dku_share,
      resortShare: r.resort_share,
    }));
  };

  const revenueChartData = getRevenueChartData();

  // Prepare chart data based on selected period
  const getExpensesDistributionData = () => {
    if (selectedCardPeriod === 'all') {
      return expensesByCategory.map(e => ({
        name: e.category,
        value: e.amount,
      }));
    }
    return monthlyExpensesData[selectedCardPeriod] || [];
  };

  const getCategoryRevenueData = () => {
    if (selectedCardPeriod === 'all') {
      return categoryRevenues.map(c => ({
        name: c.category,
        value: c.revenue,
      }));
    }
    return monthlyCategoryRevenueData[selectedCardPeriod] || [];
  };

  const expensesDistributionData = getExpensesDistributionData();
  const categoryRevenueData = getCategoryRevenueData();

  const monthlyRevenueData = monthlyData.map(m => ({
    name: m.month,
    dkuShare: m.dkuShare,
    expenses: m.expenses,
  }));

  const monthlyProfitData = monthlyData.map(m => ({
    name: m.month,
    value: m.profit,
  }));

  const monthlyMaintenanceData = monthlyData.map(m => ({
    name: m.month,
    cost: m.maintenanceCost,
  }));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Period Selector */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Dashboard Analytics</h1>
            <p className="text-base text-white/70">Welcome back, <span className="text-white font-semibold">{profile?.name}</span></p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Resort Analytics Button - PALING KIRI */}
            {isFinancialUser && (
              <button
                onClick={() => navigate('/resort-analytics')}
                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-medium hover:from-pink-700 hover:to-purple-700 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Resort Analytics
              </button>
            )}
            
            {/* Starting Month Selector - only show when period is selected (6m or 12m) */}
            {selectedPeriod && selectedPeriod !== 'all' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/70 font-medium">Start from:</label>
                <select
                  value={startingMonth}
                  onChange={(e) => setStartingMonth(e.target.value)}
                  className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white font-medium hover:bg-purple-900/50 transition-all focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  style={{ 
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  <option value="">Current Period</option>
                  {availableStartMonths.map(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const label = getMonthYearLabel(date);
                    return (
                      <option key={monthKey} value={monthKey}>{label}</option>
                    );
                  })}
                </select>
                <span className="text-xs text-white/50">
                  ({availableStartMonths.length} months available)
                </span>
              </div>
            )}
            
            {/* Month Selector - only show when NO period is selected */}
            {!selectedPeriod && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/70 font-medium">Select Month:</label>
                <select
                  value={startingMonth}
                  onChange={(e) => setStartingMonth(e.target.value)}
                  className="px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white font-medium hover:bg-purple-900/50 transition-all focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  style={{ 
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}
                >
                  <option value="">Current Month</option>
                  {availableStartMonths.map(monthKey => {
                    const [year, month] = monthKey.split('-');
                    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
                    const label = getMonthYearLabel(date);
                    return (
                      <option key={monthKey} value={monthKey}>{label}</option>
                    );
                  })}
                </select>
                <span className="text-xs text-white/50">
                  (Single month view)
                </span>
              </div>
            )}
            
            {/* Period Buttons - 6 Months, 12 Months, All Time */}
            <button
              onClick={() => setSelectedPeriod(selectedPeriod === '6m' ? null : '6m')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === '6m'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setSelectedPeriod(selectedPeriod === '12m' ? null : '12m')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === '12m'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setSelectedPeriod(selectedPeriod === 'all' ? null : 'all')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPeriod === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/30 text-white/70 hover:bg-purple-900/50'
              }`}
            >
              All Time
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <>
            {/* Key Metrics Cards */}
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
                <p className="text-3xl font-bold text-white mb-1">{displayedStats.totalAssets}</p>
                <p className="text-sm text-white/70">Total Assets</p>
                <div className="mt-3 flex items-center text-xs">
                  <span className="text-green-400 font-semibold">{displayedStats.activeAssets} Active</span>
                  <span className="text-white/50 mx-2">•</span>
                  <span className="text-orange-400 font-semibold">{displayedStats.maintenanceAssets} Maintenance</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70">Utilization</span>
                    <span className="text-blue-400 font-semibold">{displayedStats.utilizationRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${displayedStats.utilizationRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* DKU Share with Total Revenue */}
              {isFinancialUser && (
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30 hover:border-purple-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    Rp {displayedStats.totalDkuShare.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-white/70">DKU Share</p>
                  <p className="text-xs text-purple-300 mt-2">
                    Total Revenue: Rp {displayedStats.totalRevenue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              )}

              {/* Total Expenses */}
              {isFinancialUser && (
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 backdrop-blur-sm rounded-2xl p-6 border border-orange-500/30 hover:border-orange-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-500/20 rounded-xl">
                      <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    Rp {displayedStats.totalExpenses.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-white/70">Total Expenses</p>
                  <p className="text-xs text-orange-300 mt-2">
                    Approved only • {displayedStats.pendingExpenses} pending
                  </p>
                </div>
              )}

              {/* Net Profit */}
              {isFinancialUser && (
                <div className="bg-gradient-to-br from-pink-600/20 to-pink-800/20 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30 hover:border-pink-500/50 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-pink-500/20 rounded-xl">
                      <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">
                    Rp {displayedStats.netProfit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-white/70">Net Profit</p>
                  <p className={`text-xs mt-2 font-semibold ${displayedStats.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Margin: {displayedStats.profitMargin.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Monthly Trend Charts */}
            {isFinancialUser && monthlyData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <AreaChart
                  data={monthlyRevenueData}
                  title="Monthly DKU Share vs Expenses"
                  dataKeys={[
                    { key: 'dkuShare', color: '#8b5cf6', name: 'DKU Share' },
                    { key: 'expenses', color: '#ec4899', name: 'Expenses' },
                  ]}
                  highlightPeriod={selectedCardPeriod}
                />
                <LineChart
                  data={monthlyProfitData}
                  title="Monthly Profit Trend"
                  color="#10b981"
                  highlightPeriod={selectedCardPeriod}
                />
              </div>
            )}

            {/* Revenue Analysis Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {isFinancialUser && revenueChartData.length > 0 && (
                <RevenueChart data={revenueChartData} />
              )}

              {isFinancialUser && expensesDistributionData.length > 0 && (
                <DonutChart
                  data={expensesDistributionData}
                  title="Expenses Distribution"
                  colors={['#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#6366f1']}
                />
              )}

              {isFinancialUser && categoryRevenueData.length > 0 && (
                <DonutChart
                  data={categoryRevenueData}
                  title="Revenue by Category"
                  colors={['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981']}
                />
              )}

              {monthlyMaintenanceData.length > 0 && (
                <BarChart
                  data={monthlyMaintenanceData}
                  title="Monthly Maintenance Cost"
                  dataKeys={[
                    { key: 'cost', color: '#f59e0b', name: 'Maintenance Cost' },
                  ]}
                />
              )}
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isFinancialUser && (
                <div 
                  onClick={() => navigate('/resort-analytics')}
                  className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:scale-105 hover:border-purple-500/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">🏨</div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.totalResorts}</p>
                      <p className="text-sm text-white/70">Partner Resorts</p>
                      <p className="text-xs text-purple-400 mt-1">Click to compare →</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🔧</div>
                  <div>
                    <p className="text-3xl font-bold text-white">
                      Rp {(stats.totalMaintenanceCost / 1000000).toFixed(1)}M
                    </p>
                    <p className="text-sm text-white/70">Maintenance Cost</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:scale-105 transition-transform">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">✅</div>
                  <div>
                    <p className="text-3xl font-bold text-white">{stats.activeAssets}</p>
                    <p className="text-sm text-white/70">Active Assets</p>
                  </div>
                </div>
              </div>

              {isFinancialUser && (
                <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:scale-105 transition-transform">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">⏳</div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.pendingExpenses}</p>
                      <p className="text-sm text-white/70">Pending Approvals</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
