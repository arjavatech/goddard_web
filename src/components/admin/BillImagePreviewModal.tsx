import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';

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
        onClick={e => { e.stopPropagation(); onClick(); }}
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
      onClick={e => { e.stopPropagation(); onClick(); }}
      onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onClick(); } }}
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

// ── BillImagePreviewModal ─────────────────────────────────────────────────────

interface BillImagePreviewModalProps {
  url: string | null;
  onClose: () => void;
}

export function BillImagePreviewModal({ url, onClose }: BillImagePreviewModalProps) {
  const [contentLoaded, setContentLoaded] = useState(false);

  // Reset loading state whenever the URL changes
  useEffect(() => {
    setContentLoaded(false);
  }, [url]);

  // Lock body scroll while open
  useEffect(() => {
    if (!url) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [url]);

  if (!url) return null;

  const isPdf = url.toLowerCase().includes('.pdf');
  const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'Receipt');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <p className="flex-1 text-sm font-semibold text-slate-800 truncate">{filename}</p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
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
      </div>
    </div>,
    document.body
  );
}
