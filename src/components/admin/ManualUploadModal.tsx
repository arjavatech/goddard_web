import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
}

export function ManualUploadModal({
  isOpen,
  onClose,
  onSuccess,
  assignmentId,
  schoolId,
  studentName,
  uploadedBy,
  formType
}: ManualUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

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

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Completed Form PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            <p><strong>Student/Employee:</strong> {studentName}</p>
            <p><strong>Uploader:</strong> {uploadedBy}</p>
          </div>

          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            >
              <Upload className="mx-auto mb-2 text-gray-400" size={32} />
              <p className="mb-2 font-medium">Drag and drop your PDF here</p>
              <p className="text-sm text-gray-500 mb-4">or click to browse</p>
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
              <p className="text-xs text-gray-400 mt-4">Max file size: 10 MB</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <FileText size={20} className="text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>

              {/* PDF Preview */}
              <div className="border rounded-lg bg-gray-50 p-4 max-h-96 overflow-auto flex flex-col items-center">
                <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                  <Page pageNumber={currentPage} width={400} />
                </Document>
                {numPages && numPages > 1 && (
                  <div className="flex items-center justify-between mt-4 text-sm">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span>
                      Page {currentPage} of {numPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
                      disabled={currentPage === numPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="bg-[#0F2D52] hover:bg-[#1E4B83] text-white"
          >
            {isUploading ? 'Uploading...' : 'Confirm & Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
