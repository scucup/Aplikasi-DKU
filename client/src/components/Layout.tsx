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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    const baseNav = [{ name: 'Dashboard', path: '/dashboard', icon: 'dashboard' }];
    
    if (profile?.role === 'MANAGER') {
      return [
        ...baseNav,
        { name: 'Resorts', path: '/resorts', icon: 'resort' },
        { name: 'Assets', path: '/assets', icon: 'asset' },
        { name: 'Revenue', path: '/revenue', icon: 'revenue' },
        { name: 'Invoices', path: '/invoices', icon: 'invoice' },
        { name: 'Expenses', path: '/expenses', icon: 'expense' },
        { name: 'Maintenance', path: '/maintenance', icon: 'maintenance' },
        { name: 'Spareparts', path: '/spareparts', icon: 'sparepart' },
        { name: 'Tools', path: '/tools', icon: 'tool' },
        { name: 'Notifications', path: '/notifications', icon: 'notification' },
      ];
    }
    
    if (profile?.role === 'ADMIN') {
      return [
        ...baseNav,
        { name: 'Assets', path: '/assets', icon: 'asset' },
        { name: 'Revenue', path: '/revenue', icon: 'revenue' },
        { name: 'Invoices', path: '/invoices', icon: 'invoice' },
        { name: 'Expenses', path: '/expenses', icon: 'expense' },
        { name: 'Spareparts', path: '/spareparts', icon: 'sparepart' },
        { name: 'Tools', path: '/tools', icon: 'tool' },
        { name: 'Notifications', path: '/notifications', icon: 'notification' },
      ];
    }
    
    if (profile?.role === 'ENGINEER') {
      return [
        ...baseNav,
        { name: 'Assets', path: '/assets', icon: 'asset' },
        { name: 'Expenses', path: '/expenses', icon: 'expense' },
        { name: 'Maintenance', path: '/maintenance', icon: 'maintenance' },
        { name: 'Spareparts', path: '/spareparts', icon: 'sparepart' },
        { name: 'Tools', path: '/tools', icon: 'tool' },
        { name: 'Notifications', path: '/notifications', icon: 'notification' },
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

  const renderIcon = (icon: string) => {
    switch (icon) {
      case 'dashboard':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'resort':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'asset':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        );
      case 'revenue':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'invoice':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'expense':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'maintenance':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'sparepart':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'tool':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
        );
      case 'notification':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen bg-navy-800 flex">
      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 h-full bg-navy-950 border-r border-navy-700/50 shadow-sidebar z-50 transition-all duration-300 ${sidebarCollapsed ? 'w-[70px]' : 'w-[240px]'}`}>
        {/* Logo Area */}
        <div className="flex items-center h-16 px-4 border-b border-navy-700/50">
          {companyLogo ? (
            <img 
              src={companyLogo} 
              alt="Company Logo" 
              className={`h-9 w-auto object-contain transition-all ${sidebarCollapsed ? 'mx-auto' : ''}`}
            />
          ) : (
            <h1 className={`font-bold text-white transition-all ${sidebarCollapsed ? 'text-xs text-center w-full' : 'text-lg'}`}>
              {sidebarCollapsed ? 'DKU' : 'DKU Adventure'}
            </h1>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-navy-700 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <span className="flex-shrink-0">{renderIcon(item.icon)}</span>
                {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                {item.path === '/expenses' && profile?.role === 'MANAGER' && pendingExpensesCount > 0 && (
                  <span className={`bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`}>
                    {pendingExpensesCount}
                  </span>
                )}
                {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                  <span className={`bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${sidebarCollapsed ? 'absolute -top-1 -right-1' : 'ml-auto'}`}>
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-navy-700/50 p-3 space-y-1">
          {(profile?.role === 'ADMIN' || profile?.role === 'MANAGER') && (
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-navy-700 hover:text-white transition-all ${
                isActive('/settings') ? 'bg-blue-600 text-white' : ''
              }`}
            >
              <span className="flex-shrink-0">{renderIcon('settings')}</span>
              {!sidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-navy-700 hover:text-white transition-all w-full"
          >
            <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!sidebarCollapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-red-600/20 hover:text-red-400 transition-all w-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-navy-950 border-r border-navy-700/50 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-navy-700/50">
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" className="h-8 w-auto object-contain" />
          ) : (
            <h2 className="text-lg font-bold text-white">DKU Adventure</h2>
          )}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg bg-navy-700 text-white"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-navy-700/50">
          <p className="text-sm font-medium text-white">{profile?.name}</p>
          <p className="text-xs text-slate-400">{profile?.role}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
                  isActive(item.path)
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-navy-700'
                }`}
              >
                <span>{renderIcon(item.icon)}</span>
                <span className="text-sm">{item.name}</span>
                {item.path === '/expenses' && profile?.role === 'MANAGER' && pendingExpensesCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingExpensesCount}
                  </span>
                )}
                {item.path === '/notifications' && unreadNotificationsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-navy-700/50 space-y-1">
          {(profile?.role === 'ADMIN' || profile?.role === 'MANAGER') && (
            <Link
              to="/settings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:text-white hover:bg-navy-700 transition-all"
            >
              <span>{renderIcon('settings')}</span>
              <span className="text-sm">Settings</span>
            </Link>
          )}
          <button
            onClick={() => { setMobileMenuOpen(false); signOut(); }}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-600/10 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-[240px]'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-navy-900/95 backdrop-blur-md border-b border-navy-700/50 h-16 flex items-center px-4 lg:px-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-navy-700 text-white"
                aria-label="Toggle menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Search Bar */}
              <div className="hidden sm:flex items-center bg-navy-800 border border-navy-600/50 rounded-lg px-3 py-2 w-64">
                <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="text-sm text-slate-400">Search...</span>
              </div>
            </div>

            {/* Right side - Notifications & Profile */}
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-lg text-slate-300 hover:bg-navy-700 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </Link>

              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-white">{profile?.name}</p>
                  <p className="text-xs text-slate-400">{profile?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
