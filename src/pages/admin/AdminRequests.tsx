import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { fetchRequestSettings } from '../../services/api/settings';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { getTodayDateString, validateFutureDate } from '../../lib/utils';
import {
  ShoppingBag, Plus, Search, Filter, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, ArrowRight, User, School, GraduationCap, CreditCard,
  LayoutGrid, TableProperties, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X, Pencil, Trash2, AlertCircle, Download, Receipt, Package
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
  const [activeTab, setActiveTab] = useState<'all' | 'employee' | 'admin' | 'mine'>('all');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024 ? 'cards' : 'table';
    }
    return 'table';
  });
  const [sortConfig, setSortConfig] = useState<{ key: keyof Request, direction: 'asc' | 'desc' } | null>(null);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // Pay modal states
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [billImageFile, setBillImageFile] = useState<File | null>(null);
  const [payFormErrors, setPayFormErrors] = useState<Record<string, string>>({});
  const [payFormData, setPayFormData] = useState({
    amountSpent: '',
    paymentMethod: 'Credit Card',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentNotes: ''
  });

  // Start Processing modal states
  const [isStartProcessingModalOpen, setIsStartProcessingModalOpen] = useState(false);
  const [startProcessingRequest, setStartProcessingRequest] = useState<Request | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(getTodayDateString());
  const [dateError, setDateError] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const activeFilterCount = (sortConfig ? 1 : 0) + (scopeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSortConfig(null);
    setScopeFilter('all');
    setStatusFilter('all');
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
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
    location: '',
    productLink: '',
    notes: ''
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

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
      const [, classroomList, reqList, requestSettings] = await Promise.all([
        fetchTeacherList(userData.schoolId),
        fetchClassrooms(userData.schoolId),
        RequestService.fetchRequests(userData.schoolId),
        fetchRequestSettings(userData.schoolId),
      ]);
      setClassrooms(classroomList);
      setRequests(reqList);
      setCategories(requestSettings.requestCategories.map(item => item.label));
      setLocationOptions(requestSettings.location.map(item => item.label));
    } catch (e) {
      showToast('error', 'Failed to load requests data. Please refresh.', 'Error Loading Data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userData?.schoolId]);

  useEffect(() => {
    const handleResize = () => {
      setViewMode(window.innerWidth < 1024 ? 'cards' : 'table');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        [name]: value
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

    if (!formData.category) errors.category = 'Please select a category';
    
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
      location: locationOptions[0] || '',
      productLink: '',
      notes: ''
    });
    setImageFile(null);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (request: Request) => {
    setEditingRequest(request);
    setFormData({
      item: request.item, quantity: request.quantity, category: request.category || '', scope: request.scope,
      classroomId: request.classroomId || '', classroomName: request.classroomName || '',
      teacherId: request.teacherId || '', teacherName: request.teacherName || '', location: request.location || '',
      productLink: request.productLink || '', notes: request.notes || '',
    });
    setImageFile(null); setFormErrors({}); setIsModalOpen(true);
  };

  const handleDelete = async (req: Request) => {
    if (!confirm(`Delete "${req.item}"? This cannot be undone.`)) return;
    try {
      await RequestService.deleteRequest(req.id);
      showToast('success', 'Request deleted successfully.', 'Request Deleted');
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch {
      showToast('error', 'Could not delete request. Please try again.', 'Error');
    }
  };

  const handleOpenPurchaseModal = (req: Request) => {
    setSelectedRequest(req);
    setPayFormData({ amountSpent: '', paymentMethod: 'Credit Card', purchaseDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
    setBillImageFile(null);
    setPayFormErrors({});
    setIsPurchaseModalOpen(true);
  };

  const handleBillImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image must be under 5 MB.', 'File Too Large');
      return;
    }
    setBillImageFile(file);
  };

  const handleClearBillImage = () => {
    setBillImageFile(null);
  };

  const handlePurchaseSubmit = async () => {
    if (!selectedRequest || !payFormData.amountSpent) {
      showToast('error', 'Please enter an amount.', 'Missing Information');
      return;
    }
    try {
      setSubmitting(true);
      await RequestService.verifyRequest(selectedRequest.id, {
        amountSpent: parseFloat(payFormData.amountSpent),
        paymentMethod: payFormData.paymentMethod,
        purchaseDate: payFormData.purchaseDate,
        paymentNotes: payFormData.paymentNotes || undefined
      }, billImageFile || undefined);
      setIsPurchaseModalOpen(false);
      showToast('success', 'Purchase recorded successfully.', 'Success');
      await loadData();
    } catch (error: any) {
      const msg = error?.message || 'Could not record purchase. Please try again.';
      showToast('error', msg, 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenStartProcessing = (req: Request) => {
    setStartProcessingRequest(req);
    setExpectedCompletionDate(getTodayDateString());
    setDateError(null);
    setIsStartProcessingModalOpen(true);
  };

  const handleStartProcessing = async () => {
    if (!startProcessingRequest) return;
    
    // Validate date
    const validation = validateFutureDate(expectedCompletionDate);
    if (!validation.isValid) {
      setDateError(validation.error || 'Invalid date');
      return;
    }
    
    const req = startProcessingRequest;
    setIsStartProcessingModalOpen(false);
    setValidatingId(req.id);
    try {
      await RequestService.validateRequest(req.id, undefined, expectedCompletionDate);
      showToast('success', `"${req.item}" moved to In Progress.`, 'Status Updated');
      await loadData();
    } catch {
      showToast('error', 'Could not update request status.', 'Error');
    } finally {
      setValidatingId(null);
      setStartProcessingRequest(null);
      setDateError(null);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const requesterName = userData 
        ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Admin User'
        : 'Alice Johnson';

      const requestPayload = {
        schoolId: userData?.schoolId || 'school-1',
        requesterId: user?.id || '',
        requesterName,
        requesterRole: 'admin' as const,
        item: formData.item,
        quantity: formData.quantity,
        category: formData.category,
        location: formData.location || undefined,
        scope: formData.scope,
        classroomId: formData.scope === 'classroom' ? formData.classroomId : undefined,
        classroomName: formData.scope === 'classroom' ? formData.classroomName : undefined,
        teacherId: formData.scope === 'teacher' ? formData.teacherId : undefined,
        teacherName: formData.scope === 'teacher' ? formData.teacherName : undefined,
        productLink: formData.productLink || undefined,
        notes: formData.notes || undefined,
      };
      if (editingRequest) {
        await RequestService.updateRequest(editingRequest.id, requestPayload, imageFile || undefined);
      } else {
        await RequestService.createRequest(requestPayload, imageFile || undefined);
      }

      showToast('success', editingRequest ? 'Request updated successfully.' : 'Admin request created successfully. Sent to Super Admin for validation.', editingRequest ? 'Request Updated' : 'Request Created');
      setIsModalOpen(false);
      setEditingRequest(null);

      const reqList = await RequestService.fetchRequests(userData?.schoolId || 'school-1');
      setRequests(reqList);
    } catch (err) {
      showToast('error', 'Could not create request. Please try again.', 'Error Submitting Request');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedAndFiltered = requests.filter(req => {
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'employee' ? req.requesterRole === 'employee' :
      activeTab === 'admin' ? (req.requesterRole === 'admin' || req.requesterRole === 'superadmin') :
      req.requesterId === user?.id;
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

  const { currentPage, totalPages, paginatedData, itemsPerPage, setCurrentPage } =
    usePagination({ data: sortedRequests, itemsPerPage: recordsPerPage });

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

  // Action cell (shared between card and table)
  const ActionCell = ({ req }: { req: Request }) => {
    if (req.status === 'Completed') {
      return (
        <div className="text-right flex flex-col items-end gap-0.5">
          <div className="h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg bg-white border-2 border-transparent flex items-center justify-center">
            <p className="text-[8px] sm:text-xs md:text-sm font-bold text-emerald-700 whitespace-nowrap">Spent: ${req.amountSpent?.toFixed(2)}</p>
          </div>
          <p className="text-[7px] sm:text-xs text-slate-400 px-1.5 sm:px-2 md:px-3">via {req.paymentMethod} on {req.purchaseDate}</p>
          {req.paidByName && (
            <p className="text-[7px] sm:text-xs text-slate-400 px-1.5 sm:px-2 md:px-3">Completed by: {req.paidByName}</p>
          )}
        </div>
      );
    }
    if (req.status === 'Pending') {
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => handleOpenStartProcessing(req)}
            disabled={validatingId === req.id}
            className="w-[88px] sm:w-[102px] md:w-[110px] h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg border-2 border-[#0F2D52] text-[#0F2D52] bg-white hover:bg-[#0F2D52] hover:text-white font-bold text-[8px] sm:text-[9px] md:text-xs shadow-sm flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 transition-colors whitespace-nowrap"
          >
            {validatingId === req.id ? (
              <span className="animate-spin rounded-full border-2 border-current border-t-transparent h-2.5 sm:h-3 w-2.5 sm:w-3 inline-block" />
            ) : (
              <CreditCard className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" />
            )}
            <span className="hidden sm:inline">Processing</span>
            <span className="inline sm:hidden text-[7px]">Processing</span>
          </Button>
        </div>
      );
    }
    // In Progress
    return (
      <div className="flex justify-end">
        <Button
          onClick={() => handleOpenPurchaseModal(req)}
          className="w-[88px] sm:w-[102px] md:w-[110px] h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white font-bold text-[8px] sm:text-[9px] md:text-xs shadow-sm flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 transition-colors whitespace-nowrap"
        >
          <CreditCard className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" />
          <span className="hidden sm:inline text-[7px] sm:text-[8px] md:text-[9px]">Record Purchase</span>
          <span className="inline sm:hidden text-[6px]">Record</span>
        </Button>
      </div>
    );
  };

  const getStatusLabel = (status: RequestStatus) => status === 'Pending' ? 'Submitted' : status;

  // Export helpers
  const exportToCSV = () => {
    const rows = searchedAndFiltered.map(r => ({
      Item: r.item,
      Category: r.category || '',
      Quantity: r.quantity,
      Scope: r.scope,
      'Classroom / Teacher': r.classroomName || r.teacherName || '',
      Requester: r.requesterName,
      Role: r.requesterRole,
      Status: r.status,
      'Product Link': r.productLink || '',
      Notes: r.notes || '',
      'Amount Spent': r.amountSpent ?? '',
      'Payment Method': r.paymentMethod || '',
      'Purchase Date': r.purchaseDate || '',
      'Payment Notes': r.paymentNotes || '',
      'Created At': new Date(r.createdAt).toLocaleString(),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = searchedAndFiltered.map(r => `
      <tr>
        <td>${r.item}</td>
        <td>${r.requesterName}</td>
        <td style="text-transform:capitalize">${r.scope}</td>
        <td>${r.classroomName || r.teacherName || '-'}</td>
        <td><span class="badge badge-${r.status.toLowerCase().replace(' ', '-')}">${r.status}</span></td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
        <td>${r.amountSpent != null ? '$' + r.amountSpent.toFixed(2) : '-'}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><title>Requests Export</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1e293b; }
        h1 { font-size: 18px; color: #0F2D52; margin-bottom: 4px; }
        p { font-size: 11px; color: #64748b; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #0F2D52; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
        td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        tr:nth-child(even) td { background: #f8fafc; }
        .badge { padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
        .badge-pending { background:#fef3c7; color:#b45309; }
        .badge-in-progress { background:#dbeafe; color:#1d4ed8; }
        .badge-completed { background:#d1fae5; color:#065f46; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <h1>Admin — Requests Queue</h1>
      <p>Exported on ${new Date().toLocaleString()} &nbsp;|&nbsp; ${searchedAndFiltered.length} records</p>
      <table>
        <thead><tr>
          <th>Item</th><th>Requester</th><th>Scope</th><th>Target</th>
          <th>Status</th><th>Date</th><th>Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6 mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-14 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 sm:mt-0 shrink-0 text-[#0F2D52]" /> Requests
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage procurement requests for the school or specific teachers.
            </p>
          </div>

          {activeTab !== 'employee' && (
            <Button
              onClick={handleOpenModal}
              className="rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] hover:from-[#091629] text-white font-bold text-xs shadow-md flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Create Request
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="-mx-4 px-4 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max">
            {([
              { key: 'all' as const,      label: 'All',              count: requests.length },
              { key: 'employee' as const, label: 'Employee request',  count: requests.filter(r => r.requesterRole === 'employee').length },
              { key: 'admin' as const,    label: 'Admin request',     count: requests.filter(r => r.requesterRole === 'admin' || r.requesterRole === 'superadmin').length },
              { key: 'mine' as const,     label: 'My Requests',       count: requests.filter(r => r.requesterId === user?.id).length },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap px-4 sm:px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === tab.key ? 'border-[#0f2d52] text-[#0f2d52]' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.key ? 'bg-[#0F2D52]/10 text-[#0F2D52]' : 'bg-slate-100 text-slate-400'
                }`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by requested item or requester name..."
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

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs px-3 sm:px-4 flex-shrink-0 flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={exportToCSV} className="flex items-center gap-2 cursor-pointer">
                    <Package className="w-4 h-4" />
                    <span>Export as CSV</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToPDF} className="flex items-center gap-2 cursor-pointer">
                    <Receipt className="w-4 h-4" />
                    <span>Export as PDF</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
                  <label className="text-xs sm:text-sm font-medium text-slate-500">Scope</label>
                  <select
                    value={scopeFilter}
                    onChange={e => { setScopeFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
                  >
                    <option value="all">All Scopes</option>
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
        <div className="flex flex-row justify-between items-center gap-3 mb-6">
          <div className="text-sm font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{sortedRequests.length}</span> requests
          </div>
          <div className="flex items-center gap-2">
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
                onClick={() => setViewMode('cards')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}
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
              No matching items for the selected filters and criteria.
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedData.map((req, idx) => (
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
                        {req.location && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Location</p>
                            <p className="text-xs font-semibold text-slate-600 mt-0.5">{req.location}</p>
                          </div>
                        )}
                        {req.expectedCompletionDate && (
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected Completion</p>
                            <p className="text-xs font-semibold text-blue-600 mt-0.5">{new Date(req.expectedCompletionDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions section */}
                    <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-50 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button variant="outline" size="sm" disabled={req.status !== 'Pending'} onClick={() => handleOpenEdit(req)} className="h-8 rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed"><Pencil className="w-3 h-3 mr-1" />Edit</Button>
                          <Button variant="outline" size="sm" disabled={req.status !== 'Pending'} onClick={() => handleDelete(req)} className="h-8 rounded-lg text-xs text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
                          {req.productLink && (
                            <a href={req.productLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold">
                              <Link2 className="w-3.5 h-3.5" /> Product Page <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {!req.productLink && <span className="text-[11px] text-slate-400 italic">No product link</span>}
                        </div>
                        <div>
                          {req.status === 'Completed' && (
                            <div className="text-right text-[11px]">
                              <span className="font-semibold text-slate-400">Spent:</span>{' '}
                              <span className="font-extrabold text-emerald-700 text-xs">${req.amountSpent?.toFixed(2)}</span>
                              {req.paidByName && (
                                <p className="text-[10px] text-slate-400 mt-0.5">Completed by: <span className="font-semibold text-slate-600">{req.paidByName}</span></p>
                              )}
                            </div>
                          )}
                          {req.status === 'Pending' && (
                            <button
                              onClick={() => handleOpenStartProcessing(req)}
                              disabled={validatingId === req.id}
                              className="text-[11px] text-[#0F2D52] font-semibold flex items-center gap-1 bg-blue-50/80 border border-blue-100 rounded-lg px-2.5 py-1 hover:bg-[#0F2D52] hover:text-white transition-colors disabled:opacity-50 whitespace-nowrap"
                            >
                              {validatingId === req.id
                                ? <span className="animate-spin rounded-full border-2 border-current border-t-transparent h-2.5 w-2.5 inline-block" />
                                : <ArrowRight className="w-3 h-3" />}
                              Processing
                            </button>
                          )}
                          {req.status === 'In Progress' && (
                            <button
                              onClick={() => handleOpenPurchaseModal(req)}
                              className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50/80 border border-emerald-100 rounded-lg px-2.5 py-1 hover:bg-emerald-100 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Record Purchase
                            </button>
                          )}
                        </div>
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
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => setSortConfig(sc => sc?.key === 'item' ? { key: 'item', direction: sc.direction === 'asc' ? 'desc' : 'asc' } : { key: 'item', direction: 'asc' })}>
                      <div className="flex items-center gap-1.5">
                        Item {sortConfig?.key === 'item' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700">
                      Requester
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700">
                      Scope
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700">
                      Target
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => setSortConfig(sc => sc?.key === 'status' ? { key: 'status', direction: sc.direction === 'asc' ? 'desc' : 'asc' } : { key: 'status', direction: 'asc' })}>
                      <div className="flex items-center gap-1.5">
                        Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/80 transition-colors" onClick={() => setSortConfig(sc => sc?.key === 'createdAt' ? { key: 'createdAt', direction: sc.direction === 'asc' ? 'desc' : 'asc' } : { key: 'createdAt', direction: 'asc' })}>
                      <div className="flex items-center gap-1.5">
                        Date {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#0F2D52]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0F2D52]" />)}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-700 text-right min-w-[160px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedData.map((req) => (
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
                            <span className="font-semibold text-xs sm:text-sm line-clamp-2">{req.item}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{req.category || 'Supplies'}</span>
                            {req.productLink && (
                              <a href={req.productLink} target="_blank" rel="noopener noreferrer" className="text-[#1a6fc4] hover:text-[#0F2D52] hover:underline inline-flex items-center gap-1 text-[10px] font-medium w-fit mt-0.5">
                                <Link2 className="w-3 h-3" /> View Product
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-700 font-medium whitespace-nowrap">
                        {req.requesterName}
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 capitalize">
                        {req.scope}
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-600">
                        {req.scope === 'classroom' && req.classroomName}
                        {req.scope === 'teacher' && req.teacherName}
                        {req.scope === 'school' && 'Entire School'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                          {getStatusIcon(req.status)}
                          {getStatusLabel(req.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs sm:text-sm text-slate-500 font-medium whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {req.status === 'Completed' && req.amountSpent !== undefined ? (
                          <div className="text-xs">
                            <p className="font-bold text-emerald-700">${req.amountSpent.toFixed(2)}</p>
                            {req.paymentMethod && <p className="text-[10px] text-slate-400 mt-0.5">{req.paymentMethod}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right min-w-[160px]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {req.status !== 'Completed' && (
                            <>
                              <Button variant="outline" size="sm" aria-label="Edit request" onClick={() => handleOpenEdit(req)} className="h-7 w-7 p-0 rounded-lg hover:border-[#0F2D52] hover:text-[#0F2D52]"><Pencil className="w-3 h-3" /></Button>
                              <Button variant="outline" size="sm" aria-label="Delete request" onClick={() => handleDelete(req)} className="h-7 w-7 p-0 rounded-lg text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400"><Trash2 className="w-3 h-3" /></Button>
                            </>
                          )}
                          <ActionCell req={req} />
                        </div>
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
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-slate-500 text-xs sm:text-sm">
              Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * recordsPerPage + 1}</span>–<span className="font-semibold text-slate-900">{Math.min(currentPage * recordsPerPage, sortedRequests.length)}</span> of <span className="font-semibold text-slate-900">{sortedRequests.length}</span>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

      </div>

      {/* Admin Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] bg-white p-0 no-scrollbar flex flex-col">
          <div className="px-6 pt-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">{editingRequest ? 'Edit Procurement Request' : 'Create Procurement Request'}</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Submit a request for all classrooms across the school, or for a specific teacher issue. This will be verified and approved by the Super Admin.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleFormSubmit} id="admin-request-form" className="flex-1 overflow-y-auto">
            <div className="space-y-4 pt-2 px-6 pb-2">
            
            {/* Target Assignment Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Target Assignment <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!!editingRequest}
                  onClick={() => { if (!editingRequest) setFormData(prev => ({ ...prev, scope: 'school', classroomId: '', classroomName: '', teacherId: '', teacherName: '' })); }}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
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
                  disabled={!!editingRequest}
                  onClick={() => { if (!editingRequest) setFormData(prev => ({ ...prev, scope: 'classroom', classroomId: classrooms[0]?.id || '', classroomName: classrooms[0]?.name || '', teacherId: '', teacherName: '' })); }}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
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
                  disabled={!!editingRequest}
                  onClick={() => { if (!editingRequest) setFormData(prev => ({ ...prev, scope: 'teacher', classroomId: '', classroomName: '', teacherId: teachers[0]?.id || '', teacherName: teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '' })); }}
                  className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
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
              {editingRequest && <p className="text-[11px] text-slate-500">Target assignment cannot be changed after a request is created.</p>}
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
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
                >
                  <option value="">Select location</option>{locationOptions.map(loc => (
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
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  onBlur={e => { if (e.target.value === '') setFormData(prev => ({ ...prev, quantity: 1 })); }}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
                />
                {formErrors.quantity && <p className="text-xs text-red-600 font-semibold">{formErrors.quantity}</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-2 py-2.5 text-[11px] sm:text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52] overflow-hidden text-ellipsis whitespace-nowrap"
                >
                <option value="">Select category</option>{categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.category && <p className="text-xs text-red-600 font-semibold">{formErrors.category}</p>}
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
              {imageFile ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img
                      src={URL.createObjectURL(imageFile)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <p className="text-xs font-semibold text-slate-700" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{imageFile.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(imageFile.size / 1024).toFixed(0)} KB</p>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="mt-auto pt-1 text-[10px] text-red-500 hover:text-red-700 font-semibold w-fit"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : editingRequest?.productImage ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img
                      src={editingRequest.productImage}
                      alt={editingRequest.item}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">Current product image</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">This image is already attached to the request.</p>
                    <label className="inline-flex mt-2 cursor-pointer text-[10px] font-semibold text-[#1a6fc4] hover:text-[#0F2D52]">
                      Replace image
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
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
            </div>
          </form>
          <DialogFooter className="px-6 py-3 border-t border-slate-50 flex-col sm:flex-row gap-3 bg-white rounded-b-2xl justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setIsModalOpen(false); setEditingRequest(null); }}
              className="rounded-xl h-9 text-xs font-semibold px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="admin-request-form"
              disabled={submitting}
              className="rounded-xl h-9 px-5 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52]"
            >
              {submitting ? (imageFile ? 'Uploading & Saving...' : 'Saving...') : editingRequest ? 'Save Changes' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Record Purchase</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              {selectedRequest?.item && `Complete the purchase for: ${selectedRequest.item}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount Spent */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Amount Spent <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={payFormData.amountSpent}
                onChange={(e) => setPayFormData(prev => ({ ...prev, amountSpent: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={payFormData.paymentMethod}
                onChange={(e) => setPayFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
              >
                <option>Credit Card</option>
                <option>Debit Card</option>
                <option>Cash</option>
                <option>Check</option>
                <option>Bank Transfer</option>
              </select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Purchase Date
              </label>
              <input
                type="date"
                value={payFormData.purchaseDate}
                onChange={(e) => setPayFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
              />
            </div>

            {/* Bill/Receipt Image Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bill / Receipt Image
              </label>
              {!billImageFile ? (
                <label className="block relative w-full border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-slate-400 transition-colors bg-slate-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBillImageChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center text-center gap-2">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Upload bill/receipt</p>
                      <p className="text-[10px] text-slate-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </div>
                </label>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{billImageFile.name}</p>
                    <p className="text-[10px] text-slate-500">{(billImageFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearBillImage}
                    className="h-8 rounded-lg text-xs text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" /> Remove
                  </Button>
                </div>
              )}
            </div>

            {/* Payment Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Notes
              </label>
              <textarea
                value={payFormData.paymentNotes}
                onChange={(e) => setPayFormData(prev => ({ ...prev, paymentNotes: e.target.value }))}
                placeholder="Any additional notes about this purchase..."
                rows={3}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-slate-50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPurchaseModalOpen(false)}
              className="w-full sm:w-auto rounded-xl h-11 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePurchaseSubmit}
              disabled={submitting || !payFormData.amountSpent}
              className="w-full sm:w-auto rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Recording...' : 'Record Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Processing Modal */}
      <Dialog open={isStartProcessingModalOpen} onOpenChange={setIsStartProcessingModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-[#0F2D52]" /> Processing
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set the date this request is expected to be completed.
            </DialogDescription>
          </DialogHeader>
          {startProcessingRequest && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1 my-2">
              <p className="font-semibold text-slate-700">Item: <span className="font-extrabold text-slate-900">{startProcessingRequest.item}</span></p>
              <p className="text-slate-500">Requested by: <span className="font-bold text-slate-700">{startProcessingRequest.requesterName}</span></p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Expected Completion Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={expectedCompletionDate}
              min={getTodayDateString()}
              onChange={(e) => {
                setExpectedCompletionDate(e.target.value);
                const validation = validateFutureDate(e.target.value);
                setDateError(validation.isValid ? null : validation.error || null);
              }}
              className={`w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border rounded-xl focus:outline-none transition-colors ${
                dateError
                  ? 'border-red-300 focus:border-red-500 bg-red-50'
                  : 'border-slate-200 focus:border-[#0F2D52]'
              }`}
            />
            {dateError && (
              <div className="flex items-start gap-2 mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{dateError}</p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-50">
            <Button type="button" variant="outline" onClick={() => setIsStartProcessingModalOpen(false)}
              className="w-full sm:w-auto rounded-xl h-10 text-xs font-semibold">Cancel</Button>
            <Button
              onClick={handleStartProcessing}
              disabled={!expectedCompletionDate || !!dateError}
              className="w-full sm:w-auto rounded-xl h-10 border-2 border-[#0F2D52] text-[#0F2D52] bg-white hover:bg-[#0F2D52] hover:text-white font-bold text-xs px-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowRight className="w-4 h-4 mr-1.5" /> Confirm & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
