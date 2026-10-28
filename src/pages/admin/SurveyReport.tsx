import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Download, Users, CheckCircle, Clock, TrendingUp,
  Star, MessageSquare, BarChart2, ClipboardList, EyeOff, ChevronDown
} from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { StatCard } from '../../components/ui/stat-card';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../../components/ui/dialog';
import {
  getSurveyReport, closeSurvey, reopenSurvey,
  AUDIENCE_LABELS, type SurveyStatus, type SurveyAudience,
  type SurveyReport as SurveyReportData, type IndividualResponse,
} from '../../services/api/surveys';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';

const STATUS_BADGE: Record<SurveyStatus, { variant: 'success' | 'warning' | 'secondary' | 'destructive'; label: string }> = {
  published: { variant: 'success', label: 'Published' },
  draft: { variant: 'warning', label: 'Draft' },
  closed: { variant: 'secondary', label: 'Closed' },
  expired: { variant: 'destructive', label: 'Expired' },
};

const AUDIENCE_COLOR: Record<SurveyAudience, string> = {
  parents: 'bg-blue-50 text-blue-700',
  employees: 'bg-purple-50 text-purple-700',
  all_staff: 'bg-indigo-50 text-indigo-700',
  classroom: 'bg-teal-50 text-teal-700',
  everyone: 'bg-violet-50 text-violet-700',
};

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function BarChartQuestion({ choiceResults }: { choiceResults: { option: string; count: number; percentage: number }[] }) {
  return (
    <div className="space-y-2.5">
      {choiceResults.map((r, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 font-medium">{r.option}</span>
            <span className="text-slate-500 text-xs font-semibold">{r.count} ({r.percentage.toFixed(2)}%)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1a6fc4] to-[#0F2D52] transition-all duration-700"
              style={{ width: `${r.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RatingQuestion({ averageRating, ratingDistribution, totalAnswered }: {
  averageRating: number;
  ratingDistribution: { star: number; count: number; percentage: number }[];
  totalAnswered: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn('h-6 w-6', i < Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-100')} />
          ))}
        </div>
        <span className="text-xl font-extrabold text-slate-900">{averageRating.toFixed(1)}</span>
        <span className="text-sm text-slate-400">/ 5 ({totalAnswered} responses)</span>
      </div>
      <div className="space-y-1.5">
        {ratingDistribution.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-10 text-right">{r.star} ★</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${r.percentage}%` }} />
            </div>
            <span className="text-xs text-slate-400 w-8">{r.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextQuestion({ textResponses }: { textResponses: string[] }) {
  return (
    <div className="space-y-2">
      {textResponses.slice(0, 4).map((text, i) => (
        <div key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {String.fromCharCode(65 + i)}
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
        </div>
      ))}
      {textResponses.length > 4 && (
        <p className="text-xs text-slate-400 pl-10">+{textResponses.length - 4} more responses</p>
      )}
    </div>
  );
}

export function SurveyReport() {
  const navigate = useNavigate();
  const { schoolSlug, surveyId } = useParams<{ schoolSlug: string; surveyId: string }>();
  const { userData } = useUserContext();
  const { showToast } = useToast();
  const schoolPrefix = `/${schoolSlug || userData?.schoolId || 'goddard'}`;

  const [report, setReport] = useState<SurveyReportData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<'overview' | 'individual'>('overview');
  const [search, setSearch] = useState('');
  const [viewingResponse, setViewingResponse] = useState<IndividualResponse | null>(null);
  const [questionDetailId, setQuestionDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) return;
    getSurveyReport(surveyId).then(setReport).catch(() => setNotFound(true));
  }, [surveyId]);

  if (notFound || !report) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96 text-slate-400">
          <div className="text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-semibold">{notFound ? 'Survey not found' : 'Loading…'}</p>
            {notFound && (
              <button onClick={() => navigate(`${schoolPrefix}/admin/surveys`)} className="mt-3 text-[#1a6fc4] text-sm hover:underline">
                Back to Surveys
              </button>
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const sb = STATUS_BADGE[report.status as SurveyStatus];
  const isAnonymous = report.is_anonymous;
  const rate = !isAnonymous && report.total_targeted > 0
    ? `${((report.total_responded / report.total_targeted) * 100).toFixed(2)}%`
    : '—';
  const pending = !isAnonymous && report.total_targeted > 0
    ? report.total_targeted - report.total_responded
    : null;

  const filteredResponses = report.individual_responses.filter(r => {
    const q = search.toLowerCase();
    return !q || (r.respondent_name ?? '').toLowerCase().includes(q) || (r.respondent_email ?? '').toLowerCase().includes(q);
  });

  const handleExport = () => {
    showToast('success', 'CSV export would download here (prototype — no real file generated).');
  };

  const handleClose = () => {
    if (!surveyId) return;
    closeSurvey(surveyId).then(updated => {
      setReport(prev => prev ? { ...prev, status: updated.status } : prev);
      showToast('success', 'Survey closed. Responses will no longer be accepted.');
    }).catch(() => {
      showToast('error', 'Failed to close survey.');
    });
  };

  const handleReopen = () => {
    if (!surveyId) return;
    reopenSurvey(surveyId).then(updated => {
      setReport(prev => prev ? { ...prev, status: updated.status } : prev);
      showToast('success', 'Survey reopened. Responses are now being accepted again.');
    }).catch(() => {
      showToast('error', 'Failed to reopen survey.');
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-2 sm:px-4 py-0 pb-12 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-16 sm:mt-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="sm" onClick={() => navigate(`${schoolPrefix}/admin/surveys`)} className="rounded-xl shrink-0">
              <ArrowLeft className="h-4 w-4 mr-1" /> Surveys
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-extrabold text-[#0F2D52] truncate">{report.title}</h1>
                <Badge variant={sb.variant} className="text-xs shrink-0">{sb.label}</Badge>
              </div>
              <div className="flex items-center flex-wrap gap-2 mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${AUDIENCE_COLOR[report.audience as SurveyAudience]}`}>
                  {AUDIENCE_LABELS[report.audience as SurveyAudience]}
                </span>
                <span className="text-xs text-slate-400">Created {formatDate(report.created_at)}</span>
                {report.published_at && <span className="text-xs text-slate-400">· Published {formatDate(report.published_at)}</span>}
                {report.expires_at && <span className="text-xs text-slate-400">· Expires {formatDate(report.expires_at)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {report.status === 'published' && (
              <Button variant="outline" size="sm" className="rounded-xl text-slate-600" onClick={handleClose}>
                Close Survey
              </Button>
            )}
            {report.status === 'closed' && (
              <Button variant="outline" size="sm" className="rounded-xl text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={handleReopen}>
                Reopen Survey
              </Button>
            )}
            <Button size="sm" className="rounded-xl bg-[#0F2D52] hover:bg-[#1a3a6b] text-white gap-1.5 shadow-sm" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Targeted" value={isAnonymous ? '—' : report.total_targeted} icon={Users} iconBgClass="bg-[#EFF5FB]" iconColorClass="text-[#0F2D52]" />
          <StatCard label="Responded" value={report.total_responded} icon={CheckCircle} iconBgClass="bg-emerald-50" iconColorClass="text-emerald-600" />
          <StatCard label="Pending" value={pending !== null ? String(pending) : '—'} icon={Clock} iconBgClass="bg-amber-50" iconColorClass="text-amber-600" />
          <StatCard label="Response Rate" value={rate} icon={TrendingUp} iconBgClass="bg-blue-50" iconColorClass="text-blue-600" />
        </div>

        {/* Anonymous notice */}
        {report.is_anonymous && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-xs font-medium">
            <EyeOff className="h-4 w-4 shrink-0" />
            Individual responses are hidden — this is an anonymous survey.
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-100">
          {(['overview', ...(report.is_anonymous ? [] : ['individual'])] as Array<'overview' | 'individual'>).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px capitalize',
                tab === t ? 'border-[#0F2D52] text-[#0F2D52]' : 'border-transparent text-slate-400 hover:text-slate-700'
              )}
            >
              {t === 'individual' ? 'Individual Responses' : 'Overview'}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {report.question_results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
                <BarChart2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No responses yet</p>
                <p className="text-sm mt-1">Analytics will appear once people start responding.</p>
              </div>
            ) : report.question_results.map((result, i) => (
              <div
                key={result.question_id}
                className={cn(
                  'bg-white rounded-2xl border border-slate-100 shadow-sm p-5 transition-all duration-200',
                  !report.is_anonymous && 'cursor-pointer hover:border-[#0F2D52]/20 hover:shadow-md'
                )}
                onClick={() => !report.is_anonymous && setQuestionDetailId(result.question_id)}
              >
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-xs font-bold text-white bg-[#0F2D52] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{result.question_text}</p>
                </div>
                {(result.question_type === 'single_choice' || result.question_type === 'multiple_choice') && result.choice_results && (
                  <BarChartQuestion choiceResults={result.choice_results} />
                )}
                {result.question_type === 'rating' && result.average_rating != null && result.rating_distribution && (
                  <RatingQuestion averageRating={result.average_rating} ratingDistribution={result.rating_distribution} totalAnswered={result.total_answered} />
                )}
                {result.question_type === 'text' && result.text_responses && (
                  <TextQuestion textResponses={result.text_responses} />
                )}
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-slate-400">{result.total_answered} response{result.total_answered !== 1 ? 's' : ''}</p>
                  {!report.is_anonymous && (
                    <span className="flex items-center gap-1 text-xs text-[#1a6fc4] font-semibold">
                      View responses <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Individual Responses Tab ── */}
        {tab === 'individual' && !report.is_anonymous && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-48 max-w-sm">
                <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search respondents..."
                  className="pl-9 h-9 rounded-xl text-sm border-slate-200"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold">Respondent</th>
                    <th className="p-4 font-bold hidden sm:table-cell">Email</th>
                    <th className="p-4 font-bold">Submitted</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResponses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400 text-sm">No respondents found</td>
                    </tr>
                  ) : filteredResponses.map(r => (
                    <tr key={r.response_id} className="border-t border-slate-50 hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {getInitials(r.respondent_name)}
                          </div>
                          <span className="font-semibold text-slate-900">{r.respondent_name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-xs text-slate-500">{r.respondent_email ?? '—'}</td>
                      <td className="p-4 text-xs text-slate-600">{formatDate(r.submitted_at)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setViewingResponse(r)}
                          className="text-xs text-[#1a6fc4] hover:text-[#0F2D52] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#EFF5FB] transition-all"
                        >
                          View Answers
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-400 bg-slate-50/30">
              {report.total_responded} responded{pending !== null ? ` · ${pending} pending` : ''}
            </div>
          </div>
        )}

        {/* Question Detail Dialog */}
        {(() => {
          const detailResult = report.question_results.find(r => r.question_id === questionDetailId);
          if (!detailResult) return null;

          const rowsForQuestion = report.individual_responses
            .map(r => {
              const ans = r.answers.find(a => a.question_id === questionDetailId);
              if (!ans) return null;
              const displayValue = ans.values?.length ? ans.values.join(', ') : (ans.value ?? null);
              if (!displayValue) return null;
              return { id: r.response_id, name: r.respondent_name, answer: displayValue };
            })
            .filter((r): r is NonNullable<typeof r> => r !== null);

          return (
            <Dialog open={!!questionDetailId} onOpenChange={() => setQuestionDetailId(null)}>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-white bg-[#0F2D52] rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                      {report.question_results.findIndex(r => r.question_id === questionDetailId) + 1}
                    </span>
                    <div>
                      <DialogTitle className="text-sm font-extrabold text-[#0F2D52] leading-snug">{detailResult.question_text}</DialogTitle>
                      <p className="text-xs text-slate-400 mt-0.5">{rowsForQuestion.length} response{rowsForQuestion.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="overflow-y-auto flex-1">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="px-5 py-3 font-bold">Respondent</th>
                        <th className="px-5 py-3 font-bold">Answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsForQuestion.length === 0 ? (
                        <tr><td colSpan={2} className="px-5 py-12 text-center text-slate-400 text-xs">No responses yet.</td></tr>
                      ) : rowsForQuestion.map(row => (
                        <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a6fc4] to-[#0F2D52] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {getInitials(row.name)}
                              </div>
                              <span className="font-semibold text-slate-800 text-sm">{row.name ?? 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-sm text-slate-700 font-medium">{row.answer}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400 bg-slate-50/30 shrink-0">
                  {rowsForQuestion.length} of {detailResult.total_answered} responses
                </div>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* View Answers Dialog */}
        <Dialog open={!!viewingResponse} onOpenChange={() => setViewingResponse(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-extrabold text-[#0F2D52]">
                {viewingResponse?.respondent_name ?? 'Anonymous'}'s Answers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {viewingResponse && viewingResponse.answers.map((ans, i) => {
                const value = ans.values?.length ? ans.values.join(', ') : ans.value;
                return (
                  <div key={ans.question_id} className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Q{i + 1}</p>
                    <p className="text-sm font-semibold text-slate-900">{ans.question_text}</p>
                    <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700">
                      {!value ? <span className="italic text-slate-400">No answer</span> : value}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
