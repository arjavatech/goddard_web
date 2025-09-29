import { authedFetch, z } from './common';
import { fetchUserContext } from './user';
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
  isSigned: boolean;
  createdAt: string | null;
  children?: {
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
      studentFormAssignmentId: string;
      recent_edit_link: string | null;
      fillout_form_id: string;
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
const classroomSchema = z.object({
  classroom_id: z.string().optional(),
  classroom_name: z.string().optional(),
  total_children: z.number().optional()
});
const classEnrollmentSchema = z.object({
  class_id: z.union([z.string(), z.number()]).optional(),
  class_name: z.string().optional(),
  count: z.number().int().nonnegative().optional(),
  forms: z.record(z.string()).nullable().optional(),
  default_forms: z.string().nullable().optional()
});
const parentDetailSchema = z.object({
  parent_id: z.string(),
  parent_email: z.string(),
  parent_first_name: z.string().optional(),
  parent_last_name: z.string().optional(),
  children: z.array(z.object({
    child_id: z.string(),
    child_full_name: z.string(),
    child_dob: z.string().optional(),
    classroom_id: z.string().optional(),
    classroom_name: z.string().optional(),
    enrollment_id: z.string(),
    forms: z.array(z.object({
      form_id: z.string(),
      form_name: z.string(),
      status: z.string(),
      is_required: z.boolean()
    }))
  }))
});
const schoolEnrollmentSchema = z.object({
  child_id: z.union([z.string(), z.number()]).optional(),
  child_first_name: z.string().optional(),
  child_last_name: z.string().optional(),
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
    }, z.union([z.array(classEnrollmentSchema), z.string()]));
    if (typeof data === 'string') {
      console.warn('API returned string for class enrollment stats:', data);
      return [];
    }
    return data.map(item => ({
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
export async function fetchParentDetails(schoolId: string): Promise<ParentDetail[]> {
  try {
    console.log('Fetching parent details for school ID:', schoolId);
    const data = await authedFetch({
      method: 'GET',
      url: `/parent/details?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    console.log('Raw parent details response:', data);
    if (typeof data === 'string') {
      console.warn('API returned string for parent details:', data);
      return [];
    }
    if (!Array.isArray(data)) {
      console.warn('Parent details response is not an array:', data);
      return [];
    }
    const result = data.map(item => ({
      parentId: item.parent_id || item.parentId || '',
      email: item.parent_email || item.email || '',
      firstName: item.parent_first_name || item.firstName,
      lastName: item.parent_last_name || item.lastName,
      isSigned: item.is_signed || false,
      createdAt: item.created_at || item.createdAt || null,
      children: (item.children || []).map((child: any) => ({
        childId: child.child_id || child.childId || '',
        childFullName: child.child_full_name || child.childFullName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        childDob: child.child_dob || child.childDob,
        classroomId: child.classroom_id || child.classroomId,
        classroomName: child.classroom_name || child.classroomName,
        enrollmentId: child.enrollment_id || child.enrollmentId || '',
        forms: (child.forms || []).map((form: any) => ({
          formId: form.form_id || form.formId || '',
          formName: form.form_name || form.formName || '',
          status: form.status || 'In Progress',
          isRequired: form.is_required || form.isRequired || false,
          filloutFormId: form.fillout_form_id || form.filloutFormId || '',
          studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || '',
          recent_edit_link: form.recent_edit_link || null,
          fillout_form_id: form.fillout_form_id || form.filloutFormId || ''
        }))
      }))
    }));
    console.log('Processed parent details:', result);
    return result;
  } catch (error) {
    console.error('fetchParentDetails error:', error);
    return [];
  }
}
export async function fetchSingleParent(parentId: string, schoolId: string): Promise<ParentDetail | null> {
  try {
    const data = await authedFetch({
      method: 'GET',
      url: `/parents/${encodeURIComponent(parentId)}?school_id=${encodeURIComponent(schoolId)}`
    }, z.any());
    if (!data) return null;
    return {
      parentId: data.parent_id || data.parentId || '',
      email: data.parent_email || data.email || '',
      firstName: data.parent_first_name || data.firstName,
      lastName: data.parent_last_name || data.lastName,
      isSigned: data.is_signed || false,
      createdAt: data.created_at || data.createdAt || null,
      children: (data.children || []).map((child: any) => ({
        childId: child.child_id || child.childId || '',
        childFullName: child.child_full_name || child.childFullName || `${child.firstName || ''} ${child.lastName || ''}`.trim(),
        childDob: child.child_dob || child.childDob,
        classroomId: child.classroom_id || child.classroomId,
        classroomName: child.classroom_name || child.classroomName,
        enrollmentId: child.enrollment_id || child.enrollmentId || '',
        forms: (child.forms || []).map((form: any) => ({
          formId: form.form_id || form.formId || '',
          formName: form.form_name || form.formName || '',
          status: form.status || 'In Progress',
          isRequired: form.is_required || form.isRequired || false,
          filloutFormId: form.fillout_form_id || form.filloutFormId || '',
          studentFormAssignmentId: form.student_form_assignment_id || form.studentFormAssignmentId || '',
          recent_edit_link: form.recent_edit_link || null,
          fillout_form_id: form.fillout_form_id || form.filloutFormId || ''
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
  await authedFetch({
    method: 'PUT',
    url: '/classrooms',
    body: {
      school_id: schoolId,
      class_id: classroomId,
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
  await authedFetch({
    method: 'DELETE',
    url: `/form-templates?form_id=${encodeURIComponent(formId)}&school_id=${encodeURIComponent(schoolId)}`
  }, z.object({}));
}
export async function createFormTemplate(formName: string, filloutFormId: string, schoolId: string): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/form-templates',
    body: {
      id: crypto.randomUUID(),
      school_id: schoolId,
      form_name: formName,
      fillout_form_id: filloutFormId
    }
  }, z.object({}));
}
export async function updateFormTemplate(formId: string, formName: string, filloutFormUrl: string, schoolId: string): Promise<void> {
  await authedFetch({
    method: 'PUT',
    url: '/form-templates',
    body: {
      id: formId,
      school_id: schoolId,
      form_name: formName,
      fillout_form_url: filloutFormUrl
    }
  }, z.object({}));
}
export async function inviteParent(schoolId: string, parentData: {
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  childFullName: string;
  childDob: string;
  classroomId: string;
  gender: string;
}): Promise<void> {
  const [childFirstName, ...childLastNameParts] = parentData.childFullName.split(' ');
  const childLastName = childLastNameParts.join(' ');
  
  await authedFetch({
    method: 'POST',
    url: '/enrollments/parent-invite',
    body: {
      school_id: schoolId,
      child_first_name: childFirstName || parentData.childFullName,
      child_last_name: childLastName || '',
      child_birth_date: parentData.childDob,
      class_id: parentData.classroomId,
      parent_email: parentData.parentEmail,
      parent_first_name: parentData.parentFirstName,
      parent_last_name: parentData.parentLastName,
      gender: parentData.gender
    }
  }, z.union([z.object({}), z.string()]));
}
export async function addChild(schoolId: string, enrollmentId: string, childData: {
  childFullName: string;
  childDob: string;
  classroomId: string;
}): Promise<void> {
  await authedFetch({
    method: 'POST',
    url: '/enrollments/add-child',
    body: {
      school_id: schoolId,
      enrollment_id: enrollmentId,
      child_full_name: childData.childFullName,
      child_dob: childData.childDob,
      classroom_id: childData.classroomId
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