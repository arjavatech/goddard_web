import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EmployeeLayout } from './EmployeeLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../services/auth/useAuth';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { EmployeeService } from '../../services/api/employee';
import {
  ShoppingBag, Plus, Search, Filter, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, ArrowLeft, LayoutGrid, List, ArrowUp, ArrowDown, X, Pencil, Trash2
} from 'lucide-react';

export function EmployeeRequests() {
  const { userData, schoolSubdomain } = useUserContext();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  // Page states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [userOverride, setUserOverride] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Request, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    setUserOverride(true);
    localStorage.setItem('empRequestsViewMode', mode);
  };

  useEffect(() => {
    const saved = localStorage.getItem('empRequestsViewMode') as 'card' | 'table' | null;
    if (saved) { setViewMode(saved); setUserOverride(true); return; }
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (!userOverride) setViewMode(e.matches ? 'card' : 'table');
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [userOverride]);

  const activeFilterCount = (sortConfig ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSortConfig(null);
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    item: '',
    quantity: 1,
    category: '',
    classroomId: '',
    classroomName: '',
    productLink: '',
    productImage: '',
    notes: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const categories = userData?.schoolData?.requestCategories?.map(category => category.label) ?? [];

  const fetchClassroomList = async (schoolId: string) => {
    try {
      const data = await fetchClassrooms(schoolId);
      if (data && data.length > 0) {
        setClassrooms(data);
      } else {
        // Fallback mock classrooms
        setClassrooms([
          { id: 'classroom-1', name: 'Preschool A', studentsCount: 15, formsCount: 0, assignedForms: [] },
          { id: 'classroom-2', name: 'Preschool B', studentsCount: 12, formsCount: 0, assignedForms: [] },
          { id: 'classroom-3', name: 'Toddler Room', studentsCount: 8, formsCount: 0, assignedForms: [] },
          { id: 'classroom-4', name: 'Infant Room', studentsCount: 6, formsCount: 0, assignedForms: [] },
          { id: 'classroom-5', name: 'Pre-K A', studentsCount: 18, formsCount: 0, assignedForms: [] }
        ]);
      }
    } catch (e) {
      console.warn('Could not fetch classrooms, using fallbacks', e);
      setClassrooms([
        { id: 'classroom-1', name: 'Preschool A', studentsCount: 15, formsCount: 0, assignedForms: [] },
        { id: 'classroom-2', name: 'Preschool B', studentsCount: 12, formsCount: 0, assignedForms: [] },
        { id: 'classroom-3', name: 'Toddler Room', studentsCount: 8, formsCount: 0, assignedForms: [] },
        { id: 'classroom-4', name: 'Infant Room', studentsCount: 6, formsCount: 0, assignedForms: [] },
        { id: 'classroom-5', name: 'Pre-K A', studentsCount: 18, formsCount: 0, assignedForms: [] }
      ]);
    }
  };

  const loadData = async () => {
    if (!userData?.schoolId) return;
    setLoading(true);
    try {
      // First get employee record to identify requester ID
      const emp = await EmployeeService.fetchCurrentEmployee(userData.schoolId).catch(() => null);
      const empId = emp?.userId || user?.id || userData?.email || 'emp-bypass';
      setEmployeeId(empId);

      // Load classrooms
      await fetchClassroomList(userData.schoolId);

      const reqList = await RequestService.fetchRequests(userData.schoolId, 'employee', empId);
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
    if (!formData.item.trim()) errors.item = 'Request item is required';
    if (formData.quantity < 1) errors.quantity = 'Quantity must be at least 1';
    if (categories.length > 0 && !formData.category) errors.category = 'Please select a category';
    if (!formData.classroomId) errors.classroomId = 'Please select a classroom';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image must be under 2 MB.', 'File Too Large');
      e.target.value = '';
      return;
    }
    setImageFile(file);
    setFormData(prev => ({ ...prev, productImage: '' }));
  };

  const handleClearImage = () => {
    setImageFile(null);
    setFormData(prev => ({ ...prev, productImage: '' }));
  };

  const handleOpenModal = () => {
    setEditingRequest(null);
    setFormData({
      item: '',
      quantity: 1,
      category: categories[0] || '',
      classroomId: classrooms[0]?.id || '',
      classroomName: classrooms[0]?.name || '',
      productLink: '',
      productImage: '',
      notes: ''
    });
    setImageFile(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (request: Request) => {
    setEditingRequest(request);
    setFormData({
      item: request.item,
      quantity: request.quantity,
      category: request.category || '',
      classroomId: request.classroomId || '',
      classroomName: request.classroomName || '',
      productLink: request.productLink || '',
      productImage: request.productImage || '',
      notes: request.notes || '',
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
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Employee'
        : 'Sarah Jenkins';

      const requestPayload = {
        schoolId: userData?.schoolId || 'school-1',
        requesterId: employeeId,
        requesterName,
        requesterRole: 'employee',
        item: formData.item,
        quantity: formData.quantity,
        category: formData.category,
        scope: 'classroom',
        classroomId: formData.classroomId,
        classroomName: formData.classroomName,
        productLink: formData.productLink || undefined,
        notes: formData.notes || undefined
      };
      if (editingRequest) {
        await RequestService.updateRequest(editingRequest.id, requestPayload, imageFile || undefined);
      } else {
        await RequestService.createRequest(requestPayload, imageFile || undefined);
      }

      showToast('success', editingRequest ? 'Your request has been updated successfully.' : 'Your request has been submitted successfully.', editingRequest ? 'Request Updated' : 'Request Submitted');
      setIsModalOpen(false);
      setEditingRequest(null);
      // Reload list
      const reqList = await RequestService.fetchRequests(userData?.schoolId || 'school-1', 'employee', employeeId);
      setRequests(reqList);
    } catch (err) {
      showToast('error', 'Could not save request. Please try again.', 'Error Submitting Request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    setSubmitting(true);
    try {
      await RequestService.deleteRequest(requestToDelete.id);
      setRequests(currentRequests => currentRequests.filter(request => request.id !== requestToDelete.id));
      showToast('success', 'Your Pending request has been deleted.', 'Request Deleted');
      setRequestToDelete(null);
    } catch {
      showToast('error', 'Could not delete this request. Only Pending requests can be deleted.', 'Delete Failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
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
    <EmployeeLayout>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header Section */}
        <div className="mb-8 mt-8">


          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            {/* Subtle decorative background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#0F2D52]/5 to-transparent rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center shadow-md flex-shrink-0 border border-[#0F2D52]/20">
                <ShoppingBag className="w-6 h-6 text-white/90" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Material Requests</h1>
              </div>
            </div>

            <button
              onClick={handleOpenModal}
              className="relative z-10 flex items-center justify-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#0F2D52] hover:bg-[#163a66] text-white transition-all duration-200 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/50 focus:ring-offset-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Create Request
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by requested item..."
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

            <div className="flex items-center gap-2 w-full sm:w-auto">
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

          {showFilters && (
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} applied
                  </span>
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="h-8 rounded-lg bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs">
                    <X className="h-3.5 w-3.5 mr-1" /> Clear All
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-slate-500">Sort By</label>
                  <select
                    value={sortConfig ? `${sortConfig.key}-${sortConfig.direction}` : 'default'}
                    onChange={e => {
                      if (e.target.value === 'default') setSortConfig(null);
                      else {
                        const [key, direction] = e.target.value.split('-');
                        setSortConfig({ key: key as keyof Request, direction: direction as 'asc' | 'desc' });
                      }
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2.5 text-[10px] sm:text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52]"
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
                  <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-slate-500">Status</label>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 text-[10px] sm:text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Submitted</option>
                    <option value="in progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section header with gradient — view toggle inside */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-[#0F2D52] to-[#1a6fc4] px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                {/* <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-white/70">My</p> */}
                <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">My Requests</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {sortedRequests.length > 0 && (
                <span className="text-[9px] sm:text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  {sortedRequests.length} request{sortedRequests.length !== 1 ? 's' : ''}
                </span>
              )}
              <div className="flex items-center gap-0.5 bg-white/10 p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <List className="h-3 w-3" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-sm' : 'text-white/70 hover:text-white'}`}
                >
                  <LayoutGrid className="h-3 w-3" />
                  <span className="hidden sm:inline">Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mb-3"></div>
            <p className="text-slate-500 text-xs sm:text-sm font-semibold">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter options.'
                : 'You have not submitted any procurement requests yet.'}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedRequests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                >
                  <div className="rounded-2xl border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200">
                    {/* Card body */}
                    <div className="p-4 flex items-start gap-3 flex-1">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 overflow-hidden border border-slate-100">
                        {req.productImage ? (
                          <img src={req.productImage} alt={req.item} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">{req.item}</p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{req.category || 'Supplies'} · Qty {req.quantity}</p>
                        <div className="mt-1.5">
                          <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Divider */}
                    <div className="mx-4 border-t border-slate-50" />
                    {/* Footer */}
                    <div className="px-4 py-3 flex items-end justify-between gap-2">
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Classroom: {req.classroomName || '—'}</p>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">Submitted: {new Date(req.createdAt).toLocaleDateString()}</p>
                        {req.expectedCompletionDate && (
                          <p className="text-[10px] sm:text-[11px] text-blue-500 font-semibold">Expected completion: {new Date(req.expectedCompletionDate).toLocaleDateString()}</p>
                        )}
                        {req.status === 'Completed' && req.amountSpent !== undefined && (
                          <p className="text-[10px] sm:text-[11px] text-emerald-600 font-bold">Spent: ${req.amountSpent.toFixed(2)} via {req.paymentMethod}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {req.productLink && (
                          <a href={req.productLink} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] text-[#1a6fc4] hover:text-[#0F2D52] font-semibold">
                            <Link2 className="w-3 h-3" /> View Product <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {req.status === 'Pending' && (
                          <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(req)} className="h-7 px-2 text-[10px]"><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                            <Button variant="outline" size="sm" onClick={() => setRequestToDelete(req)} className="h-7 px-2 text-[10px] text-red-600 hover:text-red-700"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white overflow-x-auto shadow-sm -mx-0">
            <table className="w-full min-w-[800px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] cursor-pointer" onClick={() => requestSort('item')}>
                    <div className="flex items-center gap-1">Item {sortConfig?.key === 'item' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0F2D52]" /> : <ArrowDown className="w-3 h-3 text-[#0F2D52]" />) : null}</div>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Classroom</th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] cursor-pointer" onClick={() => requestSort('quantity')}>
                    <div className="flex items-center gap-1">Qty {sortConfig?.key === 'quantity' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0F2D52]" /> : <ArrowDown className="w-3 h-3 text-[#0F2D52]" />) : null}</div>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] cursor-pointer" onClick={() => requestSort('status')}>
                    <div className="flex items-center gap-1">Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0F2D52]" /> : <ArrowDown className="w-3 h-3 text-[#0F2D52]" />) : null}</div>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] cursor-pointer" onClick={() => requestSort('createdAt')}>
                    <div className="flex items-center gap-1">Date {sortConfig?.key === 'createdAt' ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0F2D52]" /> : <ArrowDown className="w-3 h-3 text-[#0F2D52]" />) : null}</div>
                  </th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px] leading-4">Expected<br />Completion</th>
                  <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-[9px] sm:text-[10px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRequests.map((req) => (
                  <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {req.productImage ? (
                          <img src={req.productImage} alt={req.item} className="w-6 h-6 rounded-md object-cover border border-slate-100 flex-shrink-0 bg-slate-50" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                            <ImageIcon className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-900 text-[10px] sm:text-[11px] lg:text-xs line-clamp-1 leading-tight">{req.item}</span>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wide">{req.category || 'Supplies'}</p>
                          {req.productLink && (
                            <a href={req.productLink} target="_blank" rel="noopener noreferrer" className="text-[#1a6fc4] hover:text-[#0F2D52] inline-flex items-center gap-0.5 text-[10px] font-medium">
                              <Link2 className="w-2.5 h-2.5" /> View Product <ExternalLink className="w-2 h-2" />
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[10px] sm:text-[11px] whitespace-nowrap">
                      {req.classroomName || '—'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-700 text-[10px] sm:text-[11px]">
                      {req.quantity}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                        {getStatusIcon(req.status)}
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 text-[10px] sm:text-[11px] whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">
                      {req.expectedCompletionDate ? (
                        <span className="text-blue-600">{new Date(req.expectedCompletionDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {req.status === 'Pending' && (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEdit(req)} className="h-7 px-2 text-[10px]"><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                          <Button variant="outline" size="sm" onClick={() => setRequestToDelete(req)} className="h-7 px-2 text-[10px] text-red-600 hover:text-red-700"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && sortedRequests.length > 0 && totalPages > 1 && (
          <div className="flex flex-col xs:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-100">
            <p className="text-[10px] sm:text-[11px] lg:text-xs text-slate-500 font-medium text-center sm:text-left">
              Showing <span className="font-bold text-slate-700">{((currentPage - 1) * recordsPerPage) + 1}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * recordsPerPage, sortedRequests.length)}</span> of <span className="font-bold text-slate-700">{sortedRequests.length}</span> requests
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-lg text-xs font-semibold border-slate-200"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-600">
                <span>Page {currentPage}</span>
                <span className="text-slate-400">of {totalPages}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-3 rounded-lg text-xs font-semibold border-slate-200"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={open => { setIsModalOpen(open); if (!open) setEditingRequest(null); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto bg-white p-6 no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">{editingRequest ? 'Edit Procurement Request' : 'Create Procurement Request'}</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs text-slate-500">
              Submit a request for supplies or equipment. The administrators will review it before purchase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Classroom */}
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Classroom Location <span className="text-red-500">*</span>
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

            {/* Request Item Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Requested Item <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="item"
                placeholder="e.g. Crayola Colored Chalk (Box of 48)"
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
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={categories.length === 0}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="" disabled>{categories.length > 0 ? 'Select category' : 'No categories configured'}</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && <p className="text-xs text-red-600 font-semibold">{formErrors.category}</p>}
              </div>
            </div>

            {/* Product Link (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Product Image (Optional)
              </label>
              {imageFile ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{imageFile.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(imageFile.size / 1024).toFixed(0)} KB</p>
                    <button type="button" onClick={handleClearImage} className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                  </div>
                </div>
              ) : editingRequest?.productImage ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img src={editingRequest.productImage} alt={editingRequest.item} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Current product image</p>
                    <label className="inline-flex mt-2 cursor-pointer text-[10px] font-semibold text-[#1a6fc4] hover:text-[#0F2D52]">
                      Replace image
                      <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageFileChange} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Notes (Optional) */}
            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                placeholder="Any additional context or details for this request..."
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
                {submitting ? (imageFile ? 'Uploading & Saving...' : 'Saving...') : editingRequest ? 'Save Changes' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requestToDelete} onOpenChange={open => { if (!open) setRequestToDelete(null); }}>
        <DialogContent className="w-[95vw] max-w-sm rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Delete Pending Request?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">Delete “{requestToDelete?.item}”? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setRequestToDelete(null)} disabled={submitting}>Cancel</Button>
            <Button type="button" onClick={handleDeleteRequest} disabled={submitting} className="bg-red-600 text-white hover:bg-red-700">{submitting ? 'Deleting...' : 'Delete Request'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
}
