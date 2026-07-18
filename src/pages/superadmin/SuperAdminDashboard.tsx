import { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { School, Users, Crown, Building, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { apiBaseUrl } from '../../config/env';
import { PageLoader } from '../../components/ui/page-loader';

export function SuperAdminDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        console.log('Fetching schools...');
        const response = await fetch(`${apiBaseUrl}/schools/with-owners`, {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-owner-key-2024',
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Schools data:', data);
          setSchools(data || []);
        } else {
          console.error('API response not ok:', response.status, response.statusText);
          setSchools([]);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const stats = {
    totalSchools: schools.length,
    activeSchools: schools.filter(item => item.owner?.is_verified).length,
    totalClients: schools.length,
    totalSubscriptions: schools.length > 0 ? 1 : 0
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              SuperAdmin Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Manage all Goddard Schools and system administration
            </p>
          </div>
          <Link to="/superadmin-arjava/schools">
            <Button className="bg-[#0891b2] hover:bg-[#0e7490] w-full sm:w-auto" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Schools
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalSchools}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amazon-teal/10 rounded-full flex-shrink-0 ml-2">
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-amazon-teal" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Active Schools
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.activeSchools}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full flex-shrink-0 ml-2">
                  <Building className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Clients
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalClients}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Subscriptions
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalSubscriptions}</p>
                </div>
                <div className="p-2 sm:p-3 bg-purple-100 rounded-full flex-shrink-0 ml-2">
                  <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schools Overview Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Schools Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <PageLoader message="Loading schools..." Layout={() => <div />} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">School Name</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Subdomain</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Admin</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schools.length > 0 ? schools.map((item, index) => (
                      <tr key={item.school?.id || index} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{item.school?.name || 'N/A'}</td>
                        <td className="py-3 px-2 text-muted-foreground">{item.school?.subdomain || 'N/A'}</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : 'N/A'}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={item.owner?.is_verified ? 'success' : 'secondary'}>
                            {item.owner?.is_verified ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground">
                          No schools found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/superadmin-arjava/schools" className="block">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <School className="w-4 h-4 mr-2" />
                  Manage Schools
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
              <Link to="/superadmin-arjava/clients" className="block">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  View Clients
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">System Status</span>
                  <Badge variant="success">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Database</span>
                  <Badge variant="success">Connected</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">API Status</span>
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}