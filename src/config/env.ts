import { z } from 'zod';
// Create a more robust schema that handles missing environment variables
const EnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default('https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod').transform(v => v || 'https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod').pipe(z.string().url()),
  VITE_MOCK_API_URL: z.string().default('https://arjava.proxy.beeceptor.com').transform(v => v || 'https://arjava.proxy.beeceptor.com').pipe(z.string().url()),
  VITE_USE_MOCK_API: z.string().default('true').transform(v => v || 'false').transform(v => v === 'true'),
  VITE_SUPABASE_URL: z.string().default('').transform(v => v || ''),
  VITE_SUPABASE_ANON_KEY: z.string().default('').transform(v => v || ''),
  VITE_BYPASS_AUTH: z.string().default('true').transform(v => v || 'false').transform(v => v === 'true')
});
// Guard against undefined import.meta.env
const getEnvValue = (key: string, defaultValue: string = '') => {
  try {
    return import.meta?.env?.[key] as string || defaultValue;
  } catch {
    return defaultValue;
  }
};
// Provide fallback values for missing environment variables
const envWithDefaults = {
  VITE_API_BASE_URL: getEnvValue('VITE_API_BASE_URL', 'https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod'),
  VITE_MOCK_API_URL: getEnvValue('VITE_MOCK_API_URL', 'https://arjava.proxy.beeceptor.com'),
  VITE_USE_MOCK_API: getEnvValue('VITE_USE_MOCK_API', 'false'),
  VITE_SUPABASE_URL: getEnvValue('VITE_SUPABASE_URL', ''),
  VITE_SUPABASE_ANON_KEY: getEnvValue('VITE_SUPABASE_ANON_KEY', ''),
  VITE_BYPASS_AUTH: getEnvValue('VITE_BYPASS_AUTH', 'false')
};
const parsed = EnvSchema.safeParse(envWithDefaults);
if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}
export const env = parsed.data;
export const isDev = getEnvValue('DEV', 'false') === 'true';
export const isAuthBypassed = env.VITE_BYPASS_AUTH;
console.log('🔧 Environment config:', {
  VITE_BYPASS_AUTH_raw: getEnvValue('VITE_BYPASS_AUTH'),
  VITE_BYPASS_AUTH_processed: env.VITE_BYPASS_AUTH,
  isAuthBypassed,
  VITE_SUPABASE_URL: !!env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: !!env.VITE_SUPABASE_ANON_KEY
});
export const apiBaseUrl = env.VITE_USE_MOCK_API ? env.VITE_MOCK_API_URL : env.VITE_API_BASE_URL;