import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

  const getNavigation = () => {
    const baseNav = [{ name: 'Dashboard', path: '/dashboard', icon: '📊' }];
    
    // MANAGER sees everything
    if (profile?.role === 'MANAGER') {
      return [
        ...baseNav,
        { name: 'Resorts', path: '/resorts', icon: '🏨' },
        { name: 'Assets', path: '/assets', icon: '🏍️' },
        { name: 'Revenue', path: '/revenue', icon: '💵' },
        { name: 'Expenses', path: '/expenses', icon: '💰' },
        { name: 'Maintenance', path: '/maintenance', icon: '🔧' },
        { name: 'Spareparts', path: '/spareparts', icon: '⚙️' },
        { name: 'Notifications', path: '/notifications', icon: '🔔' },
      ];
    }
    
    // ADMIN sees revenue and expenses
    if (profile?.role === 'ADMIN') {
      return [
        ...baseNav,
        { name: 'Revenue', path: '/revenue', icon: '💵' },
        { name: 'Expenses', path: '/expenses', icon: '💰' },
      ];
    }
    
    // ENGINEER sees assets, maintenance, spareparts, and notifications
    if (profile?.role === 'ENGINEER') {
      return [
        ...baseNav,
        { name: 'Assets', path: '/assets', icon: '🏍️' },
        { name: 'Maintenance', path: '/maintenance', icon: '🔧' },
        { name: 'Spareparts', path: '/spareparts', icon: '⚙️' },
        { name: 'Notifications', path: '/notifications', icon: '🔔' },
      ];
    }
    
    return baseNav;
  };

  const navigation = getNavigation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300">
      {/* Header */}
      <header className="bg-white shadow-neumorphic sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-800">DKU Adventure</h1>
              <nav className="hidden md:flex gap-2">
                {navigation.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-xl transition-all ${
                      isActive(item.path)
                        ? 'bg-gray-200 shadow-neumorphic-inset text-gray-900 font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">{profile?.name}</p>
                <p className="text-xs text-gray-500">{profile?.role}</p>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl shadow-neumorphic-inset hover:shadow-neumorphic transition-all duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white shadow-neumorphic sticky top-16 z-30">
        <div className="flex justify-around py-2">
          {navigation.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-3 py-2 rounded-xl transition-all ${
                isActive(item.path)
                  ? 'bg-gray-200 shadow-neumorphic-inset text-gray-900'
                  : 'text-gray-600'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
