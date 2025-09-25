import { z } from 'zod';

/**
 * Converts various string representations to boolean values
 * Handles common environment variable boolean patterns
 */
const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return undefined;
};

/**
 * Generic preprocessing helper that handles empty/null/undefined values with defaults
 */
const withDefault = <T,>(defaultValue: T, parser?: (v: unknown) => T | undefined) => {
  return z.preprocess(value => {
    // Handle empty/null/undefined
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }
    // Apply custom parser if provided
    if (parser) {
      const parsed = parser(value);
      return parsed !== undefined ? parsed : defaultValue;
    }
    return value;
  }, z.any());
};

/**
 * Environment variable schema with validation and defaults
 */
const EnvSchema = z.object({
  VITE_API_BASE_URL: withDefault('https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod').pipe(z.string().url()),
  VITE_MOCK_API_URL: withDefault('https://arjava.proxy.beeceptor.com').pipe(z.string().url()),
  VITE_SUPABASE_URL: withDefault('').pipe(z.string()),
  VITE_SUPABASE_ANON_KEY: withDefault('').pipe(z.string()),
  VITE_BYPASS_AUTH: withDefault(true, parseBoolean).pipe(z.boolean()),
  VITE_USE_MOCK_API: withDefault(true, parseBoolean).pipe(z.boolean())
});

/**
 * Parse and validate environment variables
 */
const parseEnvironment = () => {
  const rawEnv = import.meta.env || {};
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error('❌ Environment configuration errors:', errors);

    // Provide helpful error messages
    const errorMessages = Object.entries(errors).map(([key, messages]) => `  ${key}: ${messages?.join(', ') || 'Invalid value'}`).join('\n');
    throw new Error(`Environment validation failed:\n${errorMessages}\n\nCheck your .env file or environment variables.`);
  }
  return result.data;
};
// Parse environment once at module load
const env = parseEnvironment();

/**
 * Consolidated application configuration
 * Combines environment variables with derived values
 */
const config = {
  // Core environment variables
  env,
  // Runtime environment flags
  isDev: import.meta.env?.DEV ?? false,
  // Authentication configuration
  isAuthBypassed: env.VITE_BYPASS_AUTH,
  // API configuration
  apiBaseUrl: env.VITE_USE_MOCK_API ? env.VITE_MOCK_API_URL : env.VITE_API_BASE_URL,
  // Supabase configuration helpers
  supabase: {
    isConfigured: !!(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY),
    url: env.VITE_SUPABASE_URL,
    anonKey: env.VITE_SUPABASE_ANON_KEY
  }
} as const;

// Development logging
if (config.isDev) {
  console.log('🔧 Environment Configuration:', {
    isDev: config.isDev,
    isAuthBypassed: config.isAuthBypassed,
    useMockApi: env.VITE_USE_MOCK_API,
    apiBaseUrl: config.apiBaseUrl,
    supabaseConfigured: config.supabase.isConfigured
  });
}

// Export individual values for backward compatibility
export const {
  env: envVars,
  isDev,
  isAuthBypassed,
  apiBaseUrl
} = config;
export { env };

// Export the full config object for new usage
export default config;