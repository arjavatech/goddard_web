import { authedFetch, z } from './common';

const AdminNavCountsSchema = z.object({
  student_forms_due: z.number(),
  student_forms_review: z.number(),
  employee_forms_due: z.number(),
  employee_forms_review: z.number(),
  student_docs_review: z.number(),
  employee_docs_review: z.number(),
});

export type AdminNavCounts = z.infer<typeof AdminNavCountsSchema>;

const MyNavCountsSchema = z.object({
  forms_pending: z.number(),
  docs_pending: z.number(),
});

export type MyNavCounts = z.infer<typeof MyNavCountsSchema>;

export async function fetchAdminNavCounts(): Promise<AdminNavCounts> {
  return authedFetch({ method: 'GET', url: '/nav-counts' }, AdminNavCountsSchema);
}

export async function fetchMyNavCounts(): Promise<MyNavCounts> {
  return authedFetch({ method: 'GET', url: '/my-nav-counts' }, MyNavCountsSchema);
}
