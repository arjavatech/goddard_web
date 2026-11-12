import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../contexts/ToastContext';
import { useUserContext } from '../../contexts/UserContext';
import { fetchOwners, inviteOwner, updateOwner, deleteOwner, resendOwnerInvite, type OwnerUser, type SuperAdminInfo } from '../../services/api/owner';
import { Shield, Search, Plus, Edit, Trash2, RefreshCw, Users, UserCheck, Clock, MoreHorizontal, Mail, Phone } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { AvatarInitials } from '../../components/ui/avatar-initials';

export function OwnerManagement() {
  const [owners, setOwners] = useState<OwnerUser[]>([]);
  const [superAdmin, setSuperAdmin] = useState<SuperAdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const loadOwners = useCallback(async () => {
    if (!schoolId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const result = await fetchOwners(schoolId);
      setOwners(result.owners);
      setSuperAdmin(result.superAdmin);
    } catch (err) {
      setLoadError('Failed to load owners. Please try again.');
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
      if (err?.code === 'EMAIL_BOUNCE') {
        showToast('error', err.message);
      } else if (err?.status === 409 || err?.message?.toLowerCase().includes('already exists') || err?.message?.toLowerCase().includes('conflict')) {
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
    const q = searchTerm.toLowerCase();
    return !q || o.first_name.toLowerCase().includes(q) || o.last_name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q);
  });

  const totalOwners = owners.length;
  const verifiedOwners = owners.filter(o => o.is_verified).length;
  const pendingOwners = owners.filter(o => !o.is_verified).length;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] h-8 w-8 mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading owners…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Owner Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isSuperAdmin ? 'Manage school owners with full administrative access' : 'View school owners and administrative contacts'}
            </p>
          </div>
          {isSuperAdmin && (
            <Button onClick={openInvite} className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white gap-2 self-start sm:self-auto">
              <Plus className="w-4 h-4" /> Invite Owner
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Owners</p>
                <p className="text-2xl font-bold text-slate-900">{totalOwners}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Active</p>
                <p className="text-2xl font-bold text-slate-900">{verifiedOwners}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Pending Invitation</p>
                <p className="text-2xl font-bold text-slate-900">{pendingOwners}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Super Admin info card */}
        {superAdmin && (
          <Card className="border-[#0F2D52]/15 bg-[#0F2D52]/[0.02]">
            <CardContent className="p-4">
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
                {isOwner && (
                  <div className="sm:text-right">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      To make any changes, please contact{' '}
                      <span className="font-semibold text-slate-700">{superAdmin.first_name} {superAdmin.last_name}</span>
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search owners…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Error */}
        {loadError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center justify-between">
            <span>{loadError}</span>
            <Button variant="outline" size="sm" onClick={loadOwners} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </div>
        )}

        {/* Owner list */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-slate-400" />
              </div>
              <p className="text-slate-900 font-semibold mb-1">{searchTerm ? 'No owners found' : 'No owners yet'}</p>
              <p className="text-sm text-slate-500">
                {searchTerm ? 'Try a different search term.' : isSuperAdmin ? 'Invite an owner to give them full school-level access.' : 'No owners have been added to this school yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(owner => (
              <Card key={owner.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarInitials initials={`${owner.first_name?.[0] || ''}${owner.last_name?.[0] || ''}`.toUpperCase()} size="md" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{owner.first_name} {owner.last_name}</p>
                        <p className="text-xs text-slate-500 truncate">{owner.email}</p>
                        {owner.phone_number && <p className="text-xs text-slate-400 truncate">{owner.phone_number}</p>}
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openEdit(owner)} className="gap-2 cursor-pointer">
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </DropdownMenuItem>
                          {!owner.is_verified && (
                            <DropdownMenuItem
                              onClick={() => handleResend(owner)}
                              disabled={resendingId === owner.id}
                              className="gap-2 cursor-pointer"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${resendingId === owner.id ? 'animate-spin' : ''}`} />
                              Resend Invite
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openDelete(owner)} className="gap-2 cursor-pointer text-red-600 focus:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={owner.is_verified ? 'default' : 'secondary'} className={owner.is_verified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}>
                      {owner.is_verified ? 'Active' : 'Pending'}
                    </Badge>
                    <Badge variant="outline" className="text-[#0F2D52] border-[#0F2D52]/20 bg-[#0F2D52]/5">
                      Owner
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invite dialog — SuperAdmin only */}
      <Dialog open={isInviteOpen} onOpenChange={v => { if (!isSaving) setIsInviteOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-500">Owners have full school-level access, identical to Super Admin.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name *</label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name *</label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address *</label>
              <Input value={email} onChange={e => { setEmail(e.target.value); setEmailError(''); }} placeholder="owner@example.com" type="email" />
              {emailError && <p className="text-xs text-red-600">{emailError}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone Number</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" type="tel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleInvite} disabled={isSaving || !firstName.trim() || !lastName.trim() || !email.trim()} className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white">
              {isSaving ? 'Sending…' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog — SuperAdmin only */}
      <Dialog open={isEditOpen} onOpenChange={v => { if (!isSaving) setIsEditOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Owner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name *</label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name *</label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone Number</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" type="tel" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSaving || !firstName.trim() || !lastName.trim()} className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — SuperAdmin only */}
      <Dialog open={isDeleteOpen} onOpenChange={v => { if (!isSaving) setIsDeleteOpen(v); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Owner</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600">
              Are you sure you want to remove <strong>{selectedOwner?.first_name} {selectedOwner?.last_name}</strong>? They will lose all owner-level access immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleDelete} disabled={isSaving} variant="destructive">
              {isSaving ? 'Removing…' : 'Remove Owner'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
