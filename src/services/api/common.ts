import { z } from 'zod';
import type { HttpRequest } from './types';
import { httpFetch } from './http';
import { getAuthToken } from '../auth/session';

export async function authedFetch<T>(request: HttpRequest, schema: z.ZodType<T>): Promise<T> {
  const token = await getAuthToken();
  const response = await httpFetch<unknown>(request, {
    authToken: token
  });
  return schema.parse(response.data);
}

export { z };
