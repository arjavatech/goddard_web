import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { useUserContext } from '../../contexts/UserContext';
import { EmployeeService, type EmployeeFormAssignment } from '../../services/api/employee';
import { useToast } from '../../contexts/ToastContext';

export function EmployeeFormView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schoolSlug, formId } = useParams<{ schoolSlug: string; formId: string }>();
  const { showToast } = useToast();

  const { assignment } = (location.state ?? {}) as {
    assignment?: EmployeeFormAssignment & { formTitle: string; formDescription: string };
  };

  const back = `/${schoolSlug}/employee/dashboard`;

  const [isFrameLoading, setIsFrameLoading] = useState(true);
  const iframeContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!assignment) {
      navigate(back, { replace: true });
    }
  }, [assignment, navigate, back]);

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

  // In a real app, you'd get the actual fillout URL from the form template.
  // We'll mock it for now since the mock API doesn't pass the fillout URL in EmployeeFormAssignment yet.
  const viewUrl = `https://forms.fillout.com/t/mockform?assignmentId=${assignment.id}`;

  return (
    <div className="h-screen bg-[#F7F9FC] flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col min-h-0 relative mt-16 sm:mt-24">
        
        {/* Top Bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => navigate(back)}
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 transition-colors shrink-0"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {assignment.formTitle}
              </h1>
              <p className="text-xs text-slate-500 font-medium truncate">
                {assignment.formDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Iframe Container */}
        <div ref={iframeContainerRef} className="flex-1 relative w-full h-full bg-[#F7F9FC] overflow-hidden">
          {isFrameLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm z-10">
              <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-4 h-10 w-10" />
              <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading form...</p>
            </div>
          )}
          
          <iframe
            src={viewUrl}
            title={assignment.formTitle}
            className={`w-full h-full border-0 transition-opacity duration-300 ${isFrameLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={() => setIsFrameLoading(false)}
            allow="camera; microphone; geolocation"
          />
        </div>
      </main>
    </div>
  );
}
