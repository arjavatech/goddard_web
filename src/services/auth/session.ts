import { type User } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
export async function getAuthToken(): Promise<string | null> {
  if (isAuthBypassed) return 'bypass-token';
  if (!supabase) return null;
  const {
    data
  } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
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