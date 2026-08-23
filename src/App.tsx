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
      const role = userData.role?.toLowerCase();
      const isAdmin = role === 'admin' || role === 'superadmin';
      const isEmployee = role === 'employee';

      const expectedPath = isAdmin
        ? `/${schoolSubdomain}/admin`
        : isEmployee
        ? `/${schoolSubdomain}/employee/dashboard`
        : `/${schoolSubdomain}/dashboard`;

      const isGenericPath = currentPath === '/dashboard' || currentPath === '/admin' || currentPath === '/';
      const isWrongSubdomain = !currentPath.startsWith(`/${schoolSubdomain}/`);

      if (isGenericPath || isWrongSubdomain) {
        setShouldRedirect(expectedPath);
      }
    }
  }, [userData, loading, schoolSubdomain]);

  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (shouldRedirect) {
    return <Navigate to={shouldRedirect} replace />;
  }

  return <Dashboard />;
}
