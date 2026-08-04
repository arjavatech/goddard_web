import React, { useState, useEffect } from 'react';
import { UploadSection } from './UploadSection';
import { ValidationSummary } from './ValidationSummary';
import { SuccessTable } from './SuccessTable';
import { FailedTable } from './FailedTable';
import { CSVService, CSVProcessingResult } from '../../services/csv/csvService';
import { fetchClassrooms } from '../../services/api/admin';
import { useUserContext } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { CSVStorageService } from '../../services/csv/csvStorageService';

export function CSVUploadPageContent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CSVProcessingResult | null>(null);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  
  const { schoolId } = useUserContext();
  const { showToast } = useToast();

  useEffect(() => {
    // Load classrooms for validation
    const loadClassrooms = async () => {
      const storedSchoolId = schoolId || localStorage.getItem('schoolId');
      if (!storedSchoolId) return;
      try {
        const data = await fetchClassrooms(storedSchoolId);
        setClassrooms(data.map(c => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error('Failed to load classrooms for CSV validation', err);
        showToast('error', 'Failed to load school classrooms for validation.');
      }
    };
    
    loadClassrooms();
  }, [schoolId, showToast]);

  useEffect(() => {
    // Load previously stored CSV processing results
    const loadStoredResult = async () => {
      const storedSchoolId = schoolId || localStorage.getItem('schoolId');
      if (!storedSchoolId) return;
      try {
        const storedResult = await CSVStorageService.getProcessingResult(storedSchoolId);
        if (storedResult) {
          setResult(storedResult);
        }
      } catch (err) {
        console.error('Failed to load stored CSV processing result', err);
      }
    };

    loadStoredResult();
  }, [schoolId]);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    try {
      const processResult = await CSVService.processCSVFile(
        file, 
        classrooms, 
        (processed, total) => {
          setProgress(Math.round((processed / total) * 100));
        },
        result?.successful || []
      );

      // Deduplicate failed records by rowNumber and merge errors
      const rawFailed = [...(result?.failed || []), ...processResult.failed];
      const failedMap = new Map<number, any>();
      rawFailed.forEach(record => {
        if (failedMap.has(record.rowNumber)) {
          const existing = failedMap.get(record.rowNumber);
          existing.validation.errors = {
            ...existing.validation.errors,
            ...record.validation.errors
          };
          existing.data = { ...existing.data, ...record.data };
        } else {
          // deep clone to avoid mutating the original reference
          failedMap.set(record.rowNumber, JSON.parse(JSON.stringify(record)));
        }
      });
      const deduplicatedFailed = Array.from(failedMap.values()).sort((a, b) => a.rowNumber - b.rowNumber);

      const mergedResult: CSVProcessingResult = {
        successful: [...(result?.successful || []), ...processResult.successful],
        failed: deduplicatedFailed,
        skipped: (result?.skipped || 0) + processResult.skipped,
        totalRecords: (result?.totalRecords || 0) + processResult.totalRecords,
        processingTimeMs: (result?.processingTimeMs || 0) + processResult.processingTimeMs,
      };

      setResult(mergedResult);
      
      const currentSchoolId = schoolId || localStorage.getItem('schoolId');
      if (currentSchoolId) {
        await CSVStorageService.saveProcessingResult(currentSchoolId, mergedResult);
      }
      
      if (processResult.failed.length === 0 && processResult.successful.length > 0 && processResult.skipped === 0) {
        showToast('success', 'All new records validated successfully!');
      } else if (processResult.failed.length > 0) {
        showToast('error', `${processResult.failed.length} new records failed validation.`);
      }
      
      if (processResult.skipped > 0) {
        setTimeout(() => {
          showToast('info', `${processResult.skipped} parent(s) skipped because the record already exists.`);
        }, 500);
      }
    } catch (error: any) {
      console.error('CSV processing error:', error);
      showToast('error', error.message || 'An error occurred while processing the CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setResult(null);
    setProgress(0);
    setIsProcessing(false);
    
    const currentSchoolId = schoolId || localStorage.getItem('schoolId');
    if (currentSchoolId) {
      await CSVStorageService.clearProcessingResult(currentSchoolId);
    }
  };

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
        onReset={handleReset} 
      />

      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ValidationSummary 
            totalRecords={result.totalRecords}
            successful={result.successful.length}
            failed={result.failed.length}
            skipped={result.skipped}
            processingTimeMs={result.processingTimeMs}
          />

          <FailedTable records={result.failed} />
          
          {result.successful.length > 0 && (
            <SuccessTable records={result.successful} />
          )}
        </div>
      )}
    </div>
  );
}
