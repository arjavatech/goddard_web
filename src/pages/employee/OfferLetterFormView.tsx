import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../../hooks/useEmbeddedFormResize';

export function OfferLetterFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  const { prefillUrl } = (location.state ?? {}) as { prefillUrl?: string };

  const back = `/${schoolSlug}/employee/offer-letter`;

  useEffect(() => {
    if (!prefillUrl) navigate(back, { replace: true });
  }, [prefillUrl, back, navigate]);

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [formHeight, setFormHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(480, window.innerHeight - 120) : 700
  );
  const iframeContainerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-screen bg-[#F7F9FC] flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-col min-h-0">

        {/* Title bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm shrink-0">
          <button
            onClick={() => navigate(back, { replace: true })}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#0F2D52] hover:text-[#1c477c] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <span className="text-sm font-bold text-slate-900">Offer Letter</span>
        </div>

        {/* Iframe container */}
        <div ref={iframeContainerRef} className="w-full bg-[#F7F9FC] overflow-y-auto flex-1">
          {(!prefillUrl || isFrameLoading) && (
            <div
              className="flex flex-col items-center justify-center bg-slate-50/80"
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

      </div>
    </div>
  );
}
