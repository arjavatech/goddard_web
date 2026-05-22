import { type User } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let lastTokenRefreshTime = 0;
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh every 5 minutes

export async function getAuthToken(): Promise<string | null> {
  if (isAuthBypassed) return 'bypass-token';
  if (!supabase) return null;

  // First, try to get the current session
  const { data: sessionData } = await supabase.auth.getSession();

  // If session exists and is valid, return the token
  if (sessionData.session?.access_token) {
    // Proactively refresh if token is getting old
    const now = Date.now();
    if (now - lastTokenRefreshTime > TOKEN_REFRESH_INTERVAL) {
      lastTokenRefreshTime = now;
      // Refresh in background without blocking
      refreshSessionInBackground();
    }
    return sessionData.session.access_token;
  }

  // If already refreshing, wait for the existing refresh
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Start refresh process
  return performSessionRefresh();
}

async function performSessionRefresh(): Promise<string | null> {
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data: refreshData, error } = await supabase.auth.refreshSession();

      if (error || !refreshData.session?.access_token) {
        console.error('Failed to refresh session:', error);
        // Clear session on refresh failure
        await clearSession();
        return null;
      }

      lastTokenRefreshTime = Date.now();
      return refreshData.session.access_token;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function refreshSessionInBackground(): void {
  if (!supabase || isRefreshing) return;
  supabase.auth.refreshSession().catch(err => {
    console.error('Background session refresh failed:', err);
  });
}

export async function clearSession(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error clearing session:', err);
  }
  lastTokenRefreshTime = 0;
  isRefreshing = false;
  refreshPromise = null;
  
  // Clear localStorage and redirect to school selection for auto-logout
  localStorage.removeItem('schoolId');
  localStorage.removeItem('selectedSchool');
  window.location.href = '/';
}

export async function getCurrentUser(): Promise<User | null> {
  if (isAuthBypassed) {
    return {
      id: 'bypass-user',
      app_metadata: {},
      user_metadata: {
        full_name: 'Developer'
      },
      aud: 'bypass',
      created_at: new Date().toISOString()
    } as unknown as User;
  }
  if (!supabase) return null;
  const {
    data
  } = await supabase.auth.getUser();
  return data.user;
}