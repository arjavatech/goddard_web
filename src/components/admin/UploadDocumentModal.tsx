import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { Document, Page } from 'react-pdf';

interface UploadDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: { file: File; approvedFormName: string; formAcademicYear?: string }) => void;
  isStudent: boolean;
  documentName: string;
  personName: string;
  uploaderEmail?: string;
  isSubmitting: boolean;
}

function getPresetAcademicYears(): string[] {
  const y = new Date().getFullYear();
  return [`${y - 3}-${y - 2}`, `${y - 2}-${y - 1}`, `${y - 1}-${y}`, `${y}-${y + 1}`];
}

const YEAR_RE = /^(\d{4})-(\d{4})$/;
function isValidCustomYear(val: string): boolean {
  const m = val.match(YEAR_RE);
  return !!m && parseInt(m[2]) === parseInt(m[1]) + 1;
}

function buildDefaultDocName(templateName: string, personName: string, academicYear?: string): string {
  const parts = [templateName, personName];
  if (academicYear) parts.push(academicYear);
  return parts.map(p => p.trim().replace(/\s+/g, '-')).filter(Boolean).join('-');
}

export function UploadDocumentModal({
  open,
  onClose,
  onConfirm,
  isStudent,
  documentName,
  personName,
  uploaderEmail,
  isSubmitting,
}: UploadDocumentModalProps) {
  const presets = getPresetAcademicYears();
  const defaultYear = presets[3];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const previewWrapperRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [pdfWidth, setPdfWidth] = useState<number>(384);
  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [isCustom, setIsCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [docName, setDocName] = useState('');

  const effectiveYear = isCustom ? (isValidCustomYear(customInput) ? customInput : '') : academicYear;
  const isPdf = file?.type === 'application/pdf';
  const isImage = file?.type === 'image/jpeg' || file?.type === 'image/png';

  useEffect(() => {
    if (open) {
      setStep(1);
      setFile(null);
      setError(null);
      setCurrentPage(1);
      setNumPages(null);
      setContentHeight(null);
      setIsCustom(false);
      setCustomInput('');
      setAcademicYear(defaultYear);
      setDocName(buildDefaultDocName(documentName, personName, isStudent ? defaultYear : undefined));
    }
  }, [open, documentName, personName, isStudent]);

  useEffect(() => {
    if (step === 2) {
      setDocName(buildDefaultDocName(documentName, personName, isStudent ? (effectiveYear || academicYear) : undefined));
    }
  }, [step]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (previewWrapperRef.current) {
        const w = previewWrapperRef.current.clientWidth;
        const isDesktop = window.innerWidth >= 1024;
        setPdfWidth(isDesktop ? Math.min(w - 32, 600) : Math.min(w - 16, 280));
      }
    };
    const t = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => { clearTimeout(t); window.removeEventListener('resize', handleResize); };
  }, [open]);

  const detectContentBoundary = () => {
    if (!pageContainerRef.current) return;
    const canvas = pageContainerRef.current.querySelector('canvas');
    if (!canvas) return;
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let lastY = 0;
      for (let y = canvas.height - 1; y >= 0; y--) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          if (data[i + 3] > 200 && !(data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240)) { lastY = y; break; }
        }
        if (lastY > 0) break;
      }
      const rect = canvas.getBoundingClientRect();
      setContentHeight(Math.max(lastY * (rect.width / canvas.width) + 16, 100));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const t = setTimeout(detectContentBoundary, 200);
    return () => clearTimeout(t);
  }, [currentPage, file]);

  const handleYearChange = (year: string) => {
    setAcademicYear(year);
    setDocName(prev => {
      const cur = buildDefaultDocName(documentName, personName, academicYear);
      return prev === cur ? buildDefaultDocName(documentName, personName, year) : prev;
    });
  };

  const validateAndSetFile = (f: File) => {
    setError(null);
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(f.type)) {
      setError('Only PDF, JPG, or PNG files are allowed.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10 MB.');
      return;
    }
    setFile(f);
    setNumPages(null);
    setCurrentPage(1);
    setContentHeight(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handleNext = () => {
    if (!file) { setError('Please select a file.'); return; }
    setError(null);
    setStep(2);
  };

  const handleConfirm = () => {
    if (!file) return;
    onConfirm({
      file,
      approvedFormName: docName.trim() || buildDefaultDocName(documentName, personName, isStudent ? effectiveYear : undefined),
      formAcademicYear: isStudent ? (effectiveYear || undefined) : undefined,
    });
  };

  const isStep2Valid = isStudent ? Boolean(effectiveYear) : true;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[calc(100vw-2rem)] sm:w-auto flex flex-col lg:w-[820px] lg:h-auto lg:p-8 lg:gap-6">
        <DialogHeader className="shrink-0 lg:p-0">
          <DialogTitle className="text-lg sm:text-xl lg:font-semibold pr-8 lg:pr-0">
            Upload Document
            <span className="ml-3 text-sm font-normal text-slate-500">Step {step} of 2</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 lg:space-y-4">
              <div className="text-sm text-gray-600 space-y-0.5">
                <p><strong>Student/Employee:</strong> <span className="text-gray-900">{personName}</span></p>
                {uploaderEmail && <p><strong>Uploader:</strong> <span className="text-gray-900">{uploaderEmail}</span></p>}
              </div>

              {!file ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer lg:p-12"
                >
                  <Upload className="mx-auto mb-2 text-gray-400 lg:mb-3" size={32} />
                  <p className="mb-2 font-medium lg:text-base">Drag and drop your file here</p>
                  <p className="text-sm text-gray-500 mb-4 lg:mb-6">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    onChange={e => { const f = e.target.files?.[0]; if (f) validateAndSetFile(f); e.currentTarget.value = ''; }}
                    className="hidden"
                    id="doc-upload-input"
                  />
                  <label htmlFor="doc-upload-input">
                    <Button variant="outline" asChild><span>Choose File</span></Button>
                  </label>
                  <p className="text-xs text-gray-400 mt-4 lg:mt-6">PDF, JPG, or PNG · Max 10 MB</p>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center gap-2 lg:gap-3 p-3 lg:p-4 bg-blue-50 rounded-lg">
                    <FileText size={20} className="text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm break-words">{file.name}</p>
                      <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button onClick={() => { setFile(null); setNumPages(null); setContentHeight(null); }} className="text-sm text-red-600 hover:text-red-800 flex-shrink-0">
                      Remove
                    </button>
                  </div>

                  {isPdf && (
                    <div ref={previewWrapperRef} className="border rounded-lg bg-gray-50 p-2 sm:p-4 w-full overflow-x-auto flex justify-center">
                      <div ref={pageContainerRef} style={{ height: contentHeight ? `${contentHeight}px` : 'auto', overflow: 'hidden', display: 'flex', alignItems: 'flex-start' }}>
                        <Document file={file} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
                          <Page pageNumber={currentPage} width={pdfWidth} onRenderSuccess={detectContentBoundary} />
                        </Document>
                      </div>
                    </div>
                  )}

                  {isImage && (
                    <div className="border rounded-lg bg-gray-50 p-2 flex justify-center">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="max-h-64 rounded object-contain" />
                    </div>
                  )}

                  {isPdf && numPages && numPages > 1 && (
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
                      <span className="whitespace-nowrap">Page {currentPage} of {numPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(numPages!, p + 1))} disabled={currentPage === numPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0">
              <div className="flex gap-3 lg:justify-end w-full">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button onClick={handleNext} disabled={!file} className="bg-[#0F2D52] hover:bg-[#1E4B83] text-white">
                  Next
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
              {isStudent && (
                <div className="space-y-1.5">
                  <label htmlFor="upload-academic-year" className="text-sm font-medium leading-none">
                    Academic Year <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={isCustom ? 'custom' : academicYear}
                    onValueChange={val => {
                      if (val === 'custom') { setIsCustom(true); }
                      else { setIsCustom(false); handleYearChange(val); }
                    }}
                  >
                    <SelectTrigger id="upload-academic-year" className="w-full">
                      <SelectValue placeholder="Select academic year" />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustom && (
                    <div>
                      <Input
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        placeholder="e.g. 2021-2022"
                        className="w-full h-10 rounded-xl mt-1.5"
                      />
                      {customInput && !isValidCustomYear(customInput) && (
                        <p className="text-xs text-red-500 mt-1">Enter as YYYY-YYYY with consecutive years.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="upload-doc-name" className="text-sm font-medium leading-none">Document Name</label>
                <Input
                  id="upload-doc-name"
                  value={docName}
                  onChange={e => setDocName(e.target.value)}
                  placeholder="Enter document name"
                  className="w-full h-10 rounded-xl"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-slate-500">Used as the file name when downloaded.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0">
              <div className="flex gap-3 lg:justify-end w-full">
                <Button variant="outline" onClick={() => { setStep(1); setError(null); }} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!isStep2Valid || isSubmitting}
                  className="bg-[#0F2D52] hover:bg-[#1E4B83] text-white disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-1">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Uploading...
                    </span>
                  ) : 'Upload & Approve'}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
