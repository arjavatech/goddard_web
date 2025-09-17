import { httpFetch } from './http'
import type { HelloResponse } from './types'
import { getAuthToken } from '@/services/auth/session'

async function withAuth<T>(
  fn: (token: string | null) => Promise<T>,
): Promise<T> {
  const token = await getAuthToken()
  return fn(token)
}

export const api = {
  async hello(name: string): Promise<HelloResponse> {
    return withAuth(async (token) => {
      const res = await httpFetch<HelloResponse>(
        { method: 'GET', url: `/hello/${encodeURIComponent(name)}` },
        { authToken: token },
      )
      return res.data
    })
  },
}

export type ApiClient = typeof api


