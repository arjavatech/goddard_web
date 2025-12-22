import React, { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { School, Users, Crown, Building, Plus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { apiBaseUrl } from '../../config/env';

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
          // Fallback to mock data for now
          setSchools([
            { id: 1, name: 'Goddard Lynnwood', status: 'active', owner: { first_name: 'John', last_name: 'Smith', email: 'john@goddard.com' } }
          ]);
        }
      } catch (error) {
        console.error('Error fetching schools:', error);
        // Fallback to mock data
        setSchools([
          { id: 1, name: 'Goddard Lynnwood', status: 'active', owner: { first_name: 'John', last_name: 'Smith', email: 'john@goddard.com' } }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const stats = {
    totalSchools: schools.length,
    activeSchools: schools.length, // All schools are considered active from API
    totalAdmins: schools.length,
    totalSubscriptions: 1
  };

  const recentActivity = [
    { id: 1, action: 'School Created', details: 'Goddard Lynnwood added', time: '2 hours ago' },
    { id: 2, action: 'Admin Added', details: 'John Smith assigned to Lynnwood', time: '1 day ago' }
  ];

  const admins = schools.map((item, index) => ({
    id: index + 1,
    name: item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : 'Admin',
    school: item.school.name,
    email: item.owner?.email || 'admin@school.com',
    status: item.owner?.is_verified ? 'Active' : 'Inactive'
  }));

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1 sm:mb-2">
              SuperAdmin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage all Goddard Schools and system administration
            </p>
          </div>
          <Link to="/superadmin-arjava/schools">
            <Button className="bg-amazon-teal hover:bg-amazon-teal/90 w-full sm:w-auto" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <Card className="glass-card hover:shadow-lg transition-shadow">
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

          <Card className="glass-card hover:shadow-lg transition-shadow">
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

          <Card className="glass-card hover:shadow-lg transition-shadow">
            <CardContent className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">
                    Total Admins
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats.totalAdmins}</p>
                </div>
                <div className="p-2 sm:p-3 bg-amber-100 rounded-full flex-shrink-0 ml-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-shadow">
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

        {/* Admin Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">School Admins</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazon-teal"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Admin</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">School</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.length > 0 ? admins.map((admin) => (
                      <tr key={admin.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{admin.name}</td>
                        <td className="py-3 px-2 text-muted-foreground">{admin.school}</td>
                        <td className="py-3 px-2 text-muted-foreground">{admin.email}</td>
                        <td className="py-3 px-2">
                          <Badge variant={admin.status === 'Active' ? 'success' : 'secondary'}>
                            {admin.status}
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
                <Button variant="outline" className="w-full justify-between h-12">
                  <div className="flex items-center">
                    <School className="w-4 h-4 mr-3" />
                    Manage Schools
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/superadmin-arjava/admins" className="block">
                <Button variant="outline" className="w-full justify-between h-12">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-3" />
                    Manage Admins
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/superadmin-arjava/subscription" className="block">
                <Button variant="outline" className="w-full justify-between h-12">
                  <div className="flex items-center">
                    <Crown className="w-4 h-4 mr-3" />
                    Subscription Management
                  </div>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-amazon-teal rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.details}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}