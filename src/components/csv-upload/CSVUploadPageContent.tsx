import { useState } from 'react';
import { UploadSection } from './UploadSection';
import { CSVResultsTable } from './CSVResultsTable';
import { CSVService, CSVProcessingResult } from '../../services/csv/csvService';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../ui/button';

export function CSVUploadPageContent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CSVProcessingResult | null>(null);
  const { showToast } = useToast();

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const processResult = await CSVService.processCSVFile(
        file,
        [],
        (processed, total) => setProgress(Math.round((processed / total) * 100))
      );
      setResult(processResult);
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
  };

  const handleSubmit = () => {
    if (!result || result.failed.length > 0 || result.successful.length === 0) return;
    // TODO: submit result.successful to backend
    showToast('success', `${result.successful.length} record(s) submitted successfully.`);
    setResult(null);
    setProgress(0);
  };

  const allRecords = result
    ? [...result.successful, ...result.failed].sort((a, b) => a.rowNumber - b.rowNumber)
    : [];

  const allValid = result !== null && result.failed.length === 0 && result.successful.length > 0;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 max-w-7xl space-y-6 mt-8">
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
              disabled={!allValid}
              className="bg-[#1a6fc4] text-white hover:bg-[#1a6fc4]/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
