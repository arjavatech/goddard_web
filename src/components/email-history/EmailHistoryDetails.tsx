import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { EmailHistoryRecord } from '../../types/emailHistory';
import { Mail, Clock, AlertCircle, CheckCircle2, ChevronDown, User, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmailHistoryDetailsProps {
  record: EmailHistoryRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatDate = (isoString?: string) => {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return '—';
  }
};

export function EmailHistoryDetails({ record, isOpen, onClose }: EmailHistoryDetailsProps) {
  if (!record) return null;

  const timelineEvents = [
    { label: 'Queued', time: record.queuedAt, icon: <Clock className="w-4 h-4 text-slate-400" /> },
    { label: 'Processing', time: record.processingAt, icon: <Clock className="w-4 h-4 text-blue-400" /> },
    { label: 'Sent', time: record.sentAt, icon: <Mail className="w-4 h-4 text-blue-600" /> },
    { label: 'Delivered', time: record.deliveredAt, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
    { label: 'Failed', time: record.failedAt, icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
    { label: 'Retrying', time: record.status === 'retrying' ? new Date().toISOString() : undefined, icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> }
  ].filter(event => event.time !== undefined);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl p-0 overflow-hidden bg-white">
        <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50">
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Mail className="w-5 h-5 text-blue-600" />
            Email Details
          </DialogTitle>
          <DialogDescription>
            Detailed history and status of this email delivery.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Header Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recipient Name</p>
              <p className="text-sm font-medium text-slate-900">{record.recipientName || '—'}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Recipient Email</p>
              <p className="text-sm font-medium text-slate-900 break-all">{record.recipientEmail}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Type</p>
              <p className="text-sm font-medium text-slate-900">{record.emailType}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Subject</p>
              <p className="text-sm font-medium text-slate-900 truncate" title={record.subject}>{record.subject}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</p>
              <div className="inline-flex items-center capitalize text-sm font-medium">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold border",
                  record.status === 'delivered' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  record.status === 'failed' ? "bg-red-50 text-red-700 border-red-200" :
                  record.status === 'sent' ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {record.status}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Attempt Count</p>
              <p className="text-sm font-medium text-slate-900">{record.attemptCount}</p>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Delivery Timeline */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-4">Delivery Timeline</h4>
            <div className="space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {event.icon}
                    </div>
                    {index < timelineEvents.length - 1 && (
                      <div className="w-px h-full bg-slate-200 my-1"></div>
                    )}
                  </div>
                  <div className="pb-1 pt-1.5">
                    <p className="text-sm font-semibold text-slate-900">{event.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDate(event.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Failure Reason */}
          {record.status === 'failed' && record.failureReason && (
            <>
              <hr className="border-slate-100" />
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-red-800 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Failure Reason
                </h4>
                <p className="text-sm text-red-900 whitespace-pre-wrap font-mono text-xs">{record.failureReason}</p>
              </div>
            </>
          )}

          {/* Provider Details */}
          {record.providerMessageId && (
            <>
              <hr className="border-slate-100" />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Provider Message ID</p>
                <p className="text-xs font-mono text-slate-600 break-all">{record.providerMessageId}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
