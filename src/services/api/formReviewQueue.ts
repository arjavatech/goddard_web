import { authedFetch, z } from './common';

export type ReviewQueueItem = {
  assignmentId: string;
  schoolId: string;
  formTemplateId: string;
  formName: string;
  filloutFormId?: string;
  status: string;
  submittedAt: string;
  recentEditLink?: string;
  recentPdfLink?: string;
  studentName?: string;
  parentName?: string;
  parentEmail?: string;
  classroomId?: string;
  classroomName?: string;
  employeeId?: string;
  employeeName?: string;
  employeeEmail?: string;
};

type ReviewQueueOptions = {
  schoolId: string;
  classroomId?: string;
  formTemplateId?: string;
  search?: string;
  sortBy?: 'name' | 'date';
  sortDirection?: 'asc' | 'desc';
};

const mapItem = (item: any, kind: 'student' | 'employee'): ReviewQueueItem => ({
  assignmentId: item.assignment_id,
  schoolId: item.school_id,
  formTemplateId: item.form_template_id,
  formName: item.form_name,
  filloutFormId: item.fillout_form_id,
  status: item.status,
  submittedAt: item.submitted_at,
  recentEditLink: item.recent_edit_link,
  recentPdfLink: item.recent_pdf_link,
  ...(kind === 'student' ? {
    studentName: `${item.student_first_name} ${item.student_last_name}`.trim(),
    parentName: `${item.parent_first_name} ${item.parent_last_name}`.trim(),
    parentEmail: item.parent_email,
    classroomId: item.classroom_id,
    classroomName: item.classroom_name || 'Unassigned',
  } : {
    employeeId: item.employee_id,
    employeeName: `${item.employee_first_name} ${item.employee_last_name}`.trim(),
    employeeEmail: item.employee_email,
  }),
});

async function fetchQueue(kind: 'student' | 'employee', options: ReviewQueueOptions): Promise<ReviewQueueItem[]> {
  const params = new URLSearchParams({ school_id: options.schoolId });
  if (options.classroomId) params.set('classroom_id', options.classroomId);
  if (options.formTemplateId) params.set('form_template_id', options.formTemplateId);
  if (options.search) params.set('search', options.search);
  if (options.sortBy) params.set('sort_by', options.sortBy);
  if (options.sortDirection) params.set('sort_direction', options.sortDirection);
  const path = kind === 'student' ? '/student-form-assignments/review-queue' : '/employee-form-assignments/review-queue';
  const data = await authedFetch({ method: 'GET', url: `${path}?${params}` }, z.array(z.any()));
  return data.map((item: any) => mapItem(item, kind));
}

export const fetchStudentFormReviewQueue = (options: ReviewQueueOptions) => fetchQueue('student', options);
export const fetchEmployeeFormReviewQueue = (options: ReviewQueueOptions) => fetchQueue('employee', options);
