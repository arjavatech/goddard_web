export type HelloResponse = {
  message: string;
  timestamp: number;
  status: string;
};
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type HttpRequest = {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
};
export type HttpResponse<T> = {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
};