import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { User, Mail, UserPlus } from 'lucide-react';

interface ParentInfoProps {
  parentData: {
    firstName?: string;
    lastName?: string;
    email: string;
    parentType?: string;
    additional_first_name?: string;
    additional_last_name?: string;
    additional_email?: string;
    otherParent?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      parentType?: string;
    } | null;
  } | null;
}

function ParentRow({
  name, email, isPrimary,
}: { name: string; email: string; isPrimary?: boolean }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
        isPrimary
          ? 'bg-cyan-100 text-cyan-700'
          : 'bg-slate-100 text-slate-600'
      }`}>
        {initials || <User className="w-4 h-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <a
            href={`mailto:${email}`}
            className="text-xs text-slate-500 hover:text-cyan-600 truncate transition-colors"
          >
            {email}
          </a>
        </div>
      </div>
    </div>
  );
}

export function ParentInfo({ parentData }: ParentInfoProps) {
  if (!parentData) return null;

  const primaryName = `${parentData.firstName || ''} ${parentData.lastName || ''}`.trim() || 'Parent';
  const additionalName = parentData.additional_first_name
    ? `${parentData.additional_first_name || ''} ${parentData.additional_last_name || ''}`.trim()
    : null;

  return (
    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:-translate-y-[3px] hover:shadow-md transition-all duration-250 ease-in-out">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <User className="w-4 h-4 text-cyan-600" />
          Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <ParentRow name={primaryName} email={parentData.email} isPrimary />

        {additionalName && parentData.additional_email && (
          <>
            <div className="border-t border-slate-100" />
            <div className="flex items-center gap-1.5 mb-1">
              <UserPlus className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Additional Parent
              </span>
            </div>
            <ParentRow name={additionalName} email={parentData.additional_email} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
