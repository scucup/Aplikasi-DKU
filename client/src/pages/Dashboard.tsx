import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

interface DashboardStats {
  totalProperties: number; // Resorts
  totalAssets: number;
  activeRentals: number; // Pending Expenses
  totalRevenue: number;
  availableAssets: number; // Active Assets
  maintenanceAssets: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalAssets: 0,
    activeRentals: 0,
    totalRevenue: 0,
    availableAssets: 0,
    maintenanceAssets: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Fetch resorts count
      const { count: resortsCount } = await supabase
        .from('resorts')
        .select('*', { count: 'exact', head: true });

      // Fetch assets count and status
      const { data: assets } = await supabase
        .from('assets')
        .select('status');

      const activeCount = assets?.filter(a => a.status === 'ACTIVE').length || 0;
      const maintenanceCount = assets?.filter(a => a.status === 'MAINTENANCE').length || 0;

      // Fetch total revenue from revenue_records
      const { data: revenueRecords } = await supabase
        .from('revenue_records')
        .select('amount');

      const totalRevenue = revenueRecords?.reduce((sum, record) => sum + (Number(record.amount) || 0), 0) || 0;

      // Fetch pending expenses count (as "active rentals" equivalent)
      const { count: pendingExpenses } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');

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
              {/* Total Resorts */}
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

              {/* Pending Expenses */}
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

              {/* Total Revenue */}
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
