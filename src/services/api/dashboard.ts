import { authedFetch, z } from './common';
export type EnrollmentChild = {
  dob: string | null | undefined;
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
  child_id: z.string(),
  child_full_name: z.string(),
  child_dob: z.string().optional(),
  classroom_name: z.string().optional(),
  enrollment_id: z.string().optional(),
  forms: z.array(z.object({
    form_id: z.string(),
    form_name: z.string(),
    status: z.string(),
    is_required: z.boolean()
  })).optional(),
  form_status: z.string().optional(),
  primary_email: z.string().optional(),
  additional_parent_email: z.string().optional()
});
export async function fetchEnrollmentChildren(schoolId: string): Promise<EnrollmentChild[]> {
  try {
    if (!schoolId || !schoolId.trim()) {
      throw new Error('School ID is required to fetch enrollment children');
    }
    const data = await authedFetch({
      method: 'GET',
      // url: `/enrollments/children-forms?school_id=${encodeURIComponent(schoolId)}`
      url: `/enrollments/children-forms`
    }, z.any());
    console.log('Raw enrollment children response:', data);

    // Handle various response formats
    let children: any[] = [];
    if (Array.isArray(data)) {
      children = data;
    } else if (data && typeof data === 'object') {
      // Handle wrapped responses
      children = data.data || data.children || data.enrollments || [];
    } else {
      console.warn('Enrollment children response is not in expected format:', data);
      return [];
    }
    if (!Array.isArray(children)) {
      console.warn('Enrollment children data is not an array:', children);
      return [];
    }
    const processedChildren: EnrollmentChild[] = [];
    for (const child of children) {
      if (!child || typeof child !== 'object') continue;
      const parseResult = enrollmentChildSchema.safeParse(child);
      if (!parseResult.success) {
        console.warn('Invalid child record, skipping:', child, parseResult.error);
        continue;
      }
      const validChild = parseResult.data;
      const [firstName = '', lastName = ''] = validChild.child_full_name.split(' ');
      const formsObject: Record<string, string> = {};
      if (validChild.forms) {
        validChild.forms.forEach(form => {
          formsObject[form.form_name] = form.status;
        });
      }
      processedChildren.push({
        childId: validChild.child_id,
        firstName,
        lastName,
        dob: validChild.child_dob ?? null,
        className: validChild.classroom_name ?? null,
        formStatus: null,
        forms: formsObject,
        primaryEmail: null,
        additionalParentEmail: null
      });
    }
    return processedChildren;
  } catch (error) {
    console.error('Failed to fetch enrollment children:', error);

    // Re-throw authentication and validation errors
    if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('School ID is required'))) {
      throw error;
    }

    // For other errors, throw a user-friendly message
    throw new Error('Unable to load enrollment data. Please try again later.');
  }
}
export async function fetchFormTemplates(schoolId: string): Promise<FormTemplate[]> {
  try {
    if (!schoolId || !schoolId.trim()) {
      console.warn('Invalid school ID provided to fetchFormTemplates');
      return [];
    }
    const data = await authedFetch({
      method: 'GET',
      url: `/form-templates?school_id=552f99ff-4a34-db78-6f16-32a5fb72bedc`
    }, z.any());
    console.log('Raw form templates response:', data);

    // Handle various response formats
    let templates: any[] = [];
    if (Array.isArray(data)) {
      templates = data;
    } else if (data && typeof data === 'object') {
      // Handle wrapped responses like { data: [...] } or { templates: [...] }
      templates = data.data || data.templates || data.forms || [];
    } else {
      console.warn('Form templates response is not in expected format:', data);
      return [];
    }
    if (!Array.isArray(templates)) {
      console.warn('Form templates data is not an array:', templates);
      return [];
    }
    return templates.filter(template => template && typeof template === 'object').map(template => {
      const normalized: FormTemplate = {
        id: String(template.id || template.form_id || template.templateId || ''),
        schoolId: template.school_id || template.schoolId || null,
        formName: template.form_name || template.formName || template.name || '',
        status: template.status || null,
        formType: template.form_type || template.formType || template.type || null,
        filloutFormUrl: template.fillout_form_url || template.filloutFormUrl || template.url || null,
        isRequired: template.is_required ?? template.isRequired ?? null,
        createdAt: template.created_at || template.createdAt || template.dateCreated || null
      };

      // Validate required fields
      if (!normalized.id || !normalized.formName) {
        console.warn('Skipping invalid form template:', template);
        return null;
      }
      return normalized;
    }).filter((template): template is FormTemplate => template !== null);
  } catch (error) {
    console.error('Failed to fetch form templates:', error);

    // Re-throw authentication errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      throw error;
    }

    // Return empty array for other errors to allow graceful degradation
    return [];
  }
}