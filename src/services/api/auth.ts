import { apiBaseUrl } from '../../config/env';

export interface GoogleExchangeResult {
  success: boolean;
  token: string;
  role: string;
  school_id: string;
  user_id: string;
}

// Bypasses the interceptor so we can pass the Supabase token directly.
export async function googleExchange(supabaseToken: string): Promise<GoogleExchangeResult> {
  const res = await fetch(`${apiBaseUrl}/auth/google/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseToken}`
    }
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error((data as any).error || (data as any).message || 'Google exchange failed');
    (err as any).status = res.status;
    throw err;
  }
  return res.json() as Promise<GoogleExchangeResult>;
}
