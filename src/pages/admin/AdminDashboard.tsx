import React from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { School, FileText, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
export function AdminDashboard() {
  // Mock data for dashboard
  const stats = [{
    title: 'Total Classrooms',
    value: 12,
    icon: <School className="h-6 w-6 text-amazon-teal" />,
    change: '+2 this month'
  }, {
    title: 'Active Forms',
    value: 24,
    icon: <FileText className="h-6 w-6 text-amazon-teal" />,
    change: '+5 this month'
  }, {
    title: 'Registered Parents',
    value: 156,
    icon: <Users className="h-6 w-6 text-amazon-teal" />,
    change: '+12 this month'
  }, {
    title: 'Pending Approvals',
    value: 18,
    icon: <Clock className="h-6 w-6 text-amazon-orange" />,
    change: '8 urgent'
  }];
  const recentActivity = [{
    type: 'form_approved',
    parent: 'Sarah Johnson',
    child: 'Emma Johnson',
    form: 'Medical Authorization',
    time: '15 minutes ago'
  }, {
    type: 'parent_joined',
    parent: 'Michael Smith',
    child: 'Noah Smith',
    time: '2 hours ago'
  }, {
    type: 'form_needs_revision',
    parent: 'David Wilson',
    child: 'Olivia Wilson',
    form: 'Emergency Contact Form',
    time: '3 hours ago'
  }, {
    type: 'classroom_added',
    classroom: 'Sunshine Room',
    time: '1 day ago'
  }, {
    type: 'form_submitted',
    parent: 'Jennifer Brown',
    child: 'Sophia Brown',
    form: 'Enrollment Agreement',
    time: '1 day ago'
  }];
  const enrollmentProgress = [{
    classroom: 'Sunshine Room',
    completed: 92,
    total: 100
  }, {
    classroom: 'Rainbow Room',
    completed: 78,
    total: 100
  }, {
    classroom: 'Stars Room',
    completed: 65,
    total: 100
  }, {
    classroom: 'Moon Room',
    completed: 45,
    total: 100
  }];
  return <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard Overview
        </h1>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => <Card key={index} className="glass-card">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <h3 className="text-3xl font-bold mt-2 text-foreground">
                      {stat.value}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-full">{stat.icon}</div>
                </div>
              </CardContent>
            </Card>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enrollment Progress */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Enrollment Progress by Classroom</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {enrollmentProgress.map((classroom, index) => <div key={index}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-sm">
                        {classroom.classroom}
                      </span>
                      <span className="text-sm text-amazon-teal">
                        {Math.round(classroom.completed / classroom.total * 100)}
                        %
                      </span>
                    </div>
                    <Progress value={classroom.completed / classroom.total * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {classroom.completed} of {classroom.total} forms completed
                    </p>
                  </div>)}
              </div>
            </CardContent>
          </Card>
          {/* Recent Activity */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="p-2 rounded-full bg-gray-50">
                      {activity.type === 'form_approved' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.type === 'form_needs_revision' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      {activity.type === 'parent_joined' && <Users className="h-4 w-4 text-amazon-teal" />}
                      {activity.type === 'classroom_added' && <School className="h-4 w-4 text-amazon-teal" />}
                      {activity.type === 'form_submitted' && <FileText className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        {activity.type === 'form_approved' && <>
                            <span className="font-medium">
                              {activity.parent}'s
                            </span>{' '}
                            {activity.form} for {activity.child} was approved
                          </>}
                        {activity.type === 'parent_joined' && <>
                            <span className="font-medium">
                              {activity.parent}
                            </span>{' '}
                            registered with {activity.child}
                          </>}
                        {activity.type === 'form_needs_revision' && <>
                            <span className="font-medium">
                              {activity.parent}'s
                            </span>{' '}
                            {activity.form} for {activity.child} needs revision
                          </>}
                        {activity.type === 'classroom_added' && <>
                            New classroom{' '}
                            <span className="font-medium">
                              {activity.classroom}
                            </span>{' '}
                            was added
                          </>}
                        {activity.type === 'form_submitted' && <>
                            <span className="font-medium">
                              {activity.parent}
                            </span>{' '}
                            submitted {activity.form} for {activity.child}
                          </>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>;
}