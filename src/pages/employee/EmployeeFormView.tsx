import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, User, CheckCircle2, LayoutList, X, Home } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/layout/Header';
import { useUserContext } from '../../contexts/UserContext';
import type { EmployeeFormAssignment } from '../../services/api/employee';

type EnrichedAssignment = EmployeeFormAssignment & {
  formTitle: string;
  formDescription: string;
  normalizedStatus: string;
};
import { useToast } from '../../contexts/ToastContext';
import { getFilloutUserContext, appendFilloutUserParams } from '../../services/api/fillout';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../../hooks/useEmbeddedFormResize';
import { StatusBadge } from '../../components/dashboard/StatusBadge';


export function EmployeeFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string; formId: string }>();
  const { userData } = useUserContext();
  const { showToast } = useToast();

  const { assignment, assignments, completedCount, totalForms } = (location.state ?? {}) as {
    assignment?: EnrichedAssignment;
    assignments?: EnrichedAssignment[];
    completedCount?: number;
    totalForms?: number;
  };

  const back = `/${schoolSlug}/employee/dashboard`;

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasSidebar = assignments && assignments.length > 0;
  const progressPct = totalForms ? Math.round(((completedCount ?? 0) / totalForms) * 100) : 0;

  const currentIndex = assignments
    ? assignments.findIndex(a => a.id === assignment?.id)
    : -1;
  const prevSibling = currentIndex > 0 ? assignments![currentIndex - 1] : null;
  const nextSibling = assignments && currentIndex >= 0 && currentIndex < assignments.length - 1
    ? assignments[currentIndex + 1]
    : null;

  const handleNavigateToSibling = (sibling: EnrichedAssignment) => {
    setDrawerOpen(false);
    if (sibling.id === assignment?.id) return;
    navigate(`/${schoolSlug}/employee/form/${sibling.id}`, {
      state: {
        assignment: sibling,
        assignments,
        completedCount,
        totalForms,
      },
    });
  };

  useIframeScrollLock();
  const embeddedResize = useEmbeddedFormResize(viewUrl);

  const [formHeight, setFormHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 120) : 700
  );

  // Listen for Fillout height updates on every page change
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;
        const h =
          (data.type === 'form_resized' ? data.size : undefined) ??
          data.height ?? data.value ?? data.clientHeight ?? data.size ??
          data.payload?.height ?? data.payload?.size ??
          data.data?.height ?? data.data?.size;
        if (typeof h === 'number' && h > 0) {
          setFormHeight(prev => {
            const newH = Math.ceil(h);
            if (newH > prev && (newH - prev) < 50) return prev;
            return newH;
          });
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!assignment) {
      navigate(back, { replace: true });
    }
  }, [assignment, navigate, back]);

  // Build the form URL: prefer recentEditLink (resume in-progress form) over filloutFormId (fresh start)
  useEffect(() => {
    const baseUrl = assignment?.recentEditLink || assignment?.filloutFormId;
    if (!baseUrl) return;

    (async () => {
      let url = baseUrl;

      // Append employee_form_assignment_id so the webhook can identify the submission
      if (!url.includes('employee_form_assignment_id')) {
        url += `${url.includes('?') ? '&' : '?'}employee_form_assignment_id=${encodeURIComponent(assignment.id)}`;
      }

      // Provision Fillout user for signature/initials re-use (same as parent flow)
      const email = (userData?.email || '').trim().toLowerCase();
      const externalUserId = email || assignment.userId;
      if (externalUserId) {
        const name = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ') || email || 'Employee';
        const filloutCtx = await getFilloutUserContext({ externalUserId, email: email || `${externalUserId}@goddard.employee`, name });
        url = appendFilloutUserParams(url, filloutCtx);
      }

      setViewUrl(url);
    })();
  }, [assignment, userData]);

  const handleSubmission = useCallback(() => {
    if (isSubmittingRef.current || !assignment) return;
    isSubmittingRef.current = true;
    showToast('success', 'Form submitted successfully');
    navigate(back, { replace: true, state: { formCompleted: true } });
  }, [assignment, back, navigate, showToast]);

  const prevHeightRef = useRef<number | null>(null);

  // Listen for Fillout submission via postMessage
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let isSubmitted = false;
      let parsed: any = null;
      if (typeof event.data === 'string') {
        try { parsed = JSON.parse(event.data); } catch { /* not JSON */ }
      } else if (event.data && typeof event.data === 'object') {
        parsed = event.data;
      }
      if (parsed) {
        const type = parsed.type || parsed.event;
        if (type === 'fillout-form-submitted' || type === 'FORM_SUBMITTED') isSubmitted = true;
        if (!isSubmitted && (parsed.success === true || parsed.success === 'true') && (parsed.submission_id || parsed.submissionId)) isSubmitted = true;
      }
      if (!isSubmitted && typeof event.data === 'string') {
        const lower = event.data.toLowerCase();
        // Stricter check: avoid triggering on "navigate", "next", "prev", or "step" events
        if (
          !lower.includes('navigate') && 
          !lower.includes('step') && 
          !lower.includes('next') && 
          !lower.includes('prev') &&
          (lower.includes('submit') || lower.includes('complete')) && 
          (lower.includes('submission') || lower.includes('success'))
        ) {
          isSubmitted = true;
        }
      }
      if (isSubmitted) handleSubmission();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleSubmission]);

  // Scroll to top when the embedded form navigates to the next/previous page
  useEffect(() => {
    const scrollTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    const handlePageChange = (event: MessageEvent) => {
      let parsed: any = null;
      if (typeof event.data === 'string') {
        try { parsed = JSON.parse(event.data); } catch { /* not JSON */ }
      } else if (event.data && typeof event.data === 'object') {
        parsed = event.data;
      }
      if (!parsed) return;
      const type = (parsed.type || parsed.event || '').toString().toLowerCase();
      if (
        type.includes('page') ||
        type.includes('step') ||
        type.includes('next') ||
        type.includes('prev') ||
        type.includes('navigate') ||
        type.includes('transition')
      ) {
        scrollTop();
        return;
      }
      // Fallback: Fillout resets iframe height on each page — treat a significant
      // height change as a page-navigation signal.
      const h =
        (parsed.type === 'form_resized' ? parsed.size : undefined) ??
        parsed.height ?? parsed.value ?? parsed.clientHeight ?? parsed.size ??
        parsed.payload?.height ?? parsed.data?.height;
      if (typeof h === 'number' && h > 0) {
        const newH = Math.ceil(h);
        if (prevHeightRef.current !== null && Math.abs(newH - prevHeightRef.current) > 100) {
          scrollTop();
        }
        prevHeightRef.current = newH;
      }
    };
    window.addEventListener('message', handlePageChange);
    return () => window.removeEventListener('message', handlePageChange);
  }, []);

  // Interval-based detection via iframe URL (catches Fillout's built-in thank-you page)
  useEffect(() => {
    if (!assignment?.formTitle) return;
    const interval = setInterval(() => {
      try {
        const iframe = document.querySelector(`iframe[title="${assignment.formTitle}"]`) as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          const url = iframe.contentWindow.location.href;
          if (url.includes('thank') || url.includes('success') || url.includes('complete')) {
            clearInterval(interval);
            handleSubmission();
          }
        }
      } catch { /* cross-origin, expected */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [assignment?.formTitle, handleSubmission]);

  if (!assignment) return null;
  if (!assignment.recentEditLink && !assignment.filloutFormId) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500 text-sm">
        Form URL is not configured for this assignment.
      </div>
    );
  }

  const employeeName = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ')
    || [assignment.employeeFirstName, assignment.employeeLastName].filter(Boolean).join(' ')
    || 'Employee';

  const isReadOnly = assignment.normalizedStatus === 'Approved' || assignment.normalizedStatus === 'Submitted';
  const showSubmissionNavigation = isReadOnly || assignment.normalizedStatus === 'In Progress';


  return (
    <div className="h-screen h-dvh bg-[#F7F9FC] flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex min-h-0 relative">
        
        {/* Mobile drawer backdrop */}
        {hasSidebar && drawerOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Sidebar */}
        {hasSidebar && (
          <aside className={`
            absolute top-0 left-0 h-full z-50 flex flex-col w-[calc(100vw-2rem)] max-w-72 shadow-2xl
            transition-transform duration-300
            ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:static lg:h-full lg:overflow-y-auto lg:translate-x-0 lg:shadow-none lg:w-64 lg:shrink-0
            bg-[#0F2D52] border-r border-[#1a3a60]
          `}>
            {/* Header */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Employee</p>
                  <p className="text-xs font-bold text-white leading-tight">Forms Overview</p>
                </div>
              </div>
              <button
                className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                onClick={() => setDrawerOpen(false)}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Enrollment ratio */}
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-2xl font-extrabold text-white">{completedCount ?? 0}</span>
                  <span className="text-sm font-semibold text-white/50"> / {totalForms ?? 0}</span>
                </div>
                {progressPct === 100
                  ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  : <span className="text-xs font-bold text-white/40">{progressPct}%</span>
                }
              </div>
              <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider mb-2">
                {progressPct === 100 ? 'All forms completed!' : 'Forms completed'}
              </p>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* Forms list */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
              {assignments!.map((f, idx) => {
                const isCurrent = assignment?.id === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => handleNavigateToSibling(f)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors border-l-2 ${
                      isCurrent
                        ? 'border-white bg-white/10'
                        : 'border-transparent hover:bg-white/5 cursor-pointer'
                    }`}
                  >
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                      isCurrent ? 'bg-white text-[#0F2D52]' : 'bg-white/15 text-white/60'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] sm:text-[11px] font-semibold leading-snug ${
                        isCurrent ? 'text-white' : 'text-white/70'
                      }`}>
                        {f.formTitle}
                      </p>
                      <StatusBadge
                        status={f.normalizedStatus as any}
                        className="mt-1 text-[9px] px-1.5 py-0.5 gap-0.5 opacity-90"
                      />
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Sidebar footer */}
            <div className="shrink-0 px-4 py-4 border-t border-white/10">
              <button
                onClick={() => navigate(back)}
                className="w-full flex items-center justify-center gap-1.5 h-9 sm:h-11 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] sm:text-xs font-semibold"
              >
                <Home className="w-3 h-3 sm:w-4 sm:h-4" />
                Back to Dashboard
              </button>
            </div>
          </aside>
        )}

        <div ref={mainRef} className="flex-1 flex flex-col min-w-0 bg-white relative overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          
          {/* Title Bar */}
          <div className="shrink-0 z-30 flex items-center px-3 sm:px-4 py-3 bg-white border-b border-slate-100 shadow-sm relative">
            <div className="flex items-center justify-start min-w-[2rem]">
              {hasSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-7 sm:h-8 px-2 sm:px-2.5 gap-1 text-[11px] sm:text-xs font-semibold text-[#0F2D52]"
                  onClick={() => setDrawerOpen(true)}
                >
                  <LayoutList className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Forms
                </Button>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full text-center">
                {assignment.formTitle}
              </h2>
            </div>
            <div className="flex items-center justify-end min-w-[2rem]" />
          </div>

          {/* Info Bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:items-center gap-3 sm:gap-6 shrink-0 z-20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5 text-[#0F2D52]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Employee</p>
                <p className="text-sm font-bold text-slate-900 truncate">{employeeName}</p>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-100 shrink-0" />

            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-[#0F2D52]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Form</p>
                <p className="text-sm font-bold text-slate-900 truncate">{assignment.formTitle}</p>
              </div>
            </div>

            {assignment.dueDate && (
              <>
                <div className="hidden sm:block h-8 w-px bg-slate-100 shrink-0" />
                <div className="min-w-0 min-[420px]:col-span-2 sm:col-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Due</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{assignment.dueDate}</p>
                </div>
              </>
            )}
          </div>

          {/* Iframe Container */}
          <div ref={iframeContainerRef} className="w-full bg-[#F7F9FC] relative">
            {(!viewUrl || isFrameLoading) && (
              <div className="flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm" style={{ height: `${formHeight}px` }}>
                <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-4 h-10 w-10" />
                <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading form...</p>
              </div>
            )}

            {viewUrl && (
              <iframe
                ref={embeddedResize.iframeRef}
                src={viewUrl}
                title={assignment.formTitle}
                style={{
                  width: '100%',
                  height: embeddedResize.isDynamic
                    ? `${embeddedResize.height ?? formHeight}px`
                    : `${formHeight}px`,
                  border: 'none',
                  display: 'block',
                  opacity: isFrameLoading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out',
                }}
                onLoad={() => { embeddedResize.handleLoad(); setIsFrameLoading(false); }}
                allow="camera; microphone; geolocation"
              />
            )}
          </div>

          {/* Footer Navigation */}
          <div className={`mt-auto shrink-0 border-t-2 border-slate-200 bg-white px-3 sm:px-4 py-3 sm:py-4 items-center gap-2 sm:gap-3 ${
            hasSidebar ? 'grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'flex justify-center'
          }`}>
            {hasSidebar ? (
              <Button
                variant="outline"
                className={`justify-self-start w-full sm:w-auto h-10 sm:h-11 px-2.5 sm:px-5 gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold border-slate-300 disabled:opacity-100 ${
                  prevSibling ? 'text-slate-700 hover:text-[#0F2D52] hover:border-[#0F2D52]' : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                }`}
                disabled={!prevSibling}
                onClick={() => prevSibling && handleNavigateToSibling(prevSibling)}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Previous
              </Button>
            ) : <div aria-hidden="true" />}
            
            <Button
              className={`bg-[#0F2D52] hover:bg-[#1a3a60] text-white h-9 sm:h-12 px-2.5 sm:px-7 text-[11px] sm:text-sm font-semibold gap-1 sm:gap-2 transition-colors shadow-sm rounded-lg sm:rounded-xl ${
                hasSidebar ? 'col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 order-first sm:order-none justify-self-center' : ''
              }`}
              onClick={() => navigate(back)}
            >
              <Home className="h-3 w-3 sm:h-4 sm:w-4" />
              Back to Dashboard
            </Button>

            {hasSidebar ? (
              <div className="justify-self-end w-full sm:w-auto">
                <Button
                  variant="outline"
                  className={`w-full sm:w-auto h-10 sm:h-11 px-2.5 sm:px-5 gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold border-slate-300 disabled:opacity-100 ${
                    nextSibling ? 'text-slate-700 hover:text-[#0F2D52] hover:border-[#0F2D52]' : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                  }`}
                  disabled={!nextSibling}
                  onClick={() => nextSibling && handleNavigateToSibling(nextSibling)}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ) : <div aria-hidden="true" />}
          </div>
        </div>
      </main>
    </div>
  );
}
