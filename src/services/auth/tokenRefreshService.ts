import { supabase } from './authClient';
import { isAuthBypassed } from '../../config/env';

let refreshInterval: NodeJS.Timeout | null = null;
let isRefreshing = false;
const REFRESH_CHECK_INTERVAL = 60 * 1000; // Check every 1 minute
const REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh when 5 minutes left

export function startBackgroundTokenRefresh(): void {
  if (isAuthBypassed || !supabase || refreshInterval) return;

  refreshInterval = setInterval(async () => {
    await silentTokenRefresh();
  }, REFRESH_CHECK_INTERVAL);

  // Initial refresh check
  silentTokenRefresh();
}

export function stopBackgroundTokenRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function silentTokenRefresh(): Promise<void> {
  if (isRefreshing || isAuthBypassed || !supabase) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session) return;

    const expiresAt = sessionData.session.expires_at;
    if (!expiresAt) return;

    const now = Date.now() / 1000;
    const timeUntilExpiry = (expiresAt - now) * 1000;

    // If token expires within threshold, refresh silently
    if (timeUntilExpiry < REFRESH_THRESHOLD) {
      isRefreshing = true;
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Silent token refresh failed:', error.message);
        }
      } finally {
        isRefreshing = false;
      }
    }
  } catch (error) {
    console.error('Error in silent token refresh:', error);
  }
}

export async function forceTokenRefresh(): Promise<boolean> {
  if (isAuthBypassed || !supabase) return true;

  try {
    isRefreshing = true;
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error || !data.session) {
      console.error('Force token refresh failed:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error forcing token refresh:', error);
    return false;
  } finally {
    isRefreshing = false;
  }
}

export function isTokenRefreshing(): boolean {
  return isRefreshing;
}
