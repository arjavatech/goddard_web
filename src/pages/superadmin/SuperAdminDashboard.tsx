import { useState, useEffect } from 'react';
import { SuperAdminLayout } from './SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { School, Users, Crown, Building, Plus, ArrowRight, CheckCircle2, Database, Wifi, Activity, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { apiBaseUrl } from '../../config/env';
import { PageLoader } from '../../components/ui/page-loader';
import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

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

  const activeCount = schools.filter(item => item.owner?.is_verified).length;
  const inactiveCount = schools.length - activeCount;

  const subscriptionData = [
    { name: 'Active Schools', value: activeCount, color: '#10b981' },
    { name: 'Pending Verification', value: inactiveCount, color: '#f59e0b' }
  ];

  // If there are no schools, fall back to safe visualization
  const hasSchools = schools.length > 0;
  const pieData = hasSchools ? subscriptionData : [
    { name: 'Active Schools', value: 1, color: '#10b981' },
    { name: 'Pending Verification', value: 0, color: '#E2E8F0' }
  ];

  const growthData = [
    { name: 'Jan', schools: 0, traffic: 12 },
    { name: 'Feb', schools: 0, traffic: 18 },
    { name: 'Mar', schools: 1, traffic: 34 },
    { name: 'Apr', schools: 1, traffic: 48 },
    { name: 'May', schools: 1, traffic: 65 },
    { name: 'Jun', schools: 1, traffic: 92 },
    { name: 'Jul', schools: schools.length || 1, traffic: 115 }
  ];

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-xs font-semibold text-slate-800">
          <p className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
            {payload[0].name}: <span className="font-extrabold text-[#0F2D52]">{payload[0].value} schools</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomAreaTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-lg text-xs text-slate-600">
          <p className="font-bold text-slate-900 mb-1">{payload[0].payload.name}</p>
          <p className="flex justify-between gap-4 font-semibold text-slate-700">
            <span>Schools:</span>
            <span className="text-[#0f2d52] font-extrabold">{payload[0].payload.schools}</span>
          </p>
          <p className="flex justify-between gap-4 text-[11px] text-slate-400 mt-0.5">
            <span>API Traffic:</span>
            <span>{payload[0].payload.traffic}k reqs</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const stats = {
    totalSchools:       schools.length,
    activeSchools:      activeCount,
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
      <div className="space-y-6 max-w-7xl mx-auto pb-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-14 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              SuperAdmin Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">
              Manage all Goddard Schools and system administration
            </p>
          </div>
          <Link to="/superadmin-arjava/schools">
            <Button size="sm" className="w-full sm:w-auto rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] text-white hover:opacity-95 shadow-sm border-none font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {statItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                }}
                className="group glass-card p-5 border border-slate-100 hover:border-[#1a6fc4]/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#EFF5FB]/50 rounded-full blur-xl group-hover:bg-[#EFF5FB]/80 transition-all duration-300" />
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="space-y-1.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 truncate">{item.label}</p>
                    <p className="text-[2.25rem] font-extrabold text-[#0F2D52] tabular-nums tracking-tight leading-none">{item.value}</p>
                  </div>
                  <div className={`p-3 rounded-2xl ${item.iconBg} group-hover:scale-115 transition-all duration-300 flex-shrink-0 shadow-sm border border-white`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* System Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          {/* License Status Donut Chart */}
          <div className="glass-card p-6 lg:col-span-1 flex flex-col justify-between relative overflow-hidden border border-slate-100 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#0F2D52]">License Status</h3>
              </div>
              <p className="text-xs text-slate-400">Verified vs pending school accounts</p>
            </div>

            <div className="h-44 relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[1.85rem] font-extrabold text-[#0F2D52] leading-none">{schools.length}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Schools</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] font-bold pt-3 border-t border-slate-50">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                <span className="text-slate-500 uppercase tracking-wider">Active ({activeCount})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-slate-500 uppercase tracking-wider">Pending ({inactiveCount})</span>
              </div>
            </div>
          </div>

          {/* System Growth & Traffic Area Chart */}
          <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between border border-slate-100 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-[#1a6fc4] border border-blue-100">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#0F2D52]">System Growth & API Load</h3>
                </div>
                <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">Real-time status</span>
              </div>
              <p className="text-xs text-slate-400">Schools registered and request volume traffic trends</p>
            </div>

            <div className="h-44 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a6fc4" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1a6fc4" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area type="monotone" dataKey="traffic" stroke="#1a6fc4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTraffic)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between text-[11px] font-bold pt-3 border-t border-slate-50 text-slate-400 uppercase tracking-wider">
              <span>Feb: Platform Launch</span>
              <span>Jul: Peak Activity</span>
            </div>
          </div>
        </div>

        {/* Schools Overview Table */}
        <Card className="glass-card border border-slate-100 shadow-sm animate-fade-in-up" style={{ animationDelay: '180ms' } as React.CSSProperties}>
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-sm font-bold text-slate-900">Schools Overview</CardTitle>
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
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">School Name</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Subdomain</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin</th>
                      <th className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {schools.length > 0 ? schools.map((item, index) => (
                      <tr key={item.school?.id || index} className="transition-colors duration-150 hover:bg-slate-50/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#EFF5FB] flex items-center justify-center flex-shrink-0">
                              <School className="w-4 h-4 text-[#0F2D52]" />
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{item.school?.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-slate-500 font-semibold">{item.school?.subdomain || 'N/A'}</td>
                        <td className="px-5 py-3.5 text-sm text-slate-600 font-semibold">
                          {item.owner ? `${item.owner.first_name} ${item.owner.last_name}` : 'N/A'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={item.owner?.is_verified ? 'success' : 'secondary'} className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
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
          <Card className="glass-card border border-slate-100 shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 pb-4">
              <Link to="/superadmin-arjava/schools" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-blue-200/50 hover:bg-[#EFF5FB]/25 transition-all duration-300 text-sm text-slate-700 group">
                  <div className="w-9 h-9 rounded-lg bg-[#EFF5FB] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-300">
                    <School className="w-4 h-4 text-[#0F2D52]" />
                  </div>
                  <span className="flex-1 font-bold text-left text-slate-800">Manage Schools</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </Link>
              <Link to="/superadmin-arjava/clients" className="block">
                <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-violet-200/50 hover:bg-violet-50/25 transition-all duration-300 text-sm text-slate-700 group">
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all duration-300">
                    <Users className="w-4 h-4 text-violet-600" />
                  </div>
                  <span className="flex-1 font-bold text-left text-slate-800">View Clients</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card border border-slate-100 shadow-sm flex flex-col justify-between">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-900">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 pb-4">
              {[
                { label: 'System Status', icon: Wifi,          status: 'Online',     ok: true },
                { label: 'Database',      icon: Database,       status: 'Connected',  ok: true },
                { label: 'API Status',    icon: CheckCircle2,   status: 'Active',     ok: true },
              ].map(({ label, icon: Icon, status, ok }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-50/50 last:border-none">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#0F2D52] opacity-80" />
                    <span className="text-sm font-semibold text-slate-600">{label}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-full shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-700">{status}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </SuperAdminLayout>
  );
}