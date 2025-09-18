import { createClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

// Debug logging
console.log('Supabase Config:', {
  url: env.VITE_SUPABASE_URL,
  hasKey: !!env.VITE_SUPABASE_ANON_KEY,
  urlLength: env.VITE_SUPABASE_URL?.length,
  keyLength: env.VITE_SUPABASE_ANON_KEY?.length
});

// Only create client if we have non-empty values
const hasValidConfig = env.VITE_SUPABASE_URL &&
                       env.VITE_SUPABASE_ANON_KEY &&
                       env.VITE_SUPABASE_URL.length > 0 &&
                       env.VITE_SUPABASE_ANON_KEY.length > 0;

export const supabase = hasValidConfig ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
}) : null;