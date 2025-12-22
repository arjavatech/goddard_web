import React, { useState } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Plus, Search, Mail, School, ArrowUpDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';

export function SuperAdminManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', school: '' });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const admins = [
    { id: 1, name: 'John Smith', school: 'Goddard Lynnwood', email: 'john.smith@goddard.com', status: 'Active', role: 'School Admin' },
    { id: 2, name: 'Sarah Johnson', school: 'Goddard Bellevue', email: 'sarah.johnson@goddard.com', status: 'Active', role: 'School Admin' },
    { id: 3, name: 'Mike Davis', school: 'Goddard Seattle', email: 'mike.davis@goddard.com', status: 'Inactive', role: 'School Admin' },
    { id: 4, name: 'Emily Chen', school: 'Goddard Redmond', email: 'emily.chen@goddard.com', status: 'Active', role: 'School Admin' }
  ];

  const filteredAndSortedAdmins = admins
    .filter(admin =>
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.school.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'school': aVal = a.school; bVal = b.school; break;
        case 'email': aVal = a.email; bVal = b.email; break;
        case 'status': aVal = a.status; bVal = b.status; break;
        default: aVal = a.name; bVal = b.name;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              Admin Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage school administrators across all Goddard locations
            </p>
          </div>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" 
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </Button>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg font-semibold">School Administrators</CardTitle>
              <div className="flex gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search admins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowUpDown className="h-4 w-4 mr-2" />
                      Sort
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('asc'); }}>Name A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('name'); setSortOrder('desc'); }}>Name Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('school'); setSortOrder('asc'); }}>School A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('school'); setSortOrder('desc'); }}>School Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('email'); setSortOrder('asc'); }}>Email A-Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('email'); setSortOrder('desc'); }}>Email Z-A</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setSortBy('status'); setSortOrder('asc'); }}>Status</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Admin</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">School</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Role</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amazon-teal/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-amazon-teal">
                              {admin.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium">{admin.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          <School className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{admin.school}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{admin.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{admin.role}</Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={admin.status === 'Active' ? 'success' : 'secondary'}>
                          {admin.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">
                            {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <Input
                placeholder="Enter admin name"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">School</label>
              <Select value={newAdmin.school} onValueChange={(value) => setNewAdmin(prev => ({ ...prev, school: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="goddard-lynnwood">Goddard Lynnwood</SelectItem>
                  <SelectItem value="goddard-bellevue">Goddard Bellevue</SelectItem>
                  <SelectItem value="goddard-seattle">Goddard Seattle</SelectItem>
                  <SelectItem value="goddard-redmond">Goddard Redmond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                console.log('Adding admin:', newAdmin);
                setIsAddDialogOpen(false);
                setNewAdmin({ name: '', email: '', school: '' });
              }}
              className="bg-amazon-teal hover:bg-amazon-teal/90"
              disabled={!newAdmin.name || !newAdmin.email || !newAdmin.school}
            >
              Add Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}