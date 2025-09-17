import { apiBaseUrl, isDev } from '@/config/env'
import type { HttpRequest, HttpResponse } from './types'
type FetchOptions = {
  authToken?: string | null
}

export async function httpFetch<T>(
  req: HttpRequest,
  opts: FetchOptions = {},
): Promise<HttpResponse<T>> {
  const { authToken } = opts

  const url = req.url.startsWith('http') ? req.url : `${apiBaseUrl}${req.url}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(req.headers ?? {}),
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const start = isDev ? performance.now() : 0
  const res = await fetch(url, {
    method: req.method,
    headers,
    body: req.body ? JSON.stringify(req.body) : undefined,
  })

  const contentType = res.headers.get('content-type') || ''
  const data = (
    contentType.includes('application/json')
      ? await res.json()
      : await res.text()
  ) as unknown

  if (isDev) {
    const ms = Math.round(performance.now() - start)
    console.debug(
      `[HTTP] ${req.method} ${url} -> ${res.status} (${ms}ms)`,
      data,
    )
  }

  if (!res.ok) {
    const message =
      typeof data === 'string'
        ? data
        : (data as Record<string, unknown>)?.message ||
          `Request failed: ${res.status}`
    throw new Error(message as string)
  }

  return {
    status: res.status,
    ok: res.ok,
    data: data as T,
    headers: res.headers,
  }
}


