import { Mail, Phone, MapPin, Shield, Building2, CheckCircle2, Calendar, ChevronLeft, Briefcase, Users, Bell } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUserContext } from '../contexts/UserContext';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { AdminLayout } from './admin/AdminLayout';
import { EmployeeLayout } from './employee/EmployeeLayout';
import { ParentLayout } from './parent/ParentLayout';
import { EmployeeService, type Employee } from '../services/api/employee';
import { fetchSingleParent } from '../services/api/admin';
import { useAuth } from '../services/auth/useAuth';
import { useNotificationsContext } from '../contexts/NotificationsContext';

function ProfileContent() {
  const { userData, schoolName, schoolPhone, schoolEmail, schoolAddress } = useUserContext();

  const role = userData?.role?.toLowerCase() ?? '';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isEmployee = role === 'employee';

  const displayName = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || userData?.email || '—';
  const initials = userData?.firstName && userData?.lastName
    ? `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase()
    : (userData?.email?.[0]?.toUpperCase() ?? 'U');

  const roleLabel = role === 'superadmin' ? 'Super Admin' : isAdmin ? 'Admin' : isEmployee ? 'Employee' : 'Parent';
  const roleBadgeVariant: any = isAdmin ? 'default' : isEmployee ? 'info' : 'success';

  const joinedDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [secondaryParent, setSecondaryParent] = useState<{ firstName?: string; lastName?: string; email?: string; parentType?: string } | null>(null);
  const [parentExtraInfo, setParentExtraInfo] = useState<{ phone?: string | null; address?: string | null; relationType?: string | null } | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const { user } = useAuth();
  const { pushPermission, pushRegistration, pushError, enablePush } = useNotificationsContext();
  const [enablingPush, setEnablingPush] = useState(false);

  const enableBrowserPush = async () => {
    setEnablingPush(true);
    try { await enablePush(); } finally { setEnablingPush(false); }
  };

  useEffect(() => {
    if (isEmployee && userData?.schoolId) {
      EmployeeService.fetchCurrentEmployee(userData.schoolId)
        .then(setEmployeeDetails)
        .catch(() => {})
        .finally(() => setLoadingExtra(false));
    } else if (!isEmployee && !isAdmin && userData?.schoolId) {
      const parentId = userData.parentId || user?.id;
      if (parentId) {
        fetchSingleParent(parentId, userData.schoolId)
          .then(data => {
            setSecondaryParent(data?.otherParent ?? null);
            setParentExtraInfo({
              phone: data?.phoneNumber ?? null,
              address: data?.address ?? null,
              relationType: data?.relationType ?? null,
            });
          })
          .catch(() => {})
          .finally(() => setLoadingExtra(false));
      } else {
        setLoadingExtra(false);
      }
    } else {
      setLoadingExtra(false);
    }
  }, [isEmployee, isAdmin, userData?.schoolId, userData?.parentId, user?.id]);

  const dashboardPath = isAdmin
    ? `/${schoolSlug}/admin`
    : isEmployee
    ? `/${schoolSlug}/employee/dashboard`
    : `/${schoolSlug}/dashboard`;

  if (loadingExtra) {
    return (
      <div className="max-w-4xl mx-auto px-2 mt-14 py-6 space-y-5">
        <div className="rounded-2xl overflow-hidden shadow-md bg-white">
          <div className="h-28 bg-gradient-to-br from-[#0F2D52] via-[#1a4a8a] to-[#1a6fc4] animate-pulse" />
          <div className="px-6 pb-6 pt-0">
            <div className="flex items-end justify-between -mt-10 mb-5">
              <div className="w-20 h-20 rounded-2xl bg-slate-200 animate-pulse ring-4 ring-white" />
              <div className="h-6 w-20 rounded-full bg-slate-200 animate-pulse" />
            </div>
            <div className="space-y-2 mb-5">
              <div className="h-5 w-40 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-4 w-56 rounded-lg bg-slate-100 animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          </div>
        </div>
        {[1,2].map(i => (
          <div key={i} className="rounded-2xl bg-white shadow-sm border border-slate-100 px-6 py-5 space-y-3">
            <div className="h-4 w-36 rounded bg-slate-200 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-14 rounded-xl bg-slate-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 py-6 px-2 mt-14 animate-fade-in">

      {/* Hero Card */}
      <Card className="rounded-2xl overflow-hidden shadow-md border-0">
        {/* Banner */}
        <div className="relative h-28 bg-gradient-to-br from-[#0F2D52] via-[#1a4a8a] to-[#1a6fc4] overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 left-1/3 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute bottom-2 left-8 w-10 h-10 rounded-full bg-[#FF9900]/20" />
          {!isAdmin && !isEmployee && (
            <button
              onClick={() => navigate(dashboardPath)}
              className="absolute top-3 left-4 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-semibold px-3 py-2 rounded-full border border-white/20 transition-all duration-200"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Back to Dashboard
            </button>
          )}
        </div>

        <CardContent className="px-6 pb-6 pt-0">
          {/* Avatar row */}
          <div className="flex items-end justify-between -mt-10 mb-5">

            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white ring-4 ring-white shadow-lg flex items-center justify-center">
                <span className="text-2xl font-black text-[#0F2D52] tracking-tight">{initials}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <Badge variant={roleBadgeVariant} className="text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
              {roleLabel}
            </Badge>
          </div>

          {/* Name + meta */}
          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{displayName}</h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {userData?.email || '—'}
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <StatCell icon={<Shield className="w-4 h-4 text-[#1a6fc4]" />} label="Role" value={roleLabel} />
            <StatCell icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Status" value="Active" />
            <StatCell icon={<Calendar className="w-4 h-4 text-amber-500" />} label="Member Since" value={joinedDate} />
          </div>
        </CardContent>
      </Card>

      {/* Personal Info Card — employee */}
      {isEmployee && employeeDetails && (employeeDetails.phone || employeeDetails.address || employeeDetails.employeeType) && (
        <Card className="rounded-2xl shadow-sm border border-slate-100">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#0F2D52]/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-[#0F2D52]" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {employeeDetails.employeeType && <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Role" value={employeeDetails.employeeType} />}
              {employeeDetails.phone && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={employeeDetails.phone} />}
              {employeeDetails.address && <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={employeeDetails.address} className="sm:col-span-2" />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Info Card — parent */}
      {!isEmployee && !isAdmin && (userData?.phone || userData?.address || parentExtraInfo?.phone || parentExtraInfo?.address || parentExtraInfo?.relationType) && (
        <Card className="rounded-2xl shadow-sm border border-slate-100">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#0F2D52]/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-[#0F2D52]" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Personal Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parentExtraInfo?.relationType && (
                <InfoRow icon={<Users className="w-4 h-4" />} label="Relation" value={parentExtraInfo.relationType.charAt(0) + parentExtraInfo.relationType.slice(1).toLowerCase()} />
              )}
              {(parentExtraInfo?.phone || userData?.phone) && (
                <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={parentExtraInfo?.phone || userData?.phone || ''} />
              )}
              {(parentExtraInfo?.address || userData?.address) && (
                <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={parentExtraInfo?.address || userData?.address || ''} className="sm:col-span-2" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Parent Card */}
      {!isEmployee && !isAdmin && secondaryParent && (secondaryParent.firstName || secondaryParent.email) && (
        <Card className="rounded-2xl shadow-sm border border-slate-100">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Secondary Parent / Guardian</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(secondaryParent.firstName || secondaryParent.lastName) && (
                <InfoRow
                  icon={<Shield className="w-4 h-4" />}
                  label="Name"
                  value={[secondaryParent.firstName, secondaryParent.lastName].filter(Boolean).join(' ')}
                />
              )}
              {secondaryParent.email && (
                <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={secondaryParent.email} />
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="rounded-2xl shadow-sm border border-slate-100">
        <CardContent className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F2D52]/10 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-[#0F2D52]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-700">Browser notifications</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {pushPermission === 'granted'
                  ? pushRegistration === 'registered' ? 'Enabled and registered for this browser and device.' : 'Permission is enabled; registering this browser…'
                  : pushPermission === 'denied' ? 'Blocked by your browser settings.' : 'Enable alerts for new forms, documents, and review updates.'}
                {pushError && <span className="block mt-1 text-red-600">{pushError}</span>}
              </p>
            </div>
          </div>
          {pushPermission !== 'granted' && pushPermission !== 'denied' && (
            <button type="button" onClick={enableBrowserPush} disabled={enablingPush} className="rounded-xl bg-[#0F2D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {enablingPush ? 'Enabling…' : 'Enable notifications'}
            </button>
          )}
        </CardContent>
      </Card>
      {schoolName && (
        <Card className="rounded-2xl shadow-sm border border-slate-100">
          <CardContent className="px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#0F2D52]/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#0F2D52]" />
              </div>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">School Information</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={<Building2 className="w-4 h-4" />} label="School Name" value={schoolName} />
              {schoolPhone && <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={schoolPhone} />}
              {schoolEmail && <InfoRow icon={<Mail className="w-4 h-4" />} label="School Email" value={schoolEmail} />}
              {schoolAddress && <InfoRow icon={<MapPin className="w-4 h-4" />} label="Address" value={schoolAddress} className="sm:col-span-2" />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-3 px-2">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{value}</span>
    </div>
  );
}

function InfoRow({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: string; className?: string }) {
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/60 transition-colors ${className}`}>
      <span className="text-[#1a6fc4] mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-all leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { userData } = useUserContext();
  const role = userData?.role?.toLowerCase() ?? '';
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isEmployee = role === 'employee';

  if (isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto w-full">
          <ProfileContent />
        </div>
      </AdminLayout>
    );
  }

  if (isEmployee) {
    return (
      <EmployeeLayout>
        <div className="max-w-4xl mx-auto w-full">
          <ProfileContent />
        </div>
      </EmployeeLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="w-full">
        <ProfileContent />
      </div>
    </ParentLayout>
  );
}
