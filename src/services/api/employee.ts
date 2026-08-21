import { authedFetch, z } from './common';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Employee = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountry?: string;
  address: string;
  employeeType: string;
  joinedOn: string;
  schoolId: string;
  status: 'active' | 'inactive';
  isVerified?: boolean;
  salaryDate?: string;
};

export type EmployeeFormTemplate = {
  id: string;
  schoolId: string;
  formName: string;
  formType?: string;
  filloutFormId?: string;
  dueDate?: string;
  status?: string;
  isRequired?: boolean;
  displayOrder?: number;
};

export type EmployeeFormAssignment = {
  id: string;
  employeeId: string;
  /** Alias for employee_form_template_id — kept for backward compatibility with existing screens. */
  formId: string;
  userId: string;
  schoolId: string;
  assignmentSource?: string;
  status?: string;
  isRequired?: boolean;
  assignedBy?: string;
  assignedOn?: string;
  approvedBy?: string;
  approvedOn?: string;
  notes?: string;
  recentEditLink?: string;
  recentPdfLink?: string;
  // Joined from employee_form_templates:
  formName?: string;
  filloutFormId?: string;
  dueDate?: string;
  // Joined from users:
  employeeFirstName?: string;
  employeeLastName?: string;
};

export type AssignEmployeeFormToSchoolResponse = {
  schoolId: string;
  employeeFormTemplateId: string;
  totalActiveEmployees: number;
  employeesAlreadyAssigned: number;
  newlyAssigned: number;
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapEmployee(raw: any): Employee {
  return {
    id: raw.id ?? '',
    userId: raw.user_id ?? '',
    firstName: raw.first_name ?? '',
    lastName: raw.last_name ?? '',
    email: raw.email ?? '',
    phone: raw.phone ?? '',
    phoneCountry: raw.phone_country ?? undefined,
    address: raw.address ?? '',
    employeeType: raw.employee_type ?? '',
    joinedOn: raw.joined_on ?? '',
    schoolId: raw.school_id ?? '',
    status: raw.is_active !== false ? 'active' : 'inactive',
    isVerified: raw.is_verified ?? undefined,
    salaryDate: raw.salary_date ?? undefined,
  };
}

function mapFormTemplate(raw: any): EmployeeFormTemplate {
  return {
    id: raw.id ?? '',
    schoolId: raw.school_id ?? '',
    formName: raw.form_name ?? '',
    formType: raw.form_type ?? undefined,
    filloutFormId: raw.fillout_form_id ?? undefined,
    dueDate: raw.due_date ?? undefined,
    status: raw.status ?? undefined,
    isRequired: raw.is_required ?? undefined,
    displayOrder: raw.display_order ?? undefined,
  };
}

function mapAssignment(raw: any): EmployeeFormAssignment {
  return {
    id: raw.id ?? '',
    employeeId: raw.employee_id ?? '',
    formId: raw.employee_form_template_id ?? '',
    userId: raw.user_id ?? '',
    schoolId: raw.school_id ?? '',
    assignmentSource: raw.assignment_source ?? undefined,
    status: raw.status ?? undefined,
    isRequired: raw.is_required ?? undefined,
    assignedBy: raw.assigned_by ?? undefined,
    assignedOn: raw.assigned_at ?? undefined,
    approvedBy: raw.approved_by ?? undefined,
    approvedOn: raw.approved_on ?? undefined,
    notes: raw.notes ?? undefined,
    recentEditLink: raw.recent_edit_link ?? undefined,
    recentPdfLink: raw.recent_pdf_link ?? undefined,
    formName: raw.form_name ?? undefined,
    filloutFormId: raw.fillout_form_id ?? undefined,
    dueDate: raw.due_date ?? undefined,
    employeeFirstName: raw.employee_first_name ?? undefined,
    employeeLastName: raw.employee_last_name ?? undefined,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const EmployeeService = {
  // ── Employee CRUD ────────────────────────────────────────────────────────

  async fetchEmployees(schoolId: string): Promise<Employee[]> {
    const data = await authedFetch(
      { method: 'GET', url: `/employees?school_id=${schoolId}` },
      z.array(z.any()),
    );
    return data.map(mapEmployee);
  },

  async fetchCurrentEmployee(schoolId: string): Promise<Employee> {
    const data = await authedFetch(
      { method: 'GET', url: `/employees/me?school_id=${schoolId}` },
      z.any(),
    );
    return mapEmployee(data);
  },

  async fetchEmployeeDetails(id: string, schoolId: string): Promise<Employee | null> {
    try {
      const data = await authedFetch(
        { method: 'GET', url: `/employees/${id}?school_id=${schoolId}` },
        z.any(),
      );
      return mapEmployee(data);
    } catch (err: any) {
      if (err?.message?.includes('404') || err?.message?.toLowerCase().includes('not found')) {
        return null;
      }
      throw err;
    }
  },

  async inviteEmployee(employeeData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    phoneCountry?: string;
    address?: string;
    employeeType?: string;
    joinedOn?: string;
    schoolId: string;
  }): Promise<{ employeeId: string; userId: string; inviteId: string; emailSent: boolean; message: string }> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: '/employees/invite',
        body: {
          school_id: employeeData.schoolId,
          first_name: employeeData.firstName,
          last_name: employeeData.lastName,
          email: employeeData.email,
          phone: employeeData.phone,
          phone_country: employeeData.phoneCountry,
          address: employeeData.address,
          employee_type: employeeData.employeeType,
          joined_on: employeeData.joinedOn,
        },
      },
      z.any(),
    );
    return {
      employeeId: data.employee_id,
      userId: data.user_id,
      inviteId: data.invite_id,
      emailSent: data.email_sent,
      message: data.message,
    };
  },

  async updateEmployee(
    id: string,
    schoolId: string,
    updates: { phone?: string; phoneCountry?: string; address?: string; employeeType?: string; joinedOn?: string },
  ): Promise<Employee> {
    const data = await authedFetch(
      {
        method: 'PATCH',
        url: `/employees/${id}?school_id=${schoolId}`,
        body: {
          phone: updates.phone,
          phone_country: updates.phoneCountry,
          address: updates.address,
          employee_type: updates.employeeType,
          joined_on: updates.joinedOn,
        },
      },
      z.any(),
    );
    return mapEmployee(data);
  },

  async deactivateEmployee(id: string, schoolId: string): Promise<void> {
    await authedFetch(
      { method: 'DELETE', url: `/employees/${id}?school_id=${schoolId}` },
      z.any(),
    );
  },

  // ── Employee Form Templates ───────────────────────────────────────────────

  async fetchEmployeeFormTemplates(schoolId: string): Promise<EmployeeFormTemplate[]> {
    const data = await authedFetch(
      { method: 'GET', url: `/employee-form-templates?school_id=${schoolId}` },
      z.array(z.any()),
    );
    return data.map(mapFormTemplate);
  },

  async createEmployeeFormTemplate(req: {
    schoolId: string;
    formName: string;
    formType?: string;
    filloutFormId?: string;
    dueDate?: string;
    status?: string;
    isRequired?: boolean;
    displayOrder?: number;
  }): Promise<EmployeeFormTemplate> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: '/employee-form-templates',
        body: {
          school_id: req.schoolId,
          form_name: req.formName,
          form_type: req.formType,
          fillout_form_id: req.filloutFormId,
          due_date: req.dueDate || undefined,
          status: req.status,
          is_required: req.isRequired,
          display_order: req.displayOrder,
        },
      },
      z.any(),
    );
    return mapFormTemplate(data);
  },

  async updateEmployeeFormTemplate(req: {
    id: string;
    schoolId: string;
    formName: string;
    formType?: string;
    filloutFormId?: string;
    dueDate?: string;
    status?: string;
    isRequired?: boolean;
    displayOrder?: number;
  }): Promise<EmployeeFormTemplate> {
    const data = await authedFetch(
      {
        method: 'PUT',
        url: '/employee-form-templates',
        body: {
          id: req.id,
          school_id: req.schoolId,
          form_name: req.formName,
          form_type: req.formType,
          fillout_form_id: req.filloutFormId,
          due_date: req.dueDate || undefined,
          status: req.status,
          is_required: req.isRequired,
          display_order: req.displayOrder,
        },
      },
      z.any(),
    );
    return mapFormTemplate(data);
  },

  async deleteEmployeeFormTemplate(formId: string, schoolId: string): Promise<void> {
    await authedFetch(
      { method: 'DELETE', url: `/employee-form-templates?form_id=${formId}&school_id=${schoolId}` },
      z.any(),
    );
  },

  // ── Employee Form Assignments ─────────────────────────────────────────────

  async fetchEmployeeFormAssignments(employeeId: string): Promise<EmployeeFormAssignment[]> {
    const data = await authedFetch(
      { method: 'GET', url: `/employee-form-assignments?employee_id=${employeeId}` },
      z.array(z.any()),
    );
    return data.map(mapAssignment);
  },

  async fetchSchoolFormAssignments(schoolId: string): Promise<EmployeeFormAssignment[]> {
    const data = await authedFetch(
      { method: 'GET', url: `/employee-form-assignments?school_id=${schoolId}` },
      z.array(z.any()),
    );
    return data.map(mapAssignment);
  },

  async assignFormToEmployee(
    employeeId: string,
    formTemplateId: string,
    schoolId: string,
    _assignedBy?: string,
  ): Promise<EmployeeFormAssignment> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: '/employee-form-assignments',
        body: {
          employee_id: employeeId,
          employee_form_template_id: formTemplateId,
          school_id: schoolId,
        },
      },
      z.any(),
    );
    return mapAssignment(data);
  },

  async assignFormToAllEmployees(
    schoolId: string,
    formTemplateId: string,
    isRequired = true,
  ): Promise<AssignEmployeeFormToSchoolResponse> {
    const data = await authedFetch(
      {
        method: 'POST',
        url: '/employee-form-assignments/assign-to-school',
        body: {
          school_id: schoolId,
          employee_form_template_id: formTemplateId,
          is_required: isRequired,
        },
      },
      z.any(),
    );
    return {
      schoolId: data.school_id,
      employeeFormTemplateId: data.employee_form_template_id,
      totalActiveEmployees: data.total_active_employees,
      employeesAlreadyAssigned: data.employees_already_assigned,
      newlyAssigned: data.newly_assigned,
    };
  },

  async reviewEmployeeForm(
    assignmentId: string,
    schoolId: string,
    status: string,
    notes?: string,
  ): Promise<EmployeeFormAssignment> {
    const data = await authedFetch(
      {
        method: 'PUT',
        url: '/employee-form-assignments/review',
        body: {
          assignment_id: assignmentId,
          school_id: schoolId,
          status,
          notes,
        },
      },
      z.any(),
    );
    return mapAssignment(data);
  },

  async deleteEmployeeFormAssignment(assignmentId: string, schoolId: string): Promise<void> {
    await authedFetch(
      { method: 'DELETE', url: `/employee-form-assignments?assignment_id=${assignmentId}&school_id=${schoolId}` },
      z.any(),
    );
  },

  async submitEmployeeForm(_assignmentId: string, _formData: any): Promise<EmployeeFormAssignment> {
    throw new Error('Form submission is handled by Fillout directly via webhook.');
  },
};
