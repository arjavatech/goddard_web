import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useToast } from '../../contexts/ToastContext';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { useUserContext } from '../../contexts/UserContext';
import { StatCard } from '../../components/ui/stat-card';
import { DataTable } from '../../components/ui/data-table';
import { PhoneInput, validatePhoneNumber } from '../../components/ui/phone-input';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { Search, Plus, Edit, Trash2, Eye, MoreHorizontal, Users, UserCheck, Clock, Filter, X, LayoutGrid, List, Upload, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmployeeManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePageSize('employee', 8);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form fields
  const [empFirstName, setEmpFirstName] = useState('');
  const [empLastName, setEmpLastName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empPhoneCountry, setEmpPhoneCountry] = useState('US');
  const [empAddress, setEmpAddress] = useState('');
  const [empType, setEmpType] = useState('Full Time');
  const [empJoinedOn, setEmpJoinedOn] = useState('');

  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem('employeeMgmtViewMode') as 'card' | 'table') || 'table');

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('employeeMgmtViewMode', mode);
  };

  // Bulk upload states
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<'upload' | 'review'>('upload');
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvErrors, setCsvErrors] = useState<Record<number, string[]>>({});
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const CSV_HEADERS = ['first_name', 'last_name', 'email', 'phone', 'address', 'joined_on'];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateCsvRows = (rows: any[]) => {
    const errors: Record<number, string[]> = {};
    rows.forEach((row, i) => {
      const rowErrors: string[] = [];
      if (!row.first_name?.trim()) rowErrors.push('First name required');
      if (!row.last_name?.trim()) rowErrors.push('Last name required');
      if (!row.email?.trim()) rowErrors.push('Email required');
      else if (!EMAIL_RE.test(row.email.trim())) rowErrors.push('Invalid email');
      if (!row.joined_on?.trim()) rowErrors.push('Joined on date required');
      else if (isNaN(Date.parse(row.joined_on.trim()))) rowErrors.push('Invalid date format (use YYYY-MM-DD)');
      if (rowErrors.length) errors[i] = rowErrors;
    });
    return errors;
  };

  const handleCsvFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setCsvRows([]); setCsvErrors({ 0: ['CSV file is empty or has no data rows'] }); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const missing = CSV_HEADERS.filter(h => !['phone', 'address'].includes(h) && !headers.includes(h));
      if (missing.length) { setCsvRows([]); setCsvErrors({ 0: [`Missing columns: ${missing.join(', ')}`] }); return; }
      const rows = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
      });
      setCsvRows(rows);
      setCsvErrors(validateCsvRows(rows));
      setBulkStep('review');
    };
    reader.readAsText(file);
  };

  const handleBulkSubmit = async () => {
    if (!userData?.schoolId || Object.keys(csvErrors).length > 0) return;
    setIsBulkSubmitting(true);
    let successCount = 0;
    const newErrors: Record<number, string[]> = {};
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      try {
        await EmployeeService.inviteEmployee({
          firstName: row.first_name.trim(),
          lastName: row.last_name.trim(),
          email: row.email.trim(),
          phone: row.phone?.trim() || '',
          address: row.address?.trim() || '',
          employeeType: 'Full Time',
          joinedOn: row.joined_on.trim(),
          schoolId: userData.schoolId,
        });
        successCount++;
      } catch (err: any) {
        newErrors[i] = [err.message || 'Failed to invite'];
      }
    }
    setIsBulkSubmitting(false);
    if (Object.keys(newErrors).length) {
      setCsvErrors(newErrors);
      showToast('error', `${successCount} invited, ${Object.keys(newErrors).length} failed`);
    } else {
      showToast('success', `${successCount} employees invited successfully`);
      setIsBulkUploadOpen(false);
      setBulkStep('upload');
      setCsvRows([]);
      setCsvErrors({});
      const data = await EmployeeService.fetchEmployees(userData.schoolId);
      setEmployees(data);
    }
  };

  const downloadSampleCsv = () => {
    const sample = 'first_name,last_name,email,phone,address,joined_on\nJohn,Doe,john@example.com,+1234567890,123 Main St,2024-01-15';
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employee_bulk_upload_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };



  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { userData, schoolSubdomain } = useUserContext();

  const [employees, setEmployees] = useState<Employee[]>([]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && emp.status === 'active') ||
      (statusFilter === 'inactive' && emp.status === 'inactive');
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'active').length;

  useEffect(() => {
    const loadEmployees = async () => {
      if (!userData?.schoolId) return;
      try {
        setIsLoading(true);
        setLoadError(null);
        const data = await EmployeeService.fetchEmployees(userData.schoolId);
        setEmployees(data);
      } catch (error) {
        setLoadError('Failed to load employees.');
      } finally {
        setIsLoading(false);
      }
    };
    loadEmployees();
  }, [userData?.schoolId]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setEmpEmail(email);
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const isFormValid = empFirstName.trim() && empLastName.trim() && empEmail.trim() && !emailError && (!empPhone || validatePhoneNumber(empPhone)) && empJoinedOn;

  const handleInviteEmployee = async () => {
    if (!isFormValid || !userData?.schoolId) return;

    setIsInviting(true);
    try {
      await EmployeeService.inviteEmployee({
        firstName: empFirstName.trim(),
        lastName: empLastName.trim(),
        email: empEmail.trim(),
        phone: empPhone.trim(),
        phoneCountry: empPhoneCountry,
        address: empAddress.trim(),
        employeeType: empType,
        joinedOn: empJoinedOn,
        schoolId: userData.schoolId,
      });

      showToast('success', 'Employee invited successfully');
      setIsAddDialogOpen(false);
      resetForm();

      const data = await EmployeeService.fetchEmployees(userData.schoolId);
      setEmployees(data);
    } catch (err: any) {
      if (err.message.includes('already exists')) {
        setEmailError('Email already exists');
      } else {
        showToast('error', err.message || 'Failed to invite employee');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEmpFirstName(emp.firstName);
    setEmpLastName(emp.lastName);
    setEmpEmail(emp.email);
    setEmpPhone(emp.phone);
    setEmpPhoneCountry(emp.phoneCountry || 'US');
    setEmpAddress(emp.address);
    setEmpType(emp.employeeType);
    setEmpJoinedOn(emp.joinedOn);
    setEmailError('');
    setPhoneError('');
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !isFormValid || isUpdating) return;
    setIsUpdating(true);
    try {
      await EmployeeService.updateEmployee(selectedEmployee.id, userData?.schoolId ?? '', {
        phone: empPhone.trim(),
        phoneCountry: empPhoneCountry,
        address: empAddress.trim(),
        employeeType: empType,
        joinedOn: empJoinedOn,
      });

      setEmployees(employees.map(e => {
        if (e.id === selectedEmployee.id) {
          return {
            ...e,
            phone: empPhone.trim(),
            phoneCountry: empPhoneCountry,
            address: empAddress.trim(),
            employeeType: empType,
            joinedOn: empJoinedOn,
          };
        }
        return e;
      }));
      showToast('success', 'Employee updated successfully');
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      resetForm();
    } catch (error) {
      showToast('error', 'Failed to update employee');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewEmployee = (emp: Employee) => {
    navigate(`/${schoolSubdomain}/admin/employees/${emp.id}`);
  };

  const handleDeleteEmployee = (emp: Employee) => {
    setEmployeeToDelete(emp);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;
    try {
      await EmployeeService.deactivateEmployee(employeeToDelete.id, userData?.schoolId ?? '');
      setEmployees(employees.map(e => e.id === employeeToDelete.id ? { ...e, status: 'inactive' as const } : e));
      showToast('success', 'Employee marked as inactive');
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch (error) {
      showToast('error', 'Failed to update employee');
    }
  };

  const resetForm = () => {
    setEmpFirstName('');
    setEmpLastName('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpPhoneCountry('US');
    setEmpAddress('');
    setEmpType('Full Time');
    setEmpJoinedOn('');
    setEmailError('');
    setPhoneError('');
  };

  if (isLoading && employees.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12  mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading employees...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-6  space-y-6 pb-12">


        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-14 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Employee Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Manage and assign forms to employees.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-[#0F2D52] text-[#0F2D52] hover:bg-[#0F2D52] hover:text-white rounded-xl shadow-sm transition-all duration-200 font-semibold px-4 h-10 flex items-center gap-2"
              size="sm"
              onClick={() => { setBulkStep('upload'); setCsvRows([]); setCsvErrors({}); setIsBulkUploadOpen(true); }}
            >
              <Upload className="w-4 h-4 mr-1" />
              Bulk Upload
            </Button>
            <Button
              className="bg-[#0F2D52] hover:bg-[#1c477c] text-white rounded-xl shadow-sm transition-all duration-200 font-semibold px-4 h-10 flex items-center gap-2"
              size="sm"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Invite Employee
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between animate-fade-in">
            <span>{loadError}</span>
            <Button onClick={() => window.location.reload()} variant="outline" className="h-8 px-3 text-xs bg-white text-red-700 border-red-200 hover:bg-red-50 rounded-lg">
              Refresh Page
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <StatCard
            label="Total Employees"
            value={totalEmployees}
            icon={Users}
            iconBgClass="bg-[#EFF5FB]"
            iconColorClass="text-[#0F2D52]"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
          <StatCard
            label="Active Employees"
            value={activeEmployees}
            icon={UserCheck}
            iconBgClass="bg-emerald-50"
            iconColorClass="text-emerald-600"
            className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs"
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Employee Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Showing {filteredEmployees.length} of {totalEmployees} employee{totalEmployees === 1 ? '' : 's'}
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Card View</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search employees by name or email…"
                  className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-44">
                  <select
                    value={statusFilter}
                    onChange={e => handleStatusFilterChange(e.target.value)}
                    className="w-full pl-3 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all appearance-none cursor-pointer font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Filter className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {viewMode === 'card' ? (
            <MobileCardList
              className="p-4"
              loading={isLoading}
              loadingMessage="Loading employees..."
              emptyMessage="No employees found."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              totalItems={filteredEmployees.length}
              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              cards={paginatedEmployees.map((emp) => {
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <Card key={emp.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <AvatarInitials initials={initials} className="bg-[#01478d] text-white font-semibold w-9 h-9 rounded-full flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold text-slate-800 block truncate cursor-pointer hover:text-[#0F2D52] hover:underline" onClick={() => handleViewEmployee(emp)}>
                              {emp.firstName} {emp.lastName}
                            </span>
                            <div className="whitespace-nowrap text-xs text-slate-400 font-semibold block mt-0.5">{emp.email}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleViewEmployee(emp)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleEditEmployee(emp)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit Employee
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-xs text-red-600 focus:text-red-650" onClick={() => handleDeleteEmployee(emp)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                        <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-full font-bold text-slate-600 border border-slate-200/50">{emp.employeeType}</span>
                        <Badge variant={emp.status === 'active' ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2 py-0.5">
                          {emp.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            />
          ) : (
            <DataTable
              className="relative z-0"
              loading={isLoading}
              loadingMessage="Loading employees..."
              emptyMessage="No employees found."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEmployees.length}
              itemsPerPage={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              onPageChange={setCurrentPage}
              tableLayout="auto"
              columns={[
                { header: 'Employee', className: 'w-auto min-w-[200px]' },
                { header: 'Type', className: 'w-[15%]' },
                { header: 'Phone & PIN', className: 'w-1/5' },
                { header: 'Status', className: 'w-[15%]' },
                { header: 'Actions', className: 'w-[15%]' },
              ]}
              rows={paginatedEmployees.map((emp) => {
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
                return (
                  <tr key={emp.id} className="border-b border-slate-50 hover:bg-[#F8FAFC]">
                    <td className="py-4 px-4 cursor-pointer" onClick={() => handleViewEmployee(emp)}>
                      <div className="flex items-center gap-3">
                        <AvatarInitials initials={initials} className="bg-[#0151a0] text-white font-semibold" />
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-slate-900 block truncate">{emp.firstName} {emp.lastName}</span>
                          <div className="whitespace-nowrap text-xs text-slate-400 font-semibold block mt-0.5">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200/50">
                        {emp.employeeType}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-700">{emp.phone || '-'}</span>
                        {emp.phone && (
                          <span className="text-[11px] text-slate-500 font-medium">PIN: {emp.phone.replace(/\D/g, '').slice(-4)}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={emp.status === 'active' ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2.5 py-0.5">
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={(e) => { e.stopPropagation(); handleViewEmployee(emp); }}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs" onClick={(e) => { e.stopPropagation(); handleEditEmployee(emp); }}>
                            <Edit className="w-4 h-4 mr-2" /> Edit Employee
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-xs text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(emp); }}>
                            <Trash2 className="w-4 h-4 mr-2" /> Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            />
          )}
        </div>

        {/* Invite Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Invite New Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1.5">First Name</label>
                  <Input value={empFirstName} onChange={(e) => setEmpFirstName(e.target.value)} placeholder="First" className="w-full h-10 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1.5">Last Name</label>
                  <Input value={empLastName} onChange={(e) => setEmpLastName(e.target.value)} placeholder="Last" className="w-full h-10 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1.5">Email</label>
                <Input type="email" value={empEmail} onChange={handleEmailChange} placeholder="Email" className={`w-full h-10 rounded-xl ${emailError ? 'border-red-400' : ''}`} />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1.5">Phone</label>
                <PhoneInput
                  value={empPhone}
                  country={empPhoneCountry}
                  onCountryChange={(val) => {
                    setEmpPhoneCountry(val);
                  }}
                  onChange={(val) => {
                    setEmpPhone(val);
                    if (phoneError) setPhoneError('');
                  }}
                  onBlur={() => {
                    if (empPhone && !validatePhoneNumber(empPhone)) {
                      setPhoneError('Please enter a valid phone number');
                    }
                  }}
                  error={!!phoneError}
                />
                {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
                
                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase text-black mb-1.5">PIN</label>
                  <Input 
                    value={empPhone ? empPhone.replace(/\D/g, '').slice(-4) : ''} 
                    disabled 
                    placeholder="Auto-generated" 
                    className="w-full h-10 rounded-xl bg-slate-50 text-slate-500" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">PIN is automatically generated from the last 4 digits of the phone number.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-black mb-1.5">Address</label>
                <Input value={empAddress} onChange={(e) => setEmpAddress(e.target.value)} placeholder="Address" className="w-full h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                {/* <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1.5">Type</label>
                  <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm">
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div> */}
                <div>
                  <label className="block text-xs font-bold uppercase text-black mb-1.5">Joined On</label>
                  <Input type="date" value={empJoinedOn} onChange={(e) => setEmpJoinedOn(e.target.value)} className="w-full h-10 rounded-xl" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteEmployee} disabled={isInviting || !isFormValid} className="bg-[#0F2D52] hover:bg-[#1c477c] text-white">
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsEditDialogOpen(false);
            setSelectedEmployee(null);
            resetForm();
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Employee</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">First Name</label>
                  <Input value={empFirstName} onChange={(e) => setEmpFirstName(e.target.value)} className="w-full h-10 rounded-xl" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Last Name</label>
                  <Input value={empLastName} onChange={(e) => setEmpLastName(e.target.value)} className="w-full h-10 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Email (Cannot edit)</label>
                <Input value={empEmail} disabled className="w-full h-10 rounded-xl bg-slate-50" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Phone</label>
                <PhoneInput
                  value={empPhone}
                  country={empPhoneCountry}
                  onCountryChange={(val) => {
                    setEmpPhoneCountry(val);
                  }}
                  onChange={(val) => {
                    setEmpPhone(val);
                    if (phoneError) setPhoneError('');
                  }}
                  onBlur={() => {
                    if (empPhone && !validatePhoneNumber(empPhone)) {
                      setPhoneError('Please enter a valid phone number');
                    }
                  }}
                  error={!!phoneError}
                />
                {phoneError && <p className="text-xs text-red-600 mt-1">{phoneError}</p>}
                
                <div className="mt-3">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">PIN</label>
                  <Input 
                    value={empPhone ? empPhone.replace(/\D/g, '').slice(-4) : ''} 
                    disabled 
                    placeholder="Auto-generated" 
                    className="w-full h-10 rounded-xl bg-slate-50 text-slate-500" 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">PIN is automatically generated from the last 4 digits of the phone number.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Address</label>
                <Input value={empAddress} onChange={(e) => setEmpAddress(e.target.value)} className="w-full h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Type</label>
                  <select value={empType} onChange={(e) => setEmpType(e.target.value)} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm">
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Joined On</label>
                  <Input type="date" value={empJoinedOn} onChange={(e) => setEmpJoinedOn(e.target.value)} className="w-full h-10 rounded-xl" />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateEmployee} disabled={isUpdating || !isFormValid} className="bg-[#0F2D52] text-white">
                {isUpdating ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Modal */}
        <Dialog open={isBulkUploadOpen} onOpenChange={(open) => { if (!open) { setIsBulkUploadOpen(false); setBulkStep('upload'); setCsvRows([]); setCsvErrors({}); } }}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-bold text-slate-900">
                {bulkStep === 'upload' ? 'Bulk Upload Employees' : `Review ${csvRows.length} Employees`}
              </DialogTitle>
            </DialogHeader>

            {bulkStep === 'upload' ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">CSV Format Requirements:</p>
                  <p>Required columns: <span className="font-mono text-xs bg-white border border-slate-200 px-1 rounded">first_name, last_name, email, joined_on</span></p>
                  <p>Optional columns: <span className="font-mono text-xs bg-white border border-slate-200 px-1 rounded">phone, address</span></p>
                  <p className="text-xs text-slate-400">Date format: YYYY-MM-DD (e.g. 2024-01-15)</p>
                </div>
                <button
                  onClick={downloadSampleCsv}
                  className="flex items-center gap-2 text-xs font-semibold text-[#0F2D52] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Download sample CSV
                </button>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#0F2D52] hover:bg-slate-50 transition-all">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-semibold text-slate-600">Click to upload CSV file</span>
                  <span className="text-xs text-slate-400 mt-1">.csv files only</span>
                  <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); e.target.value = ''; }} />
                </label>
                {csvErrors[0] && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {csvErrors[0].join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500">
                      <span className="text-emerald-600">{csvRows.length - Object.keys(csvErrors).length} valid</span>
                      {Object.keys(csvErrors).length > 0 && <span className="text-red-500 ml-2">{Object.keys(csvErrors).length} errors</span>}
                    </span>
                  </div>
                  <button onClick={() => { setBulkStep('upload'); setCsvRows([]); setCsvErrors({}); }} className="text-xs font-semibold text-[#0F2D52] hover:underline">
                    ← Re-upload
                  </button>
                </div>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">#</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Email</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Phone</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Joined On</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {csvRows.map((row, i) => {
                        const hasError = !!csvErrors[i];
                        return (
                          <tr key={i} className={hasError ? 'bg-red-50' : 'hover:bg-slate-50'}>
                            <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.first_name} {row.last_name}</td>
                            <td className="px-3 py-2 text-slate-600">{row.email}</td>
                            <td className="px-3 py-2 text-slate-500">{row.phone || '—'}</td>
                            <td className="px-3 py-2 text-slate-500">{row.joined_on}</td>
                            <td className="px-3 py-2">
                              {hasError ? (
                                <div className="flex items-start gap-1 text-red-600">
                                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                  <span>{csvErrors[i].join(', ')}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-emerald-600">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Valid</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { setIsBulkUploadOpen(false); setBulkStep('upload'); setCsvRows([]); setCsvErrors({}); }}>Cancel</Button>
              {bulkStep === 'review' && (
                <Button
                  onClick={handleBulkSubmit}
                  disabled={isBulkSubmitting || csvRows.length === 0 || Object.keys(csvErrors).length > 0}
                  className="bg-[#0F2D52] hover:bg-[#1c477c] text-white"
                >
                  {isBulkSubmitting ? 'Uploading...' : `Upload ${csvRows.length - Object.keys(csvErrors).length} Employees`}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Confirm */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}>
          <DialogContent className="w-[95vw] max-w-md p-6">
            <DialogHeader>
              <DialogTitle>Deactivate Employee</DialogTitle>
            </DialogHeader>
            <p className="text-sm">Are you sure you want to mark {employeeToDelete?.firstName} as inactive?</p>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteEmployee}>Deactivate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
