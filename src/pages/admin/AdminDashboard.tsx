import React, { useEffect, useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { School, FileText, Users, Clock, UserCheck } from 'lucide-react';
import { Progress } from '../../components/ui/progress';
import { Loading } from '../../components/ui/loading';
import { fetchUserContext } from '../../services/api/user';
import { fetchDashboardMetrics } from '../../services/api/admin';

type StatCard = {
  title: string;
  value: number;
  icon: React.ReactNode;
  change: string;
};

type ProgressItem = {
  classroom: string;
  completed: number;
  total: number;
};
export function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
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

        const metrics = await fetchDashboardMetrics(user.schoolId);

        // Calculate pending enrollments
        const pendingEnrollments = metrics.classwiseMetrics.reduce(
          (sum, metric) => sum + (metric.totalEnrollments - metric.completedEnrollments),
          0
        );

        const statCards: StatCard[] = [
          {
            title: 'Total Classrooms',
            value: metrics.totalClassrooms,
            icon: <School className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data'
          },
          {
            title: 'Active Forms',
            value: metrics.totalForms,
            icon: <FileText className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data'
          },
          {
            title: 'Active Parents',
            value: metrics.totalActiveParents,
            icon: <Users className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data'
          },
          {
            title: 'Active Children',
            value: metrics.totalActiveChildren,
            icon: <UserCheck className="h-6 w-6 text-amazon-teal" />,
            change: 'Live data'
          },
          {
            title: 'Pending Enrollments',
            value: pendingEnrollments,
            icon: <Clock className="h-6 w-6 text-amazon-orange" />,
            change: 'Awaiting completion'
          }
        ];

        const progressItems: ProgressItem[] = metrics.classwiseMetrics.map(metric => ({
          classroom: metric.classroomName,
          completed: metric.completedEnrollments,
          total: metric.totalEnrollments
        })).sort((a, b) => a.classroom.localeCompare(b.classroom));

        if (!isMounted) return;
        setStats(statCards);
        setEnrollmentProgress(progressItems);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setStats([]);
        setEnrollmentProgress([]);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
      </div>
    </AdminLayout>;
}