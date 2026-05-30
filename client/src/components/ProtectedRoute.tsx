/**
 * Protected Route Component
 * Redirect ke login jika user belum login
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ENGINEER' | 'ADMIN' | 'MANAGER' | string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block PENDING or SUSPENDED users
  if (profile && profile.status !== 'ACTIVE') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {profile.status === 'PENDING' ? 'Menunggu Persetujuan' : 'Akun Dinonaktifkan'}
          </h2>
          <p className="text-slate-400 text-sm">
            {profile.status === 'PENDING'
              ? 'Akun Anda sedang menunggu persetujuan dari Manager. Anda akan mendapat akses setelah disetujui.'
              : 'Akun Anda telah dinonaktifkan. Hubungi Manager untuk informasi lebih lanjut.'}
          </p>
        </div>
      </div>
    );
  }

  // Check role jika diperlukan
  if (requiredRole && profile) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    if (!allowedRoles.includes(profile.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
