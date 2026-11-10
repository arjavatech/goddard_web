import { createContext, createElement, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { type AuthError, type Provider, type User, type Session } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
import { storeCustomToken, getStoredCustomToken, clearCustomToken } from './session';
import { googleExchange as googleExchangeApi } from '../api/auth';
import { unregisterDeviceToken } from '../api/notifications';
import { deleteFcmToken } from '../firebase';

const FCM_TOKEN_STORAGE_KEY = 'goddard.fcm-token';

async function cleanupFcmRegistration(): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(FCM_TOKEN_STORAGE_KEY) : null;
  if (token) {
    try { await unregisterDeviceToken(token); } catch { /* noop */ }
    try { localStorage.removeItem(FCM_TOKEN_STORAGE_KEY); } catch { /* noop */ }
  }
  try { await deleteFcmToken(); } catch { /* noop */ }
  try { localStorage.removeItem('fillout_user_context'); } catch { /* noop */ }
}

function parseJwtClaims(token: string): { user_id: string; email: string; role: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.user_id && payload.email) return { user_id: payload.user_id, email: payload.email, role: payload.role ?? '' };
    return null;
  } catch {
    return null;
  }
}

function makeSyntheticUser(claims: { user_id: string; email: string; role: string }): User {
  return {
    id: claims.user_id,
    email: claims.email,
    app_metadata: { role: claims.role },
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as unknown as User;
}

type UseAuth = {
  user: User | null;
  isAuthenticated: boolean;
  isBypassed: boolean;
  loading: boolean;
  authGeneration: number;
  signInWithPassword: (email: string, password: string) => Promise<{ user: User | null; session: Session | null } | null>;
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

const BYPASS_USER: User = {
  id: 'bypass-user',
  app_metadata: {},
  user_metadata: { full_name: 'Developer' },
  aud: 'bypass',
  created_at: new Date().toISOString()
} as unknown as User;

function useAuthState(): UseAuth {
  const [user, setUser] = useState<User | null>(() => {
    if (isAuthBypassed) return BYPASS_USER;
    const token = getStoredCustomToken();
    if (token) {
      const claims = parseJwtClaims(token);
      if (claims) return makeSyntheticUser(claims);
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (isAuthBypassed) return false;
    return !getStoredCustomToken();
  });

  const [authGeneration, setAuthGeneration] = useState<number>(() => {
    if (isAuthBypassed) return 1;
    return getStoredCustomToken() ? 1 : 0;
  });

  const sessionTokenRef = useRef<string | null>(null);
  const googleExchangeAttempted = useRef(false);

  useEffect(() => {
    if (isAuthBypassed) return;
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const previousToken = sessionTokenRef.current;
      sessionTokenRef.current = session?.access_token ?? null;

      if (event === 'INITIAL_SESSION') {
        if (getStoredCustomToken()) {
          // Custom JWT is active — don't let Supabase's null session overwrite it
          setLoading(false);
          return;
        }

        // Existing Google session with no custom JWT → attempt exchange to get one
        const isRestoredGoogle = session?.user?.app_metadata?.provider === 'google';

        if (isRestoredGoogle && session?.access_token) {
          if (!googleExchangeAttempted.current) {
            googleExchangeAttempted.current = true;
            googleExchangeApi(session.access_token)
              .then(result => {
                storeCustomToken(result.token);
                const claims = parseJwtClaims(result.token);
                if (claims) setUser(makeSyntheticUser(claims));
                setLoading(false);
                setAuthGeneration(g => g + 1);
                sessionStorage.setItem('oauth_just_succeeded', '1');
              })
              .catch((err: unknown) => {
                // Stale session or account not activated — sign out locally (scope:'local'
                // clears storage without an API call, so a 403 from a stale session can't
                // prevent localStorage from being wiped and cause a reload loop)
                const rawMessage = (err instanceof Error ? err.message : '') ?? '';
                const lowerRaw = rawMessage.toLowerCase();
                const message = lowerRaw.includes('invitation link') || lowerRaw.includes('account setup')
                  ? 'Please complete your account setup using the invitation link sent to your email.'
                  : lowerRaw.includes('no account found')
                  ? 'No account found. Please contact your school administrator.'
                  : rawMessage.replace(/^authorization error:\s*/i, '') || 'Google sign-in failed. Please try again.';
                sessionStorage.setItem('google_auth_error', message);
                sessionStorage.setItem('google_auth_failure', 'true');
                clearCustomToken();
                setUser(null);
                setLoading(false);
                supabase!.auth.signOut({ scope: 'local' }).finally(() => {
                  window.location.href = '/login';
                });
              });
          }
          // Exchange in flight or already attempted — never fall through to setUser(session.user)
          return;
        }

        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.access_token && session.access_token !== previousToken) {
          setAuthGeneration(g => g + 1);
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.access_token) {
        const pendingOAuth = sessionStorage.getItem('pending_oauth');
        sessionStorage.removeItem('pending_oauth');
        const isGoogle =
          pendingOAuth === 'google' ||
          session.user?.app_metadata?.provider === 'google';
        const existing = getStoredCustomToken();
        if (isGoogle && !existing) {
          if (!googleExchangeAttempted.current) {
            googleExchangeAttempted.current = true;
            // Google OAuth just completed — exchange for our custom JWT
            googleExchangeApi(session.access_token)
              .then(result => {
                storeCustomToken(result.token);
                const claims = parseJwtClaims(result.token);
                if (claims) setUser(makeSyntheticUser(claims));
                setLoading(false);
                setAuthGeneration(g => g + 1);
                sessionStorage.setItem('oauth_just_succeeded', '1');
              })
              .catch((err: Error) => {
                // Exchange rejected (e.g. account not yet activated) — sign out and show error on login page
                const rawMessage = err?.message ?? '';
                const lowerRaw = rawMessage.toLowerCase();
                const message = lowerRaw.includes('invitation link') || lowerRaw.includes('account setup')
                  ? 'Please complete your account setup using the invitation link sent to your email.'
                  : lowerRaw.includes('no account found')
                  ? 'No account found. Please contact your school administrator.'
                  : rawMessage.replace(/^authorization error:\s*/i, '') || 'Google sign-in failed. Please try again.';
                sessionStorage.setItem('google_auth_error', message);
                sessionStorage.setItem('google_auth_failure', 'true');
                clearCustomToken();
                setUser(null);
                setLoading(false);
                supabase!.auth.signOut({ scope: 'local' }).finally(() => {
                  window.location.href = '/login';
                });
              });
          }
          // Exchange already in flight from INITIAL_SESSION — stay loading, never set Supabase
          // user directly (would cause a brief auth flash and a redirect to protected routes)
          return;
        }
        // Password login — use Supabase user directly
        setUser(session.user);
        setLoading(false);
        setAuthGeneration(g => g + 1);
        return;
      }

      if (event === 'SIGNED_OUT') {
        // Only reset the exchange gate on explicit user logout. For auto sign-outs triggered
        // by a failed exchange, keeping the gate set prevents re-triggering between the
        // SIGNED_OUT event and the subsequent window.location.href navigation.
        const isExplicit = sessionStorage.getItem('explicit_logout') === 'true';
        const isInviteSwap = sessionStorage.getItem('invite_session_swap') === 'true';
        const isGoogleAuthFailure = sessionStorage.getItem('google_auth_failure') === 'true';
        sessionStorage.removeItem('invite_session_swap');
        sessionStorage.removeItem('google_auth_failure');
        if (isExplicit) {
          googleExchangeAttempted.current = false;
        }
        clearCustomToken();
        if (!isExplicit && !isInviteSwap && !isGoogleAuthFailure && previousToken) {
          localStorage.setItem('session_invalidated', 'true');
        }
        sessionStorage.removeItem('explicit_logout');
        setUser(null);
        setLoading(false);
        setAuthGeneration(g => g + 1);
        return;
      }

      // TOKEN_REFRESHED and other events
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (isAuthBypassed) return null;
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error as AuthError;
    return data;
  }, []);

  const signUpWithPassword = useCallback(async (email: string, password: string, firstName: string, lastName: string, schoolId: string, role: string) => {
    if (isAuthBypassed) return undefined;
    if (!supabase) throw new Error('Supabase not initialized');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
        data: { first_name: firstName || '', last_name: lastName || '', school_id: schoolId || '', role: role || 'Admin' }
      }
    });
    if (error) throw error as AuthError;
    if (data?.user && !data.session) return { user: data.user, session: null, needsConfirmation: true };
    return { user: data?.user, session: data?.session, needsConfirmation: false };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    });
    if (error) throw error as AuthError;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error as AuthError;
  }, []);

  const signInWithProvider = useCallback(async (provider: Provider) => {
    if (isAuthBypassed) return;
    if (!supabase) throw new Error('Supabase not initialized');
    sessionStorage.setItem('pending_oauth', provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { prompt: 'select_account' }
      }
    });
    if (error) {
      sessionStorage.removeItem('pending_oauth');
      throw error as AuthError;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (isAuthBypassed) return;
    await cleanupFcmRegistration();
    localStorage.removeItem('schoolId');
    localStorage.removeItem('selectedSchool');
    sessionStorage.setItem('post_logout_login', 'true');
    sessionStorage.setItem('explicit_logout', 'true');
    clearCustomToken();
    setUser(null);
    setAuthGeneration(g => g + 1);
    if (supabase) {
      try { await supabase.auth.signOut(); } catch { /* no Supabase session is fine */ }
    }
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
  if (!auth) throw new Error('useAuth must be used within an AuthProvider');
  return auth;
}
