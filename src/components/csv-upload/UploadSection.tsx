import React, { useCallback, useState, useRef } from 'react';
import { UploadCloud, AlertCircle, Download } from 'lucide-react';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  isProcessing: boolean;
  progress: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function UploadSection({ onFileUpload, isProcessing, progress }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateAndProcessFile = (file: File) => {
    setError(null);

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Invalid file type. Please upload a .csv file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    if (file.size === 0) {
      setError('The uploaded CSV file is empty.');
      return;
    }

    onFileUpload(file);
    // Reset the input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  }, [onFileUpload]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadSample = () => {
    const headers = [
      'Parent First Name', 'Parent Last Name', 'Parent Email', 'Parent Phone Number',
      'Secondary Parent First Name', 'Secondary Parent Last Name', 'Secondary Parent Email', 'Secondary Parent Phone Number',
      'Child First Name', 'Child Last Name', 'Child DOB', 'Child Gender', 'Classroom', 'Primary Parent Address'
    ];
    const sampleRow = [
      'John', 'Doe', 'john.doe@example.com', '555-0100',
      'Jane', 'Doe', 'jane.doe@example.com', '555-0101',
      'Jimmy', 'Doe', '25-12-2019', 'male', 'Preschool 1', '123 Main St'
    ];

    const csvContent = headers.join(',') + '\n' + sampleRow.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_parent_invite.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Upload CSV File</h2>
          <p className="text-sm text-slate-500">Upload a bulk list of parents to invite to the portal.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadSample} disabled={isProcessing} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Sample CSV
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {isProcessing ? (
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50">
          <div className="flex flex-col items-center text-center">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#1a6fc4] rounded-full animate-spin mb-4" />
            <h3 className="text-sm font-bold text-slate-900 mb-2">Processing CSV File...</h3>
            <div className="w-full max-w-md">
              <Progress value={progress} className="h-2 mb-2" />
              <p className="text-xs font-semibold text-slate-500">{Math.round(progress)}% complete</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer
            ${dragActive ? 'border-[#1a6fc4] bg-blue-50/50' : 'border-slate-200 hover:border-[#1a6fc4]/50 hover:bg-slate-50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            id="csv-file-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleChange}
          />
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <UploadCloud className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">Click to upload or drag and drop</p>
          <p className="text-xs text-slate-500">CSV files only (max. 5MB)</p>
        </div>
      )}
    </div>
  );
}
