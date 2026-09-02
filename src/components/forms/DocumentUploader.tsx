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
      <div className="flex flex-col items-center justify-center p-4 sm:p-8 border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/50 mx-4 sm:mx-0">
        <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500 mb-3 sm:mb-4" />
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">Upload Successful!</h3>
        <p className="text-xs sm:text-sm text-slate-500 text-center mb-4 sm:mb-6">Your {entityName.toLowerCase()} has been securely submitted.</p>
        <Button 
          variant="outline" 
          onClick={() => {
            setIsSuccess(false);
            setSelectedFile(null);
          }}
          className="text-[#0F2D52] border-[#0F2D52] hover:bg-[#0F2D52] hover:text-white"
        >
          Upload Another
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div 
        className={`relative border-2 border-dashed rounded-xl p-4 sm:p-8 transition-colors duration-200 ease-in-out ${
          dragActive 
            ? 'border-[#0F2D52] bg-[#0F2D52]/5' 
            : 'border-slate-200 hover:border-[#0F2D52]/50 hover:bg-slate-50'
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
        
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-[#0F2D52]/5 flex items-center justify-center mb-3 sm:mb-4">
            <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-[#0F2D52]" />
          </div>
          
          <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
            Drag and drop your file here
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">Support for a upload form. Max size: {maxSizeMB}MB</p>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Or</span>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onButtonClick}
            className="mt-4 sm:mt-6 text-white border-[#0F2D52] bg-[#0F2D52] hover:bg-[#0F2D52] hover:text-white transition-colors"
          >
            Select Form
          </Button>
        </div>
      </div>
      ) : (
        <div className="border border-slate-200 rounded-xl p-3 sm:p-6 bg-white shadow-sm w-full">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <File className="w-5 h-5 text-blue-600" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-full">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedFile(null)}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors flex-shrink-0"
              disabled={isUploading}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <Button 
            className="w-full h-10 sm:h-11 bg-[#0F2D52] hover:bg-[#1a3a60] text-white" 
            onClick={handleUploadSubmit}
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Uploading...
              </span>
            ) : (
              `Upload ${entityName}`
            )}
          </Button>
          
          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
