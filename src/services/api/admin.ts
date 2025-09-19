import { authedFetch, z } from './common';

export type Classroom = {
  id: string;
  name: string;
};

export type ClassEnrollmentStat = {
  classId: string;
  className: string;
  studentCount: number;
  forms: Record<string, string>;
  defaultFormSetId: string | null;
};

export type ParentDetail = {
  parentId: string;
  email: string;
  isSigned: boolean;
  createdAt: string | null;
};

export type SchoolEnrollment = {
  childId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  formStatus: string | null;
  primaryEmail: string | null;
  additionalParentEmail: string | null;
  forms: Record<string, string>;
};

export type StudentFormAssignment = {
  id: string;
  childId: string;
  enrollmentId: string;
  formTemplateId: string;
  status: string | null;
  isRequired: boolean | null;
  assignmentSource: string | null;
  assignedAt: string | null;
  schoolId: string | null;
};

const classroomSchema = z.object({
  id: z.string(),
  class_name: z.string()
});

const classEnrollmentSchema = z.object({
  class_id: z.union([z.string(), z.number()]),
  class_name: z.string(),
  count: z.number().int().nonnegative(),
  forms: z.record(z.string()).nullable().optional(),
  default_forms: z.string().nullable().optional()
});

const parentDetailSchema = z.object({
  parent_id: z.string(),
  parent_email: z.string(),
  id_signed: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional()
});

const schoolEnrollmentSchema = z.object({
  child_id: z.union([z.string(), z.number()]),
  child_first_name: z.string(),
  child_last_name: z.string(),
  class_name: z.string().nullable().optional(),
  form_status: z.string().nullable().optional(),
  primary_email: z.string().nullable().optional(),
  additional_parent_email: z.string().nullable().optional(),
  forms: z.record(z.string()).nullable().optional()
});

const studentFormAssignmentSchema = z.object({
  id: z.string(),
  child_id: z.string(),
  enrollment_id: z.string(),
  form_template_id: z.string(),
  status: z.string().nullable().optional(),
  is_required: z.boolean().nullable().optional(),
  assignment_source: z.string().nullable().optional(),
  assigned_at: z.string().nullable().optional(),
  school_id: z.string().nullable().optional()
});

export async function fetchClassrooms(schoolId: string): Promise<Classroom[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/classrooms?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(classroomSchema));

  return data.map(item => ({
    id: item.id,
    name: item.class_name
  }));
}

export async function fetchClassEnrollmentStats(schoolId: string): Promise<ClassEnrollmentStat[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/enrollments/class-wise-count?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(classEnrollmentSchema));

  return data.map(item => ({
    classId: String(item.class_id),
    className: item.class_name,
    studentCount: item.count,
    forms: item.forms ?? {},
    defaultFormSetId: item.default_forms ?? null
  }));
}

export async function fetchParentDetails(schoolId: string): Promise<ParentDetail[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/parents/details?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(parentDetailSchema));

  return data.map(item => ({
    parentId: item.parent_id,
    email: item.parent_email,
    isSigned: item.id_signed ?? false,
    createdAt: item.created_at ?? null
  }));
}

export async function fetchSchoolEnrollments(schoolId: string): Promise<SchoolEnrollment[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/enrollments/school-forms?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(schoolEnrollmentSchema));

  return data.map(item => ({
    childId: String(item.child_id),
    firstName: item.child_first_name,
    lastName: item.child_last_name,
    className: item.class_name ?? null,
    formStatus: item.form_status ?? null,
    primaryEmail: item.primary_email ?? null,
    additionalParentEmail: item.additional_parent_email ?? null,
    forms: item.forms ?? {}
  }));
}

export async function fetchStudentFormAssignments(schoolId: string): Promise<StudentFormAssignment[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/student-form-assignments?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(studentFormAssignmentSchema));

  return data.map(item => ({
    id: item.id,
    childId: item.child_id,
    enrollmentId: item.enrollment_id,
    formTemplateId: item.form_template_id,
    status: item.status ?? null,
    isRequired: item.is_required ?? null,
    assignmentSource: item.assignment_source ?? null,
    assignedAt: item.assigned_at ?? null,
    schoolId: item.school_id ?? null
  }));
}
