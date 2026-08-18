import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { AdminLayout } from '../admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useUserContext } from '../../contexts/UserContext';
import { useAuth } from '../../services/auth/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { fetchRequestSettings } from '../../services/api/settings';
import { EmployeeService, type Employee } from '../../services/api/employee';
import { fetchClassrooms, type Classroom } from '../../services/api/admin';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import {
  ShoppingBag, Search, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, CreditCard, DollarSign,
  LayoutGrid, TableProperties, Plus, Filter, School, User, GraduationCap, ArrowRight,
  Download, X, Receipt, Package, CalendarDays, BadgeCheck, StickyNote
} from 'lucide-react';

export function SuperAdminRequests() {
  const { userData } = useUserContext();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Lists
  const [requests, setRequests] = useState<Request[]>([]);
  const [teachers, setTeachers] = useState<Employee[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Request, direction: 'asc' | 'desc' } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'employee' | 'admin'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  const activeFilterCount = (sortConfig ? 1 : 0) + (scopeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

  const clearAllFilters = () => {
    setSortConfig(null);
    setScopeFilter('all');
    setStatusFilter('all');
  };

  // Start Processing modal state
  const [isStartProcessingModalOpen, setIsStartProcessingModalOpen] = useState(false);
  const [startProcessingRequest, setStartProcessingRequest] = useState<Request | null>(null);
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateEditRequest, setDateEditRequest] = useState<Request | null>(null);
  const [isDateEditOpen, setIsDateEditOpen] = useState(false);

  // Purchase modal state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [billImageFile, setBillImageFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    amountSpent: '',
    paymentMethod: 'Credit Card',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentNotes: ''
  });

  // Create request modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [createFormData, setCreateFormData] = useState({
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

  // Detail modal state
  const [detailRequest, setDetailRequest] = useState<Request | null>(null);

  const paymentMethods = ['Credit Card', 'Debit Card', 'Bank Transfer', 'Check', 'Cash'];
  const [categories, setCategories] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, classroomList, requestSettings] = await Promise.all([
        RequestService.fetchRequests(),
        userData?.schoolId ? fetchClassrooms(userData.schoolId) : Promise.resolve([]),
        userData?.schoolId ? fetchRequestSettings(userData.schoolId) : Promise.resolve(null),
      ]);
      setRequests(reqList);
      setClassrooms(classroomList);
      setCategories(requestSettings?.requestCategories.map(item => item.label) ?? []);
      setLocationOptions(requestSettings?.location.map(item => item.label) ?? []);

      if (userData?.schoolId) {
        try {
          const empList = await EmployeeService.fetchEmployees(userData.schoolId);
          setTeachers(empList.length > 0 ? empList : getFallbackTeachers(userData.schoolId));
        } catch {
          setTeachers(getFallbackTeachers(userData.schoolId ?? ''));
        }
      }
    } catch (e) {
      showToast('error', 'Failed to load requests queue.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const getFallbackTeachers = (schoolId: string): Employee[] => [
    { id: 'emp-1', userId: 'user-1', firstName: 'Sarah', lastName: 'Jenkins', email: '', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
    { id: 'emp-2', userId: 'user-2', firstName: 'Emily', lastName: 'Smith', email: '', phone: '', address: '', employeeType: 'Lead Teacher', joinedOn: '', schoolId, status: 'active' },
  ];

  useEffect(() => { loadData(); }, [userData?.schoolId]);

  // ── Purchase modal ──────────────────────────────────────────────────────────

  const handleOpenPurchaseModal = (req: Request) => {
    setSelectedRequest(req);
    setFormData({ amountSpent: '', paymentMethod: 'Credit Card', purchaseDate: new Date().toISOString().split('T')[0], paymentNotes: '' });
    setBillImageFile(null);
    setFormErrors({});
    setIsPurchaseModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
  };

  const handleBillImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('error', 'Image must be under 2 MB.', 'File Too Large'); return; }
    setBillImageFile(file);
  };

  const validatePurchaseForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.amountSpent.trim()) errors.amountSpent = 'Amount spent is required';
    else if (isNaN(parseFloat(formData.amountSpent)) || parseFloat(formData.amountSpent) <= 0) errors.amountSpent = 'Amount must be a positive number';
    if (!formData.purchaseDate) errors.purchaseDate = 'Purchase date is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !validatePurchaseForm()) return;
    setSubmitting(true);
    try {
      await RequestService.verifyRequest(selectedRequest.id, {
        amountSpent: parseFloat(formData.amountSpent),
        paymentMethod: formData.paymentMethod,
        purchaseDate: formData.purchaseDate,
        paymentNotes: formData.paymentNotes || undefined
      }, billImageFile || undefined);
      showToast('success', 'Request marked as Completed.', 'Purchase Recorded');
      setIsPurchaseModalOpen(false);
      const reqList = await RequestService.fetchRequests();
      setRequests(reqList);
    } catch {
      showToast('error', 'Could not record purchase details.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Start Processing (Pending → In Progress) ────────────────────────────────

  const handleOpenStartProcessing = (req: Request) => {
    setStartProcessingRequest(req);
    setExpectedCompletionDate(new Date().toISOString().split('T')[0]);
    setIsStartProcessingModalOpen(true);
  };

  const handleStartProcessing = async () => {
    if (!startProcessingRequest) return;
    const req = startProcessingRequest;
    setIsStartProcessingModalOpen(false);
    setValidatingId(req.id);
    try {
      await RequestService.validateRequest(req.id, undefined, expectedCompletionDate);
      showToast('success', `"${req.item}" moved to In Progress.`, 'Status Updated');
      const reqList = await RequestService.fetchRequests();
      setRequests(reqList);
    } catch {
      showToast('error', 'Could not update request status.', 'Error');
    } finally {
      setValidatingId(null);
      setStartProcessingRequest(null);
    }
  };

  const handleSaveExpectedCompletionDate = async () => {
    if (!dateEditRequest || !expectedCompletionDate) return;
    setSubmitting(true);
    try {
      const updatedRequest = await RequestService.updateExpectedCompletionDate(dateEditRequest.id, expectedCompletionDate);
      setRequests(currentRequests => currentRequests.map(request =>
        request.id === updatedRequest.id ? updatedRequest : request,
      ));
      setDetailRequest(currentRequest =>
        currentRequest?.id === updatedRequest.id ? updatedRequest : currentRequest,
      );
      showToast('success', 'Expected completion date updated.', 'Date Updated');
      setIsDateEditOpen(false);
      setDateEditRequest(null);
      setRequests(await RequestService.fetchRequests());
    } catch {
      showToast('error', 'Could not update expected completion date.', 'Error');
    } finally { setSubmitting(false); }
  };

  // ── Create request modal ────────────────────────────────────────────────────

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'classroomId') {
      const sel = classrooms.find(c => c.id === value);
      setCreateFormData(prev => ({ ...prev, classroomId: value, classroomName: sel?.name ?? '' }));
    } else if (name === 'teacherId') {
      const sel = teachers.find(t => t.id === value);
      setCreateFormData(prev => ({ ...prev, teacherId: value, teacherName: sel ? `${sel.firstName} ${sel.lastName}` : '' }));
    } else {
      setCreateFormData(prev => ({ ...prev, [name]: name === 'quantity' ? parseInt(value) || 1 : value }));
    }
    if (createFormErrors[name]) setCreateFormErrors(prev => { const c = { ...prev }; delete c[name]; return c; });
  };

  const handleCreateImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('error', 'Image must be under 2 MB.', 'File Too Large'); return; }
    setCreateImageFile(file);
  };

  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    if (!createFormData.item.trim()) errors.item = 'Request item name is required';
    if (createFormData.quantity < 1) errors.quantity = 'Quantity must be at least 1';
    if (createFormData.scope === 'classroom' && !createFormData.classroomId) errors.classroomId = 'Please select a classroom';
    if (createFormData.scope === 'teacher' && !createFormData.teacherId) errors.teacherId = 'Please select a teacher';
    setCreateFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreateModal = () => {
    setCreateFormData({
      item: '', quantity: 1, category: 'Classroom Supplies', scope: 'school',
      classroomId: '', classroomName: '',
      teacherId: teachers[0]?.id || '', teacherName: teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '',
      location: locationOptions[0] || '', productLink: '', notes: ''
    });
    setCreateImageFile(null);
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreateForm()) return;
    setSubmitting(true);
    try {
      const requesterName = userData ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || 'Super Admin' : 'Super Admin';
      await RequestService.createRequest({
        schoolId: userData?.schoolId || '',
        requesterId: user?.id || '',
        requesterName,
        requesterRole: 'superadmin',
        item: createFormData.item,
        quantity: createFormData.quantity,
        category: createFormData.category,
        location: createFormData.location || undefined,
        scope: createFormData.scope,
        classroomId: createFormData.scope === 'classroom' ? createFormData.classroomId : undefined,
        classroomName: createFormData.scope === 'classroom' ? createFormData.classroomName : undefined,
        teacherId: createFormData.scope === 'teacher' ? createFormData.teacherId : undefined,
        teacherName: createFormData.scope === 'teacher' ? createFormData.teacherName : undefined,
        productLink: createFormData.productLink || undefined,
        notes: createFormData.notes || undefined,
      }, createImageFile || undefined);
      showToast('success', 'Request created successfully.', 'Request Created');
      setIsCreateModalOpen(false);
      const reqList = await RequestService.fetchRequests();
      setRequests(reqList);
    } catch {
      showToast('error', 'Could not create request. Please try again.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtering ───────────────────────────────────────────────────────────────

  const searchedAndFiltered = requests.filter(req => {
    const matchesTab =
      activeTab === 'all' ? true :
      activeTab === 'employee' ? req.requesterRole === 'employee' :
      req.requesterRole === 'admin' || req.requesterRole === 'superadmin';
    const matchesSearch =
      req.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // ── Export helpers ──────────────────────────────────────────────────────────

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
        <td>${r.category || '-'}</td>
        <td>${r.quantity}</td>
        <td style="text-transform:capitalize">${r.scope}</td>
        <td>${r.classroomName || r.teacherName || '-'}</td>
        <td>${r.requesterName}</td>
        <td style="text-transform:capitalize">${r.requesterRole}</td>
        <td><span class="badge badge-${r.status.toLowerCase().replace(' ', '-')}">${r.status}</span></td>
        <td>${r.amountSpent != null ? '$' + r.amountSpent.toFixed(2) : '-'}</td>
        <td>${r.purchaseDate || '-'}</td>
        <td>${new Date(r.createdAt).toLocaleDateString()}</td>
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
      <h1>Super Admin — Requests Queue</h1>
      <p>Exported on ${new Date().toLocaleString()} &nbsp;|&nbsp; ${searchedAndFiltered.length} records</p>
      <table>
        <thead><tr>
          <th>Item</th><th>Category</th><th>Qty</th><th>Scope</th><th>Target</th>
          <th>Requester</th><th>Role</th><th>Status</th><th>Amount</th><th>Purchase Date</th><th>Created</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  // ── Status helpers ──────────────────────────────────────────────────────────

  const getStatusLabel = (status: RequestStatus) => status === 'Pending' ? 'Submitted' : status;

  const getStatusBadgeClass = (status: RequestStatus) => {
    switch (status) {
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'Pending': return <Clock className="w-3.5 h-3.5" />;
      case 'In Progress': return <Play className="w-3.5 h-3.5 animate-pulse" />;
      case 'Completed': return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  // ── Action cell (shared between card and table) ─────────────────────────────

  const ActionCell = ({ req }: { req: Request }) => {
    if (req.status === 'Completed') {
      return (
        <div className="text-right flex flex-col items-end gap-0.5">
          <div className="h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg bg-white border-2 border-transparent flex items-center justify-center">
            <p className="text-[8px] sm:text-xs md:text-sm font-bold text-emerald-700 whitespace-nowrap">Spent: ${req.amountSpent?.toFixed(2)}</p>
          </div>
          <p className="text-[7px] sm:text-xs text-slate-400 px-1.5 sm:px-2 md:px-3">via {req.paymentMethod} on {req.purchaseDate}</p>
        </div>
      );
    }
    if (req.status === 'Pending') {
      return (
        <div className="flex justify-end">
          <Button
            onClick={() => handleOpenStartProcessing(req)}
            disabled={validatingId === req.id}
            className="h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg border-2 border-[#0F2D52] text-[#0F2D52] bg-white hover:bg-[#0F2D52] hover:text-white font-bold text-[8px] sm:text-[9px] md:text-xs shadow-sm flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 transition-colors whitespace-nowrap"
          >
            {validatingId === req.id ? (
              <span className="animate-spin rounded-full border-2 border-current border-t-transparent h-2.5 sm:h-3 w-2.5 sm:w-3 inline-block" />
            ) : (
              <ArrowRight className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" />
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
          className="h-7 sm:h-8 md:h-9 px-1.5 sm:px-2 md:px-3 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white font-bold text-[8px] sm:text-[9px] md:text-xs shadow-sm flex items-center justify-center gap-0.5 sm:gap-1 md:gap-2 transition-colors whitespace-nowrap"
        >
          <CreditCard className="w-2.5 sm:w-3 h-2.5 sm:h-3 shrink-0" />
          <span className="hidden sm:inline">Record Purchase</span>
          <span className="inline sm:hidden text-[7px]">Record</span>
        </Button>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6 mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-14 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 sm:mt-0 shrink-0 text-[#0F2D52]" /> Super Admin Requests Queue
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Validate, approve, and record payments for all procurement requests.
            </p>
          </div>
          <Button
            onClick={handleOpenCreateModal}
            className="rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] hover:from-[#091629] text-white font-bold text-xs shadow-md flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Request
          </Button>
        </div>

        {/* Tabs */}
        <div className="-mx-4 px-4 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max">
            {([
              { key: 'all', label: `All (${requests.length})` },
              { key: 'employee', label: `Employee Requests (${requests.filter(r => r.requesterRole === 'employee').length})` },
              { key: 'admin', label: `Admin Requests (${requests.filter(r => r.requesterRole === 'admin' || r.requesterRole === 'superadmin').length})` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap px-4 sm:px-5 py-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === tab.key ? 'border-[#0f2d52] text-[#0f2d52]' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm mb-6 flex flex-col overflow-hidden">
          <div className="p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
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
                  <Button variant="outline" size="sm" onClick={() => { clearAllFilters(); setCurrentPage(1); }} className="h-8 rounded-lg bg-white text-[#0F2D52] border border-slate-200 hover:bg-slate-50 transition-all font-bold text-xs">
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
                    <option value="school">School</option>
                    <option value="classroom">Class</option>
                    <option value="teacher">Teacher</option>
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

        {/* Count + Export + View Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{searchedAndFiltered.length}</span> requests
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export dropdown */}
            {searchedAndFiltered.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-white text-slate-700 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl h-9 text-xs font-bold transition-all">
                    <Download className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={exportToCSV}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-xs" onClick={exportToPDF}>
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div title="No records to export">
                <Button size="sm" className="bg-white text-slate-400 border border-slate-200 rounded-xl h-9 cursor-not-allowed" disabled>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                </Button>
              </div>
            )}
            <select value={recordsPerPage} onChange={e => setRecordsPerPage(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2D52] bg-white text-slate-700 h-9">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button onClick={() => setViewMode('cards')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setViewMode('table')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'table' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                <TableProperties className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Requests Queue */}
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mb-3" />
            <p className="text-slate-500 text-sm font-semibold">Loading requests queue...</p>
          </div>
        ) : searchedAndFiltered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">No matching procurement requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {paginatedData.map((req, idx) => (
                    <motion.div key={req.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.25, delay: idx * 0.03 }}>
                      <Card
                        onClick={() => setDetailRequest(req)}
                        className="border border-slate-100 bg-white hover:border-[#0F2D52]/30 hover:shadow-md transition-all rounded-2xl overflow-hidden shadow-sm h-full flex flex-col justify-between cursor-pointer">
                        <div className="p-4 sm:p-5 space-y-4">
                          <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Category: {req.category || 'Supplies'}</p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-[#0F2D52] truncate max-w-[12rem]">{req.requesterName}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{req.requesterRole}</span>
                              </p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                              {getStatusIcon(req.status)}{getStatusLabel(req.status)}
                            </span>
                          </div>
                          <div className="flex flex-col min-[420px]:flex-row gap-3 sm:gap-4">
                            {req.productImage ? (
                              <img src={req.productImage} alt={req.item} className="w-full h-32 min-[420px]:w-20 min-[420px]:h-20 rounded-xl object-cover border border-slate-100 bg-slate-50 flex-shrink-0" />
                            ) : (
                              <div className="w-full h-32 min-[420px]:w-20 min-[420px]:h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{req.item}</h3>
                              <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                <p className="text-slate-500">Qty: <span className="font-bold text-slate-700">{req.quantity}</span></p>
                                <p className="text-slate-500 truncate">
                                  {req.scope === 'classroom' && <>Scope: <span className="font-bold text-slate-700">Classroom ({req.classroomName})</span></>}
                                  {req.scope === 'teacher' && <>Scope: <span className="font-bold text-slate-700">Teacher ({req.teacherName})</span></>}
                                  {req.scope === 'school' && <>Scope: <span className="font-bold text-slate-700">Entire School</span></>}
                                </p>
                              </div>
                              <p className="text-[10px] text-slate-400">Created on {new Date(req.createdAt).toLocaleString()}</p>
                              {req.location && <p className="text-[10px] text-slate-500">Location: <span className="font-semibold">{req.location}</span></p>}
                              {req.expectedCompletionDate && (
                                <p className="text-[10px] text-blue-500 font-semibold">Expected completion: {new Date(req.expectedCompletionDate).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50/50 px-4 sm:px-5 py-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between items-stretch gap-3">
                          <div className="min-w-0">
                            {req.productLink ? (
                              <a href={req.productLink} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold">
                                <Link2 className="w-3.5 h-3.5" /> Product Page <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">No product link</span>
                            )}
                          </div>
                          <div className="w-full sm:w-auto flex sm:justify-end" onClick={e => e.stopPropagation()}>
                            <ActionCell req={req} />
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left min-w-[100px]">Item</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left min-w-[90px]">Requester</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left min-w-[90px]">Scope / Target</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center min-w-[80px]">Status</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-left min-w-[70px]">Date</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center min-w-[90px]">Amount</th>
                        <th className="px-3 sm:px-4 py-3 sm:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-right min-w-[120px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedData.map(req => (
                        <tr key={req.id} onClick={() => setDetailRequest(req)} className="hover:bg-slate-50 transition-colors cursor-pointer align-middle">
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-left min-w-[100px]">
                            <p className="font-semibold text-slate-800 line-clamp-1 text-[7px] sm:text-[8px] md:text-xs leading-tight">{req.item}</p>
                            <p className="text-[6px] sm:text-[8px] text-slate-700 leading-tight">{req.category || 'Supplies'} • Qty: {req.quantity}</p>
                            {req.productLink && (
                              <a href={req.productLink} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-[6px] sm:text-[8px] text-[#1a6fc4] hover:text-[#0F2D52] font-semibold">
                                <Link2 className="w-2 h-2" /> Link
                              </a>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-left min-w-[90px]">
                            <p className="font-medium text-slate-700 text-[7px] sm:text-[8px] md:text-xs line-clamp-1 leading-tight">{req.requesterName}</p>
                            <p className="text-[6px] sm:text-[7px] uppercase font-bold text-slate-400 tracking-wide leading-tight">{req.requesterRole}</p>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-left min-w-[90px]">
                            <p className="text-[7px] sm:text-[10px] font-semibold text-slate-800 leading-tight capitalize">{req.scope === 'classroom' ? 'Classroom' : req.scope === 'teacher' ? 'Teacher' : 'School'}</p>
                            <p className="text-[6px] sm:text-[10px] text-slate-700 leading-tight">
                              {req.scope === 'classroom' && req.classroomName}
                              {req.scope === 'teacher' && req.teacherName}
                              {req.scope === 'school' && 'Entire School'}
                            </p>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-center min-w-[80px]">
                            <span className={`inline-flex items-center gap-0.5 text-[7px] sm:text-[8px] md:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border whitespace-nowrap ${getStatusBadgeClass(req.status)}`}>
                              {getStatusIcon(req.status)}<span className="hidden sm:inline">{getStatusLabel(req.status)}</span>
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-left min-w-[70px]">
                            <p className="text-slate-500 text-[7px] sm:text-[8px] md:text-xs whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</p>
                            {req.expectedCompletionDate && (
                              <p className="text-[7px] sm:text-[8px] text-blue-500 font-semibold whitespace-nowrap">Expected: {new Date(req.expectedCompletionDate).toLocaleDateString()}</p>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 font-medium text-[7px] sm:text-[8px] md:text-xs min-w-[90px] text-center">
                            {req.status === 'Completed' ? <span className="font-bold text-emerald-700">${req.amountSpent?.toFixed(2)}</span> : '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-2.5 text-right min-w-[120px]" onClick={e => e.stopPropagation()}>
                            <ActionCell req={req} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {searchedAndFiltered.length > 0 && (
              <Pagination currentPage={currentPage} totalPages={totalPages}
                totalItems={searchedAndFiltered.length} itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage} />
            )}
          </div>
        )}
      </div>

      {/* ── Request Detail Modal ───────────────────────────────────────────── */}
      <Dialog open={!!detailRequest} onOpenChange={open => { if (!open) setDetailRequest(null); }}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {detailRequest && (() => {
            const req = detailRequest;
            return (
              <>
                {/* Modal Header */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] rounded-t-2xl">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-1">Request Detail</p>
                    <h2 className="text-base font-extrabold text-white leading-snug line-clamp-2">{req.item}</h2>
                    <p className="text-xs text-blue-200 mt-1">{req.category || 'Supplies'} &nbsp;·&nbsp; Qty {req.quantity}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                      {getStatusIcon(req.status)}{getStatusLabel(req.status)}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Product image */}
                  {req.productImage && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                      <img src={req.productImage} alt={req.item} className="w-full max-h-52 object-contain" />
                    </div>
                  )}

                  {/* Status lifecycle bar */}
                  <div className="flex items-center gap-0">
                    {(['Pending', 'In Progress', 'Completed'] as RequestStatus[]).map((s, i) => {
                      const steps = ['Pending', 'In Progress', 'Completed'];
                      const current = steps.indexOf(req.status);
                      const done = i <= current;
                      return (
                        <React.Fragment key={s}>
                          <div className={`flex flex-col items-center ${i === 0 ? '' : ''}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold border-2 ${done ? 'bg-[#0F2D52] border-[#0F2D52] text-white' : 'bg-white border-slate-200 text-slate-300'}`}>
                              {i + 1}
                            </div>
                            <span className={`text-[9px] font-bold mt-1 whitespace-nowrap ${done ? 'text-[#0F2D52]' : 'text-slate-300'}`}>{getStatusLabel(s as RequestStatus)}</span>
                          </div>
                          {i < 2 && <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < current ? 'bg-[#0F2D52]' : 'bg-slate-200'}`} />}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Requester</p>
                      <p className="text-sm font-bold text-slate-800">{req.requesterName}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{req.requesterRole}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><School className="w-3 h-3" /> Scope</p>
                      <p className="text-sm font-bold text-slate-800 capitalize">{req.scope}</p>
                      {req.scope === 'classroom' && <p className="text-[10px] text-slate-500">{req.classroomName}</p>}
                      {req.scope === 'teacher' && <p className="text-[10px] text-slate-500">{req.teacherName}</p>}
                      {req.scope === 'school' && <p className="text-[10px] text-slate-500">Entire School</p>}
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Package className="w-3 h-3" /> Quantity</p>
                      <p className="text-sm font-bold text-slate-800">{req.quantity}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Requested On</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(req.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleTimeString()}</p>
                    </div>
                    {req.expectedCompletionDate && (
                      <div className="bg-blue-50 rounded-xl p-3 space-y-0.5 col-span-2">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1"><Play className="w-3 h-3" /> Expected Completion Date</p>
                        <div className="flex items-center justify-between"><p className="text-sm font-bold text-blue-800">{new Date(req.expectedCompletionDate).toLocaleDateString()}</p><Button variant="outline" size="sm" onClick={() => { setDateEditRequest(req); setExpectedCompletionDate(req.expectedCompletionDate || ''); setIsDateEditOpen(true); }} className="h-7 text-[10px]">Edit</Button></div>
                      </div>
                    )}
                  </div>

                  {/* Product link */}
                  {req.productLink && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Product Link</p>
                        <p className="text-xs font-semibold text-blue-700 truncate max-w-xs">{req.productLink}</p>
                      </div>
                      <a href={req.productLink} target="_blank" rel="noopener noreferrer"
                        className="shrink-0 ml-3 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                        Open <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {/* Notes */}
                  {req.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Notes</p>
                      <p className="text-xs text-amber-800">{req.notes}</p>
                    </div>
                  )}

                  {/* Payment details (Completed) */}
                  {req.status === 'Completed' && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5"><BadgeCheck className="w-4 h-4" /> Purchase Recorded</p>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wide">Amount Spent</p>
                          <p className="text-lg font-extrabold text-emerald-800">${req.amountSpent?.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wide">Payment Method</p>
                          <p className="font-bold text-emerald-800">{req.paymentMethod}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wide">Purchase Date</p>
                          <p className="font-bold text-emerald-800">{req.purchaseDate}</p>
                        </div>
                        {req.paymentNotes && (
                          <div>
                            <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wide">Notes</p>
                            <p className="text-emerald-700">{req.paymentNotes}</p>
                          </div>
                        )}
                      </div>
                      {/* Bill image */}
                      {req.billImageUrl && (
                        <div>
                          <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Receipt className="w-3 h-3" /> Receipt / Bill</p>
                          <img src={req.billImageUrl} alt="Receipt" className="w-full max-h-40 object-contain rounded-lg border border-emerald-100 bg-white" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer actions */}
                {req.status !== 'Completed' && (
                  <div className="px-6 pb-5 pt-2 border-t border-slate-50 flex justify-end gap-3" onClick={e => e.stopPropagation()}>
                    <Button variant="outline" onClick={() => setDetailRequest(null)}
                      className="rounded-xl h-10 text-xs font-semibold border-slate-200">Close</Button>
                    {req.status === 'Pending' && (
                      <Button
                        onClick={() => { setDetailRequest(null); handleOpenStartProcessing(req); }}
                        disabled={validatingId === req.id}
                        className="h-10 rounded-xl border-2 border-[#0F2D52] text-[#0F2D52] bg-white hover:bg-[#0F2D52] hover:text-white font-bold text-xs px-5 transition-colors">
                        <ArrowRight className="w-4 h-4 mr-1.5" /> Processing
                      </Button>
                    )}
                    {req.status === 'In Progress' && (
                      <Button
                        onClick={() => { setDetailRequest(null); handleOpenPurchaseModal(req); }}
                        className="h-10 rounded-xl bg-[#0F2D52] hover:bg-[#1E4B83] text-white font-bold text-xs px-5">
                        <CreditCard className="w-4 h-4 mr-1.5" /> Record Purchase
                      </Button>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Start Processing Date Modal */}
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
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setExpectedCompletionDate(e.target.value)}
              className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-3 border-t border-slate-50">
            <Button type="button" variant="outline" onClick={() => setIsStartProcessingModalOpen(false)}
              className="w-full sm:w-auto rounded-xl h-10 text-xs font-semibold">Cancel</Button>
            <Button
              onClick={handleStartProcessing}
              disabled={!expectedCompletionDate}
              className="w-full sm:w-auto rounded-xl h-10 border-2 border-[#0F2D52] text-[#0F2D52] bg-white hover:bg-[#0F2D52] hover:text-white font-bold text-xs px-5 transition-colors">
              <ArrowRight className="w-4 h-4 mr-1.5" /> Confirm & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDateEditOpen} onOpenChange={setIsDateEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl bg-white p-5">
          <DialogHeader><DialogTitle>Update Expected Completion</DialogTitle><DialogDescription>Choose the revised expected completion date for this request.</DialogDescription></DialogHeader>
          <input type="date" value={expectedCompletionDate} min={new Date().toISOString().split('T')[0]} onChange={event => setExpectedCompletionDate(event.target.value)}
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
          <DialogFooter><Button variant="outline" onClick={() => setIsDateEditOpen(false)}>Cancel</Button><Button onClick={handleSaveExpectedCompletionDate} disabled={!expectedCompletionDate || submitting} className="bg-[#0F2D52] text-white">Save Date</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Record Purchase & Complete</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter the actual spending amount to close this request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs space-y-1.5 mt-2">
              <p className="font-semibold text-slate-700">Item: <span className="font-extrabold text-slate-900">{selectedRequest.item}</span></p>
              <p className="text-slate-500">Quantity: <span className="font-bold text-slate-700">{selectedRequest.quantity}</span></p>
              <p className="text-slate-500">Requested by: <span className="font-bold text-slate-700">{selectedRequest.requesterName}</span></p>
            </div>
          )}
          <form onSubmit={handlePurchaseSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Amount Spent ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" name="amountSpent" placeholder="0.00" value={formData.amountSpent} onChange={handleInputChange}
                  className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
              </div>
              {formErrors.amountSpent && <p className="text-xs text-red-600 font-semibold">{formErrors.amountSpent}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]">
                {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleInputChange}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
              {formErrors.purchaseDate && <p className="text-xs text-red-600 font-semibold">{formErrors.purchaseDate}</p>}
            </div>
            {/* Bill / Receipt Image */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Bill / Receipt Image (Optional)
              </label>
              {!billImageFile ? (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0F2D52] hover:bg-slate-50 transition-colors">
                  <ImageIcon className="w-5 h-5 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400 font-medium">Click to upload receipt</span>
                  <span className="text-[10px] text-slate-300 mt-0.5">JPEG, PNG up to 2MB</span>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleBillImageChange} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img src={URL.createObjectURL(billImageFile)} alt="Receipt" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{billImageFile.name}</p>
                    <p className="text-[10px] text-slate-400">{(billImageFile.size / 1024).toFixed(0)} KB</p>
                    <button type="button" onClick={() => setBillImageFile(null)}
                      className="mt-1 text-[10px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Purchase Notes (Optional)
              </label>
              <textarea name="paymentNotes" placeholder="Receipt ID, store name, confirmation number..." value={formData.paymentNotes}
                onChange={handleInputChange} rows={2}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] resize-none" />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-slate-50">
              <Button type="button" variant="outline" onClick={() => setIsPurchaseModalOpen(false)}
                className="w-full sm:w-auto rounded-xl h-11 text-xs font-semibold">Cancel</Button>
              <Button type="submit" disabled={submitting}
                className="w-full sm:w-auto rounded-xl h-11 bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1a3d6e]">
                {submitting ? (billImageFile ? 'Uploading & Completing...' : 'Processing...') : 'Complete Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Request Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto bg-white p-6 no-scrollbar">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Procurement Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a school-wide, class-specific, or teacher-specific procurement request.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            {/* Scope */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Request Scope <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'school', icon: <School className="w-4 h-4" />, label: 'School', sub: 'All classrooms' },
                  { key: 'classroom', icon: <GraduationCap className="w-4 h-4" />, label: 'Class', sub: 'Specific class' },
                  { key: 'teacher', icon: <User className="w-4 h-4" />, label: 'Employee', sub: 'Specific teacher' },
                ] as const).map(s => (
                  <button key={s.key} type="button"
                    onClick={() => setCreateFormData(prev => ({
                      ...prev, scope: s.key,
                      classroomId: s.key === 'classroom' ? (classrooms[0]?.id || '') : '',
                      classroomName: s.key === 'classroom' ? (classrooms[0]?.name || '') : '',
                      teacherId: s.key === 'teacher' ? (teachers[0]?.id || '') : '',
                      teacherName: s.key === 'teacher' ? (teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '') : '',
                    }))}
                    className={`flex flex-col items-center justify-center gap-1 p-3 border rounded-xl text-xs font-bold transition-all ${
                      createFormData.scope === s.key ? 'border-[#0F2D52] bg-[#0F2D52]/5 text-[#0F2D52]' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}>
                    {s.icon}<span>{s.label}</span><span className="text-[9px] font-medium opacity-60">{s.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Location selector (school scope) */}
            {createFormData.scope === 'school' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Campus Area / Location <span className="text-red-500">*</span>
                </label>
                <select name="location" value={createFormData.location} onChange={handleCreateInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]">
                  <option value="">Select location</option>{locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Classroom selector */}
            {createFormData.scope === 'classroom' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classroom <span className="text-red-500">*</span></label>
                <select name="classroomId" value={createFormData.classroomId} onChange={handleCreateInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]">
                  {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {createFormErrors.classroomId && <p className="text-xs text-red-600 font-semibold">{createFormErrors.classroomId}</p>}
              </div>
            )}
            {/* Teacher selector */}
            {createFormData.scope === 'teacher' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teacher Involved <span className="text-red-500">*</span></label>
                <select name="teacherId" value={createFormData.teacherId} onChange={handleCreateInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]">
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeType})</option>)}
                </select>
                {createFormErrors.teacherId && <p className="text-xs text-red-600 font-semibold">{createFormErrors.teacherId}</p>}
              </div>
            )}
            {/* Item */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Requested Item <span className="text-red-500">*</span></label>
              <input type="text" name="item" placeholder="e.g. Office Swivel Chairs" value={createFormData.item} onChange={handleCreateInputChange}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
              {createFormErrors.item && <p className="text-xs text-red-600 font-semibold">{createFormErrors.item}</p>}
            </div>
            {/* Qty + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quantity <span className="text-red-500">*</span></label>
                <input type="number" name="quantity" min="1" value={createFormData.quantity} onChange={handleCreateInputChange}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</label>
                <select name="category" value={createFormData.category} onChange={handleCreateInputChange}
                  className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {/* Product Link */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Link (Optional)</label>
              <input type="url" name="productLink" placeholder="https://example.com/product" value={createFormData.productLink} onChange={handleCreateInputChange}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]" />
            </div>
            {/* Product Image Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Product Image (Optional)</label>
              {!createImageFile ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0F2D52] hover:bg-slate-50 transition-colors">
                  <ImageIcon className="w-6 h-6 text-slate-300 mb-1" />
                  <span className="text-xs text-slate-400 font-medium">Click to upload image</span>
                  <span className="text-[10px] text-slate-300 mt-0.5">JPEG, PNG, WebP up to 2MB</span>
                  <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleCreateImageChange} className="hidden" />
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex-shrink-0">
                    <img src={URL.createObjectURL(createImageFile)} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{createImageFile.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(createImageFile.size / 1024).toFixed(0)} KB</p>
                    <button type="button" onClick={() => setCreateImageFile(null)}
                      className="mt-1.5 text-[10px] text-red-500 hover:text-red-700 font-semibold">Remove</button>
                  </div>
                </div>
              )}
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Notes (Optional)</label>
              <textarea name="notes" placeholder="Any additional context or justification..." value={createFormData.notes}
                onChange={e => setCreateFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] resize-none" />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-slate-50">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}
                className="w-full sm:w-auto rounded-xl h-11 text-xs font-semibold">Cancel</Button>
              <Button type="submit" disabled={submitting}
                className="w-full sm:w-auto rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] text-white text-xs font-bold hover:from-[#091629] hover:to-[#0F2D52]">
                {submitting ? (createImageFile ? 'Uploading & Submitting...' : 'Submitting...') : 'Submit Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
