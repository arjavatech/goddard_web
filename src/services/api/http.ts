import { apiBaseUrl, isDev } from '../../config/env';
import { SESSION_CONFIG, isSessionError, isRetryableStatus } from '../../config/session';
import type { HttpRequest, HttpResponse } from './types';
import { clearSession } from '../auth/session';
import { fetchWithTokenRefresh } from '../auth/apiInterceptor';

type FetchOptions = {
  authToken?: string | null;
  retryCount?: number;
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function httpFetch<T>(req: HttpRequest, opts: FetchOptions = {}): Promise<HttpResponse<T>> {
  const { authToken, retryCount = 0 } = opts;
  const url = req.url.startsWith('http') ? req.url : `${apiBaseUrl}${req.url}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(req.headers ?? {})
  };

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const start = isDev ? performance.now() : 0;
  let res: Response;
  let data: unknown;

  try {
    res = await fetchWithTokenRefresh(url, {
      method: req.method,
      headers,
      body: req.body ? JSON.stringify(req.body) : undefined
    });

    const contentType = res.headers.get('content-type') || '';
    data = (contentType.includes('application/json') ? await res.json() : await res.text()) as unknown;
  } catch (fetchError) {
    // Network error - retry if we haven't exceeded max retries
    if (retryCount < SESSION_CONFIG.MAX_RETRIES) {
      await delay(SESSION_CONFIG.RETRY_DELAY * (retryCount + 1));
      return httpFetch(req, { ...opts, retryCount: retryCount + 1 });
    }
    throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
  }

  if (isDev) {
    const ms = Math.round(performance.now() - start);
    console.debug(`[HTTP] ${req.method} ${url} -> ${res.status} (${ms}ms)`, data);
  }

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    let errorCode: string | undefined;
    let shouldRedirectToLogin = false;
    let isSessionErrorFlag = false;

    if (typeof data === 'string') {
      message = data;
    } else if (data && typeof data === 'object') {
      const errorData = data as Record<string, unknown>;
      errorCode = errorData.code as string | undefined;
      const errorString = (errorData.error || errorData.message || errorData.detail) as string;
      message = errorString || message;

      // Check for session errors using centralized config
      if (isSessionError(message)) {
        isSessionErrorFlag = true;
        // Only redirect on 401/403 status codes, not on other errors
        if (SESSION_CONFIG.AUTH_ERROR_STATUSES.includes(res.status)) {
          shouldRedirectToLogin = true;
        }
      }

      // Check for auth errors
      if (SESSION_CONFIG.AUTH_ERROR_STATUSES.includes(res.status)) {
        shouldRedirectToLogin = true;
      }
    }

    // Don't retry on email bounce errors (502 with EXTERNAL_SERVICE_ERROR code)
    const isEmailBounceError = res.status === 502 && errorCode === 'EXTERNAL_SERVICE_ERROR';
    
    // Retry on retryable errors (but not email bounce errors)
    if (!isEmailBounceError && isRetryableStatus(res.status) && retryCount < SESSION_CONFIG.MAX_RETRIES) {
      await delay(SESSION_CONFIG.RETRY_DELAY * (retryCount + 1));
      return httpFetch(req, { ...opts, retryCount: retryCount + 1 });
    }

    // Handle session errors - clear session and redirect only on 401/403
    if (shouldRedirectToLogin) {
      await clearSession();
    }

    const error = new Error(message);
    (error as any).status = res.status;
    (error as any).response = data;
    (error as any).code = errorCode;
    throw error;
  }

  return {
    status: res.status,
    ok: res.ok,
    data: data as T,
    headers: res.headers
  };
}
