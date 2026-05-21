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
  const { userData, isReady } = useUserContext();
  console.log('🛡️ ProtectedRoute check:', {
    isAuthenticated,
    isBypassed,
    loading,
    path: location.pathname,
    role: userData?.role
  });
  if (isBypassed) {
    console.log('🛡️ Access granted: Auth bypassed');
    return children;
  }
  if (loading) {
    console.log('🛡️ Loading auth state...');
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>;
  }
  // Wait for userData to be ready before checking role
  if (!isReady) {
    console.log('🛡️ Loading user data...');
    return <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>;
  }
  // Allow superadmin routes without authentication
  if (location.pathname.startsWith('/superadmin')) {
    console.log('🛡️ Access granted: Superadmin route');
    return children;
  }

  // Prevent non-superadmin from accessing admin-management page directly
  if (location.pathname === '/admin/admin-management' && userData?.role?.toLowerCase() !== 'superadmin') {
    console.log('🛡️ Access denied: Only superadmin can access admin-management, redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }

  if (!isAuthenticated) {
    console.log('🛡️ Access denied: Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{
      from: location
    }} replace />;
  }
  console.log('🛡️ Access granted: User authenticated');
  return children;
}
export default ProtectedRoute;