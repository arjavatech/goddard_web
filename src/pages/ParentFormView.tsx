import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, FileText, CheckCircle2, LayoutList, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Loading } from '../components/ui/loading';
import { Header } from '../components/layout/Header';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { useIframeScrollLock } from '../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../hooks/useEmbeddedFormResize';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

type SiblingForm = { formId: string; title: string; status: string };

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
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [formHeight, setFormHeight] = useState(() =>
    typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 120) : 700
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  const thankYouTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCountingDownRef = useRef(false);
  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  useIframeScrollLock();
  const embeddedResize = useEmbeddedFormResize(viewUrl);

  const isReadOnly = status === 'Approved' || status === 'Submitted';
  const progressPct = totalForms ? Math.round(((completedCount ?? 0) / totalForms) * 100) : 0;
  const hasSidebar = siblingForms && siblingForms.length > 0;

  const handleBack = () => navigate(back);

  const startThankYouCountdown = () => {
    if (isCountingDownRef.current) return;
    isCountingDownRef.current = true;
    setShowThankYou(true);
    if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current);
    thankYouTimeoutRef.current = setTimeout(() => {
      navigate(back, { state: { formCompleted: true } });
    }, 2000);
  };

  // Redirect if opened without state (e.g. direct URL visit)
  useEffect(() => {
    if (!viewUrl) navigate(back, { replace: true });
  }, []);

  // Form height via postMessage
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
        if (typeof h === 'number' && h > 0) setFormHeight(Math.ceil(h));
      } catch { /* ignore */ }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
      if (isSubmitted) startThankYouCountdown();
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
            startThankYouCountdown();
            clearInterval(interval);
          }
        }
      } catch { /* cross-origin, expected */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [title]);

  useEffect(() => {
    return () => { if (thankYouTimeoutRef.current) clearTimeout(thankYouTimeoutRef.current); };
  }, []);

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

            {/* Forms list */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
              {siblingForms!.map((f, idx) => {
                const isCurrent = decodeURIComponent(currentFormId ?? '') === f.formId;
                return (
                  <div
                    key={f.formId}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors border-l-2 ${
                      isCurrent
                        ? 'border-white bg-white/10'
                        : 'border-transparent hover:bg-white/5'
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
                  </div>
                );
              })}
            </nav>

          </aside>
        )}

        {/* ── Main form area ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white relative overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          {/* Title bar — sticky header */}
          <div className="shrink-0 z-30 flex items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm relative">
            
            {/* Left side: Back to Dashboard */}
            <div className="flex-1 flex items-center justify-start min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 lg:hidden text-slate-500 hover:text-[#0F2D52] mr-1"
                onClick={handleBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-3 gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors hidden lg:flex border-slate-200"
                onClick={handleBack}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to Dashboard
              </Button>
            </div>

            {/* Center: Form Name */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full text-center">
                {title}
              </h2>
              {isReadOnly && (
                <span className="shrink-0 ml-2 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full hidden sm:inline-flex">
                  Read-only
                </span>
              )}
            </div>

            {/* Right side: Child Name */}
            <div className="flex-1 flex items-center justify-end min-w-0">
              {childName && (
                <span className="shrink-0 text-[11px] bg-slate-100 px-3 py-1.5 rounded-full text-slate-700 font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                  {childName}
                </span>
              )}
            </div>
          </div>

          {/* Form viewer — natural height, page scrolls */}
          <div className="relative min-h-[480px]">
            {isFrameLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <Loading message="Loading form..." size="sm" />
              </div>
            )}
            {viewUrl && viewUrl !== '#' ? (
              isReadOnly ? (
                <div className="flex flex-col min-h-[70vh]">
                  <div className="flex items-center justify-between p-3 bg-white border-b border-slate-100">
                    <Button variant="outline" size="sm"
                      onClick={() => {
                        setPageNumber(p => Math.max(1, p - 1));
                        pdfContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={pageNumber <= 1}
                      className="flex items-center gap-1 text-xs px-3 h-7"
                    >
                      <ChevronLeft className="h-3 w-3" /> Prev
                    </Button>
                    <span className="text-xs font-medium text-slate-600">{pageNumber} / {numPages || '...'}</span>
                    <Button variant="outline" size="sm"
                      onClick={() => {
                        setPageNumber(p => Math.min(numPages || 1, p + 1));
                        pdfContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={pageNumber >= (numPages || 1)}
                      className="flex items-center gap-1 text-xs px-3 h-7"
                    >
                      Next <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                  <div
                    ref={pdfContainerRef}
                    className="flex-1 flex justify-center overflow-auto p-4"
                    style={{ scrollBehavior: 'smooth' }}
                  >
                    <Document
                      file={viewUrl}
                      onLoadSuccess={({ numPages: n }) => { setNumPages(n); setIsFrameLoading(false); }}
                      loading={<Loading message="Loading PDF..." size="sm" />}
                      error={<div className="text-red-500 text-center p-4">Failed to load PDF</div>}
                    >
                      <Page
                        pageNumber={pageNumber}
                        width={typeof window !== 'undefined' ? Math.min(1100, window.innerWidth - 40) : 1100}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                        className="shadow-lg"
                      />
                    </Document>
                  </div>
                </div>
              ) : (
                <>
                  <style>{`
                    @media (max-width: 640px) {
                      .ndfHFb-c4YZDc-q77wGc,
                      .ndfHFb-c4YZDc-nJjxad-nK2kYb-i5oIFb { display: none !important; }
                    }
                  `}</style>
                  <div ref={iframeContainerRef} className="w-full">
                    <iframe
                      ref={embeddedResize.iframeRef}
                      src={viewUrl}
                      style={{
                        width: '100%',
                        height: embeddedResize.isDynamic
                          // Arjava forms report cumulative height of ALL pages, causing massive
                          // blank space. Cap at viewport height so only the current page shows;
                          // scrolling="auto" lets the form builder navigate pages internally.
                          ? `${Math.min(embeddedResize.height ?? 320, typeof window !== 'undefined' ? window.innerHeight - 120 : 700)}px`
                          // Fillout forms: cap to viewport height to avoid blank space on shorter pages.
                          : `${Math.min(formHeight, typeof window !== 'undefined' ? window.innerHeight - 120 : 700)}px`,
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
              )
            ) : (
              <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
                Unable to load form. Please check the form configuration.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
