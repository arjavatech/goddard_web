export interface TapTimeEmployee {
  id: string;
  firstName: string;
  lastName: string;
  pin: string;
  phone: string;
  role: string;
  status: 'Active' | 'Inactive';
}

const STORAGE_KEY = 'goddard_tap_time_employees';

export const TapTimeEmployeeStorage = {
  getEmployees: (): TapTimeEmployee[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Failed to parse tap-time employees', err);
      return [];
    }
  },

  saveEmployees: (employees: TapTimeEmployee[]): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  },

  addEmployee: (employee: Omit<TapTimeEmployee, 'id'>): TapTimeEmployee => {
    const employees = TapTimeEmployeeStorage.getEmployees();
    const newEmployee: TapTimeEmployee = {
      ...employee,
      id: crypto.randomUUID(),
    };
    TapTimeEmployeeStorage.saveEmployees([...employees, newEmployee]);
    return newEmployee;
  },

  updateEmployee: (id: string, updates: Partial<TapTimeEmployee>): TapTimeEmployee | null => {
    const employees = TapTimeEmployeeStorage.getEmployees();
    const index = employees.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const updatedEmployee = { ...employees[index], ...updates };
    employees[index] = updatedEmployee;
    TapTimeEmployeeStorage.saveEmployees(employees);
    return updatedEmployee;
  },

  deleteEmployee: (id: string): void => {
    const employees = TapTimeEmployeeStorage.getEmployees();
    TapTimeEmployeeStorage.saveEmployees(employees.filter((e) => e.id !== id));
  },
};
