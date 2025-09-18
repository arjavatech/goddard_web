import { z } from 'zod';

// Helpers
const toBoolean = (v: unknown): boolean | undefined => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(s)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(s)) return false;
  }
  return undefined;
};
const stringWithDefault = (defaultValue: string) => z.preprocess(v => {
  if (v === undefined || v === null || v === '') return defaultValue;
  return v;
}, z.string());
const urlWithDefault = (defaultValue: string) => z.preprocess(v => {
  if (v === undefined || v === null || v === '') return defaultValue;
  return v;
}, z.string().url());
const booleanWithDefault = (defaultValue: boolean) => z.preprocess(v => {
  if (v === undefined || v === null || v === '') return defaultValue;
  const result = toBoolean(v);
  return result !== undefined ? result : defaultValue;
}, z.boolean());

// Schema
const EnvSchema = z.object({
  VITE_API_BASE_URL: urlWithDefault('https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod'),
  VITE_MOCK_API_URL: urlWithDefault('https://arjava.proxy.beeceptor.com'),
  VITE_SUPABASE_URL: stringWithDefault(''),
  VITE_SUPABASE_ANON_KEY: stringWithDefault(''),
  VITE_BYPASS_AUTH: booleanWithDefault(true),
  VITE_USE_MOCK_API: booleanWithDefault(true)
});

// Raw env from Vite
const rawEnv = {
  VITE_API_BASE_URL: import.meta.env?.VITE_API_BASE_URL,
  VITE_MOCK_API_URL: import.meta.env?.VITE_MOCK_API_URL,
  VITE_SUPABASE_URL: import.meta.env?.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env?.VITE_SUPABASE_ANON_KEY,
  VITE_BYPASS_AUTH: import.meta.env?.VITE_BYPASS_AUTH,
  VITE_USE_MOCK_API: import.meta.env?.VITE_USE_MOCK_API
};
const parsed = EnvSchema.safeParse(rawEnv);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}
export const env = parsed.data;
export const isDev = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined' ? !!import.meta.env.DEV : false;
export const isAuthBypassed = env.VITE_BYPASS_AUTH;
if (isDev) {
  console.log('🔧 Environment config:', {
    VITE_BYPASS_AUTH_raw: rawEnv.VITE_BYPASS_AUTH,
    VITE_BYPASS_AUTH_processed: env.VITE_BYPASS_AUTH,
    isAuthBypassed,
    VITE_SUPABASE_URL: !!env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!env.VITE_SUPABASE_ANON_KEY
  });
}
export const apiBaseUrl = env.VITE_USE_MOCK_API ? env.VITE_MOCK_API_URL : env.VITE_API_BASE_URL;