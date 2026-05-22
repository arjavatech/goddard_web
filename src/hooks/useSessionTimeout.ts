import { useEffect, useRef } from 'react';
import { useAuth } from '../services/auth/useAuth';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity

/**
 * Hook to auto-logout user after inactivity
 * Tracks user activity and logs out if no activity for SESSION_TIMEOUT
 */
export function useSessionTimeout() {
  const { isAuthenticated, signOut } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);

    if (!isAuthenticated) return;

    // Set warning timeout (5 minutes before logout)
    warningTimeoutRef.current = setTimeout(() => {
      console.warn('Session will expire in 5 minutes due to inactivity');
    }, SESSION_TIMEOUT - 5 * 60 * 1000);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      console.log('Session expired due to inactivity');
      signOut();
    }, SESSION_TIMEOUT);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [isAuthenticated, signOut]);
}
