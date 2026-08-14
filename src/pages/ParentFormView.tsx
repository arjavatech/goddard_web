import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, LayoutList, X, Download, Printer, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Loading } from '../components/ui/loading';
import { Header } from '../components/layout/Header';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { useIframeScrollLock } from '../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../hooks/useEmbeddedFormResize';

type SiblingForm = {
  formId: string;
  title: string;
  status: string;
  recentPdfLink?: string | null;
  recentEditLink?: string | null;
  filloutFormId?: string | null;
  studentFormAssignmentId?: string | null;
  childName?: string | null;
};

export function ParentFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug, formId: currentFormId } = useParams<{ schoolSlug: string; formId: string }>();

  const {
    viewUrl, title, status, childName, returnPath,
    siblingForms, completedCount, totalForms,
  } = (location.state ?? {}) as {
    viewUrl?: string;
    title?: string;
    status?: string;
    childName?: string;
    returnPath?: string;
    siblingForms?: SiblingForm[];
    completedCount?: number;
    totalForms?: number;
  };

  const back = returnPath || `/${schoolSlug}/dashboard`;

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);
  const [formHeight, setFormHeight] = useState(() =>
    typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 120) : 700
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  const isCountingDownRef = useRef(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  useIframeScrollLock();
  const embeddedResize = useEmbeddedFormResize(viewUrl);

  const isReadOnly = status === 'Approved' || status === 'Submitted';
  // The parent dashboard currently presents an in-progress submission as
  // “Pending Approval”. Treat that state as submitted for post-form navigation.
  const showSubmissionNavigation = showThankYou ||
    status === 'Approved' || status === 'Submitted' || status === 'In Progress';
  const progressPct = totalForms ? Math.round(((completedCount ?? 0) / totalForms) * 100) : 0;
  const hasSidebar = siblingForms && siblingForms.length > 0;

  const currentIndex = siblingForms
    ? siblingForms.findIndex(f => f.formId === decodeURIComponent(currentFormId ?? ''))
    : -1;
  const prevSibling = currentIndex > 0 ? siblingForms![currentIndex - 1] : null;
  const nextSibling = siblingForms && currentIndex >= 0 && currentIndex < siblingForms.length - 1
    ? siblingForms[currentIndex + 1]
    : null;

  const handleBack = () => navigate(back);

  const handleNavigateToSibling = (sibling: SiblingForm) => {
    setDrawerOpen(false);
    if (sibling.formId === decodeURIComponent(currentFormId ?? '')) return;

    const isApproved = sibling.status === 'Approved' || sibling.status === 'Submitted';
    let siblingViewUrl: string | null = null;

    if (isApproved && sibling.recentPdfLink) {
      siblingViewUrl = sibling.recentPdfLink;
    } else if (sibling.recentEditLink) {
      siblingViewUrl = sibling.recentEditLink;
    } else if (sibling.filloutFormId) {
      const baseUrl = sibling.filloutFormId.startsWith('http')
        ? sibling.filloutFormId
        : `https://goddard.fillout.com/${sibling.filloutFormId}`;
      const assignmentId = sibling.studentFormAssignmentId == null
        ? null
        : String(sibling.studentFormAssignmentId).trim();
      siblingViewUrl = assignmentId && !baseUrl.includes('student_form_assignment_id')
        ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}student_form_assignment_id=${encodeURIComponent(assignmentId)}`
        : baseUrl;
    }

    if (siblingViewUrl) {
      navigate(`/${schoolSlug}/dashboard/form/${encodeURIComponent(sibling.formId)}`, {
        state: {
          viewUrl: siblingViewUrl,
          title: sibling.title,
          status: sibling.status,
          childName: sibling.childName ?? childName,
          returnPath: back,
          siblingForms,
          completedCount,
          totalForms,
        },
      });
    }
  };

  const showThankYouScreen = () => {
    if (isCountingDownRef.current) return;
    isCountingDownRef.current = true;
    setShowThankYou(true);
  };

  // Redirect if opened without state (e.g. direct URL visit)
  useEffect(() => {
    if (!viewUrl) navigate(back, { replace: true });
  }, []);

  // Form height via postMessage — also scroll to top on page change (height resets on each Fillout page)
  const prevFormHeightRef = useRef<number | null>(null);
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
          const newH = Math.ceil(h);
          if (prevFormHeightRef.current !== null && Math.abs(newH - prevFormHeightRef.current) > 100) {
            mainAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          prevFormHeightRef.current = newH;
          setFormHeight(newH);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Scroll to top when the embedded form navigates to the next/previous page
  useEffect(() => {
    const scrollTop = () => mainAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
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
      ) scrollTop();
    };
    window.addEventListener('message', handlePageChange);
    return () => window.removeEventListener('message', handlePageChange);
  }, []);

  // Form completion detection via postMessage
  useEffect(() => {
    const handleMessageGlobal = (event: MessageEvent) => {
      let isSubmitted = false;
      let parsedData: any = null;
      if (typeof event.data === 'string') {
        try { parsedData = JSON.parse(event.data); } catch { /* not JSON */ }
      } else if (typeof event.data === 'object' && event.data !== null) {
        parsedData = event.data;
      }
      if (parsedData && typeof parsedData === 'object') {
        const findSubmission = (obj: any, depth = 0): boolean => {
          if (depth > 4 || !obj || typeof obj !== 'object') return false;
          if ((obj.success === true || obj.success === 'true') && (obj.submission_id || obj.submissionId)) return true;
          const nested = obj.payload || obj.data;
          if (nested && findSubmission(nested, depth + 1)) return true;
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const val = obj[key];
              if (val && typeof val === 'object' && findSubmission(val, depth + 1)) return true;
            }
          }
          return false;
        };
        if (findSubmission(parsedData)) {
          isSubmitted = true;
        } else {
          const type = parsedData.type || parsedData.event;
          if (typeof type === 'string' && (
            type === 'fillout-form-submitted' || type === 'fillout:form-submitted' ||
            type === 'FORM_SUBMITTED' || type === 'submit' ||
            type.toLowerCase().includes('submit') ||
            type.toLowerCase().includes('success') ||
            type.toLowerCase().includes('complete')
          )) {
            isSubmitted = true;
          }
        }
      }
      if (!isSubmitted) {
        let str = '';
        if (typeof event.data === 'string') { str = event.data; }
        else { try { str = JSON.stringify(event.data); } catch { /* ignore */ } }
        if (str) {
          const lower = str.toLowerCase();
          if (
            (lower.includes('submit') || lower.includes('complete') || lower.includes('success') || lower.includes('thank')) &&
            (lower.includes('submission') || lower.includes('id') || lower.includes('record') || lower.includes('done') || lower.includes('response'))
          ) isSubmitted = true;
        }
      }
      if (isSubmitted) showThankYouScreen();
    };
    window.addEventListener('message', handleMessageGlobal);
    return () => window.removeEventListener('message', handleMessageGlobal);
  }, []);

  // Interval-based thank-you detection via iframe URL
  useEffect(() => {
    if (!title) return;
    const interval = setInterval(() => {
      try {
        const iframe = document.querySelector(`iframe[title="${title}"]`) as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          const url = iframe.contentWindow.location.href;
          if (url.includes('thank') || url.includes('success') || url.includes('complete')) {
            showThankYouScreen();
            clearInterval(interval);
          }
        }
      } catch { /* cross-origin, expected */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [title]);

  const handleDownload = async () => {
    if (!viewUrl) return;
    try {
      const response = await fetch(viewUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title || 'form'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(viewUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (!viewUrl) return;
    window.open(viewUrl, '_blank');
  };

  if (!viewUrl) return null;

  return (
    <div className="h-screen bg-[#F7F9FC] flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex min-h-0 relative">

        {/* ── Mobile drawer backdrop ── */}
        {hasSidebar && drawerOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        {hasSidebar && (
          <aside className={`
            absolute top-0 left-0 h-full z-50 flex flex-col w-72 shadow-2xl
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
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Enrollment</p>
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

            {/* Forms list — clickable */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
              {siblingForms!.map((f, idx) => {
                const isCurrent = decodeURIComponent(currentFormId ?? '') === f.formId;
                return (
                  <button
                    key={f.formId}
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
                      <p className={`text-[11px] font-semibold leading-snug ${
                        isCurrent ? 'text-white' : 'text-white/70'
                      }`}>
                        {f.title}
                      </p>
                      <StatusBadge
                        status={f.status as any}
                        className="mt-1 text-[9px] px-1.5 py-0.5 gap-0.5 opacity-90"
                      />
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Sidebar footer — Back to Dashboard */}
            <div className="shrink-0 px-4 py-4 border-t border-white/10">
              <button
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold"
              >
                <Home className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>

          </aside>
        )}

        {/* ── Main form area ── */}
        <div ref={mainAreaRef} className="flex-1 flex flex-col min-w-0 bg-white relative overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          {/* Title bar — sticky header */}
          <div className="shrink-0 z-30 flex items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm relative">

            {/* Left: mobile Forms drawer toggle */}
            <div className="flex items-center justify-start min-w-[2rem]">
              {hasSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden h-8 px-2.5 gap-1.5 text-xs font-semibold text-[#0F2D52]"
                  onClick={() => setDrawerOpen(true)}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Forms
                </Button>
              )}
            </div>

            {/* Center: Form Name */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full text-center">
                {title}
              </h2>
            </div>

            {/* Right side: Child Name */}
            <div className="flex items-center justify-end min-w-[2rem]">
              {childName && (
                <span className="shrink-0 text-[11px] bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                  {childName}
                </span>
              )}
            </div>
          </div>

          {/* ── Success screen ── */}
          {showThankYou ? (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-white">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">
                Submitted Successfully!
              </h2>
              <p className="text-sm text-slate-500 mb-8 text-center">
                Thank you! Your response has been recorded.
              </p>
            </div>
          ) : isReadOnly ? (
            /* ── Approved / read-only form view ── */
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 bg-white">
              <div className="w-16 h-16 rounded-full bg-[#0F2D52]/10 flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-[#0F2D52]" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1 text-center">{title}</h2>
              <p className="text-sm text-slate-500 mb-8 text-center">
                This form has been approved. You can download or print a copy.
              </p>
              {viewUrl && viewUrl !== '#' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white h-11 px-6 gap-2 text-sm font-semibold transition-colors"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                    Download Form
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#0F2D52] text-[#0F2D52] hover:bg-[#0F2D52] hover:text-white h-11 px-6 gap-2 text-sm font-semibold transition-colors"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                    Print Form
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* ── Editable form (iframe) ── */
            <div className="relative min-h-[480px]">
              {isFrameLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <Loading message="Loading form..." size="sm" />
                </div>
              )}
              {viewUrl && viewUrl !== '#' ? (
                <>
                  <style>{`
                    @media (max-width: 640px) {
                      .ndfHFb-c4YZDc-q77wGc,
                      .ndfHFb-c4YZDc-nJjxad-nK2kYb-i5oIFb { display: none !important; }
                    }
                  `}</style>
                  <div ref={iframeContainerRef} className="w-full min-w-0 overflow-x-hidden">
                    <iframe
                      ref={embeddedResize.iframeRef}
                      src={viewUrl}
                      style={{
                        width: '100%',
                        // Some form-builder pages report their current viewport
                        // through the embed channel while also sending a larger
                        // document-height message. Never shrink to the smaller
                        // value or the dashboard footer will sit over the form.
                        height: embeddedResize.isDynamic
                          ? `${Math.max(embeddedResize.height ?? 0, formHeight)}px`
                          : `${formHeight}px`,
                        border: 'none',
                        display: 'block',
                        opacity: isFrameLoading ? 0 : 1,
                        transition: 'opacity 0.3s ease-in-out, height 0.2s ease-in-out',
                      }}
                      scrolling="auto"
                      title={title}
                      onLoad={() => { embeddedResize.handleLoad(); setIsFrameLoading(false); }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
                  Unable to load form. Please check the form configuration.
                </div>
              )}
            </div>
          )}

          {/* Keep draft forms free of duplicate navigation. After submission,
              offer form-to-form navigation alongside the dashboard exit. */}
          <div className={`mt-8 shrink-0 border-t-2 border-slate-200 bg-white px-4 py-4 items-center gap-3 ${
            showSubmissionNavigation ? 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'flex justify-center'
          }`}>
            {showSubmissionNavigation && (hasSidebar ? (
              <Button
                variant="outline"
                className={`justify-self-start h-11 px-5 gap-2 text-sm font-semibold border-slate-300 disabled:opacity-100 ${
                  prevSibling ? 'text-slate-700 hover:text-[#0F2D52] hover:border-[#0F2D52]' : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                }`}
                disabled={!prevSibling}
                onClick={() => prevSibling && handleNavigateToSibling(prevSibling)}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
            ) : <div aria-hidden="true" />)}
            <Button
                className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white h-12 px-7 text-sm font-semibold gap-2 transition-colors shadow-sm rounded-xl"
                onClick={() => showSubmissionNavigation
                  ? navigate(back, { state: { formCompleted: true } })
                  : handleBack()}
              >
                <Home className="h-4 w-4" />
              Back to Dashboard
            </Button>
            {showSubmissionNavigation && (hasSidebar ? (
              <div className="justify-self-end">
                <Button
                  variant="outline"
                  className={`h-11 px-5 gap-2 text-sm font-semibold border-slate-300 disabled:opacity-100 ${
                    nextSibling ? 'text-slate-700 hover:text-[#0F2D52] hover:border-[#0F2D52]' : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
                  }`}
                  disabled={!nextSibling}
                  onClick={() => nextSibling && handleNavigateToSibling(nextSibling)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : <div aria-hidden="true" />)}
          </div>
        </div>
      </main>
    </div>
  );
}
