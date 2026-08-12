import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { EmployeeLayout } from './EmployeeLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { EmployeeService } from '../../services/api/employee';
import {
  ShoppingBag, Plus, Search, Filter, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, ArrowLeft, LayoutGrid, TableProperties, ArrowUp, ArrowDown, ArrowUpDown, X
} from 'lucide-react';

export function EmployeeRequests() {
  const { userData, schoolSubdomain } = useUserContext();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<Request[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');

  // Page states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Request, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = (sortConfig ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSortConfig(null);
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    item: '',
    quantity: 1,
    category: 'Classroom Supplies',
    classroomId: '',
    classroomName: '',
    productLink: '',
    productImage: '',
    notes: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categories = [
    'Classroom Supplies',
    'STEM & Toys',
    'Books & Learning',
    'Office & Equipment',
    'Play & Outdoor'
  ];

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
      const empId = emp?.userId || userData.id || userData.email || 'emp-bypass';
      setEmployeeId(empId);

      // Load classrooms
      await fetchClassroomList(userData.schoolId);

      // Load requests for this user
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
    setFormData({
      item: '',
      quantity: 1,
      category: 'Classroom Supplies',
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const requesterName = userData
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Employee'
        : 'Sarah Jenkins';

      await RequestService.createRequest({
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
      }, imageFile || undefined);

      showToast('success', 'Your request has been submitted with a Pending status.', 'Request Submitted');
      setIsModalOpen(false);
      // Reload list
      const reqList = await RequestService.fetchRequests(userData?.schoolId || 'school-1', 'employee', employeeId);
      setRequests(reqList);
    } catch (err) {
      showToast('error', 'Could not save request. Please try again.', 'Error Submitting Request');
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

  return (
    <EmployeeLayout>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner Card */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white shadow-xl mb-8 mt-8">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
          <div className="relative z-10 px-6 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <Link
                to={`/${schoolSubdomain || 'goddard'}/employee/dashboard`}
                className="group inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-sm backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:border-white/35 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[#0F2D52]"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                Back to Dashboard
              </Link><br />
              {/* <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                <ShoppingBag className="w-3.5 h-3.5" /> Procurement Portal
              </div> */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: '#ffffff' }}>Request Materials & Supplies</h1>
              <p className="text-sm text-slate-200/90 max-w-xl">
                Need items for your classroom? Submit a request here. Once approved, the admin will validate it and send it to the Super Admin for purchasing.
              </p>
            </div>

            <button
              onClick={handleOpenModal}
              className="flex items-center justify-center gap-2 px-5 py-3 h-12 bg-white text-[#0F2D52] hover:bg-slate-100 active:scale-[0.98] transition-all rounded-xl font-bold text-xs sm:text-sm shadow-md"
            >
              <Plus className="w-4 h-4" /> Create Request
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:max-w-md">
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

            <div className="flex items-center gap-2 w-full md:w-auto">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div className="text-sm font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{sortedRequests.length}</span> requests
          </div>
          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Requests List */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mb-3"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search query or filter options.'
                : 'You have not submitted any procurement requests yet.'}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedRequests.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <Card className="border border-slate-100 bg-white hover:border-slate-200 hover:-translate-y-1 hover:shadow-md transition-all duration-200 rounded-2xl overflow-hidden flex flex-col h-full">
                    <CardContent className="p-5 flex-1 flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Status + Category Header */}
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                            {req.category || 'Supplies'}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {req.status}
                          </span>
                        </div>

                        {/* Title and image row */}
                        <div className="flex gap-3">
                          {req.productImage && (
                            <img
                              src={req.productImage}
                              alt={req.item}
                              className="w-16 h-16 rounded-xl object-cover border border-slate-100 flex-shrink-0 bg-slate-50"
                            />
                          )}
                          {!req.productImage && (
                            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{req.item}</h3>
                            <p className="text-xs text-slate-500 mt-1">Quantity: <span className="font-semibold text-slate-700">{req.quantity}</span></p>
                          </div>
                        </div>

                        {/* Meta items */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-50 pt-3">
                          <div>
                            <span className="text-slate-400 font-medium">Classroom</span>
                            <p className="font-bold text-slate-700 truncate">{req.classroomName || '—'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Date Submitted</span>
                            <p className="font-bold text-slate-700 truncate">{new Date(req.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* Footer actions / Payment details */}
                      <div className="mt-4 pt-3 border-t border-slate-50">
                        {req.status === 'Completed' && req.amountSpent !== undefined && (
                          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5 text-[11px] space-y-1">
                            <div className="flex justify-between items-center text-emerald-800 font-semibold">
                              <span>Amount Spent:</span>
                              <span className="text-xs font-extrabold">${req.amountSpent.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-500 font-medium">
                              <span>Paid via:</span>
                              <span>{req.paymentMethod}</span>
                            </div>
                            {req.paymentNotes && (
                              <p className="text-[10px] text-slate-400 line-clamp-1 border-t border-slate-100/50 pt-1 mt-1 italic">
                                "{req.paymentNotes}"
                              </p>
                            )}
                          </div>
                        )}

                        {req.status !== 'Completed' && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Status details:</span>
                            <span className="text-[#0F2D52] font-semibold flex items-center gap-1">
                              {req.status === 'Pending'
                                ? 'Awaiting validation'
                                : 'Validated, pending purchase'}
                            </span>
                          </div>
                        )}

                        {req.productLink && (
                          <a
                            href={req.productLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold mt-3"
                          >
                            <Link2 className="w-3.5 h-3.5" /> View Product <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {req.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-2 line-clamp-2 border-t border-slate-50 pt-2">
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                    </CardContent>
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
                      Classroom
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
                            {req.notes && <span className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5">"{req.notes}"</span>}
                            {req.productLink && (
                              <a href={req.productLink} target="_blank" rel="noopener noreferrer" className="text-[#1a6fc4] hover:text-[#0F2D52] hover:underline inline-flex items-center gap-1 text-[10px] font-medium w-fit mt-0.5">
                                <Link2 className="w-3 h-3" /> View Product
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">
                        {req.classroomName || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">
                        {req.quantity}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                            {getStatusIcon(req.status)}
                            {req.status}
                          </span>
                          {req.status !== 'Completed' && (
                            <span className="text-[9px] font-medium text-slate-400">
                              {req.status === 'Pending' ? 'Awaiting validation' : 'Pending purchase'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && sortedRequests.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
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
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto bg-white p-6 no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Procurement Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a request for supplies or equipment. The administrators will review it before purchase.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Classroom */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
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
                {submitting ? (imageFile ? 'Uploading & Submitting...' : 'Submitting...') : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
}
