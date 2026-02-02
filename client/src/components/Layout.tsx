import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [pendingExpensesCount, setPendingExpensesCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string>('');

  useEffect(() => {
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'company_logo_url')
        .single();

      if (error) throw error;
      if (data?.setting_value) {
        setCompanyLogo(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching company logo:', error);
    }
  };

  const getNavigation = () => {
    const baseNav = [{ name: 'Dashboard', path: '/dashboard', icon: '📊' }];
    
    if (profile?.role === 'MANAGER') {
      return [
        ...baseNav,
        { name: 'Resorts', path: '/resorts', icon: '🏨' },
        { name: 'Assets', path: '/assets', icon: '🏍️' },
        { name: 'Revenue', path: '/revenue', icon: '💵' },
        { name: 'Invoices', path: '/invoices', icon: '📄' },
        { name: 'Expenses', path: '/expenses', icon: '💰' },
        { name: 'Maintenance', path: '/maintenance', icon: '🔧' },
        { name: 'Spareparts', path: '/spareparts', icon: '⚙️' },
        { name: 'Tools', path: '/tools', icon: '🔨' },
        { name: 'Notifications', path: '/notifications', icon: '🔔' },
      ];
    }
    
    if (profile?.role === 'ADMIN') {
      return [
        ...baseNav,
        { name: 'Revenue', path: '/revenue', icon: '💵' },
        { name: 'Invoices', path: '/invoices', icon: '📄' },
        { name: 'Expenses', path: '/expenses', icon: '💰' },
        { name: 'Notifications', path: '/notifications', icon: '🔔' },
      ];
    }
    
    if (profile?.role === 'ENGINEER') {
      return [
        ...baseNav,
        { name: 'Assets', path: '/assets', icon: '🏍️' },
        { name: 'Expenses', path: '/expenses', icon: '💰' },
        { name: 'Maintenance', path: '/maintenance', icon: '🔧' },
        { name: 'Spareparts', path: '/spareparts', icon: '⚙️' },
        { name: 'Tools', path: '/tools', icon: '🔨' },
        { name: 'Notifications', path: '/notifications', icon: '🔔' },
      ];
    }
    
    return baseNav;
  };

  const navigation = getNavigation();
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (profile?.role === 'MANAGER') {
      fetchPendingExpenses();
      const channel = supabase
        .channel('expenses-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
          fetchPendingExpenses();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.role]);

  useEffect(() => {
    if (user?.id) {
      fetchUnreadNotifications();
      const channel = supabase
        .channel('notifications-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchUnreadNotifications();
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id]);

  const fetchPendingExpenses = async () => {
    try {
      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING');
      setPendingExpensesCount(count || 0);
    } catch (error) {
      console.error('Error fetching pending expenses:', error);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('status', 'UNREAD');
      setUnreadNotificationsCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-purple-900 via-dark-purple-800 to-slate-900">
      {/* Header */}
      <header className="bg-dark-purple-900/50 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-4">
            <div className="flex items-center gap-3">
              {/* Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-purple-600/30 border border-purple-500/50 text-white"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {companyLogo ? (
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="h-8 sm:h-10 md:h-12 w-auto object-contain"
                />
              ) : (
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white">DKU Adventure</h1>
              )}
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:flex gap-1 ml-6">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-xl transition-all relative text-xs flex flex-col items-center min-w-[70px] ${
                      isActive(item.path)
                        ? 'bg-purple-600/30 backdrop-blur-sm text-white font-medium border border-purple-500/50'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg mb-1">{item.icon}</span>
                    <span className="text-center leading-tight">{item.name}</span>
                    {item.path === '/expenses' && profile?.role === 'MANAGER' && pendingExpensesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-neon-pink text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingExpensesCount}
                      </span>
                    )}
                    {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-neon-pink text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden md:block">
                <p className="text-xs md:text-sm font-medium text-white">{profile?.name}</p>
                <p className="text-xs text-white/60">{profile?.role}</p>
              </div>
              {(profile?.role === 'ADMIN' || profile?.role === 'MANAGER') && (
                <Link
                  to="/settings"
                  className="hidden sm:flex flex-col items-center px-3 py-2 bg-purple-600/30 text-white rounded-xl border border-purple-500/50 hover:bg-purple-600/50 text-xs min-w-[60px]"
                >
                  <span className="text-lg mb-1">⚙️</span>
                  <span>Settings</span>
                </Link>
              )}
              <button
                onClick={signOut}
                className="hidden sm:flex flex-col items-center px-3 py-2 bg-purple-600/30 text-white rounded-xl border border-purple-500/50 hover:bg-purple-600/50 text-xs min-w-[60px]"
              >
                <span className="text-lg mb-1">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-dark-purple-900/95 backdrop-blur-md border-r border-purple-500/30 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <h2 className="text-lg font-bold text-white">Menu</h2>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg bg-purple-600/30 border border-purple-500/50 text-white"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-purple-500/30">
          <p className="text-sm font-medium text-white">{profile?.name}</p>
          <p className="text-xs text-white/60">{profile?.role}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative text-base ${
                  isActive(item.path)
                    ? 'bg-purple-600/40 text-white font-medium border border-purple-500/50'
                    : 'text-white/80 hover:text-white hover:bg-purple-600/20'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.name}</span>
                {item.path === '/expenses' && profile?.role === 'MANAGER' && pendingExpensesCount > 0 && (
                  <span className="ml-auto bg-neon-pink text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingExpensesCount}
                  </span>
                )}
                {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                  <span className="ml-auto bg-neon-pink text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-purple-500/30 space-y-2">
          {(profile?.role === 'ADMIN' || profile?.role === 'MANAGER') && (
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-purple-600/20 transition-all"
            >
              <span className="text-xl">⚙️</span>
              <span>Settings</span>
            </Link>
          )}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              signOut();
            }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-red-600/20 transition-all"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 md:py-6">
        {children}
      </main>
    </div>
  );
}
