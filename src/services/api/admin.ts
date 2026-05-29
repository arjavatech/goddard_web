import { authedFetch, z } from './common';


export type Classroom = {
  id: string;
  name: string;
  studentsCount: number;
  formsCount: number;
  assignedForms: {
    id: string;
    name: string;
    status: string;
  }[];
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
  firstName?: string;
  lastName?: string;
  signedStatus: string;
  createdAt: string | null;
  parentType?: string;
  additional_first_name?: string;
  additional_last_name?: string;
  additional_email?: string;
  otherParent?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    parentType?: string;
  } | null;
  children?: {
    childId: string;
    childFullName: string;
    childDob?: string;
    childStatus?: string;
    classroomId?: string;
    classroomName?: string;
    enrollmentId: string;
    forms: {
      formId: string;
      formName: string;
      status: string;
      isRequired: boolean;
      filloutFormId: string;
      studentFormAssignmentId: string;
      recent_edit_link?: string | null;
      recent_pdf_link?: string | null;
      approved_by?: string | null;
      approved_on?: string | null;
      assigned_at?: string | null;
      due_date?: string | null;
    }[];
  }[];
};
export type SchoolEnrollment = {
  dob: string;
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
// const classroomSchema = z.object({
//   classroom_id: z.string().optional(),
//   classroom_name: z.string().optional(),
//   total_children: z.number().optional()
// });
// const classEnrollmentSchema = z.object({
//   class_id: z.union([z.string(), z.number()]).optional(),
//   class_name: z.string().optional(),
//   count: z.number().int().nonnegative().optional(),
//   forms: z.record(z.string()).nullable().optional(),
//   default_forms: z.string().nullable().optional()
// });
// const parentDetailSchema = z.object({
//   parent_id: z.string(),
//   parent_email: z.string(),
//   parent_first_name: z.string().optional(),
//   parent_last_name: z.string().optional(),
//   children: z.array(z.object({
//     child_id: z.string(),
//     child_full_name: z.string(),
//     child_dob: z.string().optional(),
//     classroom_id: z.string().optional(),
//     classroom_name: z.string().optional(),
//     enrollment_id: z.string(),
//     forms: z.array(z.object({
//       form_id: z.string(),
//       form_name: z.string(),
//       status: z.string(),
//       is_required: z.boolean()
//     }))
//   }))
// });
// const schoolEnrollmentSchema = z.object({
//   child_id: z.union([z.string(), z.number()]).optional(),
//   child_first_name: z.string().optional(),
//   child_last_name: z.string().optional(),
//   class_name: z.string().nullable().optional(),
//   form_status: z.string().nullable().optional(),
//   primary_email: z.string().nullable().optional(),
//   additional_parent_email: z.string().nullable().optional(),
//   forms: z.record(z.string()).nullable().optional()
// });
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
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/classrooms?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    console.log('Raw classrooms response:', data);
    const classroomsArray = data.classrooms || data;
    if (!Array.isArray(classroomsArray)) {
      console.warn('Classrooms response is not an array:', classroomsArray);
      return [];
    }
    return classroomsArray.map((item, index) => {
      const assignedFormsRaw = item.assigned_forms || item.assignedForms || [];
      const assignedForms = assignedFormsRaw.map((form: any, formIndex: number) => {
        if (typeof form === 'string') {
          return {
            id: `${form}-${formIndex}`,
            name: form.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            status: 'Active'
          };
        }
        return {
          id: form.id || `form-${formIndex}`,
          name: form.name || form,
          status: form.status || 'Active'
        };
      });
      return {
        id: item.id || item.classroom_id || `classroom-${index}`,
        name: item.name || item.class_name || item.classroom_name || `Classroom ${index + 1}`,
        studentsCount: item.student_count || item.studentsCount || item.total_children || 0,
        formsCount: assignedForms.length,
        assignedForms
      };
    });
  } catch (error) {
    console.error('fetchClassrooms error:', error);
    return [];
  }
}
export async function fetchClassEnrollmentStats(schoolId: string): Promise<ClassEnrollmentStat[]> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/enrollments/class-wise-count?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());

    if (typeof data === 'string') {
      console.warn('API returned string for class enrollment stats:', data);
      return [];
    }

    // Handle both {classes: [...]} and direct array response
    const classesArray = data.classes || data;

    if (!Array.isArray(classesArray)) {
      console.warn('Class enrollment stats response is not an array:', classesArray);
      return [];
    }

    return classesArray.map(item => ({
      classId: item.class_id ? String(item.class_id) : '',
      className: item.class_name ?? '',
      studentCount: item.count ?? 0,
      forms: item.forms ?? {},
      defaultFormSetId: item.default_forms ?? null
    }));
  } catch (error) {
    console.error('fetchClassEnrollmentStats error:', error);
    return [];
  }
}


export async function fetchParentDetails(schoolId: string): Promise<{ activeParents: ParentDetail[], inactiveParents: ParentDetail[] }> {
  try {
    console.log('Fetching parent details for school ID:', schoolId);
    const data = await authedFetch({
      method: 'GET',
      url: `/parent/details?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    console.log('Raw parent details response:', data);
    if (typeof data === 'string') {
      console.warn('API returned string for parent details:', data);
      return { activeParents: [], inactiveParents: [] };
    }

    // Helper function to map parent data
    const mapParentData = (item: any): ParentDetail => ({
      parentId: item.parent_id || item.parentId || '',
      email: item.parent_email || item.email || '',
      firstName: item.parent_first_name || item.firstName,
      lastName: item.parent_last_name || item.lastName,
      signedStatus: item.signed_status || 'not signed',
      createdAt: item.created_at || item.createdAt || null,
      children: (item.children || []).map((child: any) => ({
        childId: child.child_id || child.childId || '',
        childFullName: child.child_full_name || child.childFullName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        childDob: child.child_dob || child.childDob,
        childStatus: child.child_status || child.childStatus || 'active',
        classroomId: child.classroom_id || child.classroomId,
        classroomName: child.classroom_name || child.classroomName,
        enrollmentId: child.enrollment_id || child.enrollmentId || '',
        primaryParentEmail: child.primary_parent_email || child.primaryParentEmail || null,
        primaryParentFirstName: child.primary_parent_first_name || child.primaryParentFirstName || null,
        primaryParentLastName: child.primary_parent_last_name || child.primaryParentLastName || null,
        secondaryParentEmail: child.secondary_parent_email || child.secondaryParentEmail || null,
        secondaryParentFirstName: child.secondary_parent_first_name || child.secondaryParentFirstName || null,
        secondaryParentLastName: child.secondary_parent_last_name || child.secondaryParentLastName || null,
        forms: (child.forms || []).map((form: any) => ({
          formId: form.form_id || form.formId || '',
          formName: form.form_name || form.formName || '',
          status: form.status || 'In Progress',
          isRequired: form.is_required || form.isRequired || false,
          filloutFormId: form.fillout_form_id || form.filloutFormId || '',
          studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || '',
          recent_edit_link: form.recent_edit_link || null,
          recent_pdf_link: form.recent_pdf_link || null,
          approved_by: form.approved_by || null,
          approved_on: form.approved_on || null,
          assigned_at: form.assigned_at || null,
          due_date: form.due_date || null
        }))
      }))
    });

    // Handle new response format with active_parents and inactive_parents
    if (data.active_parents !== undefined || data.inactive_parents !== undefined) {
      const activeParents = Array.isArray(data.active_parents) ? data.active_parents.map(mapParentData) : [];
      const inactiveParents = Array.isArray(data.inactive_parents) ? data.inactive_parents.map(mapParentData) : [];
      console.log('Processed parent details (new format):', { activeParents, inactiveParents });
      return { activeParents, inactiveParents };
    }

    // Fallback for old format (simple array)
    if (Array.isArray(data)) {
      const activeParents = data.map(mapParentData);
      console.log('Processed parent details (legacy format):', { activeParents, inactiveParents: [] });
      return { activeParents, inactiveParents: [] };
    }

    console.warn('Parent details response has unexpected format:', data);
    return { activeParents: [], inactiveParents: [] };
  } catch (error) {
    console.error('fetchParentDetails error:', error);
    return { activeParents: [], inactiveParents: [] };
  }
}
// export async function reviewStudentFormAssignment(
//   assignmentId: string,
//   status: 'approved' | 'rejected',
//   notes: string,
//   reviewerId: string
// ): Promise<void> {
//   await authedFetch({
//     method: 'PUT',
//     url: `/student-form-assignments/${encodeURIComponent(assignmentId)}/review`,
//     body: {
//       status,
//       notes,
//       reviewer_id: reviewerId
//     }
//   }, z.any());
// }
export async function fetchStudentEnrollments(schoolId: string): Promise<any> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/enrollments?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    return data;
  } catch (error) {
    console.error('fetchStudentEnrollments error:', error);
    return { enrollments: [] };
  }
}

export async function fetchSingleParent(parentId: string, schoolId: string): Promise<ParentDetail | null> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/parent/${encodeURIComponent(parentId)}?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    if (!data) return null;
    return {
      parentId: data.parent_id || data.parentId || '',
      email: data.parent_email || data.email || '',
      firstName: data.parent_first_name || data.firstName,
      lastName: data.parent_last_name || data.lastName,
      signedStatus: data.signed_status || 'not signed',
      createdAt: data.created_at || data.createdAt || null,
      parentType: data.parent_type || data.parentType || 'primary_parent',
      additional_first_name: data.additional_first_name || data.additionalFirstName,
      additional_last_name: data.additional_last_name || data.additionalLastName,
      additional_email: data.additional_email || data.additionalEmail,
      otherParent: data.other_parent ? {
        firstName: data.other_parent.first_name || data.other_parent.firstName,
        lastName: data.other_parent.last_name || data.other_parent.lastName,
        email: data.other_parent.email,
        parentType: data.other_parent.parent_type || data.other_parent.parentType || 'secondary_parent'
      } : null,
      children: (data.children || []).map((child: any) => ({
        childId: child.child_id || child.childId || '',
        childFullName: child.child_full_name || child.childFullName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        childDob: child.child_dob || child.childDob,
        childStatus: child.child_status || child.childStatus || 'active',
        classroomId: child.classroom_id || child.classroomId,
        classroomName: child.classroom_name || child.classroomName,
        enrollmentId: child.enrollment_id || child.enrollmentId || '',
        parentType: child.parent_type || child.parentType,
        forms: (child.forms || []).map((form: any) => ({
          formId: form.form_id || form.formId || '',
          formName: form.form_name || form.formName || '',
          status: form.status || 'In Progress',
          isRequired: form.is_required || form.isRequired || false,
          filloutFormId: form.fillout_form_id || form.filloutFormId || '',
          studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || '',
          recent_edit_link: form.recent_edit_link || null,
          recent_pdf_link: form.recent_pdf_link || null,
          approved_by: form.approved_by || null,
          approved_on: form.approved_on || null,
          assigned_at: form.assigned_at || null,
          due_date: form.due_date || null,
          updated_at: form.updated_at || null,
          created_at: form.created_at || null
        }))
      }))
    };
  } catch (error) {
    console.error('fetchSingleParent error:', error);
    return null;
  }
}
export async function fetchSchoolEnrollments(schoolId: string): Promise<SchoolEnrollment[]> {
  try {
    console.log('Fetching enrollments for school ID:', schoolId);
    const data = await authedFetch({
      method: 'GET',
      url: `/form-templates?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    console.log('Raw enrollments response:', data);
    if (typeof data === 'string') {
      console.warn('API returned string for school enrollments:', data);
      return [];
    }
    if (!Array.isArray(data)) {
      console.warn('School enrollments response is not an array:', data);
      return [];
    }
    return data.map(item => ({
      childId: String(item.child_id || item.childId || ''),
      firstName: item.child_first_name || item.firstName || '',
      lastName: item.child_last_name || item.lastName || '',
      dob: item.child_dob || item.dob || '',
      className: item.class_name || item.className || null,
      formStatus: item.form_status || item.formStatus || null,
      primaryEmail: item.primary_email || item.primaryEmail || null,
      additionalParentEmail: item.additional_parent_email || item.additionalParentEmail || null,
      forms: item.forms || {}
    }));
  } catch (error) {
    console.error('fetchSchoolEnrollments error:', error);
    return [];
  }
}
export async function fetchStudentFormAssignments(schoolId: string): Promise<StudentFormAssignment[]> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/student-form-assignments?school_id=${encodeURIComponent(schoolId)}`
    }, z.union([z.array(studentFormAssignmentSchema), z.string()]));
    if (typeof data === 'string') {
      console.warn('API returned string for student form assignments:', data);
      return [];
    }
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
  } catch (error) {
    console.error('fetchStudentFormAssignments error:', error);
    return [];
  }
}
export async function renameClassroom(classroomId: string, newName: string, schoolId: string): Promise<void> {
  // Find the classroom by name since we don't have proper UUIDs
  const classrooms = await fetchClassEnrollmentStats(schoolId);
  const classroom = classrooms.find(c => c.classId === classroomId || c.className === classroomId);

  await authedFetch({
    method: 'PUT',
    url: '/classrooms',
    body: {
      school_id: schoolId,
      class_id: classroom?.classId && classroom.classId !== '' ? classroom.classId : crypto.randomUUID(),
      class_name: newName
    }
  }, z.object({}));
}
export async function deleteClassroom(classroomId: string, schoolId: string): Promise<void> {
  console.log(classroomId);
  console.log(schoolId);
  await authedFetch({
    method: 'DELETE',
    url: `/classrooms?classroom_id=${classroomId}&school_id=${schoolId}`
  }, z.object({}));
}
export async function deleteForm(formId: string, schoolId: string): Promise<void> {
  // Check if formId is a valid UUID, if not generate one
  const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(formId);
  const validFormId = isValidUUID ? formId : crypto.randomUUID();

  await authedFetch({
    method: 'DELETE',
    url: `/form-templates?form_id=${encodeURIComponent(validFormId)}&school_id=${encodeURIComponent(schoolId)}`
  }, z.object({}));
}
export async function createFormTemplate(formName: string, filloutFormId: string, schoolId: string, dueDate: string, status?: string): Promise<void> {
  const body: any = {
    id: crypto.randomUUID(),
    school_id: schoolId,
    form_name: formName,
    fillout_form_id: filloutFormId,
    due_date: dueDate
  };

  if (status) {
    body.status = status;
  }

  await authedFetch({
    method: 'POST',
    url: '/form-templates',
    body
  }, z.object({}));
}
export async function updateFormTemplate(formId: string, formName: string, filloutFormId: string, schoolId: string, status?: string, dueDate?: string): Promise<void> {
  const body: any = {
    id: formId,
    school_id: schoolId,
    form_name: formName,
    fillout_form_id: filloutFormId
  };

  if (status) {
    body.status = status;
  }

  if (dueDate) {
    body.due_date = dueDate;
  }

  await authedFetch({
    method: 'PUT',
    url: '/form-templates',
    body
  }, z.object({}));
}
export async function inviteParent(schoolId: string, parentData: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhoneNumber?: string;
  childFullName: string;
  childDob: string;
  classroomId: string;
  gender: string;
  secondaryParentEmail?: string;
  secondaryParentFirstName?: string;
  secondaryParentLastName?: string;
  secondaryParentPhoneNumber?: string;
}): Promise<void> {
  const [childFirstName, ...childLastNameParts] = parentData.childFullName.split(' ');
  const childLastName = childLastNameParts.join(' ');

  const body: Record<string, string> = {
    school_id: schoolId,
    child_first_name: childFirstName || parentData.childFullName,
    child_last_name: childLastName || '',
    child_birth_date: parentData.childDob,
    class_id: parentData.classroomId,
    parent_email: parentData.parentEmail,
    parent_first_name: parentData.parentFirstName,
    parent_last_name: parentData.parentLastName,
    gender: parentData.gender
  };

  if (parentData.parentPhoneNumber) {
    body.parent_phone_number = parentData.parentPhoneNumber;
  }

  if (parentData.secondaryParentEmail) {
    body.secondary_parent_email = parentData.secondaryParentEmail;
    body.secondary_parent_first_name = parentData.secondaryParentFirstName || '';
    body.secondary_parent_last_name = parentData.secondaryParentLastName || '';
    if (parentData.secondaryParentPhoneNumber) {
      body.secondary_parent_phone_number = parentData.secondaryParentPhoneNumber;
    }
  }

  try {
    await authedFetch({
      method: 'POST',
      url: '/enrollments/parent-invite',
      body
    }, z.union([z.object({}), z.string()]));
  } catch (error: any) {
    // Check for email bounce error (external service error) - 502 indicates email was suppressed
    if (error?.status === 502 || error?.code === 'EXTERNAL_SERVICE_ERROR') {
      const bounceError = new Error('External service error: Email was suppressed by the mail provider. The address may have previously bounced — please ask the recipient to check with their IT or try a different address.');
      (bounceError as any).code = 'EMAIL_BOUNCE';
      (bounceError as any).status = 502;
      (bounceError as any).noRetry = true; // Flag to prevent retry
      throw bounceError;
    }
    // Check for conflict error (email already exists)
    if (error?.response?.status === 409 || error?.code === 'CONFLICT' || 
        (error?.message && error.message.includes('User with this email already exists'))) {
      const conflictError = new Error('Email already exists');
      (conflictError as any).code = 'CONFLICT';
      throw conflictError;
    }
    throw error;
  }
}
export async function resendParentConfirmation(parentId: string): Promise<void> {
  try {
    await authedFetch({
      method: 'POST',
      url: '/enrollments/resend-confirmation',
      body: {
        parent_id: parentId
      }
    }, z.any());
  } catch (error: any) {
    // Check for email bounce error (external service error) - 502 indicates email was suppressed
    if (error?.status === 502 || error?.code === 'EXTERNAL_SERVICE_ERROR') {
      const bounceError = new Error('External service error: Email was suppressed by the mail provider. The address may have previously bounced — please ask the recipient to check with their IT or try a different address.');
      (bounceError as any).code = 'EMAIL_BOUNCE';
      (bounceError as any).status = 502;
      (bounceError as any).noRetry = true; // Flag to prevent retry
      throw bounceError;
    }
    throw error;
  }
}
export async function deactivateParent(parentId: string): Promise<void> {
  await authedFetch({
    method: 'DELETE',
    url: `/parent/${parentId}`
  }, z.any());
}
export async function activateParent(parentId: string): Promise<void> {
  await authedFetch({
    method: 'PATCH',
    url: `/parent/${parentId}/activate`
  }, z.any());
}
export async function addChild(schoolId: string, _enrollmentId: string, childData: {
  childFirstName: string;
  childLastName: string;
  childDob: string;
  gender: string;
  classroomId: string;
  parentId: string;
}): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/enrollments/add-child',
    body: {
      school_id: schoolId,
      child_first_name: childData.childFirstName,
      child_last_name: childData.childLastName,
      child_birth_date: childData.childDob,
      gender: childData.gender,
      class_id: childData.classroomId,
      parent_id: childData.parentId
    }
  }, z.union([z.object({}), z.string()]));
}
export async function createClassroom(schoolId: string, className: string): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/classrooms',
    body: {
      school_id: schoolId,
      class_name: className
    }
  }, z.union([z.object({}), z.string()]));
}

export async function assignFormToClassroom(schoolId: string, classroomId: string, formTemplateId: string, status: 'active' | 'inactive' | 'default' = 'active'): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/class-form-overrides',
    body: {
      school_id: schoolId,
      classroom_id: classroomId,
      form_template_id: formTemplateId,
      status
    }
  }, z.union([z.object({}), z.string()]));
}

/**
 * Assigns a form to all students in a specific class using the new API endpoint
 */
export async function assignFormToClassStudents(
  schoolId: string,
  classId: string,
  formTemplateId: string
): Promise<void> {
  const { getAuthToken } = await import('../auth/session');
  const token = await getAuthToken();
  const { apiBaseUrl } = await import('../../config/env');

  const response = await fetch(`${apiBaseUrl}/student-form-assignments/assign-to-class`, {
    method: 'POST',
    headers: {
      'Content-Type': ' application/json',
      'Authorization': `Bearer ${token}`,
      'X-API-Key': 'test-owner-key-2024'

    },
    body: JSON.stringify({
      school_id: schoolId,
      class_id: classId,
      form_template_id: formTemplateId
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to assign form to class students: ${response.statusText}`);
  }
}

export async function deleteClassFormOverride(formTemplateId: string, classroomId: string): Promise<void> {
  await authedFetch({
    method: 'DELETE',
    url: `/classrooms/${encodeURIComponent(classroomId)}/forms/${encodeURIComponent(formTemplateId)}`
  }, z.union([z.object({}), z.string()]));
}
export type ChildEnrollment = {
  childId: string;
  childFullName: string;
  childDob?: string;
  classroomId?: string;
  classroomName?: string;
  enrollmentId: string;
  forms: {
    formId: string;
    formName: string;
    status: string;
    isRequired: boolean;
    filloutFormId: string;
  }[];
};
export async function fetchChildrenForms(schoolId: string): Promise<ChildEnrollment[]> {
  try {
    console.log('Fetching children forms for school ID:', schoolId);
    const data = await authedFetch({
      method: 'GET',
      url: `/enrollments?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    console.log('Raw children forms response:', data);
    if (typeof data === 'string') {
      console.warn('API returned string for children forms:', data);
      return [];
    }
    if (!Array.isArray(data)) {
      console.warn('Children forms response is not an array:', data);
      return [];
    }
    return data.map(item => ({
      childId: item.child_id || '',
      childFullName: item.child_full_name || '',
      childDob: item.child_dob,
      classroomId: item.classroom_id,
      classroomName: item.classroom_name,
      enrollmentId: item.enrollment_id || '',
      forms: (item.forms || []).map((form: any) => ({
        formId: form.form_id || '',
        formName: form.form_name || '',
        status: form.status || 'Not Started',
        isRequired: form.is_required || false,
        filloutFormId: form.fillout_form_id || form.filloutFormId || ''
      }))
    }));
  } catch (error) {
    console.error('fetchChildrenForms error:', error);
    return [];
  }
}

export async function reviewStudentFormAssignment(
  assignmentId: string,
  status: 'approved' | 'rejected',
  notes: string,
  approvedBy: string
): Promise<void> {
  const requestBody = {
    assignment_id: assignmentId,
    status,
    notes,
    approved_by: approvedBy
  };

  const responseSchema = z.object({
    success: z.boolean().optional(),
    message: z.string().optional()
  }).passthrough();

  try {
    await authedFetch({
      method: 'PUT',
      url: '/student-form-assignments/review',
      body: requestBody
    }, responseSchema);
  } catch (error) {
    console.error('Error reviewing form assignment:', error);
    throw new Error('Failed to review form assignment');
  }
}

export type DashboardMetrics = {
  schoolId: string;
  totalClassrooms: number;
  totalActiveParents: number;
  totalActiveChildren: number;
  totalForms: number;
  classwiseMetrics: {
    classroomId: string;
    classroomName: string;
    totalEnrollments: number;
    completedEnrollments: number;
  }[];
};

const dashboardMetricsSchema = z.object({
  school_id: z.string(),
  total_classrooms: z.number(),
  total_active_parents: z.number(),
  total_active_children: z.number(),
  total_forms: z.number(),
  classwise_metrics: z.array(z.object({
    classroom_id: z.string(),
    classroom_name: z.string(),
    total_enrollments: z.number(),
    completed_enrollments: z.number()
  }))
});

export async function fetchDashboardMetrics(schoolId: string): Promise<DashboardMetrics> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/admin/dashboard-metrics?school_id=${encodeURIComponent(schoolId)}`
    }, dashboardMetricsSchema);

    return {
      schoolId: data.school_id,
      totalClassrooms: data.total_classrooms,
      totalActiveParents: data.total_active_parents,
      totalActiveChildren: data.total_active_children,
      totalForms: data.total_forms,
      classwiseMetrics: data.classwise_metrics.map(metric => ({
        classroomId: metric.classroom_id,
        classroomName: metric.classroom_name,
        totalEnrollments: metric.total_enrollments,
        completedEnrollments: metric.completed_enrollments
      }))
    };
  } catch (error) {
    console.error('fetchDashboardMetrics error:', error);
    throw error;
  }
}

export async function updateChildStatus(
  childId: string,
  status: 'active' | 'archive'
): Promise<void> {
  await authedFetch({
    method: 'PATCH',
    url: `/children/${encodeURIComponent(childId)}/status`,
    body: { status }
  }, z.object({}));
}

export type ClassBasedEnrollment = {
  parent_id: string;
  parent_first_name: string;
  parent_last_name: string;
  child_id: string;
  child_first_name: string;
  child_last_name: string;
  child_status: string;
  class_name: string;
  primary_email: string;
  form_status: string;
  forms: Record<string, string>;
  additional_parent_email?: string | null;
};

export async function fetchClassBasedEnrollments(
  schoolId: string,
  classId: string
): Promise<ClassBasedEnrollment[]> {
  try {
    console.log('Fetching class-based enrollments for school:', schoolId, 'class:', classId);
    const data = await authedFetch({
      method: 'GET',
      url: `/class-based-enrollments?school_id=${encodeURIComponent(schoolId)}&class_id=${encodeURIComponent(classId)}`
    }, z.any());

    console.log('Raw class-based enrollments response:', data);

    if (typeof data === 'string') {
      console.warn('API returned string for class-based enrollments:', data);
      return [];
    }

    // Handle both {enrollments: [...]} and direct array response
    const enrollmentsArray = data.enrollments || data;

    if (!Array.isArray(enrollmentsArray)) {
      console.warn('Class-based enrollments response is not an array:', enrollmentsArray);
      return [];
    }

    return enrollmentsArray.map(item => ({
      parent_id: item.parent_id || '',
      parent_first_name: item.parent_first_name || '',
      parent_last_name: item.parent_last_name || '',
      child_id: item.child_id || '',
      child_first_name: item.child_first_name || '',
      child_last_name: item.child_last_name || '',
      child_status: item.child_status || 'active',
      class_name: item.class_name || '',
      primary_email: item.primary_email || '',
      form_status: item.form_status || '',
      forms: item.forms || {},
      additional_parent_email: item.additional_parent_email || null
    }));
  } catch (error) {
    console.error('fetchClassBasedEnrollments error:', error);
    return [];
  }
}

export async function assignFormsToStudent(
  schoolId: string,
  assignments: {
    enrollment_id: string;
    child_id: string;
    form_template_id: string;
    is_required: boolean;
    due_date?: string;
  }[]
): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/student-form-assignments/assign',
    headers: {
      'X-API-Key': 'test-owner-key-2024'
    },
    body: {
      school_id: schoolId,
      assignments
    }
  }, z.object({}));
}

export async function assignFormToAllStudents(
  schoolId: string,
  formTemplateId: string,
  isRequired: boolean = true,
  dueDate?: string
): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/student-form-assignments/assign-to-school',
    headers: {
      'X-API-Key': 'test-owner-key-2024'
    },
    body: {
      school_id: schoolId,
      form_template_id: formTemplateId,
      is_required: isRequired,
      due_date: dueDate
    }
  }, z.object({}));
}

export type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_verified: boolean;
  school_id: string;
};

export async function fetchAdminUsers(schoolId: string): Promise<AdminUser[]> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/users/admin?school_id=${encodeURIComponent(schoolId)}`
    }, z.object({
      success: z.boolean(),
      count: z.number(),
      data: z.array(z.object({
        id: z.string(),
        email: z.string(),
        first_name: z.string(),
        last_name: z.string(),
        role: z.string(),
        is_verified: z.boolean(),
        school_id: z.string()
      }))
    }));

    return data.data;
  } catch (error) {
    console.error('fetchAdminUsers error:', error);
    throw error;
  }
}

export async function inviteAdmin(
  email: string,
  firstName: string,
  lastName: string,
  schoolId: string,
  phoneNumber?: string
): Promise<void> {
  try {
    await authedFetch({
      method: 'POST',
      url: '/auth/invite-create',
      body: {
        email,
        school_id: schoolId,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || null
      }
    }, z.object({}));
  } catch (error: any) {
    // Check for email bounce error (external service error)
    if (error?.code === 'EXTERNAL_SERVICE_ERROR' || error?.status === 502) {
      const bounceError = new Error('Email delivery failed. Please try again later or use a different email address.');
      (bounceError as any).code = 'EMAIL_BOUNCE';
      (bounceError as any).status = error?.status;
      throw bounceError;
    }
    throw error;
  }
}

export async function resendAdminInvite(userId: string): Promise<void> {
  try {
    await authedFetch({
      method: 'POST',
      url: '/auth/admin-resend-invite',
      body: {
        user_id: userId
      }
    }, z.any());
  } catch (error: any) {
    // Check for email bounce error (external service error)
    if (error?.code === 'EXTERNAL_SERVICE_ERROR' || error?.status === 502) {
      const bounceError = new Error('Email delivery failed. Please try again later or use a different email address.');
      (bounceError as any).code = 'EMAIL_BOUNCE';
      (bounceError as any).status = error?.status;
      throw bounceError;
    }
    throw error;
  }
}

export async function updateAdmin(
  userId: string,
  firstName: string,
  lastName: string,
  phoneNumber?: string
): Promise<void> {
  await authedFetch({
    method: 'PUT',
    url: '/users/admin',
    body: {
      user_id: userId,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber || null
    }
  }, z.object({}));
}

export async function deleteAdmin(userId: string): Promise<void> {
  await authedFetch({
    method: 'DELETE',
    url: '/users/admin',
    body: {
      user_id: userId
    }
  }, z.object({}));
}

export async function transferStudentToClass(
  childId: string,
  newClassroomId: string,
  schoolId: string
): Promise<void> {
  await authedFetch({
    method: 'PUT',
    url: '/students/transfer-class',
    body: {
      child_id: childId,
      new_classroom_id: newClassroomId,
      school_id: schoolId
    }
  }, z.object({}));
}

export async function promoteStudent(
  enrollmentId: string,
  targetClassroomId: string,
  reason: string = 'Age progression',
  effectiveDate?: string
): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: `/class-promotions/${encodeURIComponent(enrollmentId)}`,
    body: {
      to_classroom_id: targetClassroomId,
      reason,
      effective_date: effectiveDate || new Date().toISOString()
    }
  }, z.object({}));
}

export async function bulkPromoteStudents(
  schoolId: string,
  promotions: {
    enrollment_id: string;
    to_classroom_id: string;
    reason?: string;
    effective_date?: string;
  }[]
): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/class-promotions/bulk',
    body: {
      school_id: schoolId,
      promotions
    }
  }, z.object({}));
}

export async function downloadAllForms(enrollmentId: string): Promise<void> {
  const { getAuthToken } = await import('../auth/session');
  const token = await getAuthToken();
  const { apiBaseUrl } = await import('../../config/env');

  const response = await fetch(`${apiBaseUrl}/enrollments/${encodeURIComponent(enrollmentId)}/forms/download-zip`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept': '*/*'
    }
  });

  if (!response.ok) throw new Error('Failed to download forms');

  // Extract filename from Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition');
  const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch?.[1] || 'enrollment_forms.zip';

  // Read as arrayBuffer to inspect bytes
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let blob: Blob;

  // ZIP files start with PK magic bytes (0x50 0x4B)
  // If API Gateway returns base64 text instead of binary, first bytes will be 'U' 'E' (from UEsDBBQ...)
  const isZip = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4B;

  if (isZip) {
    blob = new Blob([arrayBuffer], { type: 'application/zip' });
  } else {
    // API Gateway returned base64-encoded text — decode to binary
    const text = new TextDecoder().decode(bytes);
    const binary = atob(text);
    const decoded = Uint8Array.from(binary, c => c.charCodeAt(0));
    blob = new Blob([decoded], { type: 'application/zip' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type DueForm = {
  id: string;
  formName: string;
  studentName: string;
  classroomName: string;
  parentName: string;
  parentEmail: string;
  dueDate: string | null;
  status: 'pending' | 'completed' | 'overdue' | 'submitted';
  assignedDate: string;
};

export function calculateFormDueDate(form: any, formTemplates: any[]): string | null {
  // Remove 'form_' prefix if present
  const cleanFormId = form.formId?.startsWith('form_') ? form.formId.substring(5) : form.formId;
  const formTemplate = formTemplates.find(t => t.id === cleanFormId);

  console.log('calculateFormDueDate:', {
    originalFormId: form.formId,
    cleanFormId,
    foundTemplate: formTemplate,
    templateDueDate: formTemplate?.due_date,
    assignedAt: form.assigned_at
  });

  if (formTemplate?.due_date) {
    const dueDate = new Date(formTemplate.due_date);
    if (!isNaN(dueDate.getTime())) {
      console.log('Using template due date:', dueDate.toLocaleDateString('en-US'));
      return dueDate.toLocaleDateString('en-US');
    }
  }

  // Fallback to calculated date
  if (form.assigned_at) {
    const parts = form.assigned_at.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const assigned = new Date(`${year}-${month}-${day}`);
      if (!isNaN(assigned.getTime())) {
        const due = new Date(assigned);
        due.setDate(due.getDate() + 30);
        console.log('Using calculated due date:', due.toLocaleDateString('en-US'));
        return due.toLocaleDateString('en-US');
      }
    }
  }

  console.log('No due date found');
  return null;
}

export async function fetchDueForms(schoolId: string): Promise<DueForm[]> {
  try {
    const { activeParents } = await fetchParentDetails(schoolId);

    const dueFormsMap = new Map<string, DueForm>();
    const childParentsMap = new Map<string, any[]>();

    // First, collect all parents for each child
    activeParents.forEach(parent => {
      parent.children?.forEach(child => {
        if (!childParentsMap.has(child.childId)) {
          childParentsMap.set(child.childId, []);
        }
        childParentsMap.get(child.childId)?.push(parent);
      });
    });

    // Then process forms with combined parent info
    activeParents.forEach(parent => {
      parent.children?.forEach(child => {
        child.forms.forEach(form => {
          const formKey = `${child.childId}-${form.formId}`;

          if (!dueFormsMap.has(formKey)) {
            const today = new Date();

            // Calculate due date (30 days from assigned date)
            let dueDateString = null;
            if (form.assigned_at) {
              const parts = form.assigned_at.split('-');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                const assigned = new Date(`${year}-${month}-${day}`);
                if (!isNaN(assigned.getTime())) {
                  const due = new Date(assigned);
                  due.setDate(due.getDate() + 30);
                  dueDateString = due.toLocaleDateString('en-US');
                }
              }
            }
            const dueDate = dueDateString ? new Date(dueDateString) : null;

            let status: 'pending' | 'completed' | 'overdue' | 'submitted' = 'pending';
            if (form.status === 'completed' || form.status === 'approved') {
              status = 'completed';
            } else if (dueDate && dueDate < today) {
              status = 'overdue';
            }

            // Get all parents for this child
            const allParents = childParentsMap.get(child.childId) || [parent];
            const parentNames = allParents.map(p => `${p.firstName || ''} ${p.lastName || ''}`.trim());
            const parentEmails = allParents.map(p => p.email);

            const combinedParentName = parentNames.join(' & ');
            const combinedParentEmail = parentEmails.join(', ');

            dueFormsMap.set(formKey, {
              id: form.studentFormAssignmentId || formKey,
              formName: form.formName,
              studentName: child.childFullName,
              parentName: combinedParentName,
              classroomName: child.classroomName || '',
              parentEmail: combinedParentEmail,
              dueDate: dueDateString,
              status,
              assignedDate: form.assigned_at || new Date().toISOString().split('T')[0]
            });
          }
        });
      });
    });

    return Array.from(dueFormsMap.values());
  } catch (error) {
    console.error('fetchDueForms error:', error);
    return [];
  }
}