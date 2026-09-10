import { z } from './common';
import { getAuthToken } from '../auth/session';

const tapTimeBaseUrl = (import.meta.env.VITE_TAPTIME_API_BASE_URL || '').replace(/\/$/, '');

export type AttendanceReport = { emp_id?: string; name?: string; email?: string; pin?: string; date?: string; check_in_time?: string; check_out_time?: string; time_worked?: string; type?: string; last_modified_by?: string };

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
  updateMyPin: (pin: string) => tapTimeFetch('/me/pin', z.any(), { method: 'PATCH', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ pin }) }),
  myReports: (params: URLSearchParams) => tapTimeFetch(`/me/reports?${params}`, z.object({ items: z.array(z.any()) })),
  myPending: () => tapTimeFetch('/me/pending-checkouts', z.object({ items: z.array(z.any()) })),
  schoolReports: (params: URLSearchParams) => tapTimeFetch(`/reports?${params}`, z.object({ items: z.array(z.any()) })),
  pending: () => tapTimeFetch('/pending-checkouts', z.object({ items: z.array(z.any()) })),
  employmentTypes: () => tapTimeFetch('/attendance/employment-types', z.object({ items: z.array(z.string()) })),
  correctReport: (empId: string, body: { original_check_in_time: string; check_in_time: string; check_out_time: string | null; type_id: string | null }) =>
    tapTimeFetch(`/attendance/reports/${encodeURIComponent(empId)}`, z.any(), { method: 'PATCH', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  deleteReport: (empId: string, originalCheckInTime: string) =>
    tapTimeFetch(`/attendance/reports/${encodeURIComponent(empId)}`, z.any(), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ original_check_in_time: originalCheckInTime }) }),
  createManualReport: (body: Record<string, unknown>) => tapTimeFetch('/attendance/reports', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  updateManualReport: (body: Record<string, unknown>) => tapTimeFetch('/attendance/reports', z.any(), { method: 'PATCH', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  recipients: () => tapTimeFetch('/report-settings/recipients', z.object({ items: z.array(z.any()) })),
  createRecipient: (body: Record<string, unknown>) => tapTimeFetch('/report-settings/recipients', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  updateRecipient: (email: string, body: Record<string, unknown>) => tapTimeFetch(`/report-settings/recipients/${encodeURIComponent(email)}`, z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body) }),
  deleteRecipient: (email: string) => tapTimeFetch(`/report-settings/recipients/${encodeURIComponent(email)}`, z.any(), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  viewFrequency: () => tapTimeFetch('/report-settings/view-frequency', z.object({ frequency: z.string(), salary_report_start_date: z.string().or(z.null()).transform(v => v || '') })),
  updateViewFrequency: (frequency: string, salary_report_start_date?: string) => tapTimeFetch('/report-settings/view-frequency', z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ frequency, salary_report_start_date }) }),
  weeklyNotifications: () => tapTimeFetch('/report-settings/weekly-notifications', z.object({ enabled: z.boolean() })),
  setWeeklyNotifications: (enabled: boolean) => tapTimeFetch('/report-settings/weekly-notifications', z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ enabled }) }),
  companyCC: () => tapTimeFetch('/report-settings/company-cc', z.object({ items: z.array(z.any()) })),
  addCompanyCC: (cc_email: string) => tapTimeFetch('/report-settings/company-cc', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ cc_email }) }),
  removeCompanyCC: (ccId: string) => tapTimeFetch(`/report-settings/company-cc/${encodeURIComponent(ccId)}`, z.any(), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  checkinReminder: () => tapTimeFetch('/report-settings/checkin-reminder', z.object({ enabled: z.boolean() })),
  setCheckinReminder: (enabled: boolean) => tapTimeFetch('/report-settings/checkin-reminder', z.any(), { method: 'PUT', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ enabled }) }),
  checkinRecipients: () => tapTimeFetch('/report-settings/checkin-reminder/recipients', z.object({ to: z.array(z.object({ id: z.string(), email: z.string() })), cc: z.array(z.object({ id: z.string(), email: z.string() })) })),
  addCheckinRecipient: (email: string, recipient_type: 'to' | 'cc') => tapTimeFetch('/report-settings/checkin-reminder/recipients', z.any(), { method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ email, recipient_type }) }),
  removeCheckinRecipient: (recipientId: string) => tapTimeFetch(`/report-settings/checkin-reminder/recipients/${encodeURIComponent(recipientId)}`, z.any(), { method: 'DELETE', headers: { 'Idempotency-Key': crypto.randomUUID() } }),
  salaryReportCurrent: () => tapTimeFetch('/salary-report/current', z.any()),
  salaryReportHistory: () => tapTimeFetch('/salary-report/history', z.any()),
  salaryReportPeriod: (start_date: string, end_date: string) => tapTimeFetch(`/salary-report/period?start_date=${start_date}&end_date=${end_date}`, z.any()),
};
