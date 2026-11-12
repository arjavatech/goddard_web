import React, { useRef, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface MultiFileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeMB?: number;
  label?: string;
  disabled?: boolean;
}

export function MultiFileUpload({
  files,
  onChange,
  accept = 'image/jpeg,image/png,application/pdf',
  maxFiles = 10,
  maxSizeMB = 20,
  label = 'BILL / RECEIPT DOCUMENTS (OPTIONAL)',
  disabled = false,
}: MultiFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const filtered = arr.filter(f => f.size <= maxSizeMB * 1024 * 1024);
    const merged = [...files];
    for (const f of filtered) {
      const dup = merged.some(e => e.name === f.name && e.size === f.size);
      if (!dup && merged.length < maxFiles) merged.push(f);
    }
    onChange(merged);
  };

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          relative w-full border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors
          ${dragging ? 'border-[#0F2D52] bg-blue-50/40' : 'border-slate-300 hover:border-slate-400 bg-slate-50/30'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={e => { if (e.target.files) { addFiles(e.target.files); e.target.value = ''; } }}
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <Upload className="w-7 h-7 text-slate-300" />
          <div>
            <p className="text-xs font-semibold text-slate-700">Click to upload receipts</p>
            <p className="text-[10px] text-slate-500 mt-0.5">JPEG, PNG, PDF — images auto-compressed before upload</p>
          </div>
        </div>
      </div>

      {/* File cards */}
      {files.length > 0 && (
        <ul className="space-y-1.5 mt-1">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`}
              className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3 py-2">
              {f.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{f.name}</p>
                <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
