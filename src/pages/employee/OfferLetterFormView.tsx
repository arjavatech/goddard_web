import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, Home, LayoutList, X, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Header } from '../../components/layout/Header';
import { useUserContext } from '../../contexts/UserContext';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../../hooks/useEmbeddedFormResize';
import { OfferLetterService } from '../../services/api/offerLetter';

export function OfferLetterFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { userData } = useUserContext();

  const { prefillUrl, status, rejectionReason } = (location.state ?? {}) as {
    prefillUrl?: string;
    status?: string;
    rejectionReason?: string;
  };

  const back = `/${schoolSlug}/employee/offer-letter`;

  useEffect(() => {
    if (!prefillUrl) navigate(back, { replace: true });
  }, [prefillUrl, back, navigate]);

  useEffect(() => {
    if (status !== 'offer_sent') return;
    const employeeId = userData?.employeeId;
    const schoolId = userData?.schoolId;
    if (!employeeId || !schoolId) return;
    OfferLetterService.markViewed(employeeId, schoolId).catch(() => {});
  }, []);

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formHeight, setFormHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 120) : 700
  );

  const iframeContainerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useIframeScrollLock();
  const embeddedResize = useEmbeddedFormResize(prefillUrl ?? null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;
        const h =
          (data.type === 'form_resized' ? data.size : undefined) ??
          data.height ?? data.value ?? data.clientHeight ?? data.size ??
          data.payload?.height ?? data.payload?.size ??
          (data.type === 'fillout:height-update' ? data.height : undefined);
        if (h && typeof h === 'number' && h > 100) {
          setFormHeight(Math.min(h + 40, 20000));
        }
      } catch {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const employeeName = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ');

  const statusLabel =
    status === 'offer_sent' || status === 'viewed' ? 'Action Required'
    : status === 'employee_signed' ? 'Awaiting Approval'
    : status === 'offer_accepted' ? 'Submitted'
    : status === 'offer_rejected' ? 'Action Required'
    : status === 'active' ? 'Approved'
    : 'Pending';

  const statusColor =
    status === 'offer_sent' || status === 'viewed' ? 'bg-blue-500/20 text-blue-200'
    : status === 'employee_signed' || status === 'offer_accepted' ? 'bg-amber-400/20 text-amber-200'
    : status === 'offer_rejected' ? 'bg-blue-500/20 text-blue-200'
    : status === 'active' ? 'bg-emerald-400/20 text-emerald-200'
    : 'bg-white/15 text-white/60';

  return (
    <div className="h-screen bg-[#F7F9FC] flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex min-h-0 relative">

        {/* Mobile drawer backdrop */}
        {drawerOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          absolute top-0 left-0 h-full z-50 flex flex-col w-72 shadow-2xl
          transition-transform duration-300
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:h-full lg:overflow-y-auto lg:translate-x-0 lg:shadow-none lg:w-64 lg:shrink-0
          bg-[#0F2D52] border-r border-[#1a3a60]
        `}>
          {/* Sidebar header */}
          <div className="px-4 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/50">Employee</p>
                <p className="text-xs font-bold text-white leading-tight">Offer Letter</p>
              </div>
            </div>
            <button
              className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Single offer letter entry */}
          <nav className="flex-1 overflow-y-auto no-scrollbar py-2">
            <div className="w-full text-left flex items-start gap-3 px-4 py-3 border-l-2 border-white bg-white/10">
              <div className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-white text-[#0F2D52]">
                1
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold leading-snug text-white">Offer Letter</p>
                <span className={`inline-flex items-center mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </nav>

          {/* Sidebar footer */}
          <div className="shrink-0 px-4 py-4 border-t border-white/10">
            <button
              onClick={() => navigate(back)}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold"
            >
              <Home className="w-4 h-4" />
              Back to Offer Letter
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div ref={mainRef} className="flex-1 flex flex-col min-w-0 bg-white relative overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>

          {/* Title bar */}
          <div className="shrink-0 z-30 flex items-center px-4 py-3 bg-white border-b border-slate-100 shadow-sm relative">
            <div className="flex items-center justify-start min-w-[2rem]">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden h-8 px-2.5 gap-1.5 text-xs font-semibold text-[#0F2D52]"
                onClick={() => setDrawerOpen(true)}
              >
                <LayoutList className="h-3.5 w-3.5" />
                Forms
              </Button>
            </div>
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-full text-center">
                Offer Letter
              </h2>
            </div>
            <div className="flex items-center justify-end min-w-[2rem]" />
          </div>

          {/* Info bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 lg:px-6 lg:py-3 shrink-0">
            <div className="flex items-center gap-6">
              {employeeName && (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#0F2D52]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Employee</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{employeeName}</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-slate-100 shrink-0" />
                </>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5 text-[#0F2D52]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Form</p>
                  <p className="text-sm font-bold text-slate-900 truncate">Offer Letter</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection reason banner */}
          {status === 'offer_rejected' && rejectionReason && (
            <div className="mx-4 mt-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 shrink-0">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-0.5">Rejection Reason</p>
                <p className="text-sm text-red-600">{rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Iframe */}
          <div ref={iframeContainerRef} className="w-full bg-[#F7F9FC] relative mt-6">
            {(!prefillUrl || isFrameLoading) && (
              <div
                className="flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm"
                style={{ height: `${formHeight}px` }}
              >
                <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-4 h-10 w-10" />
                <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading offer letter...</p>
              </div>
            )}
            {prefillUrl && (
              <iframe
                ref={embeddedResize.iframeRef}
                src={prefillUrl}
                title="Offer Letter"
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
                allow="camera; microphone; geolocation"
                onLoad={() => { embeddedResize.handleLoad(); setIsFrameLoading(false); }}
              />
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto shrink-0 border-t-2 border-slate-200 bg-white px-4 py-4 flex justify-center items-center gap-3">
            <div aria-hidden="true" />
            <Button
              className="h-12 px-7 bg-[#0F2D52] hover:bg-[#1a3a60] text-white text-sm font-semibold gap-2 transition-colors shadow-sm rounded-xl flex items-center justify-center"
              onClick={() => navigate(back)}
            >
              <Home className="h-4 w-4 flex-shrink-0" />
              <span>Back to Offer Letter</span>
            </Button>
            <div aria-hidden="true" />
          </div>

        </div>
      </main>
    </div>
  );
}
