import React from 'react';
import { Card, CardContent } from '../ui/card';
import { CheckCircle, XCircle, FileText, Clock, MinusCircle } from 'lucide-react';

interface ValidationSummaryProps {
  totalRecords: number;
  successful: number;
  failed: number;
  skipped: number;
  processingTimeMs: number;
}

export function ValidationSummary({ totalRecords, successful, failed, skipped, processingTimeMs }: ValidationSummaryProps) {
  const successRate = totalRecords > 0 ? Math.round((successful / totalRecords) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <Card className="rounded-2xl border-slate-100 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Records</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalRecords}</p>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-xl flex-shrink-0">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Successful</p>
              <p className="text-2xl font-extrabold text-emerald-600">{successful}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Failed</p>
              <p className="text-2xl font-extrabold text-red-600">{failed}</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Skipped</p>
              <p className="text-2xl font-extrabold text-amber-500">{skipped}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl flex-shrink-0">
              <MinusCircle className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-100 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Success Rate</p>
              <p className="text-2xl font-extrabold text-[#0F2D52]">{successRate}%</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0">
              <div className="flex flex-col items-center">
                <Clock className="h-4 w-4 text-[#1a6fc4] mb-0.5" />
                <span className="text-[9px] font-bold text-[#1a6fc4]">{Math.round(processingTimeMs)}ms</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
