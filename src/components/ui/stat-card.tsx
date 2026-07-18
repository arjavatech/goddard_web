import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  className?: string;
  onClick?: () => void;
  trend?: { value: number; label?: string };
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  className,
  onClick,
  trend,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'group transition-all duration-200',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)]',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 truncate">
              {label}
            </p>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums leading-none">
              {value}
            </div>
            {trend && (
              <p className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
                {trend.label && <span className="text-slate-400 font-normal ml-1">{trend.label}</span>}
              </p>
            )}
          </div>
          <div className={cn(
            'p-2.5 rounded-xl flex-shrink-0 transition-transform duration-200',
            iconBgClass,
            onClick && 'group-hover:scale-110'
          )}>
            <Icon className={cn('h-5 w-5', iconColorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
