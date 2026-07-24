import React, { useState } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { PageLoader } from '../../components/ui/page-loader';
import { useToast } from '../../contexts/ToastContext';
import { fetchAdminUsers, inviteAdmin, updateAdmin, deleteAdmin, resendAdminInvite, type AdminUser } from '../../services/api/admin';
import { useUserContext } from '../../contexts/UserContext';
import { StatCard } from '../../components/ui/stat-card';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { Shield, Search, Plus, Edit, Trash2, Eye, MoreHorizontal, RefreshCw, Users, UserCheck, Clock, Filter, X, LayoutGrid, List } from 'lucide-react';

interface NetworkError {
  code?: string;
  status?: number;
  message?: string;
  response?: {
    message?: string;
    error?: string;
  };
}

export function AdminManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { userData } = useUserContext();

  const [resendingAdminId, setResendingAdminId] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && admin.is_verified) ||
      (statusFilter === 'pending' && !admin.is_verified);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage);
  const paginatedAdmins = filteredAdmins.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Dynamic statistics
  const totalAdmins = admins.length;
  const activeAdmins = admins.filter(a => a.is_verified).length;
  const pendingAdmins = admins.filter(a => !a.is_verified).length;

  React.useEffect(() => {
    const loadAdmins = async () => {
      if (!userData?.schoolId) return;
      
      try {
        setIsLoading(true);
        setLoadError(null);
        const adminUsers = await fetchAdminUsers(userData.schoolId);
        setAdmins(adminUsers);
      } catch (error) {
        console.error('Error loading admins:', error);
        setLoadError('Failed to load admin users. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAdmins();
  }, [userData?.schoolId]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    setAdminEmail(email);
    
    if (email && !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const isFormValid = adminFirstName.trim() && adminLastName.trim() && adminEmail.trim() && !emailError;

  const handleInviteAdmin = async () => {
    if (!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim() || emailError) {
      showToast('error', 'Please fill in all required fields with valid information');
      return;
    }

    if (admins.some(admin => admin.email.toLowerCase() === adminEmail.toLowerCase())) {
      setEmailError('Email already exists');
      return;
    }

    if (!userData?.schoolId) {
      showToast('error', 'School ID not found');
      return;
    }

    setIsInviting(true);

    try {
      await inviteAdmin(
        adminEmail.trim(),
        adminFirstName.trim(),
        adminLastName.trim(),
        userData.schoolId
      );
      
      showToast('success', 'Invitation sent to ' + adminEmail.trim());
      setIsAddDialogOpen(false);
      resetForm();
      
      const adminUsers = await fetchAdminUsers(userData.schoolId);
      setAdmins(adminUsers);
    } catch (err) {
      const errorResponse = err as NetworkError;
      if (errorResponse?.code === 'EMAIL_BOUNCE' || errorResponse?.status === 502) {
        showToast('error', errorResponse.message);
        return;
      }

      const errorText =
        errorResponse?.response?.message ||
        errorResponse?.response?.error ||
        errorResponse?.message ||
        '';

      if (
        errorText.includes('Already registered with different role') ||
        errorText.includes('Conflict: Already registered with different role') ||
        errorText.includes('different role')
      ) {
        showToast('error', 'Already registered with different role');
      } else if (errorResponse.message?.includes('already exists') || errorResponse.message?.includes('duplicate')) {
        setEmailError('Email already exists');
      } else {
        showToast('error', errorText || 'Failed to send invitation');
      }
    } finally {
      setIsInviting(false);
    }
  };

  const handleResendInvite = async (admin: AdminUser) => {
    setResendingAdminId(admin.id);
    try {
      await resendAdminInvite(admin.id);
      showToast('success', 'Invitation resent successfully to ' + admin.email);
    } catch (error) {
      const err = error as NetworkError;
      if (err?.code === 'EMAIL_BOUNCE' || err?.status === 502) {
        showToast('error', err.message);
      } else {
        console.error('Error resending invitation:', error);
        showToast('error', 'Failed to resend invitation');
      }
    } finally {
      setResendingAdminId(null);
    }
  };

  const handleEditAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setAdminFirstName(admin.first_name);
    setAdminLastName(admin.last_name);
    setAdminEmail(admin.email);
    setAdminPhone(''); // Phone not available in current data
    setEmailError(''); // Clear any existing email errors
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin || !adminFirstName.trim() || !adminLastName.trim()) return;
    
    try {
      await updateAdmin(
        selectedAdmin.id,
        adminFirstName.trim(),
        adminLastName.trim(),
        adminPhone.trim() || undefined
      );
      
      setAdmins(admins.map(admin => 
        admin.id === selectedAdmin.id 
          ? { ...admin, first_name: adminFirstName.trim(), last_name: adminLastName.trim() }
          : admin
      ));
      
      showToast('success', 'Admin updated successfully');
      setIsEditDialogOpen(false);
      setSelectedAdmin(null);
      resetForm();
    } catch (error) {
      showToast('error', 'Failed to update admin');
    }
  };

  const handleViewAdmin = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setEmailError(''); // Clear any existing email errors
    setIsViewDialogOpen(true);
  };

  const handleDeleteAdmin = (admin: AdminUser) => {
    setAdminToDelete(admin);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteAdmin = async () => {
    if (!adminToDelete) return;
    
    try {
      await deleteAdmin(adminToDelete.id);
      setAdmins(admins.filter(admin => admin.id !== adminToDelete.id));
      showToast('success', 'Admin deleted successfully');
      setIsDeleteDialogOpen(false);
      setAdminToDelete(null);
    } catch (error) {
      showToast('error', 'Failed to delete admin');
    }
  };

  const resetForm = () => {
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
    setAdminPhone('');
    setEmailError('');
  };

  if (isLoading && admins.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 max-w-7xl mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8"></div>
            <p className="text-slate-500 text-sm font-semibold">Loading administrator users...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in duration-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Admin Management
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              Manage system administrator accounts and access
            </p>
          </div>
          <Button 
            className="bg-[#0F2D52] hover:bg-[#1c477c] text-white rounded-xl shadow-sm transition-all duration-200 font-semibold px-4 h-10 flex items-center gap-2" 
            size="sm" 
            onClick={() => {
              setEmailError('');
              setIsAddDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite Admin
          </Button>
        </div>

        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between animate-fade-in">
            <span>{loadError}</span>
            <Button onClick={() => window.location.reload()} variant="outline" className="h-8 px-3 text-xs bg-white text-red-700 border-red-200 hover:bg-red-50 rounded-lg">
              Refresh Page
            </Button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <div className="h-full">
            <StatCard 
              label="Total Administrators" 
              value={totalAdmins} 
              icon={Users} 
              iconBgClass="bg-[#EFF5FB]" 
              iconColorClass="text-[#0F2D52]" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
          <div className="h-full">
            <StatCard 
              label="Active Administrators" 
              value={activeAdmins} 
              icon={UserCheck} 
              iconBgClass="bg-emerald-50" 
              iconColorClass="text-emerald-600" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
          <div className="h-full">
            <StatCard 
              label="Pending Invitations" 
              value={pendingAdmins} 
              icon={Clock} 
              iconBgClass="bg-amber-50" 
              iconColorClass="text-amber-600" 
              className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" 
            />
          </div>
        </div>

        {/* Directory Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Administrator Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Showing {filteredAdmins.length} of {totalAdmins} administrator{totalAdmins === 1 ? '' : 's'}
                </p>
              </div>
              
              {/* Segmented View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${
                    viewMode === 'card'
                      ? 'bg-white text-[#0F2D52] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Card View</span>
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search administrators by name or email…"
                  className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-44">
                  <select
                    value={statusFilter}
                    onChange={e => handleStatusFilterChange(e.target.value)}
                    className="w-full pl-3 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all appearance-none cursor-pointer font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                    <Filter className="h-3.5 w-3.5" />
                  </div>
                </div>

                {(searchTerm || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleSearchChange('');
                      handleStatusFilterChange('all');
                    }}
                    className="h-10 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </div>          {/* Conditional Rendering of Views */}
          {viewMode === 'card' ? (
            <MobileCardList
              className="p-4"
              loading={isLoading}
              loadingMessage="Loading administrators..."
              emptyMessage="No administrators found. Try adjusting your search or filters."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              cards={paginatedAdmins.map((admin) => {
                const initials = `${admin.first_name?.[0] || ''}${admin.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <Card key={admin.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <AvatarInitials initials={initials} className="bg-[#EFF5FB] text-[#0F2D52] font-semibold w-9 h-9 rounded-full flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-800 block truncate">
                                {admin.first_name} {admin.last_name}
                              </span>
                              {admin.role.toLowerCase() === 'owner' && (
                                <Shield className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-semibold block truncate mt-0.5">{admin.email}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-650 flex-shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700" onClick={() => handleViewAdmin(admin)}>
                              <Eye className="w-4 h-4 mr-2 text-slate-400" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700" onClick={() => handleEditAdmin(admin)}>
                              <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Admin
                            </DropdownMenuItem>
                            {!admin.is_verified && (
                              <DropdownMenuItem
                                className="cursor-pointer font-medium text-xs text-slate-700"
                                disabled={resendingAdminId === admin.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleResendInvite(admin);
                                }}
                              >
                                {resendingAdminId === admin.id ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 text-slate-400 animate-spin" /> Resending Invite...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Resend Invite
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="cursor-pointer font-medium text-xs text-red-650 focus:text-red-650 focus:bg-red-50" onClick={() => handleDeleteAdmin(admin)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 font-semibold">Role:</span>
                          <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            admin.role.toLowerCase() === 'owner' 
                              ? 'bg-[#EFF5FB] text-[#0F2D52] border border-blue-200/50' 
                              : 'bg-slate-50 text-slate-600 border border-slate-200/50'
                          }`}>
                            {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
                          </span>
                        </div>
                        <Badge variant={admin.is_verified ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2 py-0.5">
                          {admin.is_verified ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            />
          ) : (
            <DataTable
              className="relative z-0"
              loading={isLoading}
              loadingMessage="Loading administrators..."
              emptyMessage="No administrators found. Try adjusting your search or filters."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAdmins.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Administrator', className: 'w-2/5' },
                { header: 'Role', className: 'w-1/5' },
                { header: 'Status', className: 'w-1/5' },
                { header: 'Actions', className: 'w-1/5 text-right' },
              ]}
              rows={paginatedAdmins.map((admin) => {
                const initials = `${admin.first_name?.[0] || ''}${admin.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <tr key={admin.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors duration-150">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarInitials initials={initials} className="bg-[#EFF5FB] text-[#0F2D52] font-semibold" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 block truncate">
                              {admin.first_name} {admin.last_name}
                            </span>
                            {admin.role.toLowerCase() === 'owner' && (
                              <Shield className="w-3.5 h-3.5 text-brand-blue flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-semibold block truncate mt-0.5">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        admin.role.toLowerCase() === 'owner' 
                          ? 'bg-[#EFF5FB] text-[#0F2D52] border border-blue-200/50' 
                          : 'bg-slate-50 text-slate-600 border border-slate-200/50'
                      }`}>
                        {admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={admin.is_verified ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2.5 py-0.5">
                        {admin.is_verified ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl">
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700" onClick={() => handleViewAdmin(admin)}>
                            <Eye className="w-4 h-4 mr-2 text-slate-400" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700" onClick={() => handleEditAdmin(admin)}>
                            <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Admin
                          </DropdownMenuItem>
                          {!admin.is_verified && (
                            <DropdownMenuItem
                              className="cursor-pointer font-medium text-xs text-slate-700"
                              disabled={resendingAdminId === admin.id}
                              onClick={(e) => {
                                e.preventDefault();
                                handleResendInvite(admin);
                              }}
                            >
                              {resendingAdminId === admin.id ? (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 text-slate-400 animate-spin" /> Resending...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Resend Invite
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="cursor-pointer font-medium text-xs text-red-600 focus:text-red-650 focus:bg-red-50" onClick={() => handleDeleteAdmin(admin)}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            />
          )}
        </div>

        {/* Invite Admin Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] text-[#0F2D52] flex items-center justify-center mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Invite New Admin</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Send an email invitation to register a new administrator account.</p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">First Name</label>
                <Input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                  className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Last Name</label>
                <Input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                  className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={handleEmailChange}
                  placeholder="Enter admin email"
                  required
                  className={`w-full h-10 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-white ${
                    emailError 
                      ? 'border-red-400 focus:ring-red-100 focus:border-red-500' 
                      : 'border-slate-200 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]'
                  }`}
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1 font-semibold">{emailError}</p>
                )}
              </div>
            </div>
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleInviteAdmin} 
                disabled={isInviting || !isFormValid} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white transition-all duration-200 font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsEditDialogOpen(false);
            setSelectedAdmin(null);
            resetForm();
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] text-[#0F2D52] flex items-center justify-center mb-3">
                <Edit className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Edit Admin Details</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Update the name or contact information for this administrator.</p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">First Name</label>
                <Input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Last Name</label>
                <Input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email (Cannot edit)</label>
                <Input
                  type="email"
                  value={adminEmail}
                  disabled
                  className="w-full h-10 rounded-xl border border-slate-100 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number (Optional)</label>
                <Input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white"
                />
              </div>
            </div>
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 font-medium"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateAdmin} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white transition-all duration-200 font-semibold flex items-center justify-center"
              >
                Update Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Admin Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsViewDialogOpen(false);
            setSelectedAdmin(null);
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] text-[#0F2D52] flex items-center justify-center mb-3">
                <Eye className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Admin Details</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Comprehensive information about the administrator user.</p>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-5 py-2">
                <div className="flex items-center space-x-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                  <AvatarInitials initials={`${selectedAdmin.first_name?.[0] || ''}${selectedAdmin.last_name?.[0] || ''}`.toUpperCase()} size="lg" />
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{selectedAdmin.first_name} {selectedAdmin.last_name}</h3>
                    <p className="text-xs text-slate-400 font-semibold break-all">{selectedAdmin.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                    <Badge variant={selectedAdmin.is_verified ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2 py-0.5">
                      {selectedAdmin.is_verified ? 'Approved' : 'Pending'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Role</label>
                    <p className="text-sm font-bold text-slate-800">{selectedAdmin.role.charAt(0).toUpperCase() + selectedAdmin.role.slice(1)}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="mt-6">
              <Button 
                variant="outline" 
                onClick={() => setIsViewDialogOpen(false)} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 font-medium"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setAdminToDelete(null);
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto no-scrollbar rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
            <DialogHeader className="mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
                <Trash2 className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">Delete Administrator</DialogTitle>
              <p className="text-xs text-slate-500 font-medium">Removing this administrator will revoke their access to the system immediately.</p>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Are you absolutely sure you want to delete <strong className="text-slate-900 font-extrabold">{adminToDelete?.first_name} {adminToDelete?.last_name}</strong>? This action is permanent and cannot be undone.
              </p>
            </div>
            <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 font-medium"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDeleteAdmin} 
                className="w-full sm:w-auto h-10 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-200"
              >
                Delete Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}