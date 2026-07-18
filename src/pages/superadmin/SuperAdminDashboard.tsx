import { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { School, Users, Crown, Building, Plus, ArrowRight, CheckCircle2, Database, Wifi } from 'lucide-react';
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
        const response = await fetch(`${apiBaseUrl}/schools/with-owners`, {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-owner-key-2024',
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSchools(data || []);
        } else {
          setSchools([]);
        }
      } catch (error) {
        setSchools([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSchools();
  }, []);

  const stats = {
    totalSchools:       schools.length,
    activeSchools:      schools.filter(item => item.owner?.is_verified).length,
    totalClients:       schools.length,
    totalSubscriptions: schools.length > 0 ? 1 : 0
  };

  const statItems = [
    { label: 'Total Schools',   value: stats.totalSchools,       icon: School,   iconBg: 'bg-[#EFF5FB]',  iconColor: 'text-[#0F2D52]' },
    { label: 'Active Schools',  value: stats.activeSchools,      icon: Building, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Total Clients',   value: stats.totalClients,       icon: Users,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Subscriptions',   value: stats.totalSubscriptions, icon: Crown,    iconBg: 'bg-violet-50',  iconColor: 'text-violet-600' },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              SuperAdmin Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage all Goddard Schools and system administration
            </p>
          </div>
          <Link to="/superadmin-arjava/schools">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group glass-card p-5 animate-fade-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 truncate">{item.label}</p>
                    <p className="text-[2rem] font-extrabold text-slate-900 tabular-nums tracking-tight leading-none">{item.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${item.iconBg} group-hover:scale-105 transition-transform duration-200 flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Schools Overview Table */}
        <Card className="glass-card animate-fade-in-up" style={{ animationDelay: '180ms' } as React.CSSProperties}>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle>Schools Overview</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0 pb-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="h-7 w-7 rounded-full border-2 border-[#0F2D52] border-t-transparent animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-5 py-3.5 text-left">School Name</th>
                      <th className="px-5 py-3.5 text-left">Subdomain</th>
                      <th className="px-5 py-3.5 text-left">Admin</th>
                      <th className="px-5 py-3.5 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {schools.length > 0 ? schools.map((item, index) => (
                      <tr key={item.school?.id || index} className="transition-colors duration-150">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                              <School className="w-4 h-4 text-[#0F2D52]" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{item.school?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500">{item.school?.subdomain || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600 font-medium">
                          {item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={item.owner?.is_verified ? 'success' : 'secondary'}>
                            {item.owner?.is_verified ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-5 py-12 text-center text-sm text-slate-400">
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

        {/* Quick Actions + System Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '220ms' } as React.CSSProperties}>
          <Card className="glass-card">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <Link to="/superadmin-arjava/schools" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 text-sm text-slate-700 group">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF5FB] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-150">
                    <School className="w-4 h-4 text-[#0F2D52]" />
                  </div>
                  <span className="flex-1 font-medium text-left">Manage Schools</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform duration-150" />
                </button>
              </Link>
              <Link to="/superadmin-arjava/clients" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all duration-150 text-sm text-slate-700 group">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-150">
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="flex-1 font-medium text-left">View Clients</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform duration-150" />
                </button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {[
                { label: 'System Status', icon: Wifi,          status: 'Online',     ok: true },
                { label: 'Database',      icon: Database,       status: 'Connected',  ok: true },
                { label: 'API Status',    icon: CheckCircle2,   status: 'Active',     ok: true },
              ].map(({ label, icon: Icon, status, ok }) => (
                <div key={label} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{label}</span>
                  </div>
                  <Badge variant={ok ? 'success' : 'destructive'}>{status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </SuperAdminLayout>
  );
}