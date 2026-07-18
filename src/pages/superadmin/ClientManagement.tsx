import React, { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Users, Search, Eye, MoreVertical, Mail, Phone, Building } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { apiBaseUrl } from '../../config/env';

export function ClientManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
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
        const mappedClients = data.map((item: any) => ({
          id: item.owner?.id || item.school?.id,
          name: item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : 'N/A',
          email: item.owner?.email || 'N/A',
          phone: item.owner?.phone_number || 'N/A',
          schoolName: item.school?.name || 'N/A',
          schoolSubdomain: item.school?.subdomain || 'N/A',
          status: item.owner?.is_verified ? 'Active' : 'Inactive',
          createdAt: item.school?.created_at || null,
          schoolSettings: item.school?.settings || {}
        }));
        setClients(mappedClients);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      setClients([]);
    }
  };

  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      await fetchClients();
      setLoading(false);
    };
    loadClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewClient = (client: any) => {
    setSelectedClient(client);
    setIsViewDialogOpen(true);
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Client Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage all school clients and their details
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Clients
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{clients.length}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full flex-shrink-0 ml-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Active Clients
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {clients.filter(c => c.status === 'Active').length}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <Building className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Inactive Clients
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {clients.filter(c => c.status === 'Inactive').length}
                  </p>
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
              placeholder="Search clients, emails, or schools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 sm:h-11 text-sm sm:text-base"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading clients...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            {filteredClients.map((client) => (
              <Card key={client.id} className="glass-card">
                <CardHeader className="pb-3 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-amazon-teal/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amazon-teal" />
                      </div>
                      <div>
                        <CardTitle className="text-base sm:text-lg">{client.name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">
                          School: {client.schoolName}
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
                        <DropdownMenuItem onClick={() => handleViewClient(client)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge variant={client.status === 'Active' ? 'success' : 'warning'}>
                        {client.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground truncate">{client.email}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground">{client.phone}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="w-3 h-3 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground">{client.schoolSubdomain}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* View Client Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Client Details</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <div className="space-y-6 py-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amazon-teal to-amazon-orange text-white flex items-center justify-center font-bold text-lg">
                    {selectedClient.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{selectedClient.name}</h3>
                    <p className="text-sm text-slate-500">{selectedClient.email}</p>
                    <Badge variant={selectedClient.status === 'Active' ? 'success' : 'warning'} className="mt-1">
                      {selectedClient.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-slate-500">{selectedClient.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-slate-500">{selectedClient.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">School Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">School Name</p>
                          <p className="text-sm text-slate-500">{selectedClient.schoolName}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Subdomain</p>
                        <p className="text-sm text-slate-500">{selectedClient.schoolSubdomain}</p>
                      </div>
                      {selectedClient.schoolSettings?.timezone && (
                        <div>
                          <p className="text-sm font-medium">Timezone</p>
                          <p className="text-sm text-slate-500">{selectedClient.schoolSettings.timezone}</p>
                        </div>
                      )}
                      {selectedClient.schoolSettings?.enrollment_capacity && (
                        <div>
                          <p className="text-sm font-medium">Enrollment Capacity</p>
                          <p className="text-sm text-slate-500">{selectedClient.schoolSettings.enrollment_capacity}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {selectedClient.schoolSettings?.age_groups && selectedClient.schoolSettings.age_groups.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-lg">Age Groups</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedClient.schoolSettings.age_groups.map((group: string) => (
                        <Badge key={group} variant="outline" className="capitalize">
                          {group.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
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