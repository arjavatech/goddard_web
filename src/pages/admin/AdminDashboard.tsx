import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { School, FileText, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { Loading } from '../../components/ui/loading';
import { fetchUserContext } from '../../services/api/user';
import { fetchClassrooms, fetchParentDetails, fetchSchoolEnrollments } from '../../services/api/admin';
import { fetchFormTemplates } from '../../services/api/dashboard';
import { normalizeFormStatus, COMPLETION_STATUSES } from '../../lib/formStatus';
type StatCard = {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
};
type ActivityItem = {
  type: 'form_approved' | 'form_needs_revision' | 'form_submitted' | 'parent_joined' | 'classroom_added';
  parent?: string;
  child?: string;
  form?: string;
  classroom?: string;
  time: string;
};
type ProgressItem = {
  classroom: string;
  completed: number;
  total: number;
};
function formatRelative(index: number): string {
  if (index === 0) return 'Just now';
  if (index === 1) return 'A few minutes ago';
  if (index === 2) return 'Earlier today';
  return 'Recently';
}
export function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [enrollmentProgress, setEnrollmentProgress] = useState<ProgressItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const user = await fetchUserContext();
        if (!user.schoolId) {
          throw new Error('Unable to determine school context for the current admin.');
        }
        const schoolId = user.schoolId;
        const [classrooms, forms, parents, enrollments] = await Promise.all([fetchClassrooms(schoolId).catch(() => []), fetchFormTemplates(schoolId).catch(() => []), fetchParentDetails(schoolId).catch(() => []), fetchSchoolEnrollments(schoolId).catch(() => [])]);
        const totalClassrooms = classrooms.length;
        const activeForms = forms.filter(template => (template.status ?? '').toLowerCase() === 'active').length;
        const registeredParents = parents.length;
        const pendingApprovals = enrollments.filter(child => !COMPLETION_STATUSES.has(normalizeFormStatus(child.formStatus))).length;
        const statCards: StatCard[] = [{
          title: 'Total Classrooms',
          value: totalClassrooms,
          icon: <School className="h-6 w-6 text-amazon-teal" />,
          change: 'Live data'
        }, {
          title: 'Active Forms',
          value: activeForms,
          icon: <FileText className="h-6 w-6 text-amazon-teal" />,
          change: 'Live data'
        }, {
          title: 'Registered Parents',
          value: registeredParents,
          icon: <Users className="h-6 w-6 text-amazon-teal" />,
          change: 'Live data'
        }, {
          title: 'Pending Approvals',
          value: pendingApprovals,
          icon: <Clock className="h-6 w-6 text-amazon-orange" />,
          change: 'Awaiting completion'
        }];
        const completionsByClass = new Map<string, {
          completed: number;
          total: number;
        }>();
        enrollments.forEach(child => {
          const className = child.className ?? 'Unassigned';
          if (!completionsByClass.has(className)) {
            completionsByClass.set(className, {
              completed: 0,
              total: 0
            });
          }
          const bucket = completionsByClass.get(className);
          if (!bucket) return;
          bucket.total += 1;
          const status = normalizeFormStatus(child.formStatus);
          if (COMPLETION_STATUSES.has(status)) {
            bucket.completed += 1;
          }
        });
        const progressItems: ProgressItem[] = Array.from(completionsByClass.entries()).map(([classroom, counts]) => ({
          classroom,
          completed: counts.completed,
          total: counts.total
        })).sort((a, b) => a.classroom.localeCompare(b.classroom));
        const activityItems: ActivityItem[] = enrollments.slice(0, 5).map((child, index) => {
          const status = normalizeFormStatus(child.formStatus);
          if (COMPLETION_STATUSES.has(status)) {
            return {
              type: 'form_approved',
              parent: child.primaryEmail ?? child.additionalParentEmail ?? 'Guardian',
              child: `${child.firstName} ${child.lastName}`.trim(),
              form: 'Enrollment Packet',
              time: formatRelative(index)
            } satisfies ActivityItem;
          }
          if (status === 'Needs Revision') {
            return {
              type: 'form_needs_revision',
              parent: child.primaryEmail ?? child.additionalParentEmail ?? 'Guardian',
              child: `${child.firstName} ${child.lastName}`.trim(),
              form: 'Enrollment Packet',
              time: formatRelative(index)
            } satisfies ActivityItem;
          }
          return {
            type: 'form_submitted',
            parent: child.primaryEmail ?? child.additionalParentEmail ?? 'Guardian',
            child: `${child.firstName} ${child.lastName}`.trim(),
            form: 'Enrollment Packet',
            time: formatRelative(index)
          } satisfies ActivityItem;
        });
        if (!isMounted) return;
        setStats(statCards);
        setEnrollmentProgress(progressItems);
        setRecentActivity(activityItems);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setStats([]);
        setEnrollmentProgress([]);
        setRecentActivity([]);
        const message = err instanceof Error ? err.message : null;
        setError(message && message !== 'Received unexpected response from the server.' ? message : "We couldn't load the admin dashboard data right now. Please try again shortly.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);
  return <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">
          Dashboard Overview
        </h1>
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>}
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
                {loading ? <Loading message="Loading enrollment data..." size="sm" /> : enrollmentProgress.length === 0 ? <div className="text-sm text-muted-foreground">
                    No enrollment data available yet.
                  </div> : enrollmentProgress.map((classroom, index) => <div key={`${classroom.classroom}-${index}`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-sm">
                          {classroom.classroom}
                        </span>
                        <span className="text-sm text-amazon-teal">
                          {classroom.total > 0 ? Math.round(classroom.completed / classroom.total * 100) : 0}%
                        </span>
                      </div>
                      <Progress value={classroom.total > 0 ? classroom.completed / classroom.total * 100 : 0} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {classroom.completed} of {classroom.total} students marked complete
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
                {recentActivity.map((activity, index) => <div key={`${activity.type}-${index}`} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
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
                            <span className="font-medium">{activity.parent}</span>{' '}
                            Enrollment packet for {activity.child} was approved
                          </>}
                        {activity.type === 'form_needs_revision' && <>
                            <span className="font-medium">{activity.parent}</span>{' '}
                            Enrollment packet for {activity.child} needs revision
                          </>}
                        {activity.type === 'form_submitted' && <>
                            <span className="font-medium">{activity.parent}</span>{' '}
                            submitted enrollment documents for {activity.child}
                          </>}
                        {activity.type === 'parent_joined' && <>
                            <span className="font-medium">{activity.parent}</span>{' '}
                            joined the portal for {activity.child}
                          </>}
                        {activity.type === 'classroom_added' && <>
                            New classroom{' '}
                            <span className="font-medium">{activity.classroom}</span>{' '}
                            was added
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