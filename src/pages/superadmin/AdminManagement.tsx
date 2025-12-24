import React, { useState } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Shield, Search, Plus, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabaseClient';
import { fetchAdminUsers, inviteAdmin, updateAdmin, deleteAdmin, type AdminUser } from '../../services/api/admin';
import { useUserContext } from '../../contexts/UserContext';

export function AdminManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [adminName, setAdminName] = useState('');
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { userData } = useUserContext();

  const [admins, setAdmins] = useState<AdminUser[]>([]);

  const filteredAdmins = admins.filter(admin =>
    `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

    // Check for existing email
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
      
      // Reload admin list
      const adminUsers = await fetchAdminUsers(userData.schoolId);
      setAdmins(adminUsers);
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        setEmailError('Email already exists');
      } else {
        showToast('error', 'Failed to send invitation');
      }
    } finally {
      setIsInviting(false);
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
    setAdminName('');
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
    setAdminPhone('');
    setEmailError('');
  };

  // Remove the old handleAddAdmin function and keep only handleInviteAdmin
  const handleAddAdmin = handleInviteAdmin;

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Admin Management
          </h1>
          <Button className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm" onClick={() => {
            setEmailError(''); // Clear any existing email errors
            setIsAddDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Invite Admin
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search admins or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Admins List */}
        <Card className="glass-card">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">System Admins ({filteredAdmins.length})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-amazon-teal border-t-transparent rounded-full"></div>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground mb-4">{loadError}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Refresh Page
                </Button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredAdmins.map((admin) => (
                  <div key={admin.id} className="flex flex-col p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {admin.first_name[0]}{admin.last_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{admin.first_name} {admin.last_name}</h3>
                            <Shield className="w-4 h-4 text-amazon-teal flex-shrink-0" />
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{admin.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewAdmin(admin)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAdmin(admin)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteAdmin(admin)} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Role: {admin.role}
                      </div>
                      <Badge variant={admin.is_verified ? 'success' : 'secondary'}>
                        {admin.is_verified ? 'approved' : 'pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite Admin Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Enter last name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={handleEmailChange}
                  placeholder="Enter admin email"
                  required
                  className={emailError ? 'border-red-500' : ''}
                />
                {emailError && (
                  <p className="text-red-500 text-sm mt-1">{emailError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteAdmin} disabled={isInviting || !isFormValid} className="bg-amazon-teal hover:bg-amazon-teal/90 disabled:opacity-50">
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
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">First Name</label>
                <Input
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Last Name</label>
                <Input
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={adminEmail}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  placeholder="Email cannot be edited"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <Input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="Enter phone number (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateAdmin} className="bg-amazon-teal hover:bg-amazon-teal/90">
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
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Admin Details</DialogTitle>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-lg">
                    {selectedAdmin.first_name[0]}{selectedAdmin.last_name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedAdmin.first_name} {selectedAdmin.last_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={selectedAdmin.is_verified ? 'success' : 'secondary'}>
                      {selectedAdmin.is_verified ? 'approved' : 'pending'}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Role</label>
                    <p className="text-sm">{selectedAdmin.role}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
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
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Admin</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <strong>{adminToDelete?.first_name} {adminToDelete?.last_name}</strong>? This action cannot be undone.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteAdmin}>
                Delete Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}