import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { fetchOwners, inviteOwner, updateOwner, deleteOwner, resendOwnerInvite, type OwnerUser, type SuperAdminInfo } from '../../services/api/owner';
import { Shield, Search, Plus, Edit, Trash2, RefreshCw, Users, UserCheck, Clock, MoreHorizontal, Mail, Phone, Filter, X, LayoutGrid, List } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { AvatarInitials } from '../../components/ui/avatar-initials';
import { StatCard } from '../../components/ui/stat-card';
import { DataTable } from '../../components/ui/data-table';
import { MobileCardList } from '../../components/ui/mobile-card-list';
import { usePageSize } from '../../hooks/usePageSize';

export function OwnerManagement() {
  const [owners, setOwners] = useState<OwnerUser[]>([]);
  const [superAdmin, setSuperAdmin] = useState<SuperAdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = usePageSize('owner', 10);
  const [viewMode, setViewMode] = useState<'card' | 'table'>(
    () => (localStorage.getItem('ownerMgmtViewMode') as 'card' | 'table') || 'table'
  );

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerUser | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { showToast } = useToast();
  const { userData } = useUserContext();
  const schoolId = userData?.schoolData?.id || '';
  const isSuperAdmin = userData?.role?.toLowerCase() === 'superadmin';
  const isOwner = userData?.role?.toLowerCase() === 'owner';

  const handleViewModeChange = (mode: 'card' | 'table') => {
    setViewMode(mode);
    localStorage.setItem('ownerMgmtViewMode', mode);
  };

  const handleSearchChange = (value: string) => { setSearchTerm(value); setCurrentPage(1); };
  const handleStatusFilterChange = (value: string) => { setStatusFilter(value); setCurrentPage(1); };

  const loadOwners = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await fetchOwners(schoolId);
      setOwners(result.owners);
      setSuperAdmin(result.superAdmin);
    } catch {
      setLoadError('Failed to load owners. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { loadOwners(); }, [loadOwners]);

  const resetForm = () => { setFirstName(''); setLastName(''); setEmail(''); setPhone(''); setEmailError(''); };

  const openInvite = () => { resetForm(); setIsInviteOpen(true); };
  const openEdit = (owner: OwnerUser) => {
    setSelectedOwner(owner);
    setFirstName(owner.first_name);
    setLastName(owner.last_name);
    setPhone(owner.phone_number || '');
    setIsEditOpen(true);
  };
  const openDelete = (owner: OwnerUser) => { setSelectedOwner(owner); setIsDeleteOpen(true); };

  const handleInvite = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setEmailError('Please enter a valid email address.'); return; }
    setEmailError('');
    setIsSaving(true);
    try {
      await inviteOwner(email.trim(), firstName.trim(), lastName.trim(), schoolId, phone.trim() || undefined);
      showToast('success', 'Owner invited successfully. An invitation email has been sent.');
      setIsInviteOpen(false);
      loadOwners();
    } catch (err: any) {
      if (err?.status === 409 || err?.message?.toLowerCase().includes('already exists') || err?.message?.toLowerCase().includes('conflict')) {
        setEmailError('A user with this email already exists.');
      } else {
        showToast('error', err?.message || 'Failed to invite owner. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedOwner || !firstName.trim() || !lastName.trim()) return;
    setIsSaving(true);
    try {
      await updateOwner(selectedOwner.id, firstName.trim(), lastName.trim(), phone.trim() || undefined);
      showToast('success', 'Owner updated successfully.');
      setIsEditOpen(false);
      loadOwners();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to update owner.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedOwner) return;
    setIsSaving(true);
    try {
      await deleteOwner(selectedOwner.id);
      showToast('success', 'Owner removed successfully.');
      setIsDeleteOpen(false);
      setSelectedOwner(null);
      loadOwners();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to remove owner.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResend = async (owner: OwnerUser) => {
    setResendingId(owner.id);
    try {
      await resendOwnerInvite(owner.id);
      showToast('success', 'Invitation email resent.');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to resend invitation.');
    } finally {
      setResendingId(null);
    }
  };

  const filtered = owners.filter(o => {
    const matchesSearch = !searchTerm ||
      `${o.first_name} ${o.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && o.is_verified) ||
      (statusFilter === 'pending' && !o.is_verified);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalOwners = owners.length;
  const activeOwners = owners.filter(o => o.is_verified).length;
  const pendingOwners = owners.filter(o => !o.is_verified).length;

  if (isLoading && owners.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px] bg-white rounded-2xl border border-slate-100 shadow-xs mt-12 sm:mt-10 p-12 mx-auto">
          <div className="text-center animate-pulse">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-3 h-8 w-8" />
            <p className="text-slate-500 text-sm font-semibold">Loading owner accounts…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const renderActionMenu = (owner: OwnerUser) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white rounded-xl border border-slate-100 shadow-xl z-50">
        <DropdownMenuItem className="cursor-pointer font-medium text-xs text-slate-700" onClick={() => openEdit(owner)}>
          <Edit className="w-4 h-4 mr-2 text-slate-400" /> Edit Owner
        </DropdownMenuItem>
        {!owner.is_verified && (
          <DropdownMenuItem
            className="cursor-pointer font-medium text-xs text-slate-700"
            disabled={resendingId === owner.id}
            onClick={() => handleResend(owner)}
          >
            {resendingId === owner.id
              ? <><RefreshCw className="w-4 h-4 mr-2 text-slate-400 animate-spin" /> Resending…</>
              : <><RefreshCw className="w-4 h-4 mr-2 text-slate-400" /> Resend Invite</>}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer font-medium text-xs text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => openDelete(owner)}>
          <Trash2 className="w-4 h-4 mr-2" /> Remove Owner
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 sm:pt-12 space-y-6 pb-12">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between my-5 gap-4 mt-16 sm:mt-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">Owner Management</h1>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold mt-0.5">
              {isSuperAdmin ? 'Manage school owners with full administrative access' : 'View school owners and administrative contacts'}
            </p>
          </div>
          {isSuperAdmin && (
            <Button
              className="bg-[#0F2D52] hover:bg-[#1c477c] text-white rounded-xl shadow-sm transition-all duration-200 font-semibold px-4 h-10 flex items-center gap-2"
              size="sm"
              onClick={openInvite}
            >
              <Plus className="w-4 h-4" /> Invite Owner
            </Button>
          )}
        </div>

        {/* Error banner */}
        {loadError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
            <span>{loadError}</span>
            <Button onClick={() => window.location.reload()} variant="outline" className="h-8 px-3 text-xs bg-white text-red-700 border-red-200 hover:bg-red-50 rounded-lg">
              Refresh Page
            </Button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
          <StatCard label="Total Owners" value={totalOwners} icon={Users} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
          <StatCard label="Active Owners" value={activeOwners} icon={UserCheck} iconBgClass="bg-emerald-50" iconColorClass="text-emerald-600" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
          <StatCard label="Pending Invitations" value={pendingOwners} icon={Clock} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" className="h-full border border-slate-100 hover:shadow-md transition-all duration-300 rounded-2xl shadow-xs" />
        </div>

        {/* SuperAdmin contact card — only shown to Owner viewers */}
        {superAdmin && isOwner && (
          <div className="bg-white rounded-2xl border border-[#0F2D52]/15 shadow-xs p-4">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-[#0F2D52]/10 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-[#0F2D52]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#0F2D52]/60 mb-0.5">School Super Admin</p>
                  <p className="font-semibold text-slate-900">{superAdmin.first_name} {superAdmin.last_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {superAdmin.email}
                    </span>
                    {superAdmin.phone_number && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="w-3 h-3 flex-shrink-0" /> {superAdmin.phone_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500 leading-relaxed">
                  To make any changes, please contact{' '}
                  <span className="font-semibold text-slate-700">{superAdmin.first_name} {superAdmin.last_name}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Directory card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Owner Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  Showing {filtered.length} of {totalOwners} owner{totalOwners === 1 ? '' : 's'}
                </p>
              </div>

              {/* Segmented view switcher */}
              <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 shadow-xs">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('table')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'table' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                >
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('card')}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${viewMode === 'card' ? 'bg-white text-[#0F2D52] shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Card View</span>
                </button>
              </div>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${searchTerm ? 'text-[#0F2D52]' : 'text-slate-400'}`} />
                <input
                  placeholder="Search owners by name or email…"
                  className="w-full pl-9 pr-8 h-10 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all"
                  value={searchTerm}
                  onChange={e => handleSearchChange(e.target.value)}
                />
                {searchTerm && (
                  <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                    onClick={() => { handleSearchChange(''); handleStatusFilterChange('all'); }}
                    className="h-10 px-3 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <X className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Card view */}
          {viewMode === 'card' ? (
            <MobileCardList
              className="p-4"
              loading={isLoading}
              loadingMessage="Loading owners…"
              emptyMessage="No owners found. Try adjusting your search or filters."
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              totalItems={filtered.length}
              gridClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              cards={paginated.map(owner => {
                const initials = `${owner.first_name?.[0] || ''}${owner.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <Card key={owner.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <AvatarInitials initials={initials} className="bg-[#01478d] text-white font-semibold w-9 h-9 rounded-full flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-bold text-slate-800 block truncate">{owner.first_name} {owner.last_name}</span>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5 break-all">{owner.email}</p>
                            {owner.phone_number && <p className="text-xs text-slate-400 mt-0.5">{owner.phone_number}</p>}
                          </div>
                        </div>
                        {isSuperAdmin && renderActionMenu(owner)}
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF5FB] text-[#0F2D52] border border-blue-200/50">
                          Owner
                        </span>
                        <Badge variant={owner.is_verified ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2 py-0.5">
                          {owner.is_verified ? 'Approved' : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            />
          ) : (
            /* Table view */
            <DataTable
              className="relative z-0"
              loading={isLoading}
              loadingMessage="Loading owners…"
              emptyMessage="No owners found. Try adjusting your search or filters."
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={itemsPerPage}
              onPageSizeChange={setItemsPerPage}
              onPageChange={setCurrentPage}
              columns={[
                { header: 'Name', className: 'w-1/4' },
                { header: 'Email', className: 'w-1/4' },
                { header: 'Phone Number', className: 'w-1/5' },
                { header: 'Status', className: 'w-auto' },
                { header: 'Actions', className: 'w-auto' },
              ]}
              rows={paginated.map(owner => {
                const initials = `${owner.first_name?.[0] || ''}${owner.last_name?.[0] || ''}`.toUpperCase();
                return (
                  <tr key={owner.id} className="border-b border-slate-50 hover:bg-[#F8FAFC] transition-colors duration-150">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <AvatarInitials initials={initials} className="bg-[#0151a0] text-white font-semibold" />
                        <span className="text-sm font-bold text-slate-900 truncate">{owner.first_name} {owner.last_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs text-slate-600 font-semibold break-all">{owner.email}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs text-slate-600 font-semibold">{owner.phone_number || <span className="text-slate-400">—</span>}</p>
                    </td>
                    <td className="py-4 px-4">
                      <Badge variant={owner.is_verified ? 'success' : 'secondary'} className="text-[10px] font-bold rounded-full px-2.5 py-0.5">
                        {owner.is_verified ? 'Approved' : 'Pending'}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      {isSuperAdmin ? renderActionMenu(owner) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })}
            />
          )}
        </div>
      </div>

      {/* Invite dialog */}
      <Dialog open={isInviteOpen} onOpenChange={v => { if (!isSaving) setIsInviteOpen(v); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-bold text-slate-900">Invite New Owner</DialogTitle>
            <p className="text-xs text-slate-500 font-medium">Owners have full school-level access, identical to Super Admin.</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">First Name *</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">Last Name *</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">Email Address *</label>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="owner@example.com"
                className={`w-full h-10 rounded-xl border text-sm focus:outline-none focus:ring-2 transition-all bg-white ${emailError ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : 'border-slate-200 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52]'}`}
              />
              {emailError && <p className="text-red-500 text-xs mt-1 font-semibold">{emailError}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">Phone Number (Optional)</label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsInviteOpen(false)} disabled={isSaving} className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all font-medium">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSaving || !firstName.trim() || !lastName.trim() || !email.trim()} className="w-full sm:w-auto h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white transition-all font-semibold disabled:opacity-50">
              {isSaving ? 'Sending…' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={v => { if (!isSaving) setIsEditOpen(v); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
          <DialogHeader className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#EFF5FB] text-[#0F2D52] flex items-center justify-center mb-3">
              <Edit className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">Edit Owner Details</DialogTitle>
            <p className="text-xs text-slate-500 font-medium">Update the name or contact information for this owner.</p>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">First Name *</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">Last Name *</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number (Optional)</label>
              <Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" className="w-full h-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/15 focus:border-[#0F2D52] transition-all bg-white" />
            </div>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving} className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all font-medium">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSaving || !firstName.trim() || !lastName.trim()} className="w-full sm:w-auto h-10 text-sm rounded-xl bg-[#0F2D52] hover:bg-[#1c477c] text-white transition-all font-semibold disabled:opacity-50">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={v => { if (!isSaving) setIsDeleteOpen(v); }}>
        <DialogContent className="w-[95vw] max-w-md rounded-2xl shadow-lg border border-slate-100 bg-white p-6">
          <DialogHeader className="mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">Remove Owner</DialogTitle>
            <p className="text-xs text-slate-500 font-medium">Removing this owner will revoke their access immediately.</p>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 leading-relaxed font-medium">
              Are you sure you want to remove <strong className="text-slate-900 font-extrabold">{selectedOwner?.first_name} {selectedOwner?.last_name}</strong>? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSaving} className="w-full sm:w-auto h-10 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all font-medium">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving} className="w-full sm:w-auto h-10 text-sm rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-all">
              {isSaving ? 'Removing…' : 'Remove Owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
