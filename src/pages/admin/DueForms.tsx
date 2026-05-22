import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Search, Mail, Calendar, AlertTriangle, CheckCircle, Clock, Filter, ArrowUp, ArrowDown, X, ChevronDown, Download } from 'lucide-react';
import { DueForm } from '../../services/api/admin';
import { useToast } from '../../contexts/ToastContext';
import { apiBaseUrl } from '../../config/env';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { PageLoader } from '../../components/ui/page-loader';
import { downloadCSV, printAsPDF } from '../../lib/export';


export function DueForms() {
  const [dueForms, setDueForms] = useState<DueForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<DueForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classroomFilter, setClassroomFilter] = useState<string[]>([]);
  const [formFilter, setFormFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const schoolId = localStorage.getItem('schoolId');

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
          className="flex h-10 sm:h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className="truncate">
            {value.length === 0 ? placeholder : `${value.length} selected`}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
            <div className="p-1 max-h-60 overflow-y-auto">
              {options.map((option) => (
                <div
                  key={option}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleMultiSelectChange(option, value, onValueChange)}
                >
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={value.includes(option)}
                      onChange={() => {}}
                      className="pointer-events-none"
                    />
                    <span>{option}</span>
                  </div>
                </div>
              ))}
              {options.length === 0 && (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No options available
                </div>
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
        // const user = await fetchUserContext();
        if (!schoolId) return;
        
        // Use new enrollments API
        const response = await fetch(`${apiBaseUrl}/enrollments?school_id=${schoolId}`, {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-owner-key-2024',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const enrollments = data.enrollments || [];
          
          // Map enrollments to due forms
          const mappedForms: DueForm[] = [];
          
          enrollments.forEach((enrollment: any) => {
            Object.entries(enrollment.forms || {}).forEach(([formName, formData]: [string, any]) => {
              const today = new Date();
              
              // Parse DD-MM-YYYY format
              let dueDate = null;
              if (formData.due_date) {
                const parts = formData.due_date.split('-');
                if (parts.length === 3) {
                  const [day, month, year] = parts;
                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
              }
              
              const submittedStatuses = new Set(['submitted', 'received']);
              const inProgressStatuses = new Set(['in progress', 'in_progress']);
              let status: 'pending' | 'completed' | 'overdue' | 'submitted' | 'in_progress' = 'pending';
              if (formData.status === 'approved') {
                status = 'completed';
              } else if (formData.status && inProgressStatuses.has(formData.status.toLowerCase().replace(/_/g, ' '))) {
                status = 'in_progress';
              } else if (formData.status && submittedStatuses.has(formData.status.toLowerCase().replace(/_/g, ' '))) {
                status = 'submitted';
              } else if (dueDate && dueDate < today) {
                status = 'overdue';
              }
              
              // Skip completed and submitted forms
              if (status === 'completed' || status === 'submitted') {
                return;
              }
              
              // Combine parent names and emails
              let parentName = `${enrollment.parent_first_name} ${enrollment.parent_last_name}`;
              let parentEmail = enrollment.primary_email;
              
              if (enrollment.secondary_parent_first_name) {
                parentName += ` & ${enrollment.secondary_parent_first_name} ${enrollment.secondary_parent_last_name}`;
                if (enrollment.secondary_parent_email) {
                  parentEmail += `, ${enrollment.secondary_parent_email}`;
                }
              }
              
              mappedForms.push({
                id: `${enrollment.enrollment_id}-${formName}`,
                formName,
                studentName: `${enrollment.child_first_name} ${enrollment.child_last_name}`,
                classroomName: enrollment.class_name || 'Unassigned',
                parentName,
                parentEmail,
                dueDate: formData.due_date || null,
                status,
                assignedDate: formData.assigned_at || ''
              });
            });
          });
          
          if (!isMounted) return;
          setDueForms(mappedForms);
          setFilteredForms(mappedForms);
        } else {
          console.error('Failed to fetch enrollments');
        }
      } catch (error) {
        console.error('Error fetching due forms:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const allClassrooms = useMemo(() => {
    const set = new Set<string>();
    dueForms.forEach(f => { if (f.classroomName && f.classroomName !== 'Unassigned') set.add(f.classroomName); });
    return Array.from(set).sort();
  }, [dueForms]);

  const allFormNames = useMemo(() => {
    const set = new Set<string>();
    dueForms.forEach(f => set.add(f.formName));
    return Array.from(set).sort();
  }, [dueForms]);

  const activeFilterCount = useMemo(() => {
    return [classroomFilter, formFilter, statusFilter].filter(arr => arr.length > 0).length;
  }, [classroomFilter, formFilter, statusFilter]);

  const clearAllFilters = () => {
    setClassroomFilter([]);
    setFormFilter([]);
    setStatusFilter([]);
  };

  const filteredFormsData = useMemo(() => {
    return dueForms.filter(form => {
      const matchesSearch =
        form.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.parentName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClassroom = classroomFilter.length === 0 || classroomFilter.includes(form.classroomName);
      const matchesForm = formFilter.length === 0 || formFilter.includes(form.formName);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(form.status);

      return matchesSearch && matchesClassroom && matchesForm && matchesStatus;
    });
  }, [dueForms, searchQuery, classroomFilter, formFilter, statusFilter]);

  const [sortBy, setSortBy] = useState('formName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortLabel = () => {
    const labels: Record<string, string> = {
      formName: 'Form',
      studentName: 'Student',
      classroomName: 'Classroom',
      parentName: 'Parent',
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
        case 'studentName': aVal = a.studentName; bVal = b.studentName; break;
        case 'classroomName': aVal = a.classroomName; bVal = b.classroomName; break;
        case 'parentName': aVal = a.parentName; bVal = b.parentName; break;
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
    itemsPerPage,
    setCurrentPage
  } = usePagination({ data: filteredForms });

  const dueFormsExportHeaders = ['Form', 'Student', 'Classroom', 'Parent', 'Parent Email', 'Due Date', 'Status'];
  
  const getDueFormsExportRows = () => filteredForms.map(form => [
    form.formName,
    form.studentName,
    form.classroomName,
    form.parentName,
    form.parentEmail,
    formatDate(form.dueDate),
    form.status
  ]);

  const exportToCSV = () => downloadCSV(
    `due_forms_export_${new Date().toISOString().split('T')[0]}.csv`,
    dueFormsExportHeaders,
    getDueFormsExportRows()
  );

  const exportToPDF = () => printAsPDF('Due Forms Export', dueFormsExportHeaders, getDueFormsExportRows());

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

  const handleSendReminder = async (formIds: string[]) => {
    try {
      // const user = await fetchUserContext();
      if (!schoolId) return;

      const formsToRemind = dueForms.filter(f => formIds.includes(f.id) && f.status !== 'completed');

      if (formsToRemind.length === 0) {
        showToast('error', 'No reminders to send — all selected forms are already completed');
        return;
      }
      
      const reminders = formsToRemind.map(form => ({
        parent_email: form.parentEmail,
        parent_name: form.parentName,
        student_name: form.studentName,
        class_name: form.classroomName,
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

      if (response.ok) {
        showToast('success', `Reminder emails sent to ${formsToRemind.length} parent(s)`);
        setSelectedForms([]);
      } else {
        showToast('error', 'Failed to send reminder emails');
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      showToast('error', 'Failed to send reminder emails');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'overdue':
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" />In Progress</Badge>;
      case 'pending':
        return <Badge variant="warning" className="text-xs"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    
    // Handle DD-MM-YYYY format
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US');
      }
    }
    
    return dateString;
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    
    // Parse DD-MM-YYYY format
    const parts = dueDate.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        const today = new Date();
        return date < today && date.toDateString() !== today.toDateString();
      }
    }
    
    return false;
  };

  const stats = {
    total: dueForms.length,
    pending: dueForms.filter(f => f.status === 'pending').length,
    in_progress: dueForms.filter(f => f.status === 'in_progress').length,
    overdue: dueForms.filter(f => f.status === 'overdue').length
  };

  if (loading) {
    return <PageLoader message="Loading due forms tracking..." Layout={AdminLayout} />;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
            Due Forms Tracking
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor form completion status and send reminders to parents
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Total Forms</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.pending}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full flex-shrink-0 ml-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">In Progress</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.in_progress}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full flex-shrink-0 ml-2">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">Overdue</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.overdue}</p>
                </div>
                <div className="p-2 bg-red-100 rounded-full flex-shrink-0 ml-2">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search forms, students, or parents..."
                  className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(prev => !prev)}
                  size="sm"
                  className="h-10 sm:h-11 relative"
                >
                  {showFilters ? (
                    <><X className="h-4 w-4 mr-2" /> Hide Filters</>
                  ) : (
                    <><Filter className="h-4 w-4 mr-2" /> Filters</>
                  )}
                  {!showFilters && activeFilterCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-semibold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 sm:h-11">
                      {sortOrder === 'asc'
                        ? <ArrowUp className="h-4 w-4 mr-2" />
                        : <ArrowDown className="h-4 w-4 mr-2" />}
                      {getSortLabel()}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortBy('formName'); setSortOrder('asc'); }}>Form A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('formName'); setSortOrder('desc'); }}>Form Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('studentName'); setSortOrder('asc'); }}>Student A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('studentName'); setSortOrder('desc'); }}>Student Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('classroomName'); setSortOrder('asc'); }}>Classroom A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('classroomName'); setSortOrder('desc'); }}>Classroom Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('parentName'); setSortOrder('asc'); }}>Parent A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('parentName'); setSortOrder('desc'); }}>Parent Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {showFilters && (
              <div className="p-3 sm:p-4 bg-background rounded-lg border space-y-3">
                {activeFilterCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                    </span>
                    <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-10 sm:h-11">
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Classroom</label>
                    <MultiSelectDropdown
                      value={classroomFilter}
                      onValueChange={setClassroomFilter}
                      options={allClassrooms}
                      placeholder="Select classrooms"
                      label="Classroom"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Form</label>
                    <MultiSelectDropdown
                      value={formFilter}
                      onValueChange={setFormFilter}
                      options={allFormNames}
                      placeholder="Select forms"
                      label="Form"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs sm:text-sm font-medium text-muted-foreground">Status</label>
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
        </Card>

        {/* Forms Table */}
        <Card className="glass-card">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
            <CardTitle className="text-base sm:text-lg">Due Forms ({filteredForms.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {selectedForms.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 bg-amazon-teal hover:bg-amazon-teal/90 text-white">
                      <Download className="h-4 w-4 mr-1.5" />
                      Export Selected ({selectedForms.length})
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const selectedFormObjects = dueForms.filter(f => selectedForms.includes(f.id));
                      const headers = dueFormsExportHeaders;
                      const rows = selectedFormObjects.map(form => [
                        form.formName,
                        form.studentName,
                        form.classroomName,
                        form.parentName,
                        form.parentEmail,
                        formatDate(form.dueDate),
                        form.status
                      ]);
                      downloadCSV(
                        `selected_forms_export_${new Date().toISOString().split('T')[0]}.csv`,
                        headers,
                        rows
                      );
                    }}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      const selectedFormObjects = dueForms.filter(f => selectedForms.includes(f.id));
                      const headers = dueFormsExportHeaders;
                      const rows = selectedFormObjects.map(form => [
                        form.formName,
                        form.studentName,
                        form.classroomName,
                        form.parentName,
                        form.parentEmail,
                        formatDate(form.dueDate),
                        form.status
                      ]);
                      printAsPDF('Selected Forms Export', headers, rows);
                    }}>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {filteredForms.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="h-8 bg-amazon-teal hover:bg-amazon-teal/90 text-white">
                      <Download className="h-4 w-4 mr-1.5" />
                      Export All
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToCSV}>Export as CSV</DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToPDF}>Export as PDF</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button size="sm" className="h-8" disabled>
                  <Download className="h-4 w-4 mr-1.5" />
                  Export All
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8 bg-amazon-teal hover:bg-amazon-teal/90" size="sm">
                    <Mail className="h-4 w-4 mr-1.5" />
                    Remind
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {selectedForms.length > 0 && (
                    <DropdownMenuItem onClick={() => handleSendReminder(selectedForms)}>
                      Remind Selected ({selectedForms.length})
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'pending').map(f => f.id))}
                    disabled={filteredForms.filter(f => f.status === 'pending').length === 0}
                  >
                    Remind Pending ({filteredForms.filter(f => f.status === 'pending').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'in_progress').map(f => f.id))}
                    disabled={filteredForms.filter(f => f.status === 'in_progress').length === 0}
                  >
                    Remind In Progress ({filteredForms.filter(f => f.status === 'in_progress').length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSendReminder(filteredForms.filter(f => f.status === 'overdue').map(f => f.id))}
                    disabled={filteredForms.filter(f => f.status === 'overdue').length === 0}
                  >
                    Remind Overdue ({filteredForms.filter(f => f.status === 'overdue').length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredForms.length > 0 ? (
              <>
                {/* Card View — mobile only */}
                <div className="md:hidden p-3 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox
                      checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paginatedForms.map(form => (
                      <div key={form.id} className="border rounded-lg p-3 sm:p-4 bg-card space-y-2 sm:space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Checkbox
                              checked={selectedForms.includes(form.id)}
                              onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                              className="flex-shrink-0"
                            />
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-semibold text-xs flex-shrink-0">
                              {form.studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{form.formName}</p>
                              <p className="text-xs text-muted-foreground truncate">{form.studentName} &bull; {form.classroomName}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Parent:</span>
                            <span className="font-medium truncate max-w-[60%] text-right">{form.parentName.split(' & ')[0]}</span>
                          </div>
                          {form.parentName.includes(' & ') && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Secondary:</span>
                              <span className="font-medium truncate max-w-[60%] text-right">{form.parentName.split(' & ')[1]}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Due:</span>
                            <span className={`font-medium ${
                              isOverdue(form.dueDate) && form.status !== 'completed' ? 'text-red-600' : form.dueDate ? '' : 'text-muted-foreground'
                            }`}>{formatDate(form.dueDate)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium truncate max-w-[60%] text-right">{getStatusBadge(form.status)}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSendReminder([form.id])}
                            disabled={form.status === 'completed'}
                            className="w-full h-7 text-xs"
                          >
                            <Mail className="h-3 w-3 mr-1" />
                            Send Reminder
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <MobilePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>

                {/* Table — tablet & desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-muted/30">
                        <th className="text-center py-3 px-2 font-medium text-gray-600 w-10">
                          <Checkbox
                            checked={selectedForms.length === filteredForms.length && filteredForms.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Form</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600 hidden sm:table-cell">Student</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600 hidden md:table-cell">Classroom</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600 hidden md:table-cell">Parent</th>
                        <th className="text-left py-3 px-2 font-medium text-gray-600 hidden lg:table-cell">Due Date</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-600">Status</th>
                        <th className="text-center py-3 px-2 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedForms.map(form => (
                        <tr key={form.id} className="border-b border-gray-100 hover:bg-muted/50">
                          <td className="py-3 px-2 text-center">
                            <Checkbox
                              checked={selectedForms.includes(form.id)}
                              onCheckedChange={(checked) => handleSelectForm(form.id, checked as boolean)}
                            />
                          </td>
                          <td className="py-3 px-3 font-medium text-sm max-w-0">
                            <div className="truncate">{form.formName}</div>
                            <div className="text-xs text-muted-foreground truncate sm:hidden">{form.studentName}</div>
                            <div className="text-xs text-muted-foreground truncate md:hidden">
                              {form.parentName.split(' & ')[0]}
                            </div>
                            <div className="text-xs text-muted-foreground truncate lg:hidden sm:hidden">
                              {formatDate(form.dueDate)}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-sm max-w-0 hidden sm:table-cell">
                            <div className="truncate">{form.studentName}</div>
                          </td>
                          <td className="py-3 px-2 text-sm max-w-0 hidden md:table-cell">
                            <div className="truncate">{form.classroomName}</div>
                          </td>
                          <td className="py-3 px-2 text-sm max-w-0 hidden md:table-cell">
                            <div className="font-medium truncate">{form.parentName.split(' & ')[0]}</div>
                            <div className="text-xs text-muted-foreground truncate">{form.parentEmail.split(', ')[0]}</div>
                            {form.parentName.includes(' & ') && (
                              <div className="mt-1">
                                <div className="font-medium truncate">{form.parentName.split(' & ')[1]}</div>
                                <div className="text-xs text-muted-foreground truncate">{form.parentEmail.split(', ')[1] || ''}</div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-sm whitespace-nowrap hidden lg:table-cell">
                            <span className={isOverdue(form.dueDate) && form.status !== 'completed' ? 'text-red-600 font-medium' : form.dueDate ? '' : 'text-muted-foreground'}>
                              {formatDate(form.dueDate)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">{getStatusBadge(form.status)}</td>
                          <td className="py-3 px-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder([form.id])}
                              disabled={form.status === 'completed'}
                              className="h-8 px-2 sm:px-3 text-xs gap-1 whitespace-nowrap"
                            >
                              <Mail className="h-3 w-3" />
                              <span className="hidden sm:inline">Remind</span>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredForms.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  className="hidden md:flex"
                />

               

            
              </>
            ) : (
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No forms match your current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}