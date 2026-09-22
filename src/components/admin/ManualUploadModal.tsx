import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import { fetchWithTokenRefresh } from '@/services/auth/apiInterceptor';
import { apiBaseUrl } from '@/config/env';

interface ManualUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId: string;
  schoolId: string;
  studentName: string;
  uploadedBy: string;
  formType: 'student' | 'employee';
  isReplacing?: boolean;
}

export function ManualUploadModal({
  isOpen,
  onClose,
  onSuccess,
  assignmentId,
  schoolId,
  studentName,
  uploadedBy,
  formType,
  isReplacing = false
}: ManualUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(384);
  const [reason, setReason] = useState('');
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    if (selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10 MB');
      return;
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const detectContentBoundary = () => {
    if (!pageContainerRef.current) return;
    
    const canvas = pageContainerRef.current.querySelector('canvas');
    if (!canvas) return;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      let lastContentY = 0;

      for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const alpha = data[idx + 3];
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          if (alpha > 200 && !(r > 240 && g > 240 && b > 240)) {
            lastContentY = y;
            break;
          }
        }
        if (lastContentY > 0) break;
      }

      const rect = canvas.getBoundingClientRect();
      const scale = rect.width / canvas.width;
      const boundaryHeightCss = Math.max(lastContentY * scale + 16, 100);
      setContentHeight(boundaryHeightCss);
    } catch (err) {
      console.error('Error detecting content boundary:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(detectContentBoundary, 200);
    return () => clearTimeout(timer);
  }, [currentPage, file]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      if (previewWrapperRef.current) {
        const containerWidth = previewWrapperRef.current.clientWidth;
        const isDesktop = window.innerWidth >= 1024;
        const maxPdfWidth = isDesktop ? Math.min(containerWidth - 32, 600) : Math.min(containerWidth - 16, 280);
        setPdfWidth(maxPdfWidth);
      }
    };

    const timer = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
    // Reset form when modal closes
    return () => {
      if (!isOpen) {
        setFile(null);
        setReason('');
        setError(null);
        setCurrentPage(1);
      }
    };
  }, [isOpen]);

  // Validate UUID format at render time
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isInvalidAssignmentId = !UUID_REGEX.test(assignmentId);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    if (isReplacing && !reason.trim()) {
      setError('Please provide a reason for replacing the PDF');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const endpoint = formType === 'student'
        ? `/student-form-assignments/${assignmentId}/manual-pdf?school_id=${schoolId}`
        : `/employee-form-assignments/${assignmentId}/manual-pdf?school_id=${schoolId}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaded_by', uploadedBy);
      if (isReplacing && reason.trim()) {
        formData.append('reason', reason);
      }

      const response = await fetchWithTokenRefresh(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[calc(100vw-2rem)] sm:w-auto flex flex-col lg:w-[820px] lg:h-auto lg:p-8 lg:gap-6">
        <DialogHeader className="shrink-0 lg:p-0">
          <DialogTitle className="text-lg sm:text-xl lg:text-xl lg:font-semibold pr-8 lg:pr-0">Upload Completed Form PDF</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 lg:space-y-4">
          <div className="text-sm text-gray-600 lg:text-sm lg:space-y-0">
            <p><strong>Student/Employee:</strong> <span className="lg:text-gray-900">{studentName}</span></p>
            <p><strong>Uploader:</strong> <span className="lg:text-gray-900">{uploadedBy}</span></p>
          </div>

          {isReplacing && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Reason for Replacement <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Please provide a reason for replacing the PDF..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[70px] text-sm"
              />
            </div>
          )}

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer lg:p-12"
            >
              <Upload className="mx-auto mb-2 text-gray-400 lg:mb-3" size={32} />
              <p className="mb-2 font-medium lg:text-base">Drag and drop your PDF here</p>
              <p className="text-sm text-gray-500 mb-4 lg:mb-6">or click to browse</p>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="pdf-input"
              />
              <label htmlFor="pdf-input">
                <Button variant="outline" asChild>
                  <span>Choose PDF</span>
                </Button>
              </label>
              <p className="text-xs text-gray-400 mt-4 lg:mt-6">Max file size: 10 MB</p>
            </div>
          ) : (
            <div className="space-y-4 lg:space-y-4 flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 bg-blue-50 rounded-lg">
                <FileText size={20} className="lg:size-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 sm:flex-none lg:flex-1 min-w-0 sm:min-w-auto">
                  <p className="font-medium text-sm lg:text-sm min-w-0 sm:min-w-auto break-words sm:break-normal lg:break-normal whitespace-normal sm:whitespace-nowrap lg:whitespace-nowrap">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm lg:text-sm text-red-600 hover:text-red-800 flex-shrink-0 lg:font-medium"
                >
                  Remove
                </button>
              </div>

              {/* PDF Preview */}
              <div ref={previewWrapperRef} className="border rounded-lg bg-gray-50 p-2 sm:p-4 w-full lg:flex-1 lg:min-h-0 overflow-x-auto flex justify-center">
                <div
                  ref={pageContainerRef}
                  style={{
                    height: contentHeight ? `${contentHeight}px` : 'auto',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-start',
                  }}
                >
                  <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                    <Page pageNumber={currentPage} width={pdfWidth} onRenderSuccess={detectContentBoundary} />
                  </Document>
                </div>
              </div>

              {numPages && numPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 lg:mt-0 text-sm">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 lg:px-4 lg:py-2 border rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="whitespace-nowrap">
                    Page {currentPage} of {numPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                    disabled={currentPage === numPages}
                    className="px-3 py-1 lg:px-4 lg:py-2 border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 lg:flex-col lg:gap-3">
          {isInvalidAssignmentId && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 w-full">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span className="text-xs">Form assignment ID is missing. Please refresh the page and try again.</span>
            </div>
          )}
          <div className="flex lg:flex-row gap-3 lg:justify-end w-full">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || (isReplacing && !reason.trim()) || isInvalidAssignmentId}
              className="bg-[#0F2D52] hover:bg-[#1E4B83] text-white"
            >
              {isUploading ? 'Uploading...' : 'Confirm & Submit for Review'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
