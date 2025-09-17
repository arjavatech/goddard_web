import React from 'react';
import { Badge } from '../ui/badge';
import { CheckCircle, Clock, AlertCircle, FileEdit, FileText } from 'lucide-react';
type Status = 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
interface StatusBadgeProps {
  status: Status;
}
export function StatusBadge({
  status
}: StatusBadgeProps) {
  const getVariant = () => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Submitted':
        return 'info';
      case 'In Progress':
        return 'secondary';
      case 'Needs Revision':
        return 'warning';
      case 'Draft':
        return 'outline';
      default:
        return 'default';
    }
  };
  const getIcon = () => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'Submitted':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'In Progress':
        return <FileEdit className="h-3 w-3 mr-1" />;
      case 'Needs Revision':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'Draft':
        return <FileText className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };
  return <Badge variant={getVariant() as any} className="mt-1 self-start flex items-center text-xs">
      {getIcon()}
      {status}
    </Badge>;
}