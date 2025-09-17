import { z } from 'zod'

const EnvSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .url()
    .default('https://hjny5xriqd.execute-api.us-west-2.amazonaws.com/prod'),

  VITE_MOCK_API_URL: z
    .string()
    .url()
    .default('https://arjava.proxy.beeceptor.com'),

  VITE_USE_MOCK_API: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  VITE_SUPABASE_URL: z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
  VITE_BYPASS_AUTH: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
})

const parsed = EnvSchema.safeParse(import.meta.env)

if (!parsed.success) {
  console.error(
    'Invalid environment configuration',
    parsed.error.flatten().fieldErrors,
  )
  throw new Error('Invalid environment configuration')
}

export const env = parsed.data

export const isDev = import.meta.env.DEV
export const isAuthBypassed = env.VITE_BYPASS_AUTH

console.log('🔧 Environment config:', {
  VITE_BYPASS_AUTH_raw: import.meta.env.VITE_BYPASS_AUTH,
  VITE_BYPASS_AUTH_processed: env.VITE_BYPASS_AUTH,
  isAuthBypassed,
  VITE_SUPABASE_URL: !!env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: !!env.VITE_SUPABASE_ANON_KEY
})

export const apiBaseUrl = env.VITE_USE_MOCK_API
  ? env.VITE_MOCK_API_URL
  : env.VITE_API_BASE_URL


