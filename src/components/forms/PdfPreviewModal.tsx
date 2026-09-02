import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

export interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null;
  title?: string;
}

export function PdfPreviewModal({ isOpen, onClose, fileUrl, title = 'View Uploaded Form' }: PdfPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[800px] h-[90vh] sm:h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border-0 shadow-xl">
        <DialogHeader className="px-4 py-4 sm:px-6 bg-white border-b border-slate-100 flex-shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 pr-4 break-words">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
          {fileUrl ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title={title}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Loading PDF...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
