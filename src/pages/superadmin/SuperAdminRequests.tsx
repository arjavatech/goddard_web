import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from '../admin/AdminLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { RequestService, type Request, type RequestStatus } from '../../services/api/requests';
import { Pagination } from '../../components/ui/pagination';
import { usePagination } from '../../hooks/usePagination';
import { 
  ShoppingBag, Search, Clock, Play, CheckCircle2,
  ExternalLink, Link2, ImageIcon, RefreshCw, CreditCard, DollarSign,
  LayoutGrid, TableProperties
} from 'lucide-react';

export function SuperAdminRequests() {
  const { showToast } = useToast();
  
  // Lists
  const [requests, setRequests] = useState<Request[]>([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'employee' | 'admin'>('employee');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  
  // Modal state
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    amountSpent: '',
    paymentMethod: 'Credit Card',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentNotes: ''
  });

  const paymentMethods = [
    'Credit Card',
    'Purchase Order',
    'Bank Transfer',
    'Check',
    'Cash'
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const reqList = await RequestService.fetchRequests();
      setRequests(reqList);
    } catch (e) {
      showToast('error', 'Failed to load requests queue.', 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenPurchaseModal = (req: Request) => {
    setSelectedRequest(req);
    setFormData({
      amountSpent: '',
      paymentMethod: 'Credit Card',
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentNotes: ''
    });
    setFormErrors({});
    setIsPurchaseModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
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
    if (!formData.amountSpent.trim()) {
      errors.amountSpent = 'Amount spent is required';
    } else if (isNaN(parseFloat(formData.amountSpent)) || parseFloat(formData.amountSpent) <= 0) {
      errors.amountSpent = 'Amount spent must be a positive number';
    }
    
    if (!formData.purchaseDate) {
      errors.purchaseDate = 'Purchase date is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !validateForm()) return;

    setSubmitting(true);
    try {
      await RequestService.verifyRequest(selectedRequest.id, {
        amountSpent: parseFloat(formData.amountSpent),
        paymentMethod: formData.paymentMethod,
        purchaseDate: formData.purchaseDate,
        paymentNotes: formData.paymentNotes || undefined
      });

      showToast('success', 'Procurement verified. Request marked as Completed.', 'Purchase Recorded');
      setIsPurchaseModalOpen(false);
      
      // Reload list
      const reqList = await RequestService.fetchRequests();
      setRequests(reqList);
    } catch (err) {
      showToast('error', 'Could not record purchase details.', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const searchedAndFiltered = requests.filter(req => {
    const matchesTab = activeTab === 'employee' ? req.requesterRole === 'employee' : req.requesterRole === 'admin';
    const matchesSearch = req.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesTab && matchesSearch && matchesStatus;
  });

  const {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage,
    setCurrentPage,
  } = usePagination({ data: searchedAndFiltered, itemsPerPage: recordsPerPage });

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
    <AdminLayout>
      <div className="space-y-5 sm:space-y-6  mx-auto px-4 sm:px-6 py-6 overflow-x-hidden">
        
        {/* Upper Header Row */}
        <div className="mt-10 sm:mt-14">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight flex items-start sm:items-center gap-2">
            <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 mt-0.5 sm:mt-0 shrink-0 text-[#0F2D52]" /> Super Admin Requests Queue
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Validate, approve, and record payments for requests submitted by employees and school administrators.
          </p>
        </div>

        {/* Tabs */}
        <div className="-mx-4 px-4 overflow-x-auto border-b border-slate-200">
          <div className="flex min-w-max">
          <button
            onClick={() => setActiveTab('employee')}
            className={`whitespace-nowrap px-4 sm:px-5 py-3 text-xs font-bold text-center border-b-2 transition-all ${
              activeTab === 'employee' ? 'border-[#0f2d52] text-[#0f2d52]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Employee Requests ({requests.filter(r => r.requesterRole === 'employee').length})
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`whitespace-nowrap px-4 sm:px-5 py-3 text-xs font-bold text-center border-b-2 transition-all ${
              activeTab === 'admin' ? 'border-[#0f2d52] text-[#0f2d52]' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Admin Requests ({requests.filter(r => r.requesterRole === 'admin').length})
          </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-3 sm:p-4 flex flex-col md:flex-row gap-3 sm:gap-4 justify-between items-stretch md:items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by requested item or requester name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="min-w-0 flex-1 md:flex-none px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <Button
              variant="outline"
              size="icon"
              onClick={loadData}
              disabled={loading}
              className="rounded-xl h-10 w-10 flex-shrink-0 border-slate-200 hover:bg-slate-50"
              title="Refresh Queue"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-sm font-medium text-slate-600">
            Showing <span className="font-bold text-slate-900">{searchedAndFiltered.length}</span> requests
          </div>
          <div className="flex items-center gap-3">
            <select
              value={recordsPerPage}
              onChange={e => setRecordsPerPage(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#0F2D52] bg-white text-slate-700"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-md p-1.5 transition-colors ${viewMode === 'cards' ? 'bg-[#0F2D52] text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
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
            <p className="text-slate-500 text-sm font-semibold">Loading requests queue...</p>
          </div>
        ) : searchedAndFiltered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No matching procurement requests.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {viewMode === 'cards' ? (
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
                        <div className="p-4 sm:p-5 space-y-4">
                          {/* Top Meta info */}
                          <div className="flex flex-col min-[420px]:flex-row min-[420px]:justify-between items-start gap-2">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                Category: {req.category || 'Supplies'}
                              </p>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-[#0F2D52] truncate max-w-[12rem]">{req.requesterName}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">{req.requesterRole}</span>
                              </p>
                            </div>
                            <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                              {getStatusIcon(req.status)}
                              {req.status}
                            </span>
                          </div>

                          {/* Content block */}
                        <div className="flex flex-col min-[420px]:flex-row gap-3 sm:gap-4">
                            {req.productImage ? (
                              <img
                                src={req.productImage}
                                alt={req.item}
                                className="w-full h-32 min-[420px]:w-20 min-[420px]:h-20 rounded-xl object-cover border border-slate-100 bg-slate-50 flex-shrink-0"
                              />
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
                                  {req.scope === 'classroom' && (
                                    <>Scope: <span className="font-bold text-slate-700">Classroom ({req.classroomName})</span></>
                                  )}
                                  {req.scope === 'teacher' && (
                                    <>Scope: <span className="font-bold text-slate-700">Teacher ({req.teacherName})</span></>
                                  )}
                                  {req.scope === 'school' && (
                                    <>Scope: <span className="font-bold text-slate-700">Entire School</span></>
                                  )}
                                </p>
                              </div>
                              
                              <p className="text-[10px] text-slate-400">Created on {new Date(req.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions section */}
                        <div className="bg-slate-50/50 px-4 sm:px-5 py-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between items-stretch gap-3">
                          <div className="min-w-0">
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
                            {!req.productLink && <span className="text-[11px] text-slate-400 italic">No product link</span>}
                          </div>

                          {/* Action buttons */}
                          <div className="w-full sm:w-auto">
                            {req.status === 'Completed' ? (
                              <div className="text-left sm:text-right text-[11px]">
                                <div className="flex sm:justify-end gap-1.5 font-bold text-emerald-800 text-xs">
                                  <span>Spent:</span>
                                  <span>${req.amountSpent?.toFixed(2)}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">via {req.paymentMethod} on {req.purchaseDate}</p>
                              </div>
                            ) : req.requesterRole === 'employee' && req.status === 'Pending' ? (
                              <span className="text-[11px] text-amber-600 font-semibold inline-flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                                <Clock className="w-3 h-3" /> Awaiting Admin Validation
                              </span>
                            ) : (
                              <Button
                                onClick={() => handleOpenPurchaseModal(req)}
                                className="h-9 w-full sm:w-auto rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white font-bold text-xs px-3.5 flex items-center justify-center gap-1 shadow-sm"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> Record Purchase
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <Card className="border border-slate-100 rounded-2xl shadow-sm bg-white overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        {['Item', 'Requester', 'Scope / Target', 'Status', 'Date', 'Amount', 'Actions'].map(h => (
                          <th key={h} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedData.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 min-w-[200px]">
                            <p className="font-semibold text-slate-800 line-clamp-2">{req.item}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{req.category || 'Supplies'} • Qty: {req.quantity}</p>
                            {req.productLink && (
                              <a
                                href={req.productLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-[#1a6fc4] hover:text-[#0F2D52] font-semibold mt-1"
                              >
                                <Link2 className="w-3 h-3" /> Product Page
                              </a>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-700">{req.requesterName}</p>
                            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">{req.requesterRole}</p>
                          </td>
                          <td className="px-5 py-3.5 text-slate-600">
                            {req.scope === 'classroom' && <span>Classroom: <b className="text-slate-700">{req.classroomName}</b></span>}
                            {req.scope === 'teacher'   && <span>Teacher: <b className="text-slate-700">{req.teacherName}</b></span>}
                            {req.scope === 'school'    && <span className="text-slate-400 italic">Entire School</span>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)} whitespace-nowrap`}>
                              {getStatusIcon(req.status)}
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{new Date(req.createdAt).toLocaleDateString()}</td>
                          <td className="px-5 py-3.5 text-right font-medium">
                            {req.status === 'Completed' ? (
                              <span className="font-bold text-emerald-700 text-sm">${req.amountSpent?.toFixed(2)}</span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {req.status === 'Completed' ? (
                              <span className="text-[10px] text-slate-400">Recorded</span>
                            ) : req.requesterRole === 'employee' && req.status === 'Pending' ? (
                              <span className="text-[10px] text-amber-600 font-semibold whitespace-nowrap">Awaiting Validation</span>
                            ) : (
                              <Button
                                onClick={() => handleOpenPurchaseModal(req)}
                                className="h-8 rounded-lg bg-[#0F2D52] hover:bg-[#1E4B83] text-white font-bold text-xs px-3 shadow-sm whitespace-nowrap"
                              >
                                Record
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {searchedAndFiltered.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={searchedAndFiltered.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            )}
          </div>
        )}

      </div>

      {/* Record Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Record Purchase & Complete</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Input actual spending amount and payment details to verify purchase and close this request.
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
            
            {/* Amount Spent */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Amount Spent ($) <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-[#0F2D52]" />
                <input
                  type="text"
                  name="amountSpent"
                  placeholder="0.00"
                  value={formData.amountSpent}
                  onChange={handleInputChange}
                  className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
                />
              </div>
              {formErrors.amountSpent && <p className="text-xs text-red-600 font-semibold">{formErrors.amountSpent}</p>}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleInputChange}
                className="w-full px-3 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#0F2D52]"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Purchase Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Purchase Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52]"
                />
              </div>
              {formErrors.purchaseDate && <p className="text-xs text-red-600 font-semibold">{formErrors.purchaseDate}</p>}
            </div>

            {/* Payment Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Purchase Notes (Optional)
              </label>
              <textarea
                name="paymentNotes"
                placeholder="Attach receipt ID, store name, or confirmation numbers..."
                value={formData.paymentNotes}
                onChange={handleInputChange}
                rows={2}
                className="w-full px-4 py-2.5 text-xs sm:text-sm text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] resize-none"
              />
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
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto rounded-xl h-11 bg-[#0F2D52] text-white text-xs font-bold hover:bg-[#1a3d6e]"
              >
                {submitting ? 'Processing...' : 'Complete Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
