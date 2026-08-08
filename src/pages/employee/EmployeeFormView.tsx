import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { FileText, User } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useUserContext } from '../../contexts/UserContext';
import { EmployeeService, type EmployeeFormAssignment } from '../../services/api/employee';
import { useToast } from '../../contexts/ToastContext';
import { getFilloutUserContext, appendFilloutUserParams } from '../../services/api/fillout';
import { useIframeScrollLock } from '../../hooks/useIframeScrollLock';
import { useEmbeddedFormResize } from '../../hooks/useEmbeddedFormResize';

export function EmployeeFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string; formId: string }>();
  const { userData } = useUserContext();
  const { showToast } = useToast();

  const { assignment } = (location.state ?? {}) as {
    assignment?: EmployeeFormAssignment & { formTitle: string; formDescription: string };
  };

  const back = `/${schoolSlug}/employee/dashboard`;

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const [viewUrl, setViewUrl] = useState<string | null>(null);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

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

  // Listen for Fillout submission via postMessage
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      let isSubmitted = false;
      if (typeof event.data === 'string') {
        const lower = event.data.toLowerCase();
        if ((lower.includes('submit') || lower.includes('complete')) &&
            (lower.includes('submission') || lower.includes('success'))) {
          isSubmitted = true;
        }
      } else if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'fillout-form-submitted' || event.data.type === 'FORM_SUBMITTED') {
          isSubmitted = true;
        }
      }

      if (isSubmitted && assignment) {
        try {
          await EmployeeService.submitEmployeeForm(assignment.id, { submittedViaIframe: true });
          showToast('success', 'Form submitted successfully');
          navigate(back, { replace: true });
        } catch (error) {
          showToast('error', 'Failed to submit form status');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [assignment, navigate, back, showToast]);

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

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 relative">

        {/* Info Bar */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-6 shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#EFF5FB] flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-[#0F2D52]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none mb-0.5">Employee</p>
              <p className="text-sm font-bold text-slate-900 truncate">{employeeName}</p>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-100 shrink-0" />

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
              <div className="h-8 w-px bg-slate-100 shrink-0" />
              <div className="min-w-0">
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
      </main>
    </div>
  );
}
