import { createContext, createElement, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { type AuthError, type Provider, type User, type Session } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
import { unregisterDeviceToken } from '../api/notifications';
import { deleteFcmToken } from '../firebase';

const FCM_TOKEN_STORAGE_KEY = 'goddard.fcm-token';

// Best-effort: tell the backend to forget this device's FCM token, then nuke
// the local Firebase registration. Called before signOut so the auth header is
// still valid for the DELETE. Errors are swallowed — a stale row is fine since
// FCM will mark it UNREGISTERED on the next send and the backend prunes it.
async function cleanupFcmRegistration(): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(FCM_TOKEN_STORAGE_KEY) : null;
  if (token) {
    try { await unregisterDeviceToken(token); } catch { /* noop */ }
    try { localStorage.removeItem(FCM_TOKEN_STORAGE_KEY); } catch { /* noop */ }
  }
  try { await deleteFcmToken(); } catch { /* noop */ }
  try { localStorage.removeItem('fillout_user_context'); } catch { /* noop */ }
}
type UseAuth = {
  user: User | null;
  isAuthenticated: boolean;
  isBypassed: boolean;
  loading: boolean;
  authGeneration: number;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string, firstName: string, lastName: string, schoolId: string, role: string) => Promise<{
    user: User | null;
    session: Session | null;
    needsConfirmation: boolean;
  } | undefined>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithProvider: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<UseAuth | undefined>(undefined);

function useAuthState(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // A new generation represents a fresh authenticated session. Profile data
  // is keyed to this value so it cannot be reused after logout or re-login.
  const [authGeneration, setAuthGeneration] = useState(0);
  const sessionTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (isAuthBypassed) {
      const devUser = {
        id: 'bypass-user',
        app_metadata: {},
        user_metadata: {
          full_name: 'Developer'
        },
        aud: 'bypass',
        created_at: new Date().toISOString()
      } as unknown as User;
      setUser(devUser);
      setAuthGeneration(1);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Supabase immediately emits INITIAL_SESSION to this subscription. Using
    // it as the only initial-session source avoids a duplicate profile load.
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      const previousToken = sessionTokenRef.current;
      sessionTokenRef.current = session?.access_token ?? null;
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_OUT') {
        setAuthGeneration(generation => generation + 1);
      } else if (
        (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
        session?.access_token &&
        session.access_token !== previousToken
      ) {
        setAuthGeneration(generation => generation + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error as AuthError;
  }, []);
  const signUpWithPassword = useCallback(async (email: string, password: string, firstName: string, lastName: string, schoolId: string, role: string) => {
    if (isAuthBypassed) {
      return undefined;
    }
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }
    const {
      data,
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: {
          first_name: firstName || '',
          last_name: lastName || '',
          school_id: schoolId || '',
          role: role || 'Admin'
        }
      }
    });
    if (error) {
      throw error as AuthError;
    }
    if (data?.user && !data.session) {
      return {
        user: data.user,
        session: null,
        needsConfirmation: true
      };
    }
    return {
      user: data?.user,
      session: data?.session,
      needsConfirmation: false
    };
  }, []);
  const resetPassword = useCallback(async (email: string) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const {
      error
    } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    });
    if (error) throw error as AuthError;
  }, []);
  const updatePassword = useCallback(async (password: string) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const {
      error
    } = await supabase.auth.updateUser({
      password
    });
    if (error) throw error as AuthError;
  }, []);
  const signInWithProvider = useCallback(async (provider: Provider) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw error as AuthError;
  }, []);
  const signOut = useCallback(async () => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    await cleanupFcmRegistration();
    // Do not let the next login reuse a school selected by the previous user.
    localStorage.removeItem('schoolId');
    localStorage.removeItem('selectedSchool');
    const {
      error
    } = await supabase.auth.signOut();
    if (error) throw error as AuthError;
  }, []);
  return {
    user,
    isAuthenticated: !!user,
    isBypassed: isAuthBypassed,
    loading,
    authGeneration,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    signInWithProvider,
    signOut
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuthState();
  return createElement(AuthContext.Provider, { value: auth }, children);
}

export function useAuth(): UseAuth {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return auth;
}
