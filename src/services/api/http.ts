import { apiBaseUrl, isDev } from '../../config/env';
import type { HttpRequest, HttpResponse } from './types';
type FetchOptions = {
  authToken?: string | null;
};
export async function httpFetch<T>(req: HttpRequest, opts: FetchOptions = {}): Promise<HttpResponse<T>> {
  const {
    authToken
  } = opts;
  const url = req.url.startsWith('http') ? req.url : `${apiBaseUrl}${req.url}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(req.headers ?? {})
  };

  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const start = isDev ? performance.now() : 0;
  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.body ? JSON.stringify(req.body) : undefined
  });
  const contentType = res.headers.get('content-type') || '';
  const data = (contentType.includes('application/json') ? await res.json() : await res.text()) as unknown;
  if (isDev) {
    const ms = Math.round(performance.now() - start);
    console.debug(`[HTTP] ${req.method} ${url} -> ${res.status} (${ms}ms)`, data);
  }
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    let errorCode: string | undefined;
    let shouldRedirectToLogin = false;

    if (typeof data === 'string') {
      message = data;
    } else if (data && typeof data === 'object') {
      const errorData = data as Record<string, unknown>;
      errorCode = errorData.code as string | undefined;
      const errorString = (errorData.error || errorData.message || errorData.detail) as string;
      message = errorString || message;

      // Check for session expiration - error_code is nested in the error string
      if (errorCode === 'AUTHORIZATION_ERROR' && errorString && errorString.includes('session_not_found')) {
        shouldRedirectToLogin = true;
      }

      // Missing auth headers or similar auth-required errors
      if (
        res.status === 401 ||
        errorCode === 'AUTHORIZATION_ERROR' ||
        (typeof errorString === 'string' &&
          (errorString.toLowerCase().includes('authentication required') ||
            errorString.toLowerCase().includes('bearer token') ||
            errorString.toLowerCase().includes('x-api key')))
      ) {
        shouldRedirectToLogin = true;
      }
    }

    // Redirect to login page (only once)
    if (shouldRedirectToLogin && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      if (!(window as any).__redirecting) {
        (window as any).__redirecting = true;
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
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
