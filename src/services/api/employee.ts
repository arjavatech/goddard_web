
export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  employeeType: string;
  joinedOn: string;
  schoolId: string;
  status: 'active' | 'inactive';
};

export type EmployeeFormAssignment = {
  id: string;
  employeeId: string;
  formId: string;
  status: 'Assigned' | 'Submitted' | 'Approved' | 'Rejected';
  assignedBy: string;
  assignedOn: string;
  submittedOn?: string;
  reviewedBy?: string;
  reviewedOn?: string;
  schoolId: string;
};

// --- Repository Layer (localStorage mock) ---
const EMPLOYEES_KEY = 'goddard_employees';
const ASSIGNMENTS_KEY = 'goddard_employee_assignments';

function getStoredEmployees(): Employee[] {
  const data = localStorage.getItem(EMPLOYEES_KEY);
  return data ? JSON.parse(data) : [];
}

function saveEmployees(employees: Employee[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

function getStoredAssignments(): EmployeeFormAssignment[] {
  const data = localStorage.getItem(ASSIGNMENTS_KEY);
  return data ? JSON.parse(data) : [];
}

function saveAssignments(assignments: EmployeeFormAssignment[]) {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

// --- Service Layer ---

export const EmployeeService = {
  async fetchEmployees(schoolId: string): Promise<Employee[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    const employees = getStoredEmployees();
    return employees.filter(e => e.schoolId === schoolId);
  },

  async fetchEmployeeDetails(id: string): Promise<Employee | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const employees = getStoredEmployees();
    return employees.find(e => e.id === id) || null;
  },

  async inviteEmployee(employeeData: Omit<Employee, 'id' | 'status'>): Promise<Employee> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const employees = getStoredEmployees();
    
    // Check if email already exists
    if (employees.some(e => e.email === employeeData.email)) {
      throw new Error('An employee with this email already exists.');
    }

    const newEmployee: Employee = {
      ...employeeData,
      id: crypto.randomUUID(),
      status: 'active',
    };

    employees.push(newEmployee);
    saveEmployees(employees);
    return newEmployee;
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const employees = getStoredEmployees();
    const index = employees.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');
    
    employees[index] = { ...employees[index], ...updates };
    saveEmployees(employees);
    return employees[index];
  },

  async fetchEmployeeFormAssignments(employeeId: string): Promise<EmployeeFormAssignment[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const assignments = getStoredAssignments();
    return assignments.filter(a => a.employeeId === employeeId);
  },

  async assignFormToEmployee(employeeId: string, formId: string, schoolId: string, assignedBy: string): Promise<EmployeeFormAssignment> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const assignments = getStoredAssignments();
    
    // Prevent duplicate assignments
    if (assignments.some(a => a.employeeId === employeeId && a.formId === formId)) {
      throw new Error('This form is already assigned to the employee.');
    }

    const newAssignment: EmployeeFormAssignment = {
      id: crypto.randomUUID(),
      employeeId,
      formId,
      status: 'Assigned',
      assignedBy,
      assignedOn: new Date().toISOString(),
      schoolId,
    };

    assignments.push(newAssignment);
    saveAssignments(assignments);
    return newAssignment;
  },

  async submitEmployeeForm(assignmentId: string, formData: any): Promise<EmployeeFormAssignment> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const assignments = getStoredAssignments();
    const index = assignments.findIndex(a => a.id === assignmentId);
    if (index === -1) throw new Error('Assignment not found');
    
    // In a real app, formData would be saved to a forms submissions table
    // Here we just update the assignment status
    assignments[index].status = 'Submitted';
    assignments[index].submittedOn = new Date().toISOString();
    
    // Mock save form data to localStorage
    localStorage.setItem(`form_submission_${assignmentId}`, JSON.stringify(formData));

    saveAssignments(assignments);
    return assignments[index];
  },

  async reviewEmployeeForm(assignmentId: string, status: 'Approved' | 'Rejected', reviewerName: string): Promise<EmployeeFormAssignment> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const assignments = getStoredAssignments();
    const index = assignments.findIndex(a => a.id === assignmentId);
    if (index === -1) throw new Error('Assignment not found');
    
    assignments[index].status = status;
    assignments[index].reviewedBy = reviewerName;
    assignments[index].reviewedOn = new Date().toISOString();

    saveAssignments(assignments);
    return assignments[index];
  }
};
