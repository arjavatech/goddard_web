import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Search, Calendar, CheckCircle, Filter, ArrowUp, ArrowDown, X, ChevronDown, LayoutGrid, List, FileText, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiBaseUrl } from '../../config/env';
import { Pagination, MobilePagination } from '../../components/ui/pagination';
import { PageSizeSelector } from '../../components/ui/page-size-selector';
import { usePagination } from '../../hooks/usePagination';
import { usePageSize } from '../../hooks/usePageSize';
import { useUserContext } from '../../contexts/UserContext';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { fetchParentDetails } from '../../services/api/admin';

const isInvalidFormId = (id: string | null | undefined): boolean => {
  if (!id) return true;
  const trimmed = id.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === '#' ||
    trimmed === 'test' ||
    trimmed === 'undefined' ||
    trimmed === 'null' ||
    trimmed === 'placeholder' ||
    trimmed === 'none' ||
    trimmed === 'dummy' ||
    (trimmed.length < 4 && !/^https?:\/\//i.test(trimmed))
  );
};

type LocalDueForm = {
  id: string;
  formName: string;
  studentName: string;
  classroomName: string;
  parentName: string;
  parentEmail: string;
  dueDate: string | null;
  status: string;
  assignedDate: string;
  studentFormAssignmentId?: string;
  filloutFormId?: string;
  recentEditLink?: string;
  recentPdfLink?: string;
  childDob?: string;
  childGender?: string;
  rawFormData: any;
};

export function FormsPendingApproval() {
  const [dueForms, setDueForms] = useState<LocalDueForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<LocalDueForm[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classroomFilter, setClassroomFilter] = useState<string[]>([]);
  const [formFilter, setFormFilter] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(() => (localStorage.getItem('formsPendingViewMode') as 'card' | 'table') || 'table');
  const handleViewModeChange = (mode: 'card' | 'table') => { setViewMode(mode); localStorage.setItem('formsPendingViewMode', mode); };
  const [itemsPerPage, setItemsPerPage] = usePageSize('formsPendingApproval', 10);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { schoolSubdomain } = useUserContext();

  useEffect(() => {
    const handleResize = () => { 
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    label
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
        
        const [response, templates, parentDetailsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/enrollments?school_id=${schoolId}`, {
            method: 'GET',
            headers: {
              'X-API-Key': 'test-owner-key-2024',
              'Content-Type': 'application/json'
            }
          }),
          fetchFormTemplates(schoolId).catch(() => []),
          fetchParentDetails(schoolId).catch(() => ({ activeParents: [], inactiveParents: [] }))
        ]);
        
        if (response.ok) {
          const data = await response.json();
          const enrollments = data.enrollments || [];
          
          const allParents = [...(parentDetailsResponse.activeParents || []), ...(parentDetailsResponse.inactiveParents || [])];
          
          const mappedForms: LocalDueForm[] = [];
          
          enrollments.forEach((enrollment: any) => {
            Object.entries(enrollment.forms || {}).forEach(([formName, formData]: [string, any]) => {
              const submittedStatuses = new Set(['submitted', 'received', 'in progress']);
              
              if (!formData.status || !submittedStatuses.has(formData.status.toLowerCase().replace(/_/g, ' '))) {
                return; // Only process forms that are submitted (Pending Approval)
              }

              // Find template by matching form ID or name
              const formId = formData.id || formData.form_id || formData.formId;
              const template = templates.find(t => t.id === formId || t.formName === formName || (t as any).form_name === formName);

              // Resolve exactly like ParentDetails.tsx
              const filloutFormUrl = (!isInvalidFormId(formData.recent_edit_link) ? formData.recent_edit_link : null) ||
                  (!isInvalidFormId(formData.fillout_form_id) ? formData.fillout_form_id : null) ||
                  (!isInvalidFormId(formData.filloutFormId) ? formData.filloutFormId : null) ||
                  template?.filloutFormUrl ||
                  (template as any)?.fillout_form_url ||
                  '#';

              const filloutFormId = (!isInvalidFormId(formData.fillout_form_id) ? formData.fillout_form_id : null) ||
                  (!isInvalidFormId(formData.filloutFormId) ? formData.filloutFormId : null) ||
                  template?.filloutFormUrl ||
                  (template as any)?.fillout_form_url ||
                  '#';
              
              let parentName = `${enrollment.parent_first_name} ${enrollment.parent_last_name}`;
              let parentEmail = enrollment.primary_email;
              
              if (enrollment.secondary_parent_first_name) {
                parentName += ` & ${enrollment.secondary_parent_first_name} ${enrollment.secondary_parent_last_name}`;
                if (enrollment.secondary_parent_email) {
                  parentEmail += `, ${enrollment.secondary_parent_email}`;
                }
              }
              
              // Enhance formData with the resolved URLs so it is passed properly in state
              const enhancedFormData = {
                ...formData,
                link: filloutFormUrl,
                fillout_form_id: filloutFormId,
                recent_edit_link: !isInvalidFormId(formData.recent_edit_link) ? formData.recent_edit_link : null
              };

              const extractIdFromUrl = (val: any): string | null => {
                if (typeof val !== 'string') return null;
                const trimmed = val.trim();
                if (!trimmed || trimmed === '#') return null;
                try {
                  const paramsPart = trimmed.includes('?') ? trimmed.split('?')[1] : '';
                  if (!paramsPart) return null;
                  const urlParams = new URLSearchParams(paramsPart);
                  return urlParams.get('student_form_assignment_id');
                } catch {
                  return null;
                }
              };

              // Cross-reference with fetchParentDetails to find the proven Assignment ID
              let actualAssignmentId: string | undefined;
              if (allParents.length > 0) {
                for (const parent of allParents) {
                  const matchingChild = parent.children?.find(c => c.enrollmentId === enrollment.enrollment_id || c.childId === enrollment.child_id);
                  if (matchingChild) {
                    const matchingForm = matchingChild.forms?.find(f => 
                      f.formName === formName || 
                      (f.filloutFormId && f.filloutFormId === filloutFormId) ||
                      (f.formId && f.formId === formData.id)
                    );
                    if (matchingForm?.studentFormAssignmentId) {
                      actualAssignmentId = matchingForm.studentFormAssignmentId;
                      break;
                    }
                  }
                }
              }

              const resolvedAssignmentId = 
                actualAssignmentId ||
                formData.student_form_assignment_id || 
                formData.studentFormAssignmentId || 
                formData.assignment_id ||
                extractIdFromUrl(enhancedFormData.recent_edit_link) ||
                extractIdFromUrl(filloutFormUrl) ||
                extractIdFromUrl(filloutFormId) ||
                formData.id;

              mappedForms.push({
                id: `${enrollment.enrollment_id}-${formName}`,
                formName,
                studentName: `${enrollment.child_first_name} ${enrollment.child_last_name}`,
                classroomName: enrollment.class_name || 'Unassigned',
                parentName,
                parentEmail,
                dueDate: formData.due_date || null,
                status: 'submitted',
                assignedDate: formData.assigned_at || '',
                studentFormAssignmentId: resolvedAssignmentId,
                filloutFormId: filloutFormId,
                recentEditLink: enhancedFormData.recent_edit_link,
                recentPdfLink: formData.recent_pdf_link,
                childDob: enrollment.child_dob,
                childGender: enrollment.child_gender,
                rawFormData: enhancedFormData
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
  }, [schoolId]);

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
    return [classroomFilter, formFilter].filter(arr => arr.length > 0).length;
  }, [classroomFilter, formFilter]);

  const clearAllFilters = () => {
    setClassroomFilter([]);
    setFormFilter([]);
  };

  const filteredFormsData = useMemo(() => {
    return dueForms.filter(form => {
      const matchesSearch =
        form.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.parentName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClassroom = classroomFilter.length === 0 || classroomFilter.includes(form.classroomName);
      const matchesForm = formFilter.length === 0 || formFilter.includes(form.formName);

      return matchesSearch && matchesClassroom && matchesForm;
    });
  }, [dueForms, searchQuery, classroomFilter, formFilter]);

  const [sortBy, setSortBy] = useState('formName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const getSortLabel = () => {
    const labels: Record<string, string> = {
      formName: 'Form',
      studentName: 'Student',
      classroomName: 'Classroom',
      parentName: 'Parent',
      dueDate: 'Due Date'
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
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
  
  const handleViewForm = (form: LocalDueForm) => {
    const schoolPrefix = schoolSubdomain ? `/${schoolSubdomain}` : '';
    navigate(`${schoolPrefix}/admin/forms/view/${encodeURIComponent(form.id)}`, {
      state: {
        form: {
          ...form.rawFormData,
          title: form.formName,
          status: 'Submitted'
        },
        childName: form.studentName,
        childDob: form.childDob,
        childGender: form.childGender,
        parentEmail: form.parentEmail,
        classDetails: form.classroomName,
        returnPath: location.pathname,
        filloutFormUrl: form.rawFormData?.link || form.rawFormData?.fillout_form_url || form.rawFormData?.url,
        filloutFormId: form.filloutFormId || form.rawFormData?.fillout_form_id,
        recentEditLink: form.recentEditLink || form.rawFormData?.recent_edit_link,
        recentPdfLink: form.recentPdfLink || form.rawFormData?.recent_pdf_link,
        studentFormAssignmentId: form.studentFormAssignmentId || form.rawFormData?.student_form_assignment_id
      }
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12  mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading forms pending approval...</p>
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
        className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12"
      >
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-blue-600" /> Forms Pending Approval
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              Review and approve forms submitted by parents
            </p>
          </div>
          
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
             <div className="flex-shrink-0">
               <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-lg">
                 {dueForms.length}
               </span>
             </div>
             <div>
               <p className="text-sm font-bold text-slate-800">Total Pending</p>
               <p className="text-xs text-slate-500">Awaiting your review</p>
             </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <Input
                  placeholder="Search forms, students, or parents..."
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
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('studentName'); setSortOrder('asc'); }}>Student A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('studentName'); setSortOrder('desc'); }}>Student Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('classroomName'); setSortOrder('asc'); }}>Classroom A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('classroomName'); setSortOrder('desc'); }}>Classroom Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('parentName'); setSortOrder('asc'); }}>Parent A-Z</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('parentName'); setSortOrder('desc'); }}>Parent Z-A</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => { setSortBy('dueDate'); setSortOrder('asc'); }}>Due Date</DropdownMenuItem>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Classroom</label>
                    <MultiSelectDropdown
                      value={classroomFilter}
                      onValueChange={setClassroomFilter}
                      options={allClassrooms}
                      placeholder="Select classrooms"
                      label="Classroom"
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
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Forms Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <CardHeader className="flex flex-col gap-3 pb-3 border-b border-slate-50 bg-slate-50/50 px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm font-bold text-slate-900">Pending Forms ({filteredForms.length})</CardTitle>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedForms.map(form => (
                      <Card key={form.id} className="p-5 rounded-2xl border border-slate-100 shadow-xs bg-white flex flex-col justify-between hover:shadow-md transition-all duration-300 hover:-translate-y-1 space-y-4">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-9 h-9 rounded-xl bg-[#044ba0] text-white flex items-center justify-center font-extrabold text-xs flex-shrink-0 border border-slate-100">
                                {form.studentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 text-sm truncate">{form.formName}</p>
                                <p className="text-[10px] font-extrabold text-slate-400 truncate mt-0.5 uppercase tracking-wider">{form.studentName} &bull; {form.classroomName}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 font-semibold">Parent:</span>
                              <span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{form.parentName.split(' & ')[0]}</span>
                            </div>
                            {form.parentName.includes(' & ') && (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-400 font-semibold">Secondary:</span>
                                <span className="font-bold text-slate-700 truncate max-w-[60%] text-right">{form.parentName.split(' & ')[1]}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-400 font-semibold">Status:</span>
                              <Badge variant="warning" className="text-xs">Pending Approval</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <Button
                            size="sm"
                            onClick={() => handleViewForm(form)}
                            className="w-full h-9 text-xs font-bold rounded-xl bg-[#0F2D52] text-white hover:opacity-90 hover:text-white transition-all duration-200"
                          >
                            <FileText className="h-4 w-4 mr-1.5" />
                            Review Form
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
                          <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80">Form</th>
                          <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden sm:table-cell">Student</th>
                          <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden md:table-cell">Classroom</th>
                          <th className="text-left py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80 hidden md:table-cell">Parent</th>
                          <th className="text-center py-3.5 px-3 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80">Status</th>
                          <th className="text-right py-3.5 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/85 bg-slate-50/80">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedForms.map(form => (
                          <tr key={form.id} className="border-b border-slate-50 transition-all duration-150 ease-in-out cursor-pointer hover:bg-[#F8FAFC]"
                              onClick={() => handleViewForm(form)}>
                            <td className="py-4 px-3 max-w-xs">
                              <div className="font-bold text-slate-900 text-sm truncate">{form.formName}</div>
                              <div className="text-xs font-semibold text-slate-400 truncate sm:hidden mt-0.5">{form.studentName}</div>
                              <div className="text-xs font-semibold text-slate-400 truncate md:hidden">
                                {form.parentName}
                              </div>
                            </td>
                            <td className="py-4 px-3 text-sm font-semibold text-slate-700 hidden sm:table-cell max-w-0">
                              <div className="truncate">{form.studentName}</div>
                            </td>
                            <td className="py-4 px-3 text-sm font-semibold text-slate-700 hidden md:table-cell max-w-0">
                              <div className="truncate">{form.classroomName}</div>
                            </td>
                            <td className="py-4 px-3 hidden md:table-cell">
                              <div className="min-w-0 space-y-2">
                                {form.parentName.split(' & ').map((name, idx) => {
                                  const emails = form.parentEmail.split(', ');
                                  const email = emails[idx] || '';
                                  return (
                                    <div key={idx}>
                                      <div className="font-bold text-slate-800 block truncate text-sm">{name}</div>
                                      {email && <div className="whitespace-nowrap text-xs text-slate-400 font-medium mt-0.5">{email}</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center">
                              <Badge variant="warning" className="text-xs">Pending Approval</Badge>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleViewForm(form); }}
                                className="h-8 px-3 text-xs rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 font-bold"
                              >
                                Review
                                <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
              <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400 text-sm font-bold">All caught up!</p>
              <p className="text-slate-400 text-xs mt-1">No forms are currently pending approval.</p>
            </div>
          )}
        </CardContent>
      </div>
    </motion.div>
  </AdminLayout>
);
}
