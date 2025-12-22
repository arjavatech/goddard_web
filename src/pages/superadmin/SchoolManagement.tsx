import React, { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { School, MapPin, Plus, Search, MoreVertical, Edit, Trash2, Crown, Users, Building } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { useToast } from '../../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';
import { apiBaseUrl } from '../../config/env';

export function SchoolManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [schoolName, setSchoolName] = useState('');
  const [schoolLocation, setSchoolLocation] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [capacity, setCapacity] = useState('200');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [ageGroups, setAgeGroups] = useState(['infants', 'toddlers', 'preschool', 'pre-k']);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/schools/with-owners`, {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-owner-key-2024',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response:', data);
          const mappedSchools = data.map((item: any) => ({
            id: item.school.id,
            name: item.school.name,
            subdomain: item.school.subdomain,
            location: item.school.settings?.timezone || 'N/A',
            capacity: item.school.settings?.enrollment_capacity || 'N/A',
            ageGroups: item.school.settings?.age_groups || [],
            admin: `${item.owner.first_name} ${item.owner.last_name}`,
            adminEmail: item.owner.email,
            adminPhone: item.owner.phone_number,
            status: item.owner.is_verified ? 'active' : 'inactive',
            createdAt: item.school.created_at
          }));
          setSchools(mappedSchools);
        } else {
          // Fallback to sample data
          setSchools([
            {
              id: 'eea5544a-12c6-4db4-82d3-e6749ab85389',
              name: 'Test School Email Template',
              subdomain: 'testschool9999',
              location: 'America/New_York',
              capacity: 'N/A',
              ageGroups: [],
              admin: 'Test Admin',
              adminEmail: 'testadmin9999@test.com',
              adminPhone: '+1234567890',
              status: 'active',
              createdAt: null
            },
            {
              id: 'dd8e8b76-d43d-41b2-95f3-4e9de35f95ee',
              name: 'Goddard School 1765962555',
              subdomain: 'school1765962555',
              location: 'America/New_York',
              capacity: 200,
              ageGroups: [],
              admin: 'John Doe',
              adminEmail: 'owner1765962555@test.com',
              adminPhone: '+1234567890',
              status: 'active',
              createdAt: null
            },
            {
              id: 'd0cfcff0-bc82-4366-a9bf-77e950bf085f',
              name: 'Goddard Schools, Lynnwood',
              subdomain: 'lynnwood',
              location: 'America/New_York',
              capacity: 200,
              ageGroups: ['infants', 'toddlers', 'preschool', 'pre-k'],
              admin: 'Super Admin',
              adminEmail: 'mani.arjava+01@gmail.com',
              adminPhone: '+1-555-0100',
              status: 'active',
              createdAt: null
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        // Fallback to sample data on error
        setSchools([
          {
            id: 'eea5544a-12c6-4db4-82d3-e6749ab85389',
            name: 'Test School Email Template',
            subdomain: 'testschool9999',
            location: 'America/New_York',
            capacity: 'N/A',
            ageGroups: [],
            admin: 'Test Admin',
            adminEmail: 'testadmin9999@test.com',
            adminPhone: '+1234567890',
            status: 'active',
            createdAt: null
          },
          {
            id: 'dd8e8b76-d43d-41b2-95f3-4e9de35f95ee',
            name: 'Goddard School 1765962555',
            subdomain: 'school1765962555',
            location: 'America/New_York',
            capacity: 200,
            ageGroups: [],
            admin: 'John Doe',
            adminEmail: 'owner1765962555@test.com',
            adminPhone: '+1234567890',
            status: 'active',
            createdAt: null
          },
          {
            id: 'd0cfcff0-bc82-4366-a9bf-77e950bf085f',
            name: 'Goddard Schools, Lynnwood',
            subdomain: 'lynnwood',
            location: 'America/New_York',
            capacity: 200,
            ageGroups: ['infants', 'toddlers', 'preschool', 'pre-k'],
            admin: 'Super Admin',
            adminEmail: 'mani.arjava+01@gmail.com',
            adminPhone: '+1-555-0100',
            status: 'active',
            createdAt: null
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.admin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSchool = async () => {
    if (!schoolName.trim() || !subdomain.trim() || !adminName.trim() || !adminEmail.trim()) return;
    
    try {
      const [firstName, ...lastNameParts] = adminName.trim().split(' ');
      const lastName = lastNameParts.join(' ') || 'Admin';
      
      const requestBody = {
        school: {
          name: schoolName.trim(),
          subdomain: subdomain.trim(),
          settings: {
            timezone: timezone,
            enrollment_capacity: parseInt(capacity),
            age_groups: ageGroups
          }
        },
        owner: {
          email: adminEmail.trim(),
          first_name: firstName,
          last_name: lastName,
          phone_number: adminPhone.trim() || "+1234567890"
        }
      };
      
      const response = await fetch(`${apiBaseUrl}/schools/with-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-owner-key-2024'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const newSchool = {
          id: schools.length + 1,
          name: schoolName.trim(),
          location: schoolLocation.trim(),
          admin: adminName.trim(),
          adminEmail: adminEmail.trim(),
          status: 'active'
        };
        
        setSchools([...schools, newSchool]);
        showToast('success', 'School created successfully');
      } else {
        showToast('error', 'Failed to create school');
      }
    } catch (error) {
      console.error('Error creating school:', error);
      showToast('error', 'Error creating school');
    }
    
    setIsAddDialogOpen(false);
    setSchoolName('');
    setSchoolLocation('');
    setSubdomain('');
    setTimezone('America/New_York');
    setCapacity('200');
    setAdminName('');
    setAdminEmail('');
    setAdminPhone('');
    setAgeGroups(['infants', 'toddlers', 'preschool', 'pre-k']);
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
    <SuperAdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              School Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage all Goddard Schools and their administrators
            </p>
          </div>
          <Button 
            className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" 
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Schools
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{schools.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full flex-shrink-0 ml-2">
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Active Schools
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {schools.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <Building className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Admins
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{schools.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal"></div>
          </div>
        ) : (
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
                          {school.subdomain}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant={school.status === 'active' ? 'success' : 'warning'}>
                        {school.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Capacity</span>
                      <span className="text-xs font-medium">{school.capacity}</span>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Admin Contact</div>
                      <div className="text-sm font-medium">{school.adminEmail}</div>
                      <div className="text-xs text-muted-foreground">{school.adminPhone}</div>
                    </div>
                    {school.ageGroups.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Age Groups</div>
                        <div className="flex flex-wrap gap-1">
                          {school.ageGroups.slice(0, 3).map((group: string) => (
                            <Badge key={group} variant="outline" className="text-xs px-1 py-0">
                              {group}
                            </Badge>
                          ))}
                          {school.ageGroups.length > 3 && (
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              +{school.ageGroups.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Subdomain</label>
                  <Input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                    placeholder="Enter subdomain"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <select 
                    value={timezone} 
                    onChange={(e) => setTimezone(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Enrollment Capacity</label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Enter capacity"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Age Groups</label>
                <div className="grid grid-cols-2 gap-2">
                  {['infants', 'toddlers', 'preschool', 'pre-k', 'kindergarten', 'school-age'].map(group => (
                    <label key={group} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={ageGroups.includes(group)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAgeGroups([...ageGroups, group]);
                          } else {
                            setAgeGroups(ageGroups.filter(g => g !== group));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm capitalize">{group.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Admin Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Admin Phone</label>
                  <Input
                    type="tel"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddSchool} 
                className="bg-amazon-teal hover:bg-amazon-teal/90"
                disabled={!schoolName.trim() || !subdomain.trim() || !adminName.trim() || !adminEmail.trim()}
              >
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
    </SuperAdminLayout>
  );
}