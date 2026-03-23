import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconBgClass: string;
  iconColorClass: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, iconBgClass, iconColorClass, className }: StatCardProps) {
  return (
    <Card className={`glass-card hover:shadow-lg transition-shadow ${className ?? ''}`}>
      <CardContent className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1 truncate">{label}</p>
            <div className="text-2xl sm:text-3xl font-bold text-foreground">{value}</div>
          </div>
          <div className={`p-2 sm:p-3 ${iconBgClass} rounded-full flex-shrink-0 ml-2`}>
            <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
