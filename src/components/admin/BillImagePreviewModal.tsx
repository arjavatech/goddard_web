import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';

// ── ReceiptThumbnail ──────────────────────────────────────────────────────────

interface ReceiptThumbnailProps {
  url: string;
  index: number;
  total: number;
  onClick: () => void;
}

export function ReceiptThumbnail({ url, index, total, onClick }: ReceiptThumbnailProps) {
  const [loaded, setLoaded] = useState(false);
  const isPdf = url.toLowerCase().includes('.pdf');
  const label = total > 1 ? `Receipt ${index + 1}` : 'Receipt';

  if (isPdf) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-emerald-100 bg-white hover:bg-emerald-50 transition-colors text-emerald-700 text-xs font-semibold text-left"
      >
        <FileText className="w-4 h-4 flex-shrink-0" />
        {total > 1 ? `View Receipt PDF ${index + 1}` : 'View Receipt (PDF)'}
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      className="relative w-full rounded-lg border border-emerald-100 bg-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
      style={{ minHeight: '80px' }}
    >
      {/* Skeleton shown while image loads */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse rounded-lg">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={url}
        alt={label}
        className={`w-full max-h-40 object-contain rounded-lg transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
      />
    </div>
  );
}

// ── BillImagePreviewModal ─────────────────────────────────────────────────

interface BillImagePreviewModalProps {
  url: string | null;
  onClose: () => void;
}

export function BillImagePreviewModal({ url, onClose }: BillImagePreviewModalProps) {
  const [contentLoaded, setContentLoaded] = useState(false);

  if (!url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'Receipt');

  return (
    <DialogPrimitive.Root open={!!url} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[9998] bg-slate-900/50 backdrop-blur-[2px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[9999] flex flex-col w-[95vw] max-w-5xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%]',
            'border border-slate-200/80 bg-white rounded-2xl',
            'shadow-[0_20px_60px_-8px_rgba(15,23,42,0.18),0_8px_24px_-4px_rgba(15,23,42,0.08)]',
            'duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
            <p className="flex-1 text-sm font-semibold text-slate-800 truncate">{filename}</p>
            <DialogPrimitive.Close
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F2D52]/20"
            >
              <X className="w-4 h-4" />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="flex-1 bg-slate-100 flex items-center justify-center overflow-auto p-6 rounded-b-2xl relative">
            {/* Spinner shown while content loads */}
            {!contentLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-[#0F2D52] rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Loading preview…</p>
              </div>
            )}

            {isPdf ? (
              <iframe
                src={url}
                title={filename}
                className={`w-full h-[75vh] rounded-xl bg-white shadow transition-opacity duration-200 ${contentLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setContentLoaded(true)}
              />
            ) : (
              <img
                src={url}
                alt={filename}
                className={`max-w-full max-h-[75vh] object-contain rounded-xl shadow-lg transition-opacity duration-200 ${contentLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setContentLoaded(true)}
                onError={() => setContentLoaded(true)}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
