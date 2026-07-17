/**
 * Fillout user provisioning for the signature/initials re-use feature.
 *
 * Every form link a parent opens must carry `user_id` + `user_token` so the
 * Fillout form can load the parent's saved signatures/initials and save new
 * ones. This module provisions (or looks up) the Fillout user for the
 * logged-in parent via Fillout's customer API and caches the short-lived
 * token locally until just before it expires.
 */

const FILLOUT_API_URL =
  (import.meta.env.VITE_FILLOUT_API_URL as string | undefined) ||
  'https://hb9ooihpdj.execute-api.us-east-1.amazonaws.com';
const FILLOUT_API_KEY = (import.meta.env.VITE_FILLOUT_API_KEY as string | undefined) || '';

const CACHE_KEY = 'fillout_user_context';
// Refresh the token when less than 5 minutes of its 2-hour lifetime remain
const EXPIRY_MARGIN_MS = 5 * 60 * 1000;

export type FilloutUserContext = {
  userId: string;
  userToken: string;
  expiresAt: string;
  externalUserId: string;
};

function readCache(externalUserId: string): FilloutUserContext | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as FilloutUserContext | null;
    if (
      cached &&
      cached.externalUserId === externalUserId &&
      cached.userId &&
      cached.userToken &&
      new Date(cached.expiresAt).getTime() - Date.now() > EXPIRY_MARGIN_MS
    ) {
      return cached;
    }
  } catch {
    // Corrupt cache — ignore and re-provision
  }
  return null;
}

/**
 * Provision (or fetch) the Fillout user for the logged-in parent.
 * Returns null when the API key is not configured or the call fails —
 * callers should degrade gracefully (form still opens, just without
 * signature re-use).
 */
export async function getFilloutUserContext(params: {
  externalUserId: string;
  email: string;
  name: string;
}): Promise<FilloutUserContext | null> {
  if (!FILLOUT_API_KEY) {
    console.warn('[Fillout] VITE_FILLOUT_API_KEY not configured — skipping user provisioning');
    return null;
  }

  const cached = readCache(params.externalUserId);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${FILLOUT_API_URL.replace(/\/$/, '')}/api/v1/users/provision?api_key=${encodeURIComponent(FILLOUT_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          external_user_id: params.externalUserId,
          email: params.email,
          name: params.name,
        }),
      }
    );
    if (!res.ok) {
      throw new Error(`Fillout provision failed: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.fillout_user_id || !data?.user_token) {
      throw new Error('Fillout provision response missing fillout_user_id/user_token');
    }
    const ctx: FilloutUserContext = {
      userId: data.fillout_user_id,
      userToken: data.user_token,
      expiresAt: data.expires_at,
      externalUserId: params.externalUserId,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(ctx));
    return ctx;
  } catch (err) {
    console.error('[Fillout] User provisioning failed:', err);
    return null;
  }
}

/** Append user_id + user_token to a Fillout form URL (no-op if ctx is null or already present). */
export function appendFilloutUserParams(url: string, ctx: FilloutUserContext | null): string {
  if (!ctx || !url || url === '#' || url.includes('user_token=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}user_id=${encodeURIComponent(ctx.userId)}&user_token=${encodeURIComponent(ctx.userToken)}`;
}
