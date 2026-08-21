import { useState } from 'react';
import { UploadSection } from './UploadSection';
import { CSVResultsTable } from './CSVResultsTable';
import { CSVService, CSVProcessingResult } from '../../services/csv/csvService';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/button';
import { useUserContext } from '../../contexts/UserContext';
import { getAuthToken } from '../../services/auth/session';
import { apiBaseUrl } from '../../config/env';

type BulkImportResult = {
  created_families: number;
  created_children: number;
  row_errors: { row: number; errors: string[] }[];
};

export function CSVUploadPageContent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CSVProcessingResult | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendResult, setBackendResult] = useState<BulkImportResult | null>(null);
  const { showToast } = useToast();
  const { userData } = useUserContext();

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setBackendResult(null);
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const processResult = await CSVService.processCSVFile(
        uploadedFile,
        [],
        (processed, total) => setProgress(Math.round((processed / total) * 100))
      );
      setResult(processResult);
      if (processResult.failed.length > 0) setBackendResult(null);
    } catch (error: any) {
      console.error('CSV processing error:', error);
      showToast('error', error.message || 'An error occurred while processing the CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setResult(null);
    setProgress(0);
    setFile(null);
    setBackendResult(null);
  };

  const handleSubmit = async () => {
    if (!file || !result || result.failed.length > 0 || result.successful.length === 0) return;
    const schoolId = userData?.schoolId;
    if (!schoolId) {
      showToast('error', 'No school associated with your account. Please contact support.');
      return;
    }
    setIsSubmitting(true);
    setBackendResult(null);
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append('school_id', schoolId);
      formData.append('file', file);
      // Use raw fetch — fetchWithTokenRefresh is built for JSON and can corrupt multipart boundaries
      const res = await fetch(`${apiBaseUrl}/enrollments/bulk-import`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          // Do NOT set Content-Type — let the browser set multipart/form-data with the correct boundary
        },
        body: formData,
      });
      const data = await res.json();
      // 422 = validation errors with row_errors body — display them
      // Other non-2xx = unexpected error
      if (!res.ok && res.status !== 422) {
        throw new Error(data?.error || data?.message || `Upload failed: ${res.status}`);
      }
      setBackendResult(data);
      if (data.row_errors?.length > 0) {
        showToast('error', `Import stopped: ${data.row_errors.length} row error(s) — nothing was saved.`);
      } else {
        showToast('success', `Import complete: ${data.created_families} families and ${data.created_children} children created.`);
        setResult(null);
        setFile(null);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allRecords = result
    ? [...result.successful, ...result.failed].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  const allValid = result !== null && result.failed.length === 0 && result.successful.length > 0;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6  space-y-6 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">CSV Upload</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">Bulk invite parents using a CSV file</p>
        </div>
      </div>

      <UploadSection
        onFileUpload={handleFileUpload}
        isProcessing={isProcessing}
        progress={progress}
      />

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
          <CSVResultsTable records={allRecords} skipped={result.skipped} />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClear}>
              Clear
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!allValid || isSubmitting}
              className="bg-[#1a6fc4] text-white hover:bg-[#1a6fc4]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Uploading…
                </span>
              ) : 'Submit'}
            </Button>
          </div>

          {backendResult && (
            <div className={`rounded-2xl border p-5 space-y-3 ${
              backendResult.row_errors.length > 0
                ? 'bg-red-50 border-red-100'
                : 'bg-emerald-50 border-emerald-100'
            }`}>
              {backendResult.row_errors.length === 0 ? (
                <>
                  <p className="font-bold text-emerald-800">Import Complete</p>
                  <p className="text-sm text-emerald-700">
                    {backendResult.created_families} {backendResult.created_families === 1 ? 'family' : 'families'} created,{' '}
                    {backendResult.created_children} {backendResult.created_children === 1 ? 'child' : 'children'} enrolled.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-red-800">Import Failed — No records were saved</p>
                  <ul className="space-y-1">
                    {backendResult.row_errors.map((e) => (
                      <li key={e.row} className="text-sm text-red-700">
                        <span className="font-semibold">Row {e.row}:</span> {e.errors.join('; ')}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
