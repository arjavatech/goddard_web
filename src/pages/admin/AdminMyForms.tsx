import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FileText, Eye, CheckCircle, Clock, RefreshCw, Download, Printer } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { StatusBadge } from '../../components/dashboard/StatusBadge';
import { fetchMyFormAssignments, type EmployeeFormAssignment } from '../../services/api/employee';
import { normalizeFormStatus, type NormalizedFormStatus } from '../../lib/formStatus';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';

type EnrichedAssignment = EmployeeFormAssignment & {
  formTitle: string;
  normalizedStatus: NormalizedFormStatus;
};

export function AdminMyForms() {
  const { userData, schoolSubdomain } = useUserContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<{ formId: string; action: 'download' | 'print' } | null>(null);

  useEffect(() => {
    if ((location.state as { formCompleted?: boolean } | null)?.formCompleted) {
      showToast('success', 'Form submitted successfully');
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  useEffect(() => {
    if (!userData?.schoolId) return;
    setLoading(true);
    fetchMyFormAssignments(userData.schoolId)
      .then(raw => {
        setAssignments(raw.map(a => ({
          ...a,
          formTitle: a.formName || 'Form',
          normalizedStatus: normalizeFormStatus(a.status),
        })));
      })
      .catch(() => showToast('error', 'Unable to load forms'))
      .finally(() => setLoading(false));
  }, [userData?.schoolId, location.key]);

  const total = assignments.length;
  const completed = assignments.filter(a => ['Approved', 'Submitted'].includes(a.normalizedStatus)).length;

  const handleDownloadForm = async (a: EnrichedAssignment) => {
    if (!a.recentPdfLink) return;
    setLoadingAction({ formId: a.id!, action: 'download' });
    try {
      const res = await fetch(a.recentPdfLink);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = document.createElement('a');
      el.href = url; el.download = `${a.approvedFormName || a.formTitle}.pdf`;
      document.body.appendChild(el); el.click(); el.remove();
      URL.revokeObjectURL(url);
    } catch { showToast('error', 'Download failed'); }
    finally { setLoadingAction(null); }
  };

  const handlePrintForm = async (a: EnrichedAssignment) => {
    if (!a.recentPdfLink) return;
    setLoadingAction({ formId: a.id!, action: 'print' });
    try {
      const res = await fetch(a.recentPdfLink);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (w) {
        w.onload = () => { setTimeout(() => { w.print(); w.onafterprint = () => { w.close(); URL.revokeObjectURL(url); }; }, 1000); };
        setTimeout(() => { setLoadingAction(null); URL.revokeObjectURL(url); }, 3000);
        showToast('success', 'Print dialog opening...');
      } else { throw new Error('Popup blocked'); }
    } catch (err: any) {
      showToast('error', err?.message === 'Popup blocked' ? 'Allow popups to print' : 'Print failed');
      setLoadingAction(null);
    }
  };

  const open = (a: EnrichedAssignment) => {
    navigate(`/${schoolSubdomain}/admin/my-form/${a.id}`, {
      state: { assignment: a, assignments, completedCount: completed, totalForms: total },
    });
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">My Forms</h1>
            <p className="mt-1 text-sm text-slate-500">View and fill forms assigned to you.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => { setLoading(true); if (userData?.schoolId) fetchMyFormAssignments(userData.schoolId).then(raw => { setAssignments(raw.map(a => ({ ...a, formTitle: a.formName || 'Form', normalizedStatus: normalizeFormStatus(a.status) }))); }).finally(() => setLoading(false)); }}
            disabled={loading}
            className="rounded-xl text-xs font-bold"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon={<FileText className="h-5 w-5 text-blue-500" />} label="Total" value={total} />
          <SummaryCard icon={<Clock className="h-5 w-5 text-amber-500" />} label="Pending" value={total - completed} />
          <SummaryCard icon={<CheckCircle className="h-5 w-5 text-emerald-500" />} label="Completed" value={completed} />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Loading forms…</div>
        ) : !assignments.length ? (
          <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center text-sm text-slate-500">
            No forms have been assigned to you yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {assignments.map(a => (
              <div key={a.id}
                className="rounded-2xl border border-slate-100 bg-white flex flex-col hover:border-slate-200 hover:-translate-y-[2px] hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => { if (a.normalizedStatus !== 'Approved') open(a); }}>
                {/* Body */}
                <div className="p-4 flex items-start gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2D52] to-[#1E4B83] flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{a.formTitle}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                      <StatusBadge status={a.normalizedStatus} />
                      {a.normalizedStatus === 'Approved' && a.approvedOn && (() => {
                        try {
                          const d = new Date(a.approvedOn);
                          if (!isNaN(d.getTime())) return (
                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              Approved {d.toLocaleDateString()}
                            </span>
                          );
                        } catch {}
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                {/* Divider */}
                <div className="mx-4 border-t border-slate-50" />
                {/* Footer */}
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    Assigned: {a.assignedOn ? new Date(a.assignedOn).toLocaleDateString() : '—'}
                  </p>
                  <div className="flex gap-1 flex-shrink-0">
                    {a.normalizedStatus === 'Approved' ? (
                      a.recentPdfLink && (
                        <>
                          <Button variant="outline" size="icon"
                            className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                            onClick={(e) => { e.stopPropagation(); handleDownloadForm(a); }}
                            disabled={!!loadingAction} title="Download PDF">
                            {loadingAction?.formId === a.id && loadingAction.action === 'download'
                              ? <span className="animate-spin h-3.5 w-3.5 border-2 border-[#0F2D52] border-t-transparent rounded-full" />
                              : <Download className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="outline" size="icon"
                            className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                            onClick={(e) => { e.stopPropagation(); handlePrintForm(a); }}
                            disabled={!!loadingAction} title="Print PDF">
                            {loadingAction?.formId === a.id && loadingAction.action === 'print'
                              ? <span className="animate-spin h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full" />
                              : <Printer className="h-3.5 w-3.5" />}
                          </Button>
                        </>
                      )
                    ) : (
                      <Button variant="outline" size="icon"
                        className="h-7 w-7 rounded-lg text-[#0F2D52] border-[#0F2D52]/30 hover:bg-[#0F2D52] hover:border-[#0F2D52] hover:text-white transition-all duration-200"
                        onClick={(e) => { e.stopPropagation(); open(a); }} title="Fill Form">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="rounded-2xl border-slate-100 shadow-xs">
      <CardContent className="flex items-center gap-3 p-4">
        {icon}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-xl font-extrabold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
