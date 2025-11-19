import React from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Users, Shield, Activity, Database, Settings } from 'lucide-react';

export function SuperAdminDashboard() {
  const systemStats = [
    { icon: <Shield className="w-6 h-6" />, label: 'Total Admins', value: '12', change: '+2 this month' },
    { icon: <Users className="w-6 h-6" />, label: 'Active Admins', value: '11', change: '1 inactive' },
    { icon: <Activity className="w-6 h-6" />, label: 'System Health', value: '99%', change: 'All systems operational' }
  ];

  const recentActivity = [
    { action: 'New admin added', school: 'John Smith', time: '2 hours ago', status: 'success' },
    { action: 'Admin updated', school: 'Sarah Johnson', time: '4 hours ago', status: 'success' },
    { action: 'Admin login', school: 'Mike Wilson', time: '6 hours ago', status: 'info' },
    { action: 'Admin deactivated', school: 'Lisa Brown', time: '1 day ago', status: 'warning' }
  ];

  return (
    <SuperAdminLayout>
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
          Admin Management Overview
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {systemStats.map((stat, index) => (
            <Card key={index} className="glass-card cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-foreground">
                      {stat.value}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {stat.change}
                    </p>
                  </div>
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-full flex-shrink-0 ml-2">{stat.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Quick Actions */}
          <Card className="glass-card">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Settings className="w-5 h-5 text-amazon-teal" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full bg-amazon-teal hover:bg-amazon-teal/90" onClick={() => window.location.href = '/superadmin/admins'}>
                <Shield className="w-4 h-4 mr-2" />
                Manage Admins
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Database className="w-5 h-5 text-amazon-teal" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{activity.action}</div>
                    <div className="text-xs text-muted-foreground">{activity.school} • {activity.time}</div>
                  </div>
                  <Badge variant={activity.status as any} className="text-xs">
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}