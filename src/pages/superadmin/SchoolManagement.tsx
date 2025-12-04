import React, { useState } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { School, MapPin, Plus, Search, MoreVertical, Edit, Trash2, Crown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

export function SchoolManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLocation, setSchoolLocation] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<any>(null);
  
  // Mock subscription limit - 3 schools allowed
  const maxSchools = 3;

  const [schools, setSchools] = useState([
    { id: 1, name: 'Goddard Lynnwood', location: 'Lynnwood, WA', admin: 'John Smith', adminEmail: 'john@goddard-lynnwood.com', status: 'active' }
  ]);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.admin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSchool = () => {
    if (!schoolName.trim() || !schoolLocation.trim() || !adminName.trim() || !adminEmail.trim()) return;
    
    const newSchool = {
      id: schools.length + 1,
      name: schoolName.trim(),
      location: schoolLocation.trim(),
      admin: adminName.trim(),
      adminEmail: adminEmail.trim(),
      status: 'active'
    };
    
    setSchools([...schools, newSchool]);
    setIsAddDialogOpen(false);
    setSchoolName('');
    setSchoolLocation('');
    setAdminName('');
    setAdminEmail('');
    showToast('success', 'School added successfully');
  };

  const handleEditSchool = (school: any) => {
    setSelectedSchool(school);
    setSchoolName(school.name);
    setSchoolLocation(school.location);
    setAdminName(school.admin);
    setAdminEmail(school.adminEmail);
    setIsEditDialogOpen(true);
  };

  const handleUpdateSchool = () => {
    if (!selectedSchool || !schoolName.trim() || !schoolLocation.trim() || !adminName.trim() || !adminEmail.trim()) return;
    
    setSchools(schools.map(school => 
      school.id === selectedSchool.id 
        ? { ...school, name: schoolName.trim(), location: schoolLocation.trim(), admin: adminName.trim(), adminEmail: adminEmail.trim() }
        : school
    ));
    setIsEditDialogOpen(false);
    setSelectedSchool(null);
    setSchoolName('');
    setSchoolLocation('');
    setAdminName('');
    setAdminEmail('');
    showToast('success', 'School updated successfully');
  };

  const openDeleteDialog = (school: any) => {
    setSchoolToDelete(school);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteSchool = () => {
    if (schoolToDelete) {
      setSchools(schools.filter(school => school.id !== schoolToDelete.id));
      showToast('success', 'School deleted successfully');
      setIsDeleteDialogOpen(false);
      setSchoolToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
            School Management
          </h1>
          <Button 
            className="bg-amazon-teal hover:bg-amazon-teal/90" 
            onClick={() => {
              if (schools.length >= maxSchools) {
                setIsSubscriptionDialogOpen(true);
              } else {
                setIsAddDialogOpen(true);
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search schools, locations, or admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {filteredSchools.map((school) => (
            <Card key={school.id} className="glass-card">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-amazon-teal/10 flex items-center justify-center">
                      <School className="w-5 h-5 text-amazon-teal" />
                    </div>
                    <div>
                      <CardTitle className="text-base sm:text-lg">{school.name}</CardTitle>
                      <div className="flex items-center text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3 mr-1" />
                        {school.location}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Admin: {school.admin}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditSchool(school)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit School
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteDialog(school)} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete School
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                  <Badge variant={school.status === 'active' ? 'success' : 'warning'}>
                    {school.status}
                  </Badge>
                </div>
                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Admin Contact</div>
                  <div className="text-sm font-medium">{school.adminEmail}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">School Name</label>
                <Input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={schoolLocation}
                  onChange={(e) => setSchoolLocation(e.target.value)}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Admin Name</label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Enter admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Admin Email</label>
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
              <Button onClick={handleAddSchool} className="bg-amazon-teal hover:bg-amazon-teal/90">
                Add School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit School</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">School Name</label>
                <Input
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  value={schoolLocation}
                  onChange={(e) => setSchoolLocation(e.target.value)}
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Admin Name</label>
                <Input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Enter admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Admin Email</label>
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
              <Button onClick={handleUpdateSchool} className="bg-amazon-teal hover:bg-amazon-teal/90">
                Update School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Subscription Limit Dialog */}
        <Dialog open={isSubscriptionDialogOpen} onOpenChange={setIsSubscriptionDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amazon-teal" />
                Subscription Required
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                You've reached your school limit. Subscribe to add more schools and unlock additional features.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-blue-900">Current Plan: Basic</p>
                    <p className="text-sm text-blue-700">Schools: {schools.length}/{maxSchools}</p>
                  </div>
                  <Crown className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSubscriptionDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => {
                  setIsSubscriptionDialogOpen(false);
                  navigate('/admin/subscription');
                }} 
                className="bg-amazon-teal hover:bg-amazon-teal/90"
              >
                <Crown className="h-4 w-4 mr-2" />
                See Plans
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Delete School
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete <strong>{schoolToDelete?.name}</strong>? This action cannot be undone.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-800 font-medium">This will permanently remove:</p>
                </div>
                <ul className="text-sm text-red-700 mt-2 ml-6 list-disc">
                  <li>School information and settings</li>
                  <li>All associated admin accounts</li>
                  <li>Student and parent data</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteSchool}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}