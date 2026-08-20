import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Send, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { EmailHistorySummary as SummaryType } from '../../types/emailHistory';

interface EmailHistorySummaryProps {
  summary: SummaryType;
}

export function EmailHistorySummary({ summary }: EmailHistorySummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Sent */}
      <Card className="shadow-xs hover:shadow-sm transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                Total Sent
              </p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{summary.totalSent}</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0 ml-2">
              <Send className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivered */}
      <Card className="shadow-xs hover:shadow-sm transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                Delivered
              </p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{summary.delivered}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl flex-shrink-0 ml-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed */}
      <Card className="shadow-xs hover:shadow-sm transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                Failed
              </p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{summary.failed}</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0 ml-2">
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing */}
      <Card className="shadow-xs hover:shadow-sm transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 truncate">
                Processing
              </p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{summary.processing}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl flex-shrink-0 ml-2">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
