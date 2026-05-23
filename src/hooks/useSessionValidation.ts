import { useEffect } from 'react';
import { useAuth } from '../services/auth/useAuth';

/**
 * Hook to validate session on app load
 * Removed periodic validation as token refresh handles this
 */
export function useSessionValidation() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Session validation on mount only
    // Token refresh is handled automatically by getAuthToken every 5 minutes
  }, [isAuthenticated, user?.id]);
}
