import React, { useState } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Shield, Search, Plus, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabaseClient';

export function AdminManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const { showToast } = useToast();

  const [admins, setAdmins] = useState([
    { id: 1, name: 'John Smith', email: 'john@goddardschool.com', status: 'active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@goddardschool.com', status: 'active', lastLogin: '1 day ago' },
    { id: 3, name: 'Mike Wilson', email: 'mike@goddardschool.com', status: 'active', lastLogin: '3 hours ago' },
    { id: 4, name: 'Lisa Brown', email: 'lisa@goddardschool.com', status: 'inactive', lastLogin: '1 week ago' }
  ]);

  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInviteAdmin = async () => {
    if (!adminEmail.trim()) {
      showToast('error', 'Please enter an email address');
      return;
    }

    setIsInviting(true);

    try {
      // Use Supabase auth signup to send invitation email
      const { data, error } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password: Math.random().toString(36).slice(-8) + 'A1!',
        options: {
          emailRedirectTo: `${window.location.origin}/signup`
        }
      });

      if (error) {
        showToast('error', error.message);
        return;
      }
      
      showToast('success', 'Invitation sent to ' + adminEmail.trim());
      setIsAddDialogOpen(false);
      resetForm();
    } catch (err) {
      showToast('error', 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleEditAdmin = (admin: any) => {
    setSelectedAdmin(admin);
    setAdminName(admin.name);
    setAdminEmail(admin.email);
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdmin = () => {
    if (!selectedAdmin || !adminName.trim() || !adminEmail.trim()) return;
    
    setAdmins(admins.map(admin => 
      admin.id === selectedAdmin.id 
        ? { ...admin, name: adminName.trim(), email: adminEmail.trim() }
        : admin
    ));
    setIsEditDialogOpen(false);
    setSelectedAdmin(null);
    resetForm();
  };

  const handleViewAdmin = (admin: any) => {
    setSelectedAdmin(admin);
    setIsViewDialogOpen(true);
  };

  const handleDeleteAdmin = (adminId: number) => {
    if (confirm('Are you sure you want to delete this admin?')) {
      setAdmins(admins.filter(admin => admin.id !== adminId));
    }
  };

  const resetForm = () => {
    setAdminName('');
    setAdminEmail('');
  };

  // Remove the old handleAddAdmin function and keep only handleInviteAdmin
  const handleAddAdmin = handleInviteAdmin;

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            Admin Management
          </h1>
          <Button className="bg-amazon-teal hover:bg-amazon-teal/90" onClick={() => setIsAddDialogOpen(true)}>
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
            <div className="space-y-3 sm:space-y-4">
              {filteredAdmins.map((admin) => (
                <div key={admin.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {admin.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground text-sm sm:text-base truncate">{admin.name}</h3>
                        <Shield className="w-4 h-4 text-amazon-teal" />
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{admin.email}</p>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <span>Last login: {admin.lastLogin}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
                    <Badge variant={admin.status === 'active' ? 'success' : 'secondary'}>
                      {admin.status}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleDeleteAdmin(admin.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invite Admin Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInviteAdmin} disabled={isInviting} className="bg-amazon-teal hover:bg-amazon-teal/90">
                {isInviting ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Admin</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Admin Name</label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Enter admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Enter admin email"
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
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Admin Details</DialogTitle>
            </DialogHeader>
            {selectedAdmin && (
              <div className="space-y-4 py-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-lg">
                    {selectedAdmin.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedAdmin.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedAdmin.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Status</label>
                    <Badge variant={selectedAdmin.status === 'active' ? 'success' : 'secondary'}>
                      {selectedAdmin.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Last Login</label>
                    <p className="text-sm">{selectedAdmin.lastLogin}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SuperAdminLayout>
  );
}