import { useEffect, useState, useCallback } from 'react';
import { type AuthError, type Provider, type User, type Session } from '@supabase/supabase-js';
import { isAuthBypassed } from '../../config/env';
import { supabase } from './authClient';
type UseAuth = {
  user: User | null;
  isAuthenticated: boolean;
  isBypassed: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<{
    user: User | null;
    session: Session | null;
    needsConfirmation: boolean;
  } | undefined>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signInWithProvider: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
};
export function useAuth(): UseAuth {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
      return;
    }
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
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
  const signUpWithPassword = useCallback(async (email: string, password: string) => {
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
        emailRedirectTo: `${window.location.origin}/auth/confirm`
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
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    signInWithProvider,
    signOut
  };
}