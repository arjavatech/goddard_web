import { forceTokenRefresh } from './tokenRefreshService';
import { getAuthToken } from './session';
import { isAuthBypassed } from '../../config/env';

interface PendingRequest {
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
  request: () => Promise<Response>;
}

let pendingRequests: PendingRequest[] = [];
let isRefreshingToken = false;

/**
 * Intercepts fetch requests and handles 401 errors with automatic token refresh
 */
export async function fetchWithTokenRefresh(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Add auth token to headers
    const token = await getAuthToken();
    const headers = new Headers(options.headers || {});
    
    if (token && !isAuthBypassed) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    // If successful, return response
    if (response.status !== 401) {
      return response;
    }

    // Handle 401 - Token expired
    return await handle401Error(url, options);
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

async function handle401Error(
  url: string,
  options: RequestInit
): Promise<Response> {
  // If already refreshing, queue this request
  if (isRefreshingToken) {
    return new Promise((resolve, reject) => {
      pendingRequests.push({
        resolve,
        reject,
        request: () => retryRequest(url, options)
      });
    });
  }

  // Start refresh process
  isRefreshingToken = true;

  try {
    const refreshed = await forceTokenRefresh();

    if (!refreshed) {
      // Refresh failed - surface as error without redirecting
      isRefreshingToken = false;
      clearPendingRequests();
      throw new Error('Token refresh failed');
    }

    // Refresh succeeded - retry original request
    const retryResponse = await retryRequest(url, options);

    // Process queued requests
    isRefreshingToken = false;
    processPendingRequests();

    return retryResponse;
  } catch (error) {
    isRefreshingToken = false;
    clearPendingRequests();
    throw error;
  }
}

async function retryRequest(
  url: string,
  options: RequestInit
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !isAuthBypassed) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers
  });
}

function processPendingRequests(): void {
  const requests = [...pendingRequests];
  pendingRequests = [];

  requests.forEach(async (req) => {
    try {
      const response = await req.request();
      req.resolve(response);
    } catch (error) {
      req.reject(error);
    }
  });
}

function clearPendingRequests(): void {
  pendingRequests.forEach((req) => {
    req.reject(new Error('Token refresh failed'));
  });
  pendingRequests = [];
}


