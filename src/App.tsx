import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { useUserContext } from './contexts/UserContext';
import { useSessionValidation } from './hooks/useSessionValidation';
import { startBackgroundTokenRefresh, stopBackgroundTokenRefresh } from './services/auth/tokenRefreshService';
import { setupForegroundMessageListener } from './utils/notification';
// import { useSessionTimeout } from './hooks/useSessionTimeout';

export function App() {
  const { userData, loading } = useUserContext();
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  
  // Register service worker and setup FCM
  useEffect(() => {
    // Register Firebase messaging service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Setup foreground message listener
    setupForegroundMessageListener();
  }, []);
  
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
    if (!loading && userData) {
      // Check user role and redirect accordingly
      if (userData.role === 'Admin') {
        setShouldRedirect('/admin');
      } else if (userData.role === 'Parent') {
        // Parent stays on the dashboard
        setShouldRedirect(null);
      }
    }
  }, [userData, loading]);

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