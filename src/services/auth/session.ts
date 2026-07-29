import { type User } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
import { unregisterDeviceToken } from '../api/notifications';
import { deleteFcmToken } from '../firebase';

const FCM_TOKEN_STORAGE_KEY = 'goddard.fcm-token';

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let isClearing = false;
// Proactively refresh when less than 5 minutes remain before expiry
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

export async function getAuthToken(): Promise<string | null> {
  if (isAuthBypassed) return 'bypass-token';
  if (!supabase) return null;

  // Get the current session
  const { data: sessionData } = await supabase.auth.getSession();

  if (sessionData.session?.access_token) {
    const expiresAt = sessionData.session.expires_at;
    if (expiresAt) {
      const timeUntilExpiry = expiresAt * 1000 - Date.now();
      // Only refresh proactively when token is close to expiry
      if (timeUntilExpiry < REFRESH_THRESHOLD_MS) {
        refreshSessionInBackground();
      }
    }
    return sessionData.session.access_token;
  }

  // No valid session — if already refreshing, wait for it
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  // Attempt a full session refresh
  return performSessionRefresh();
}

async function performSessionRefresh(): Promise<string | null> {
  if (!supabase) return null;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const { data: refreshData, error } = await supabase.auth.refreshSession();

      if (error) {
        // No session to refresh — not an error worth logging (e.g. unauthenticated page load)
        if (error.name !== 'AuthSessionMissingError') {
          console.error('Failed to refresh session:', error);
        }
        return null;
      }

      if (!refreshData.session?.access_token) return null;

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
  isRefreshing = true;
  supabase.auth.refreshSession()
    .catch(err => {
      console.error('Background session refresh failed:', err);
    })
    .finally(() => {
      isRefreshing = false;
    });
}

export async function clearSession(): Promise<void> {
  // Prevent multiple simultaneous clears
  if (isClearing) return;
  isClearing = true;

  // Best-effort: tell the backend to drop this device's FCM token while the
  // auth header is still valid. Failures are non-fatal — a stale row will be
  // pruned on the next FCM send anyway.
  const fcmToken = typeof window !== 'undefined' ? localStorage.getItem(FCM_TOKEN_STORAGE_KEY) : null;
  if (fcmToken) {
    try { await unregisterDeviceToken(fcmToken); } catch { /* noop */ }
    try { localStorage.removeItem(FCM_TOKEN_STORAGE_KEY); } catch { /* noop */ }
  }
  try { await deleteFcmToken(); } catch { /* noop */ }

  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Error clearing session:', err);
  }
  isRefreshing = false;
  refreshPromise = null;
  
  // Clear localStorage and redirect to school selection for auto-logout
  localStorage.removeItem('schoolId');
  localStorage.removeItem('selectedSchool');
  
  // Use a small delay to ensure state is cleared before redirect
  setTimeout(() => {
    window.location.href = '/';
  }, 100);
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
