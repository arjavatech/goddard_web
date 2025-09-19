import { authedFetch, z } from './common';
export type EnrollmentChild = {
  childId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  formStatus: string | null;
  forms: Record<string, string>;
  primaryEmail: string | null;
  additionalParentEmail: string | null;
};
export type FormTemplate = {
  id: string;
  schoolId: string | null;
  formName: string;
  status: string | null;
  formType: string | null;
  filloutFormUrl: string | null;
  isRequired: boolean | null;
  createdAt: string | null;
};
const enrollmentChildSchema = z.object({
  child_id: z.union([z.string(), z.number()]),
  child_first_name: z.string(),
  child_last_name: z.string(),
  class_name: z.string().nullable().optional(),
  form_status: z.string().nullable().optional(),
  forms: z.record(z.string()).nullable().optional(),
  primary_email: z.string().nullable().optional(),
  additional_parent_email: z.string().nullable().optional()
});
const formTemplateSchema = z.object({
  id: z.string(),
  school_id: z.string().nullable().optional(),
  form_name: z.string(),
  status: z.string().nullable().optional(),
  form_type: z.string().nullable().optional(),
  fillout_form_url: z.string().nullable().optional(),
  is_required: z.boolean().nullable().optional(),
  created_at: z.string().nullable().optional()
});
export async function fetchEnrollmentChildren(schoolId: string): Promise<EnrollmentChild[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/enrollments/children-forms?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(enrollmentChildSchema));
  return data.map(child => ({
    childId: String(child.child_id),
    firstName: child.child_first_name,
    lastName: child.child_last_name,
    className: child.class_name ?? null,
    formStatus: child.form_status ?? null,
    forms: child.forms ?? {},
    primaryEmail: child.primary_email ?? null,
    additionalParentEmail: child.additional_parent_email ?? null
  }));
}
export async function fetchFormTemplates(schoolId: string): Promise<FormTemplate[]> {
  const data = await authedFetch({
    method: 'GET',
    url: `/form-templates?school_id=${encodeURIComponent(schoolId)}`
  }, z.array(formTemplateSchema));
  return data.map(template => ({
    id: template.id,
    schoolId: template.school_id ?? null,
    formName: template.form_name,
    status: template.status ?? null,
    formType: template.form_type ?? null,
    filloutFormUrl: template.fillout_form_url ?? null,
    isRequired: template.is_required ?? null,
    createdAt: template.created_at ?? null
  }));
}
