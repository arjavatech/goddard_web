import React from 'react';
import { badgeVariants } from '../ui/badge';
import { CheckCircle2, Clock, AlertCircle, FileEdit, FileText } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

type Status = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const CONFIG: Record<Status, { variant: NonNullable<VariantProps<typeof badgeVariants>['variant']>; icon: React.ReactNode; label: string }> = {
  Approved:        { variant: 'success',  icon: <CheckCircle2 className="w-3 h-3" />, label: 'Approved' },
  Submitted:       { variant: 'info',     icon: <Clock className="w-3 h-3" />,        label: 'Pending Approval' },
  'In Progress':   { variant: 'info',     icon: <Clock className="w-3 h-3" />,        label: 'Pending Approval' },
  'Needs Revision':{ variant: 'warning',  icon: <AlertCircle className="w-3 h-3" />,  label: 'Needs Revision' },
  Draft:           { variant: 'secondary',icon: <FileText className="w-3 h-3" />,     label: 'Draft' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = CONFIG[status] ?? { variant: 'secondary' as const, icon: null, label: status };
  return (
    <span className={cn(badgeVariants({ variant: cfg.variant }), 'inline-flex items-center gap-1 mt-1 self-start', className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}
