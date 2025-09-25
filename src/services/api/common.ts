import { z } from 'zod';
import type { HttpRequest } from './types';
import { httpFetch } from './http';
import { getAuthToken } from '../auth/session';
export async function authedFetch<T>(request: HttpRequest, schema: z.ZodType<T>): Promise<T> {
  const token = await getAuthToken();
  const response = await httpFetch<unknown>(request, {
    authToken: token
  });
  try {
    return schema.parse(response.data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('Failed to parse API response', request.method, request.url, err); // surface schema mismatch to dev console
      throw new Error('Received unexpected response from the server.');
    }
    throw err;
  }
}
export { z };