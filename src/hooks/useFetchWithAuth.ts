import { useCallback } from 'react';
import { fetchWithTokenRefresh } from '../services/auth/apiInterceptor';

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Custom hook for making API calls with automatic token refresh
 * Handles 401 errors by refreshing token and retrying
 */
export function useFetchWithAuth() {
  const fetchData = useCallback(
    async <T,>(
      url: string,
      options: FetchOptions = {}
    ): Promise<T> => {
      const { timeout = 30000, ...fetchOptions } = options;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetchWithTokenRefresh(url, {
          ...fetchOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          (error as any).status = response.status;
          throw error;
        }

        const data = await response.json();
        return data as T;
      } catch (error) {
        console.error(`Fetch error for ${url}:`, error);
        throw error;
      }
    },
    []
  );

  return { fetchData };
}
