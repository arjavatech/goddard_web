import { useEffect } from 'react';
import { useAuth } from '../services/auth/useAuth';
import { getAuthToken, clearSession } from '../services/auth/session';

/**
 * Hook to validate session on app load and periodically
 * Ensures that stale sessions are detected and cleared
 */
export function useSessionValidation() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Validate session on mount
    validateSession();

    // Periodically validate session (every 10 minutes)
    const interval = setInterval(validateSession, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user?.id]);

  async function validateSession() {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.warn('Session validation failed: No token available');
        await clearSession();
      }
    } catch (err) {
      console.error('Session validation error:', err);
      await clearSession();
    }
  }
}
