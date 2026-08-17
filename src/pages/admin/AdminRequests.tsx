import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from './AdminLayout';
import { getProcurementCategories, getProcurementLocations } from './Settings';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import {
  ShoppingBag, Plus, Search, Filter, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, ArrowRight, User, School, GraduationCap,
  LayoutGrid, TableProperties, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X
} from 'lucide-react';

export function AdminRequests() {
  const { userData } = useUserContext();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Lists
  const [requests, setRequests] = useState<Request[]>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  // States
  const [activeTab, setActiveTab] = useState<'admin' | 'employee'>('admin');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Request, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = (sortConfig ? 1 : 0) + (scopeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSortConfig(null);
    setScopeFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    item: '',
    quantity: 1,
    category: 'Classroom Supplies',
    scope: 'school' as 'school' | 'classroom' | 'teacher',
    classroomId: '',
    classroomName: '',
    teacherId: '',
    teacherName: '',
    locationArea: 'General',
    productLink: '',
    notes: ''
  });

  const categories = getProcurementCategories();
  const locationOptions = getProcurementLocations();

  const fetchTeacherList = async (schoolId: string) => {
    try {
      const data = await EmployeeService.fetchEmployees(schoolId);
      if (data && data.length > 0) {
        setTeachers(data);
      } else {
        // Fallback teachers
        setTeachers([
          { id: 'emp-1', userId: 'user-1', firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
          { id: 'emp-2', userId: 'user-2', firstName: 'Emily', lastName: 'Smith', email: 'emily@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
          { id: 'emp-3', userId: 'user-3', firstName: 'Jessica', lastName: 'Davis', email: 'jessica@goddard.com', phone: '', address: '', employeeType: 'Assistant Teacher', joinedOn: '', schoolId, status: 'active' },
          { id: 'emp-4', userId: 'user-4', firstName: 'Michael', lastName: 'Brown', email: 'michael@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' }
        ]);
      }
    } catch (e) {
      console.warn('Could not fetch employees, using fallbacks', e);
      setTeachers([
        { id: 'emp-1', userId: 'user-1', firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
        { id: 'emp-2', userId: 'user-2', firstName: 'Emily', lastName: 'Smith', email: 'emily@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
        { id: 'emp-3', userId: 'user-3', firstName: 'Jessica', lastName: 'Davis', email: 'jessica@goddard.com', phone: '', address: '', employeeType: 'Assistant Teacher', joinedOn: '', schoolId, status: 'active' },
        { id: 'emp-4', userId: 'user-4', firstName: 'Michael', lastName: 'Brown', email: 'michael@goddard.com', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' }
      ]);
    }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image must be under 2 MB.', 'File Too Large');
      return;
    }
    setImageFile(file);
  };

  const handleClearImage = () => {
    setImageFile(null);
  };

  const loadData = async () => {
    if (!userData?.schoolId) return;
    setLoading(true);
    try {
      const [, classroomList, reqList] = await Promise.all([
        fetchTeacherList(userData.schoolId),
        fetchClassrooms(userData.schoolId),
        RequestService.fetchRequests(userData.schoolId, 'admin'),
      ]);
      setClassrooms(classroomList);
      setRequests(reqList);
    } catch (e) {
      showToast('error', 'Failed to load requests data. Please refresh.', 'Error Loading Data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userData?.schoolId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'classroomId') {
      const selected = classrooms.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        classroomId: value,
        classroomName: selected ? selected.name : ''
      }));
    } else if (name === 'teacherId') {
      const selected = teachers.find(t => t.id === value);
      setFormData(prev => ({
        ...prev,
        teacherId: value,
        teacherName: selected ? `${selected.firstName} ${selected.lastName}` : ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'quantity' ? parseInt(value) || 1 : value
      }));
    }

    if (formErrors[name]) {
      setFormErrors(prev => {
        const copy = { ...prev };
        delete copy[name];
        return copy;
      });
    }
  };

  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.item.trim()) errors.item = 'Request item name is required';
    if (formData.quantity < 1) errors.quantity = 'Quantity must be at least 1';
    
    if (formData.scope === 'classroom' && !formData.classroomId) {
      errors.classroomId = 'Please select a classroom';
    }
    if (formData.scope === 'teacher' && !formData.teacherId) {
      errors.teacherId = 'Please select a teacher';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenModal = () => {
    setFormData({
      item: '',
      quantity: 1,
      category: categories[0] || 'Classroom Supplies',
      scope: 'school',
      classroomId: '',
      classroomName: '',
      teacherId: teachers[0]?.id || '',
      teacherName: teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '',
      locationArea: locationOptions[0] || 'General',
      productLink: '',
      notes: ''
    });
    setImageFile(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const requesterName = userData 
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Admin User'
        : 'Alice Johnson';

      const finalNotes = formData.scope === 'school' && formData.locationArea && formData.locationArea !== 'General'
        ? `[Location: ${formData.locationArea}] ${formData.notes || ''}`.trim()
        : formData.notes || undefined;

      await RequestService.createRequest({
        schoolId: userData?.schoolId || 'school-1',
        requesterId: user?.id || '',
        requesterName,
        requesterRole: 'admin',
        item: formData.item,
        quantity: formData.quantity,
        category: formData.category,
        scope: formData.scope,
        classroomId: formData.scope === 'classroom' ? formData.classroomId : undefined,
        classroomName: formData.scope === 'classroom' ? formData.classroomName : undefined,
        teacherId: formData.scope === 'teacher' ? formData.teacherId : undefined,
        teacherName: formData.scope === 'teacher' ? formData.teacherName : undefined,
        productLink: formData.productLink || undefined,
        notes: finalNotes
      }, imageFile || undefined);

      showToast('success', 'Admin request created successfully. Sent to Super Admin for validation.', 'Request Created');
      setIsModalOpen(false);
      
      const reqList = await RequestService.fetchRequests(userData?.schoolId || 'school-1', 'admin');
      setRequests(reqList);
    } catch (err) {
      showToast('error', 'Could not create request. Please try again.', 'Error Submitting Request');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedAndFiltered = requests.filter(req => {
    const matchesTab = activeTab === 'employee' ? req.requesterRole === 'employee' : (req.requesterRole === 'admin' || req.requesterRole === 'superadmin');
    const matchesSearch = req.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesScope = scopeFilter === 'all' || req.scope === scopeFilter;
    return matchesTab && matchesSearch && matchesStatus && matchesScope;
  });

  const sortedRequests = [...searchedAndFiltered].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key] ?? '';
    const bVal = b[key] ?? '';
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: keyof Request) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / recordsPerPage));
  const paginatedRequests = sortedRequests.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const getStatusBadgeClass = (status: RequestStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'Pending':
        return <Clock className="w-3.5 h-3.5" />;
      case 'In Progress':
        return <Play className="w-3.5 h-3.5 animate-pulse" />;
      case 'Completed':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  const getStatusLabel = (status: RequestStatus) => {
    switch (status) {
      case 'Pending':
        return 'Submitted';
      case 'In Progress':
        return 'In Progress';
      case 'Completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 mx-auto px-4 py-6">
        
        {/* Upper Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-14 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#0F2D52]" /> Procurement Request Board
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage procurement requests for the school or specific teachers.
            </p>
          </div>

          {activeTab === 'admin' && (
            <Button
              onClick={handleOpenModal}
              className="rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] hover:from-[#091629] text-white font-bold text-xs shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Request
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-2">
          <button
            onClick={() => { setActiveTab('admin'); setSearchTerm(''); setStatusFilter('all'); setScopeFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'admin' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Requests
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'admin' ? 'bg-[#0F2D52]/10 text-[#0F2D52]' : 'bg-slate-200 text-slate-500'
            }`}>
              {requests.filter(r => r.requesterRole === 'admin' || r.requesterRole === 'superadmin').length}
            </span>
          </button>
          <button
            onClick={() => { setActiveTab('employee'); setSearchTerm(''); setStatusFilter('all'); setScopeFilter('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'employee' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Employee Requests
            <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeTab === 'employee' ? 'bg-[#0F2D52]/10 text-[#0F2D52]' : 'bg-slate-200 text-slate-500'
            }`}>
              {requests.filter(r => r.requesterRole === 'employee').length}
            </span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by item..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setShowFilters(prev => !prev)}
                size="sm"
                className="h-10 rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all duration-200 relative font-bold text-xs px-3 sm:px-4 flex-shrink-0"
              >
                {showFilters ? <X className="h-4 w-4 sm:mr-1.5" /> : <Filter className="h-4 w-4 sm:mr-1.5" />}
                <span className="hidden sm:inline">{showFilters ? 'Hide Filters' : 'Filters'}</span>
                {!showFilters && activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F2D52] text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                disabled={loading}
                className="rounded-xl h-10 w-10 flex-shrink-0 border-slate-200 hover:bg-slate-50"
                title="Refresh list"
              >
                <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Collapsible Filter Area */}
          {showFilters && (
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                  </span>
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 rounded-lg bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear All
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Sort By</label>
                  <select
                    value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : 'default'}
                    onChange={e => {
                      if (e.target.value === 'default') {
                        setSortConfig(null);
                      } else {
                        const [key, direction] = e.target.value.split('-');
                        setSortConfig({ key: key as keyof Request, direction: direction as 'asc' | 'desc' });
                      }
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52]"
                  >
                    <option value="default">Default Sort</option>
                    <option value="createdAt-desc">Date (Newest)</option>
                    <option value="createdAt-asc">Date (Oldest)</option>
                    <option value="item-asc">Item (A-Z)</option>
                    <option value="item-desc">Item (Z-A)</option>
                    <option value="quantity-desc">Quantity (High-Low)</option>
                    <option value="quantity-asc">Quantity (Low-High)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Assignment Level</label>
                  <select
                    value={scopeFilter}
                    onChange={e => { setScopeFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                  >
                    <option value="all">All Levels</option>
                    <option value="school">Entire School</option>
                    <option value="classroom">Specific Classroom</option>
                    <option value="teacher">Specific Employee</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Count + View Toggle */}
        <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3 mb-6">
          <div className="text-sm font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{sortedRequests.length}</span> requests
          </div>
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={recordsPerPage}
              onChange={e => { setRecordsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2D52] bg-white text-slate-700 h-9"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode('card')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'card' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <TableProperties className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Requests Queue */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mb-3"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading request lists...</p>
          </div>
        ) : sortedRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No matching items for this role and status filter.
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedRequests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <Card className="border border-slate-100 bg-white hover:border-slate-200 transition-all rounded-2xl overflow-hidden shadow-sm h-full flex flex-col justify-between">
                    <div className="p-4 space-y-3">
                      {/* Top: status badge + category */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide truncate">{req.category || 'Supplies'}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold uppercase flex-shrink-0">{req.requesterRole}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${getStatusBadgeClass(req.status)}`}>
                          {getStatusIcon(req.status)}
                          {req.status}
                        </span>
                      </div>

                      {/* Image + Item name */}
                      <div className="flex gap-3 items-start">
                        {req.productImage ? (
                          <img
                            src={req.productImage}
                            alt={req.item}
                            className="w-16 h-16 rounded-xl object-cover border border-slate-100 bg-slate-50 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1">{req.item}</h3>
                          <p className="text-[11px] text-slate-500">
                            By <span className="font-semibold text-slate-700">{req.requesterName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Full details grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Quantity</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">{req.quantity}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Target</p>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {req.scope === 'classroom' && `Classroom · ${req.classroomName}`}
                            {req.scope === 'teacher' && `Employee · ${req.teacherName}`}
                            {req.scope === 'school' && 'Entire School'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Submitted</p>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">{new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        {req.processingStartDate && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Processing From</p>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{new Date(req.processingStartDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions section */}
                    <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-50 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        {req.productLink && (
                          <a
                            href={req.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold"
                          >
                            <Link2 className="w-3.5 h-3.5" /> Product Page <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {!req.productLink && <span className="text-[11px] text-slate-400 italic">No product link provided</span>}
                      </div>

                      {/* Action buttons */}
                      <div>
                        {req.status === 'Completed' && (
                          <div className="text-right text-[11px]">
                            <span className="font-semibold text-slate-400">Spent:</span>{' '}
                            <span className="font-extrabold text-emerald-700 text-xs">${req.amountSpent?.toFixed(2)}</span>
                          </div>
                        )}

                        {req.status === 'Pending' && (
                          <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1 whitespace-nowrap">
                            Pending Approval
                          </span>
                        )}

                        {req.status === 'In Progress' && (
                          <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 bg-blue-50/80 border border-blue-100 rounded-lg px-2.5 py-1">
                            <ArrowRight className="w-3 h-3" /> In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors w-2/5" onClick={() => requestSort('item')}>
                      <div className="flex items-center gap-1.5">
                        Item {sortConfig?.key === 'item' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />) : null}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 transition-colors">
                      Target Assignment
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => requestSort('quantity')}>
                      <div className="flex items-center gap-1.5">
                        Qty {sortConfig?.key === 'quantity' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />) : null}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => requestSort('status')}>
                      <div className="flex items-center gap-1.5">
                        Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />) : null}
                      </div>
                    </th>
                    <th className="px-4 py-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => requestSort('createdAt')}>
                      <div className="flex items-center gap-1.5">
                        Date {sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />) : null}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors group">
                      <td className="px-4 py-3.5 text-slate-900">
                        <div className="flex gap-3 items-start">
                          {req.productImage ? (
                            <img src={req.productImage} alt={req.item} className="w-11 h-11 rounded-lg object-cover border border-slate-100 flex-shrink-0 bg-slate-50" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm line-clamp-2">{req.item}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.category || 'Supplies'}</span>
                            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                              <span className="font-semibold text-slate-700">{req.requesterName}</span>
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-bold uppercase">{req.requesterRole}</span>
                            </p>
                            {req.productLink && (
                              <a href={req.productLink} target="_blank" rel="noopener noreferrer" className="text-[#1a6fc4] hover:text-[#0F2D52] hover:underline inline-flex items-center gap-1 text-[10px] font-medium w-fit mt-0.5">
                                <Link2 className="w-3 h-3" /> View Product
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        {req.scope === 'classroom' && (
                          <>Target: <span className="font-bold text-slate-700">Classroom ({req.classroomName})</span></>
                        )}
                        {req.scope === 'teacher' && (
                          <>Target: <span className="font-bold text-slate-700">Employee ({req.teacherName})</span></>
                        )}
                        {req.scope === 'school' && (
                          <>Target: <span className="font-bold text-slate-700">Entire School</span></>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {req.quantity}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                        {req.processingStartDate && (
                          <p className="text-[10px] text-blue-500 font-semibold">Start: {new Date(req.processingStartDate).toLocaleDateString()}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && sortedRequests.length > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
            <div className="text-slate-500">
              Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * recordsPerPage + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * recordsPerPage, sortedRequests.length)}</span> of <span className="font-semibold text-slate-900">{sortedRequests.length}</span> requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <div className="hidden md:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-semibold transition-colors ${currentPage === p ? 'bg-[#0F2D52] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Admin Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto bg-white p-6 no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Procurement Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a request for all classrooms across the school, or for a specific teacher issue. This will be verified and approved by the Super Admin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            
            {/* Target Assignment Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Assignment <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope: 'school', classroomId: '', classroomName: '', teacherId: '', teacherName: '' }))}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all ${
                    formData.scope === 'school'
                      ? 'border-[#0F2D52] bg-[#0F2D52]/5 text-[#0F2D52]'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <School className="w-4 h-4" />
                  <span>School</span>
                  <span className="text-[9px] font-medium opacity-60">General campus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope: 'classroom', classroomId: classrooms[0]?.id || '', classroomName: classrooms[0]?.name || '', teacherId: '', teacherName: '' }))}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all ${
                    formData.scope === 'classroom'
                      ? 'border-[#0F2D52] bg-[#0F2D52]/5 text-[#0F2D52]'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Classroom</span>
                  <span className="text-[9px] font-medium opacity-60">Target class</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, scope: 'teacher', classroomId: '', classroomName: '', teacherId: teachers[0]?.id || '', teacherName: teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '' }))}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all ${
                    formData.scope === 'teacher'
                      ? 'border-[#0F2D52] bg-[#0F2D52]/5 text-[#0F2D52]'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>Employee</span>
                  <span className="text-[9px] font-medium opacity-60">Target individual</span>
                </button>
              </div>
            </div>

            {/* Classroom Selector (if scope is classroom) */}
            {formData.scope === 'classroom' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Classroom <span className="text-red-500">*</span>
                </label>
                <select
                  name="classroomId"
                  value={formData.classroomId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
                >
                  {classrooms.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {formErrors.classroomId && <p className="text-xs text-red-600 font-semibold">{formErrors.classroomId}</p>}
              </div>
            )}

            {/* Teacher Selector (if scope is teacher) */}
            {formData.scope === 'teacher' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Employee Involved <span className="text-red-500">*</span>
                </label>
                <select
                  name="teacherId"
                  value={formData.teacherId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeType})</option>
                  ))}
                </select>
                {formErrors.teacherId && <p className="text-xs text-red-600 font-semibold">{formErrors.teacherId}</p>}
              </div>
            )}

            {/* Area/Location Selector (if scope is school) */}
            {formData.scope === 'school' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Campus Area / Location <span className="text-red-500">*</span>
                </label>
                <select
                  name="locationArea"
                  value={formData.locationArea}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
                >
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Request Item Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Requested Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="item"
                placeholder="e.g. Office Swivel Chairs"
                value={formData.item}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
              />
              {formErrors.item && <p className="text-xs text-red-600 font-semibold">{formErrors.item}</p>}
            </div>

            {/* Quantity and Category Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Quantity */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
                />
                {formErrors.quantity && <p className="text-xs text-red-600 font-semibold">{formErrors.quantity}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Link (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Link (Optional)
              </label>
              <input
                type="url"
                name="productLink"
                placeholder="https://example.com/product"
                value={formData.productLink}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
              />
            </div>

            {/* Product Image Upload (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Image (Optional)
              </label>
              {!imageFile ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0F2D52] hover:bg-slate-50 transition-colors">
                  <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400 font-medium">Click to upload image</span>
                  <span className="text-[10px] text-slate-300 mt-0.5">JPEG, PNG, WebP up to 2MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{imageFile.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(imageFile.size / 1024).toFixed(0)} KB</p>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                placeholder="Any additional context or justification for this request..."
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] resize-none"
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-slate-50">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto rounded-xl h-11 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52]"
              >
                {submitting ? (imageFile ? 'Uploading & Submitting...' : 'Submitting...') : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
