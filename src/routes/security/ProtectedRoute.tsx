import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../services/auth/useAuth';
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
  console.log('🛡️ ProtectedRoute check:', {
    isAuthenticated,
    isBypassed,
    loading,
    path: location.pathname
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