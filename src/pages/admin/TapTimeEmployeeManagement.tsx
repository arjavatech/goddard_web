import React, { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from './AdminLayout';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Plus, Search, Edit, Trash2, Users, AlertCircle, Phone, Mail, BadgeCheck, XCircle, UserCog } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../contexts/ToastContext';
import { TapTimeEmployee, TapTimeEmployeeStorage } from '../../services/local/tapTimeEmployeeStorage';
import { PhoneInput, validatePhoneNumber } from '../../components/ui/phone-input';

export function TapTimeEmployeeManagement() {
  const [employees, setEmployees] = useState<TapTimeEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'Admin' | 'Employee'>('Employee');
  
  const [selectedEmployee, setSelectedEmployee] = useState<TapTimeEmployee | null>(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  
  const { showToast } = useToast();

  useEffect(() => {
    const loadEmployees = () => {
      try {
        const storedEmployees = TapTimeEmployeeStorage.getEmployees();
        setEmployees(storedEmployees);
      } finally {
        setLoading(false);
      }
    };
    
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = 
        employee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.pin.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'All' || employee.status === statusFilter;
      const matchesTab = employee.role === activeTab;

      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [employees, searchQuery, statusFilter, activeTab]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!pin.trim()) errors.pin = 'PIN is required';
    else if (!/^\d{4,6}$/.test(pin.trim())) errors.pin = 'PIN must be 4 to 6 digits';
    if (!phone.trim()) errors.phone = 'Phone number is required';
    else if (!validatePhoneNumber(phone)) errors.phone = 'Invalid phone number format';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddEmployee = () => {
    if (!validateForm()) return;
    
    const newEmployee = TapTimeEmployeeStorage.addEmployee({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      pin: pin.trim(),
      phone: phone.trim(),
      role: activeTab,
      status: 'Active'
    });
    
    setEmployees(prev => [...prev, newEmployee]);
    setIsAddDialogOpen(false);
    resetForm();
    showToast('success', 'Employee added successfully');
  };

  const handleEditEmployee = () => {
    if (!validateForm() || !selectedEmployee) return;
    
    const updated = TapTimeEmployeeStorage.updateEmployee(selectedEmployee.id, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      pin: pin.trim(),
      phone: phone.trim(),
      role: selectedEmployee.role,
      status: selectedEmployee.status
    });

    if (updated) {
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setIsEditDialogOpen(false);
      resetForm();
      showToast('success', 'Employee updated successfully');
    }
  };

  const handleDeleteEmployee = () => {
    if (!selectedEmployee) return;
    
    TapTimeEmployeeStorage.deleteEmployee(selectedEmployee.id);
    setEmployees(prev => prev.filter(e => e.id !== selectedEmployee.id));
    setIsDeleteDialogOpen(false);
    setSelectedEmployee(null);
    showToast('success', 'Employee deleted successfully');
  };

  const openEditDialog = (employee: TapTimeEmployee) => {
    setSelectedEmployee(employee);
    setFirstName(employee.firstName);
    setLastName(employee.lastName);
    setPin(employee.pin);
    setPhone(employee.phone);
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (employee: TapTimeEmployee) => {
    setSelectedEmployee(employee);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPin('');
    setPhone('');
    setFormErrors({});
    setSelectedEmployee(null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading employees...</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Staff Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">Manage employees for Tap-Time access</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
            className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-4 w-full sm:w-auto text-xs" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add {activeTab}
          </Button>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-xl w-fit">
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('Admin')}
          >
            Admins
          </button>
          <button 
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'Employee' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('Employee')}
          >
            Employees
          </button>
        </div>

        {employees.length === 0 ? (
          <Card className="text-center py-16 sm:py-24 border-slate-100 shadow-sm rounded-2xl">
            <CardContent>
              <div className="w-16 h-16 bg-[#EFF5FB] rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-[#0F2D52]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No employees found</h3>
              <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto">
                Get started by adding your first employee to the Tap-Time system.
              </p>
              <div className="flex justify-center">
                <Button 
                  onClick={() => { resetForm(); setIsAddDialogOpen(true); }}
                  className="bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 rounded-xl font-bold shadow-xs border-none h-10 px-6"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add {activeTab}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <div className="relative w-full sm:w-72">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchQuery ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search employees..."
                  className="w-full pl-9 pr-4 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-10 rounded-xl border-slate-200 bg-white text-sm focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                    <SelectItem value="All" className="rounded-lg">All Statuses</SelectItem>
                    <SelectItem value="Active" className="rounded-lg">Active</SelectItem>
                    <SelectItem value="Inactive" className="rounded-lg">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-500">
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Role</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Contact</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-5 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map(employee => (
                    <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                            <span className="font-bold text-[#0F2D52]">{employee.firstName[0]}{employee.lastName[0]}</span>
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-900">{employee.firstName} {employee.lastName}</div>
                            <div className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1">
                              PIN: <code className="px-1 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-semibold">{employee.pin}</code>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <UserCog className="w-3.5 h-3.5 text-slate-400" />
                          {employee.role === 'Admin' ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {employee.phone}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          employee.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {employee.status === 'Active' ? <BadgeCheck className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {employee.status}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(employee)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52] hover:bg-[#EFF5FB] rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(employee)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-slate-500 font-medium">
                        No employees found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredEmployees.map(employee => (
                <div key={employee.id} className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                         <span className="font-bold text-[#0F2D52]">{employee.firstName[0]}{employee.lastName[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">{employee.firstName} {employee.lastName}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate font-medium">{employee.role}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          employee.status === 'Active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {employee.status}
                        </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(employee)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-[#0F2D52]"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(employee)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 pl-13 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 text-xs">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{employee.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono truncate font-semibold">
                        PIN: {employee.pin}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="py-8 text-center text-sm text-slate-500 font-medium">
                  No employees found.
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Employee Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className="w-[95vw] sm:max-w-lg rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-5 py-4 border-b bg-white">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {isEditDialogOpen ? `Edit ${activeTab}` : `Add New ${activeTab}`}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1 font-medium">
              {isEditDialogOpen ? `Update ${activeTab.toLowerCase()} tap-time access details` : `Configure a new ${activeTab.toLowerCase()} for Tap-Time access`}
            </DialogDescription>
          </div>
          
          <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={firstName}
                  onChange={e => {
                    setFirstName(e.target.value);
                    if (formErrors.firstName) setFormErrors(prev => ({ ...prev, firstName: '' }));
                  }}
                  placeholder="e.g. Jane"
                  className={`w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white transition-all ${formErrors.firstName ? 'border-red-500' : ''}`}
                  autoFocus
                />
                {formErrors.firstName && <p className="text-xs text-red-600 mt-1.5 font-bold">{formErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={lastName}
                  onChange={e => {
                    setLastName(e.target.value);
                    if (formErrors.lastName) setFormErrors(prev => ({ ...prev, lastName: '' }));
                  }}
                  placeholder="e.g. Doe"
                  className={`w-full h-11 rounded-xl border-slate-200 text-sm focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-white transition-all ${formErrors.lastName ? 'border-red-500' : ''}`}
                />
                {formErrors.lastName && <p className="text-xs text-red-600 mt-1.5 font-bold">{formErrors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                  Phone <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    if (formErrors.phone) setFormErrors(prev => ({ ...prev, phone: '' }));
                    
                    const digitsOnly = val.replace(/\D/g, '');
                    if (digitsOnly.length >= 4) {
                      setPin(digitsOnly.slice(-4));
                      if (formErrors.pin) setFormErrors(prev => ({ ...prev, pin: '' }));
                    } else {
                      setPin('');
                    }
                  }}
                  error={!!formErrors.phone}
                />
                {formErrors.phone && <p className="text-xs text-red-600 mt-1.5 font-bold">{formErrors.phone}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
                  PIN <span className="text-red-500">*</span>
                </label>
                <Input
                  value={pin}
                  readOnly
                  disabled
                  placeholder="Auto-generated from phone"
                  className={`w-full h-11 rounded-xl border-slate-200 text-xs focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] bg-slate-50 transition-all ${formErrors.pin ? 'border-red-500' : ''}`}
                />
                <p className="text-[10px] text-slate-500 mt-1.5 font-medium">PIN is automatically generated from the last 4 digits of phone number</p>
                {formErrors.pin && <p className="text-xs text-red-600 mt-1 font-bold">{formErrors.pin}</p>}
              </div>
              
            </div>
          </div>
          
          <div className="flex-shrink-0 px-5 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                resetForm();
              }}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditDialogOpen ? handleEditEmployee : handleAddEmployee}
              className="h-10 rounded-xl text-xs font-bold px-5 bg-[#0F2D52] hover:bg-[#1E4B83] text-white transition-all shadow-xs"
            >
              {isEditDialogOpen ? 'Save Changes' : `Add ${activeTab}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-2xl p-0 gap-0" preventClose>
          <div className="flex-shrink-0 px-6 py-4 border-b bg-slate-50/50">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Delete Employee
            </DialogTitle>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedEmployee?.firstName} {selectedEmployee?.lastName}</span>? 
              This will remove their Tap-Time access. This action cannot be undone.
            </p>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t bg-slate-50/20 flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="h-10 border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 px-4"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              className="h-10 rounded-xl text-xs font-bold px-4 text-white transition-all bg-red-600 hover:bg-red-700"
            >
              Delete Employee
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
