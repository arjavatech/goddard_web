import { z } from './common';
import { getAuthToken } from '../auth/session';

const tapTimeBaseUrl = (import.meta.env.VITE_TAPTIME_API_BASE_URL || '').replace(/\/$/, '');

export type AttendanceReport = { emp_id?: string; name?: string; email?: string; pin?: string; date?: string; check_in_time?: string; check_out_time?: string; time_worked?: string; type?: string };

async function tapTimeFetch<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
  if (!tapTimeBaseUrl) throw new Error('TapTime integration is not configured for this environment.');
  const token = await getAuthToken();
  const response = await fetch(`${tapTimeBaseUrl}/v1/integrations${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `TapTime request failed: ${response.status}`);
  return schema.parse(body);
}

export const TapTimeService = {
  connection: () => tapTimeFetch('/connection', z.any()),
  myReports: (params: URLSearchParams) => tapTimeFetch(`/me/reports?${params}`, z.object({ items: z.array(z.any()) })),
  myPending: () => tapTimeFetch('/me/pending-checkouts', z.object({ items: z.array(z.any()) })),
  schoolReports: (params: URLSearchParams) => tapTimeFetch(`/reports?${params}`, z.object({ items: z.array(z.any()) })),
  pending: () => tapTimeFetch('/pending-checkouts', z.object({ items: z.array(z.any()) })),
  employmentTypes: () => tapTimeFetch('/attendance/employment-types', z.object({ items: z.array(z.string()) })),
  correctReport: (empId: string, body: { original_check_in_time: string; check_in_time: string; check_out_time: string | null; type_id: string | null }) =>
    tapTimeFetch(`/attendance/reports/${encodeURIComponent(empId)}`, z.any(), { method: 'PATCH', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  createManualReport: (body: Record<string, unknown>) => tapTimeFetch('/attendance/reports', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  updateManualReport: (body: Record<string, unknown>) => tapTimeFetch('/attendance/reports', z.any(), { method: 'PATCH', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  recipients: () => tapTimeFetch('/report-settings/recipients', z.object({ items: z.array(z.any()) })),
  createRecipient: (body: Record<string, unknown>) => tapTimeFetch('/report-settings/recipients', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  updateRecipient: (email: string, body: Record<string, unknown>) => tapTimeFetch(`/report-settings/recipients/${encodeURIComponent(email)}`, z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  deleteRecipient: (email: string) => tapTimeFetch(`/report-settings/recipients/${encodeURIComponent(email)}`, z.any(), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  viewFrequency: () => tapTimeFetch('/report-settings/view-frequency', z.any()),
  updateViewFrequency: (frequency: string) => tapTimeFetch('/report-settings/view-frequency', z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ frequency }) }),
};
