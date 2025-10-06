import { type User } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
export async function getAuthToken(): Promise<string | null> {
  if (isAuthBypassed) return 'bypass-token';
  if (!supabase) return null;

  // First, try to get the current session
  const { data: sessionData } = await supabase.auth.getSession();

  // If session exists and is valid, return the token
  if (sessionData.session?.access_token) {
    return sessionData.session.access_token;
  }

  // If no session, try to refresh the session
  const { data: refreshData, error } = await supabase.auth.refreshSession();

  if (error || !refreshData.session?.access_token) {
    // Session refresh failed - user needs to log in again
    console.error('Failed to refresh session:', error);
    return null;
  }

  return refreshData.session.access_token;
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