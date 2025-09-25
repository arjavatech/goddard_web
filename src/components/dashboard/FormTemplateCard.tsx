import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { FilloutFormButton } from './FilloutFormButton';
import type { FormTemplate } from '../../services/api/dashboard';

interface FormTemplateCardProps {
  template: FormTemplate;
}

export function FormTemplateCard({ template }: FormTemplateCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'inactive':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 mr-2 text-amazon-teal" />
            <CardTitle className="text-base font-medium">{template.formName}</CardTitle>
          </div>
          {template.status && (
            <Badge variant={getStatusVariant(template.status)}>
              {template.status}
            </Badge>
          )}
        </div>
        {template.isRequired && (
          <Badge variant="destructive" className="w-fit">
            Required
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {template.formType && (
          <div className="text-sm text-muted-foreground">
            Type: {template.formType}
          </div>
        )}
        
        {template.createdAt && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            Created: {formatDate(template.createdAt)}
          </div>
        )}

        {template.filloutFormUrl ? (
          <FilloutFormButton
            formUrl={template.filloutFormUrl}
            formTitle={template.formName}
            variant="outline"
            size="sm"
            className="w-full"
          />
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2">
            Form URL not available
          </div>
        )}
      </CardContent>
    </Card>
  );
}