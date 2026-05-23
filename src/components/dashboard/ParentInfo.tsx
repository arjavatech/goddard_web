import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { User, Crown, Mail } from 'lucide-react';

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

export function ParentInfo({ parentData }: ParentInfoProps) {
  if (!parentData) return null;

  const currentParentName = `${parentData.firstName || ''} ${parentData.lastName || ''}`.trim() || 'Parent';
  const additionalParentName = parentData.additional_first_name 
    ? `${parentData.additional_first_name || ''} ${parentData.additional_last_name || ''}`.trim() || 'Parent'
    : null;

  console.log('ParentInfo - Parent details:', parentData);

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-amazon-teal" />
            Parent Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amazon-teal/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-amazon-teal" />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 block truncate">{currentParentName}</span>
              <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{parentData.email}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Parent Card */}
      {parentData.additional_first_name && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-amazon-teal" />
              Additional Parent Info
            </CardTitle>
          </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-gray-600" />
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 block truncate">{additionalParentName}</span>
              {parentData.additional_email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{parentData.additional_email}</span>
                </div>
              )}
            </div>
          </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}