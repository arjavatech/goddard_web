import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Search, Mail, Calendar, AlertTriangle, Clock, Filter, ArrowUp, ArrowDown, X, ChevronDown, Download, LayoutGrid, List } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiBaseUrl } from '../../config/env';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { downloadCSV, printAsPDF } from '../../lib/export';
import { useUserContext } from '../../contexts/UserContext';
import { EmployeeService, type Employee, type EmployeeFormAssignment } from '../../services/api/employee';
import { fetchFormTemplates } from '../../services/api/dashboard';

type DueFormStatus = 'pending' | 'completed' | 'overdue' | 'submitted' | 'in_progress';

interface LocalDueForm {
  id: string;
  formId: string;
  formName: string;
  employeeName: string;
  employeeType: string;
  employeeEmail: string;
  dueDate: string | null;
  status: DueFormStatus;
  assignedDate: string;
}

const parseDueDate = (dateString: string | null): Date | null => {
  if (!dateString) return null;
  const parts = dateString.split('-');
  if (parts.length !== 3) return null;
  let day: string, month: string, year: string;
  if (parts[0].length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(date.getTime()) ? null : date;
};

export function EmployeeDueForms() {
  const [dueForms, setDueForms] = useState<LocalDueForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<LocalDueForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [formFilter, setFormFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => typeof window !== 'undefined' && window.innerWidth < 768 ? 'card' : (localStorage.getItem('empDueFormsViewMode') as 'card' | 'table') || 'table');
  const handleViewModeChange = (mode: 'card' | 'table') => { setViewMode(mode); localStorage.setItem('empDueFormsViewMode', mode); };
  const [itemsPerPage, setItemsPerPage] = usePageSize('empDueForms', 10);
  useEffect(() => {
    const handleResize = () => { 
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 768) setViewMode('card'); 
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [remindingFormIds, setRemindingFormIds] = useState<Set<string>>(new Set());
  const [bulkRemindLoading, setBulkRemindLoading] = useState(false);
  const { showToast } = useToast();
  const { userData } = useUserContext();

  const schoolId = userData?.schoolId;

  const handleMultiSelectChange = (value: string, currentValues: string[], setter: (values: string[]) => void) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter(v => v !== value));
    } else {
      setter([...currentValues, value]);
    }
  };

  const MultiSelectDropdown = ({
    value,
    onValueChange,
    options,
    placeholder,
    
  }: {
    value: string[],
    onValueChange: (values: string[]) => void,
    options: string[],
    placeholder: string,
    label: string
  }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex min-h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all gap-2"
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {value.length === 0 ? (
              <span className="text-slate-400 font-semibold">{placeholder}</span>
            ) : (
              value.map(v => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 bg-[#EFF5FB] text-[#0F2D52] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#0F2D52]/10"
                >
                  {v}
                  <span
                    role="button"
                    onClick={e => { e.stopPropagation(); handleMultiSelectChange(v, value, onValueChange); }}
                    className="hover:text-red-500 transition-colors cursor-pointer leading-none"
                  >×</span>
                </span>
              ))
            )}
          </div>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-100 bg-white shadow-xl overflow-hidden">
            <div className="p-1.5 max-h-52 overflow-y-auto space-y-0.5">
              {options.length > 0 && (
                <div
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors border-b border-slate-100 mb-0.5 ${
                    value.length === options.length ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => onValueChange(value.length === options.length ? [] : [...options])}
                >
                  <span>Select All</span>
                  {value.length === options.length && (
                    <span className="h-4 w-4 rounded-full bg-[#0F2D52] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                  )}
                </div>
              )}
              {options.map((option) => {
                const selected = value.includes(option);
                return (
                  <div
                    key={option}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      selected ? 'bg-[#EFF5FB] text-[#0F2D52]' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    onClick={() => handleMultiSelectChange(option, value, onValueChange)}
                  >
                    <span>{option}</span>
                    {selected && (
                      <span className="h-4 w-4 rounded-full bg-[#0F2D52] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">✓</span>
                    )}
                  </div>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400 font-semibold">No options available</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        if (!schoolId) return;

        const [employees, templates, assignments] = await Promise.all([
          EmployeeService.fetchEmployees(schoolId).catch(() => [] as Employee[]),
          fetchFormTemplates(schoolId).catch(() => []),
          EmployeeService.fetchSchoolFormAssignments(schoolId).catch(() => [] as EmployeeFormAssignment[])
        ]);

        if (!isMounted) return;

        const employeeMap = new Map(employees.map(e => [e.id, e]));
        const templateMap = new Map(templates.map((t: any) => [String(t.id), t]));
        const today = new Date();
        const mappedForms: LocalDueForm[] = [];

        assignments.forEach(assignment => {
          const employee = employeeMap.get(assignment.employeeId);
          if (!employee) return;
          const template = templateMap.get(assignment.formId);
          const formName = template?.formName || 'Employee Form';
          const dueDate = template?.due_date || null;

          let status: DueFormStatus = 'pending';
          if (assignment.status === 'Approved') {
            status = 'completed';
          } else if (assignment.status === 'Submitted') {
            status = 'submitted';
          } else if (assignment.status === 'Rejected') {
            status = 'in_progress';
          } else {
            const due = parseDueDate(dueDate);
            if (due && due < today) {
              status = 'overdue';
            }
          }

          // Skip completed and submitted forms
          if (status === 'completed' || status === 'submitted') {
            return;
          }

          mappedForms.push({
            id: assignment.id,
            formId: assignment.formId,
            formName,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            employeeType: employee.employeeType || 'Employee',
            employeeEmail: employee.email,
            dueDate,
            status,
            assignedDate: assignment.assignedOn
          });
        });

        setDueForms(mappedForms);
        setFilteredForms(mappedForms);
      } catch (error) {
        console.error('Error fetching employee due forms:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  const allRoles = useMemo(() => {
    const set = new Set<string>();
    dueForms.forEach(f => { if (f.employeeType) set.add(f.employeeType); });
    return Array.from(set).sort();
  }, [dueForms]);

  const allFormNames = useMemo(() => {
    const set = new Set<string>();
    dueForms.forEach(f => set.add(f.formName));
    return Array.from(set).sort();
  }, [dueForms]);

  const activeFilterCount = useMemo(() => {
    return [roleFilter, formFilter, statusFilter].filter(arr => arr.length > 0).length;
  }, [roleFilter, formFilter, statusFilter]);

  const clearAllFilters = () => {
    setRoleFilter([]);
    setFormFilter([]);
    setStatusFilter([]);
  };

  const filteredFormsData = useMemo(() => {
    return dueForms.filter(form => {
      const matchesSearch =
        form.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.employeeEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter.length === 0 || roleFilter.includes(form.employeeType);
      const matchesForm = formFilter.length === 0 || formFilter.includes(form.formName);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(form.status);

      return matchesSearch && matchesRole && matchesForm && matchesStatus;
    });
  }, [dueForms, searchQuery, roleFilter, formFilter, statusFilter]);

  const [sortBy, setSortBy] = useState('formName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortLabel = () => {
    const labels: Record<string, string> = {
      formName: 'Form',
      employeeName: 'Employee',
      employeeType: 'Role',
      dueDate: 'Due Date',
      status: 'Status',
    };
    return labels[sortBy] || 'Sort';
  };

  useEffect(() => {
    const sorted = [...filteredFormsData].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'formName': aVal = a.formName; bVal = b.formName; break;
        case 'employeeName': aVal = a.employeeName; bVal = b.employeeName; break;
        case 'employeeType': aVal = a.employeeType; bVal = b.employeeType; break;
        case 'dueDate': aVal = a.dueDate || ''; bVal = b.dueDate || ''; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: aVal = a.formName; bVal = b.formName;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      const result = sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      return result;
    });
    setFilteredForms(sorted);
  }, [filteredFormsData, sortBy, sortOrder]);



  const {
    currentPage,
    totalPages,
    paginatedData: paginatedForms,
    setCurrentPage
  } = usePagination({ data: filteredForms, itemsPerPage });

  const dueFormsExportHeaders = ['Form', 'Employee', 'Role', 'Email', 'Due Date', 'Status'];
  
  const getDueFormsExportRows = () => filteredForms.map(form => [
    form.formName,
    form.employeeName,
    form.employeeType,
    form.employeeEmail,
    formatDate(form.dueDate),
    form.status
  ]);

  const exportToCSV = () => downloadCSV(
    `employee_due_forms_export_${new Date().toISOString().split('T')[0]}.csv`,
    dueFormsExportHeaders,
    getDueFormsExportRows()
  );

  const exportToPDF = () => printAsPDF('Employee Due Forms Export', dueFormsExportHeaders, getDueFormsExportRows());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedForms(filteredForms.map(form => form.id));
    } else {
      setSelectedForms([]);
    }
  };

  const handleSelectForm = (formId: string, checked: boolean) => {
    if (checked) {
      setSelectedForms(prev => [...prev, formId]);
    } else {
      setSelectedForms(prev => prev.filter(id => id !== formId));
    }
  };

  const handleSendReminder = async (formIds: string[], isBulk = false) => {
    try {
      if (isBulk) {
        setBulkRemindLoading(true);
      } else {
        setRemindingFormIds(prev => new Set([...prev, ...formIds]));
      }
      if (!schoolId) return;

      const formsToRemind = dueForms.filter(f => formIds.includes(f.id) && f.status !== 'completed');

      if (formsToRemind.length === 0) {
        showToast('error', 'No reminders to send — all selected forms are already completed');
        return;
      }
      
      const reminders = formsToRemind.map(form => ({
        employee_email: form.employeeEmail,
        employee_name: form.employeeName,
        form_name: form.formName,
        due_date: form.dueDate || ''
      }));

      const response = await fetch(`${apiBaseUrl}/emails/bulk-form-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-owner-key-2024'
        },
        body: JSON.stringify({
          school_id: schoolId,
          reminders
        })
      });

      if (response.status === 502) {
        showToast('error', 'Email delivery failed. Please try again later or use a different email address.');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const { total_failed, failed_emails, message } = data;
        
        if (total_failed > 0) {
          const failedEmailsList = failed_emails.filter((email: string) => email).join(', ');
          showToast('error', `${message}. Failed emails: ${failedEmailsList}`);
        } else {
          showToast('success', message);
        }
        setSelectedForms([]);
      } else {
        showToast('error', 'Failed to send reminder emails');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      showToast('error', 'Failed to send reminder emails');
    } finally {
      if (isBulk) {
        setBulkRemindLoading(false);
      } else {
        setRemindingFormIds(prev => {
          const updated = new Set(prev);
          formIds.forEach(id => updated.delete(id));
          return updated;
        });
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />Needs Attention</Badge>;
      case 'pending':
        return <Badge variant="warning" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = parseDueDate(dateString);
    if (date) {
      return date.toLocaleDateString('en-US');
    }
    return dateString;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    const date = parseDueDate(dueDate);
    if (!date) return false;
    const today = new Date();
    return date < today && date.toDateString() !== today.toDateString();
  };

  const stats = {
    total: dueForms.length,
    pending: dueForms.filter(f => f.status === 'pending').length,
    in_progress: dueForms.filter(f => f.status === 'in_progress').length,
    overdue: dueForms.filter(f => f.status === 'overdue').length
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 max-w-7xl mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading employee due forms tracking...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4  py-0 sm:pt-12 max-w-7xl space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">             Employee Due Forms Tracking
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Monitor form completion status and send reminders to employees
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                    Total Forms
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{stats.total}</p>
                </div>
                <div className="p-2.5 bg-[#EFF5FB] rounded-xl flex-shrink-0 ml-2">
                  <Calendar className="h-4 w-4 text-[#0F2D52]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                    Pending
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{stats.pending}</p>
                </div>
                <div className="p-2.5 bg-amber-50 rounded-xl flex-shrink-0 ml-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                    Needs Attention
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{stats.in_progress}</p>
                </div>
                <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0 ml-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 shadow-xs bg-white">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 truncate">
                    Overdue
                  </p>
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{stats.overdue}</p>
                </div>
                <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0 ml-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search forms, employees, or emails..."
                  className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(prev => !prev)}
                  size="sm"
                  className="h-10 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all relative"
                >
                  {showFilters ? (
                    <><X className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline"> Hide Filters</span></>
                  ) : (
                    <><Filter className="h-4 w-4 sm:mr-1.5 text-slate-400" /><span className="hidden sm:inline"> Filters</span></>
                  )}
                  {!showFilters && activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-extrabold text-white animate-pulse">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold transition-all">
                      {sortOrder === 'asc' ? <ArrowUp className="h-3.5 w-3.5 sm:mr-1.5 text-slate-400" /> : <ArrowDown className="h-3.5 w-3.5 sm:mr-1.5 text-slate-400" />}
                      <span className="hidden sm:inline">{getSortLabel()}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('formName'); setSortOrder('asc'); }}>Form A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('formName'); setSortOrder('desc'); }}>Form Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('employeeName'); setSortOrder('asc'); }}>Employee A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('employeeName'); setSortOrder('desc'); }}>Employee Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('employeeType'); setSortOrder('asc'); }}>Role A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('employeeType'); setSortOrder('desc'); }}>Role Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {showFilters && (
              <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3 mt-3">
                {activeFilterCount > 0 && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs text-slate-500 font-bold">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                    </span>
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 rounded-lg bg-white border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-extrabold transition-all">
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear All
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Role</label>
                    <MultiSelectDropdown
                      value={roleFilter}
                      onValueChange={setRoleFilter}
                      options={allRoles}
                      placeholder="Select roles"
                      label="Role"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Form</label>
                    <MultiSelectDropdown
                      value={formFilter}
                      onValueChange={setFormFilter}
                      options={allFormNames}
                      placeholder="Select forms"
                      label="Form"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
                    <MultiSelectDropdown
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                      options={['pending', 'in_progress', 'overdue']}
                      placeholder="Select statuses"
                      label="Status"
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Forms Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-50 bg-slate-50/50 px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-slate-900">Due Forms ({filteredForms.length})</CardTitle>
              {/* Segmented View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Card View</span>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedForms.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-white text-slate-700 border border-slate-200 hover:bg-[#0F2D52] hover:text-white rounded-xl h-10 sm:h-11 text-xs font-bold transition-all group">
                      <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400 group-hover:text-white" />
                      Export Selected ({selectedForms.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => {
                      const selectedFormObjects = dueForms.filter(f => selectedForms.includes(f.id));
                      const headers = dueFormsExportHeaders;
                      const rows = selectedFormObjects.map(form => [
                        form.formName,
                        form.employeeName,
                        form.employeeType,
                        form.employeeEmail,
                        formatDate(form.dueDate),
                        form.status
                      ]);
                      downloadCSV(
                        `selected_employee_forms_export_${new Date().toISOString().split('T')[0]}.csv`,
                        headers,
                        rows
                      );
                    }}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => {
                      const selectedFormObjects = dueForms.filter(f => selectedForms.includes(f.id));
                      const headers = dueFormsExportHeaders;
                      const rows = selectedFormObjects.map(form => [
                        form.formName,
                        form.employeeName,
                        form.employeeType,
                        form.employeeEmail,
                        formatDate(form.dueDate),
                        form.status
                      ]);
                      printAsPDF('Selected Employee Forms Export', headers, rows);
                    }}>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {filteredForms.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="bg-white text-slate-700 border border-slate-200 hover:bg-[#0F2D52] hover:text-white rounded-xl h-10 sm:h-11 text-xs font-bold transition-all group">
                      <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400 group-hover:text-white" />
                      Export All
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF}>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" className="bg-white text-[#0F2D52]/40 border-2 border-[#0F2D52]/20 rounded-xl h-10 sm:h-11 flex-shrink-0 cursor-not-allowed" disabled>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export All
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 border-2 border-[#0F2D52] rounded-xl h-10 sm:h-11 transition-all duration-200" size="sm" disabled={bulkRemindLoading}>
                    {bulkRemindLoading ? (
                      <>
                        <div className="h-4 w-4 mr-1.5 border-2 border-[#0F2D52] border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-1.5" />
                        Remind
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedForms.length > 0 && (
                    <DropdownMenuItem onClick={() => handleSendReminder(selectedForms, true)} disabled={bulkRemindLoading}>
                      Remind Selected ({selectedForms.length})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'pending').map(f => f.id), true)}
                    disabled={filteredForms.filter(f => f.status === 'pending').length === 0 || bulkRemindLoading}
                  >
                    Remind Pending ({filteredForms.filter(f => f.status === 'pending').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'in_progress').map(f => f.id), true)}
                    disabled={filteredForms.filter(f => f.status === 'in_progress').length === 0 || bulkRemindLoading}
                  >
                    Remind Needs Attention ({filteredForms.filter(f => f.status === 'in_progress').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'overdue').map(f => f.id), true)}
                    disabled={filteredForms.filter(f => f.status === 'overdue').length === 0 || bulkRemindLoading}
                  >
                    Remind Overdue ({filteredForms.filter(f => f.status === 'overdue').length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </CardHeader>
            <div className="flex justify-end items-center px-4 py-3 border-b border-slate-50 bg-slate-50/20">
              <div className="flex items-center gap-2">
                <PageSizeSelector
                  pageSize={itemsPerPage}
                  onPageSizeChange={setItemsPerPage}
                  options={[10, 25, 50, 100]}
                />
              </div>
            </div>
            <CardContent className="p-0">
            {filteredForms.length > 0 ? (
              <>
                {/* Conditional Rendering of Views */}
                {viewMode === 'card' ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                      <Checkbox
                        checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-xs font-bold text-slate-700">Select All</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedForms.map(form => (
                        <Card key={form.id} className="p-5 rounded-2xl border border-slate-100 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-4">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <Checkbox
                                  checked={selectedForms.includes(form.id)}
                                  onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                                  className="flex-shrink-0"
                                />
                                <div className="w-9 h-9 rounded-xl bg-[#044ba0] text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 border border-slate-100">
                                  {form.employeeName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-900 text-sm truncate">{form.formName}</p>
                                  <p className="text-[10px] font-extrabold text-slate-400 truncate mt-0.5 uppercase tracking-wider">{form.employeeName} &bull; {form.employeeType}</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 font-semibold">Email:</span>
                                <div className="whitespace-nowrap font-bold text-slate-700 text-right">{form.employeeEmail}</div>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 font-semibold">Due:</span>
                                <span className={`font-bold ${
                                  isOverdue(form.dueDate) && form.status !== 'completed' ? 'text-red-600' : form.dueDate ? 'text-slate-700' : 'text-slate-400'
                                }`}>{formatDate(form.dueDate)}</span>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50 mt-1">
                                <span className="text-slate-400 font-semibold">Status:</span>
                                <span className="font-semibold truncate max-w-[60%] text-right">{getStatusBadge(form.status)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-slate-100">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder([form.id])}
                              disabled={form.status === 'completed' || remindingFormIds.has(form.id)}
                              className="w-full h-9 text-xs font-bold rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-90 hover:text-white border border-[#0F2D52] transition-all duration-200"
                            >
                              {remindingFormIds.has(form.id) ? (
                                <>
                                  <div className="h-3 w-3 mr-1.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="h-4 w-4 mr-1.5" />
                                  Send Reminder
                                </>
                              )}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <MobilePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredForms.length}
                      itemsPerPage={itemsPerPage}
                      onPageSizeChange={setItemsPerPage}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto relative z-0">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50">
                            <th className="text-center py-3.5 px-3 w-12 border-y border-slate-200/85 bg-slate-50/80">
                              <Checkbox
                                checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                                indeterminate={selectedForms.length > 0 && selectedForms.length < filteredForms.length}
                                onCheckedChange={handleSelectAll}
                              />
                            </th>
                            <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 w-[20%]">Form</th>
                            <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden sm:table-cell w-[15%]">Employee</th>
                            <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden md:table-cell w-[12%]">Role</th>
                            <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden md:table-cell w-[23%]">Email</th>
                            <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden lg:table-cell w-[10%]">Due Date</th>
                            <th className="text-center py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 w-[10%]">Status</th>
                            <th className="text-right py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 w-[10%]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedForms.map(form => (
                            <tr key={form.id} className={`border-b border-slate-50 transition-all duration-150 ease-in-out ${selectedForms.includes(form.id) ? 'bg-[#EFF5FB] hover:bg-[#e6f0f9]' : 'hover:bg-[#F8FAFC]'}`}>
                              <td className="py-4 px-3 text-center">
                                <Checkbox
                                  checked={selectedForms.includes(form.id)}
                                  onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                                />
                              </td>
                              <td className="py-4 px-3 max-w-xs">
                                <div className="font-bold text-slate-900 text-sm truncate">{form.formName}</div>
                                <div className="text-xs font-semibold text-slate-400 truncate sm:hidden mt-0.5">{form.employeeName}</div>
                                <div className="text-xs font-semibold text-slate-400 truncate lg:hidden sm:hidden">
                                  {formatDate(form.dueDate)}
                                </div>
                              </td>
                              <td className="py-4 px-3 text-sm font-semibold text-slate-700 hidden sm:table-cell max-w-0">
                                <div className="truncate">{form.employeeName}</div>
                              </td>
                              <td className="py-4 px-3 text-sm font-semibold text-slate-700 hidden md:table-cell max-w-0">
                                <div className="truncate">{form.employeeType}</div>
                              </td>
                              <td className="py-4 px-3 text-xs hidden md:table-cell max-w-0">
                                <div className="whitespace-nowrap font-bold text-slate-800">{form.employeeEmail}</div>
                              </td>
                              <td className="py-4 px-3 text-xs font-semibold text-slate-700 hidden lg:table-cell">
                                <span className={isOverdue(form.dueDate) && form.status !== 'completed' ? 'text-red-600 font-bold' : form.dueDate ? '' : 'text-slate-400'}>
                                  {formatDate(form.dueDate)}
                                </span>
                              </td>
                              <td className="py-4 px-3 text-center">
                                {getStatusBadge(form.status)}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleSendReminder([form.id])}
                                  disabled={form.status === 'completed' || remindingFormIds.has(form.id)}
                                  className="h-8 px-3 text-xs rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-90 border border-[#0F2D52] hover:text-white transition-all duration-200 font-bold"
                                >
                                  {remindingFormIds.has(form.id) ? (
                                    <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Mail className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  <span>{remindingFormIds.has(form.id) ? 'Sending...' : 'Remind'}</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-5 py-4 border-t border-slate-50">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredForms.length}
                        itemsPerPage={itemsPerPage}
                        onPageSizeChange={setItemsPerPage}
                        onPageChange={setCurrentPage}
                        className="flex"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl">
                <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-xs font-bold">No forms match your current filters</p>
              </div>
            )}
          </CardContent>
        </div>
      </motion.div>
    </AdminLayout>
  );
}
