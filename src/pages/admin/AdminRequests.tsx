import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminLayout } from './AdminLayout';
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
  ExternalLink, Link2, ImageIcon, RefreshCw, ArrowRight, User, School, GraduationCap
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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  
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
    productLink: '',
    notes: ''
  });

  const categories = [
    'Classroom Supplies',
    'STEM & Toys',
    'Books & Learning',
    'Office & Equipment',
    'Play & Outdoor'
  ];

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
      category: 'Classroom Supplies',
      scope: 'school',
      classroomId: '',
      classroomName: '',
      teacherId: teachers[0]?.id || '',
      teacherName: teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : '',
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
        notes: formData.notes || undefined
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
    if (req.requesterRole !== 'admin' && req.requesterRole !== 'superadmin') return false;
    const matchesSearch = req.item.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.requesterName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesScope = scopeFilter === 'all' || req.scope === scopeFilter;
    return matchesSearch && matchesStatus && matchesScope;
  });

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
      <div className="space-y-6 mt-14 mx-auto px-4 py-6">
        
        {/* Upper Header Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-[#0F2D52]" /> Procurement Request Board
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create and manage procurement requests for the school or specific teachers.
            </p>
          </div>

          <Button
            onClick={handleOpenModal}
            className="rounded-xl h-11 bg-gradient-to-r from-[#0F2D52] to-[#1E4B83] hover:from-[#091629] text-white font-bold text-xs shadow-md flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Request
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by item..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2D52] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="text-slate-400 w-4 h-4 flex-shrink-0" />
            <select
              value={scopeFilter}
              onChange={e => setScopeFilter(e.target.value)}
              className="w-full md:w-40 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
            >
              <option value="all">All Scopes</option>
              <option value="school">School-wise</option>
              <option value="classroom">Class-wise</option>
              <option value="teacher">Teacher-wise</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full md:w-40 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F2D52] transition-colors"
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
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Requests Queue */}
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mb-3"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading request lists...</p>
          </div>
        ) : searchedAndFiltered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No requests found</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No matching items for this role and status filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {searchedAndFiltered.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: idx * 0.03 }}
                >
                  <Card className="border border-slate-100 bg-white hover:border-slate-200 transition-all rounded-2xl overflow-hidden shadow-sm h-full flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      {/* Top Meta info */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Category: {req.category || 'Supplies'}
                          </p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                            <span className="font-semibold text-slate-700">{req.requesterName}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-bold uppercase">{req.requesterRole}</span>
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeClass(req.status)}`}>
                          {getStatusIcon(req.status)}
                          {req.status}
                        </span>
                      </div>

                      {/* Content block */}
                      <div className="flex gap-4">
                        {req.productImage ? (
                          <img
                            src={req.productImage}
                            alt={req.item}
                            className="w-20 h-20 rounded-xl object-cover border border-slate-100 bg-slate-50 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="font-bold text-slate-900 text-sm line-clamp-2 leading-snug">{req.item}</h3>
                          <div className="flex items-center gap-4 text-xs">
                            <p className="text-slate-500">Qty: <span className="font-bold text-slate-700">{req.quantity}</span></p>
                            <p className="text-slate-500 flex items-center gap-1 truncate">
                              {req.scope === 'classroom' && (
                                <>Scope: <span className="font-bold text-slate-700">Classroom ({req.classroomName})</span></>
                              )}
                              {req.scope === 'teacher' && (
                                <>Scope: <span className="font-bold text-slate-700">Teacher Issue ({req.teacherName})</span></>
                              )}
                              {req.scope === 'school' && (
                                <>Scope: <span className="font-bold text-slate-700">All Classrooms</span></>
                              )}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-400">Submitted: {new Date(req.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions section */}
                    <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-50 flex items-center justify-between gap-3">
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
                          <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1">
                            Pending Super Admin Approval
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
        )}

      </div>

      {/* Admin Request Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Procurement Request</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submit a request for all classrooms across the school, or for a specific teacher issue. This will be verified and approved by the Super Admin.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            
            {/* Scope Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Request Scope <span className="text-red-500">*</span>
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
                  <span>School-wise</span>
                  <span className="text-[9px] font-medium opacity-60">All classrooms</span>
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
                  <span>Class-wise</span>
                  <span className="text-[9px] font-medium opacity-60">Specific class</span>
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
                  <span>Teacher-wise</span>
                  <span className="text-[9px] font-medium opacity-60">Specific teacher</span>
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
                  Teacher Involved <span className="text-red-500">*</span>
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
