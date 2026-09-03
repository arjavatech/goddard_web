import { useState, useEffect } from 'react';
import { getMockPdfFromIdb } from '../../services/api/formUpload';
import { useToast } from '../../contexts/ToastContext';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigate, useParams } from 'react-router-dom';

export function PdfRenderer({ assignmentId }: { assignmentId: string }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug?: string }>();

  useEffect(() => {
    let isActive = true;

    async function loadPdf() {
      setIsLoading(true);
      setError(false);
      try {
        const file = await getMockPdfFromIdb(assignmentId);
        if (isActive) {
          if (file) {
            const url = URL.createObjectURL(file);
            setPdfUrl(url);
          } else {
            setError(true);
            showToast('error', 'Uploaded file not found. It may have expired or you are in a different session.');
          }
        }
      } catch (err) {
        if (isActive) {
          setError(true);
          showToast('error', 'Failed to load preview');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (assignmentId) {
      loadPdf();
    }

    return () => {
      isActive = false;
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [assignmentId]);

  const handleBack = () => {
    // If we're an employee form, we want to go back to employee dashboard. Parent goes to parent dashboard.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(`/${schoolSlug || 'demo'}/dashboard`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm min-h-[480px]">
        <div className="animate-spin rounded-full border-b-2 border-[#0F2D52] mx-auto mb-4 h-10 w-10" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading uploaded document...</p>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 min-h-[480px] px-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2 text-center">Document Not Found</h2>
        <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
          The uploaded file could not be found locally. It may have expired or was uploaded in a different session.
        </p>
        <Button onClick={handleBack} className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[480px] flex flex-col">
      <iframe 
        src={`${pdfUrl}#toolbar=0`} 
        className="w-full h-full flex-1 border-0" 
        title="Uploaded Document Preview"
      />
    </div>
  );
}
