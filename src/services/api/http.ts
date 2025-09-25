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
    if (typeof data === 'string') {
      message = data;
    } else if (data && typeof data === 'object') {
      const errorData = data as Record<string, unknown>;
      message = (errorData.message || errorData.error || errorData.detail) as string || message;
    }

    // Add more context for common HTTP errors
    switch (res.status) {
      case 401:
        message = 'Authentication required. Please log in again.';
        break;
      case 403:
        message = 'Access denied. You do not have permission to perform this action.';
        break;
      case 404:
        message = 'The requested resource was not found.';
        break;
      case 500:
        message = 'Server error. Please try again later.';
        break;
    }
    const error = new Error(message);
    (error as any).status = res.status;
    (error as any).response = data;
    throw error;
  }
  return {
    status: res.status,
    ok: res.ok,
    data: data as T,
    headers: res.headers
  };
}