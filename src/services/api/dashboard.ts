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
  child_id: z.string().optional(),
  childId: z.string().optional(),
  id: z.string().optional(),
  child_full_name: z.string().optional(),
  full_name: z.string().optional(),
  name: z.string().optional(),
  first_name: z.string().optional(),
  firstName: z.string().optional(),
  last_name: z.string().optional(),
  lastName: z.string().optional(),
  child_dob: z.string().optional(),
  dob: z.string().optional(),
  date_of_birth: z.string().optional(),
  classroom_name: z.string().optional(),
  class_name: z.string().optional(),
  classroom: z.string().optional(),
  enrollment_id: z.string().optional(),
  enrollmentId: z.string().optional(),
  forms: z.array(z.object({
    form_id: z.string().optional(),
    form_name: z.string(),
    status: z.string(),
    is_required: z.boolean().optional()
  })).optional(),
  form_status: z.string().optional(),
  formStatus: z.string().optional(),
  status: z.string().optional(),
  primary_email: z.string().optional(),
  additional_parent_email: z.string().optional()
}).passthrough();
export async function fetchEnrollmentChildren(schoolId: string, parentId?: string): Promise<EnrollmentChild[]> {
  try {
    if (!schoolId || !schoolId.trim()) {
      throw new Error('School ID is required to fetch enrollment children');
    }
    
    console.log('Fetching enrollment children for school ID:', schoolId, 'parent ID:', parentId);
    
    // Try multiple endpoints to get parent's children
    const endpoints = [
      parentId ? `/parents/${encodeURIComponent(parentId)}/children` : null,
      parentId && parentId.includes('@') ? `/enrollments?parent_email=${encodeURIComponent(parentId)}` : null,
      `/enrollments?school_id=${encodeURIComponent(schoolId)}`,
      `/enrollments/children-forms?school_id=${encodeURIComponent(schoolId)}`
    ].filter(Boolean);
    
    let data = null;
    let lastError = null;
    
    for (const url of endpoints) {
      try {
        console.log('🔄 Trying API endpoint:', url);
        data = await authedFetch({
          method: 'GET',
          url: url!
        }, z.any());
        console.log('✅ Success with endpoint:', url);
        console.log('📊 Response data:', data);
        break;
      } catch (error) {
        console.log('❌ Failed with endpoint:', url);
        console.log('📋 Error details:', error);
        lastError = error;
        continue;
      }
    }
    
    if (!data) {
      console.error('🚫 No data received from any API endpoint');
      throw lastError || new Error('All API endpoints failed');
    }
    
    console.log('📊 Raw enrollment children response:', JSON.stringify(data, null, 2));
    console.log('🔍 Response type:', typeof data);
    console.log('📜 Is array:', Array.isArray(data));
    console.log('📈 Data keys:', data && typeof data === 'object' ? Object.keys(data) : 'N/A');

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
      
      console.log('Raw child data:', child);
      
      const parseResult = enrollmentChildSchema.safeParse(child);
      if (!parseResult.success) {
        console.warn('Schema validation failed, but continuing with raw data:', parseResult.error);
        // Continue with raw data if schema fails
      }
      
      const validChild = parseResult.success ? parseResult.data : child;
      
      // Extract child ID from various possible fields
      const childId = validChild.child_id || validChild.childId || validChild.id || '';
      
      // Extract names from various possible fields
      const fullName = validChild.child_full_name || validChild.full_name || validChild.name || 
                      `${validChild.first_name || validChild.firstName || ''} ${validChild.last_name || validChild.lastName || ''}`.trim();
      
      const firstName = validChild.first_name || validChild.firstName || fullName.split(' ')[0] || '';
      const lastName = validChild.last_name || validChild.lastName || fullName.split(' ').slice(1).join(' ') || '';
      
      // Extract other fields
      const dob = validChild.child_dob || validChild.dob || validChild.date_of_birth;
      const className = validChild.classroom_name || validChild.class_name || validChild.classroom;
      const formStatus = validChild.form_status || validChild.formStatus || validChild.status;
      
      console.log('Processing child:', {
        childId,
        fullName,
        firstName,
        lastName,
        dob,
        className,
        formStatus,
        forms: validChild.forms
      });
      
      // Skip if no valid child ID or name
      if (!childId || (!firstName && !fullName)) {
        console.warn('Skipping child with missing ID or name:', validChild);
        continue;
      }
      const formsObject: Record<string, string> = {};
      if (validChild.forms && Array.isArray(validChild.forms)) {
        validChild.forms.forEach((form: any) => {
          const formName = form?.form_name || form?.formName || form?.name;
          if (form && formName) {
            formsObject[formName] = form.status || 'Unknown';
          }
        });
      }
      
      processedChildren.push({
        childId,
        firstName,
        lastName,
        dob: dob ?? null,
        className: className ?? null,
        formStatus: formStatus ?? null,
        forms: formsObject,
        primaryEmail: validChild.primary_email ?? null,
        additionalParentEmail: validChild.additional_parent_email ?? null
      });
    }
    console.log('Processed children count:', processedChildren.length);
    
    // If no children found and we used parent endpoint, try fallback to school endpoint
    if (processedChildren.length === 0 && parentId) {
      console.log('No children found with parent endpoint, trying school endpoint as fallback...');
      return fetchEnrollmentChildren(schoolId); // Recursive call without parentId
    }
    

    
    return processedChildren;
  } catch (error) {
    console.error('Failed to fetch enrollment children:', error);

    // Re-throw authentication and validation errors
    if (error instanceof Error && (error.message.includes('Authentication') || error.message.includes('School ID is required'))) {
      throw error;
    }

    // If we were trying parent endpoint and it failed, try school endpoint
    if (parentId && error instanceof Error && (error as any).status === 404) {
      console.log('Parent endpoint failed, trying school endpoint as fallback...');
      try {
        return fetchEnrollmentChildren(schoolId); // Recursive call without parentId
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
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
      url: `/form-templates?school_id=${encodeURIComponent(schoolId)}`
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
    const processedTemplates = templates.filter(template => template && typeof template === 'object').map(template => {
      const normalized: FormTemplate = {
        id: String(template.id || template.form_id || template.templateId || ''),
        schoolId: template.school_id || template.schoolId || null,
        formName: template.form_name || template.formName || template.name || '',
        status: template.status || null,
        formType: template.form_type || template.formType || template.type || null,
        filloutFormUrl: template.fillout_form_id || template.fillout_form_id || template.fillout_form_id || null,
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
    

    
    return processedTemplates;
  } catch (error) {
    console.error('Failed to fetch form templates:', error);

    // Re-throw authentication errors
    if (error instanceof Error && error.message.includes('Authentication')) {
      throw error;
    }

    return [];
  }
}