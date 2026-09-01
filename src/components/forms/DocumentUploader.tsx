import React, { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';

export interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  entityName?: string;
}

export function DocumentUploader({ 
  onUpload, 
  accept = 'application/pdf,image/jpeg,image/png', 
  maxSizeMB = 10,
  entityName = 'Document'
}: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file: File) => {
    setError(null);
    const acceptedTypes = accept.split(',').map(type => type.trim());
    if (!acceptedTypes.includes(file.type)) {
      setError(`File type not accepted. Please upload ${accept.split(',').map(a => a.split('/')[1]).join(', ')}`);
      return false;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Max size is ${maxSizeMB}MB`);
      return false;
    }
    
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setError(null);
    
    try {
      await onUpload(selectedFile);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/50">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload Successful!</h3>
        <p className="text-sm text-slate-500 text-center mb-6">Your {entityName.toLowerCase()} has been securely submitted.</p>
        <Button 
          variant="outline" 
          className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
          onClick={() => {
            setIsSuccess(false);
            setSelectedFile(null);
          }}
        >
          Upload Another {entityName}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive ? 'border-[#0F2D52] bg-[#0F2D52]/5' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleChange}
          />
          <div className="w-12 h-12 rounded-full bg-[#0F2D52]/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="w-6 h-6 text-[#0F2D52]" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Click or drag file to this area to upload</h3>
          <p className="text-sm text-slate-500 mb-6">Support for a upload form. Max size: {maxSizeMB}MB</p>
          <Button 
            onClick={onButtonClick}
            className="bg-[#0F2D52] hover:bg-[#1a3a60] text-white"
          >
            Select {entityName}
          </Button>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-6 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <File className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 truncate max-w-[200px] sm:max-w-[300px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedFile(null)}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              disabled={isUploading}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <Button 
            className="w-full bg-[#0F2D52] hover:bg-[#1a3a60] text-white" 
            onClick={handleUploadSubmit}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : `Submit ${entityName}`}
          </Button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}
    </div>
  );
}
