import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
import { useUserContext } from '../../contexts/UserContext';
type ProtectedRouteProps = {
  children: React.ReactNode;
};
export function ProtectedRoute({
  children
}: ProtectedRouteProps) {
  const location = useLocation();
  const {
    isAuthenticated,
    isBypassed,
    loading
  } = useAuth();
  const { userData, isReady, error: userError } = useUserContext();
  if (isBypassed) {
    return children;
  }
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>;
  }

  if (isAuthenticated && !userData) {
    if (userError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 p-6 shadow-sm text-center">
            <div className="text-red-500 font-bold mb-2">Failed to load user profile</div>
            <p className="text-sm text-slate-500 mb-4">{userError}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-[#0F2D52] text-white rounded-xl text-xs font-bold hover:bg-[#1E4B83] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>;
  }

  // Wait for userData to be ready before checking role
  if (!isReady) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>;
  }
  // Allow superadmin routes without authentication
  if (location.pathname.startsWith('/superadmin')) {
    return children;
  }

  // Prevent non-superadmin from accessing admin-management page directly
  if (location.pathname === '/admin/admin-management' && userData?.role?.toLowerCase() !== 'superadmin') {
    return <Navigate to="/admin" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{
      from: location
    }} replace />;
  }
  return children;
}
export default ProtectedRoute;
