import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { useUserContext } from './contexts/UserContext';
import { useSessionValidation } from './hooks/useSessionValidation';
import { startBackgroundTokenRefresh, stopBackgroundTokenRefresh } from './services/auth/tokenRefreshService';
// import { useSessionTimeout } from './hooks/useSessionTimeout';

export function App() {
  const { userData, schoolSubdomain, loading } = useUserContext();
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  
  // Start background token refresh on app load
  useEffect(() => {
    startBackgroundTokenRefresh();
    
    return () => {
      stopBackgroundTokenRefresh();
    };
  }, []);
  
  // Validate session on app load and periodically
  useSessionValidation();
  
  // Auto-logout after inactivity - DISABLED
  // useSessionTimeout();

  useEffect(() => {
    if (!loading && userData && schoolSubdomain) {
      const currentPath = window.location.pathname;
      const expectedPath = userData.role === 'Admin'
        ? `/${schoolSubdomain}/admin`
        : `/${schoolSubdomain}/dashboard`;
        
      const isMismatch = (userData.role === 'Admin' && currentPath.endsWith('/admin') && !currentPath.startsWith(`/${schoolSubdomain}/`)) ||
                         (userData.role === 'Parent' && currentPath.endsWith('/dashboard') && !currentPath.startsWith(`/${schoolSubdomain}/`));
                         
      if (currentPath === '/dashboard' || currentPath === '/admin' || currentPath === '/' || isMismatch) {
        setShouldRedirect(expectedPath);
      }
    }
  }, [userData, loading, schoolSubdomain]);

  // Show loading while fetching user data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Redirect admin users to admin dashboard
  if (shouldRedirect) {
    return <Navigate to={shouldRedirect} replace />;
  }

  // Show parent dashboard for parent users or as default
  return <Dashboard />;
}