import React, { useMemo } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { StatusBadge } from './StatusBadge';
interface FormCardProps {
  title: string;
  description: string;
  lastUpdated: string;
  status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  childName?: string; // Optional - only for child-specific forms
}
function FormCard({
  title,
  description,
  lastUpdated,
  status,
  childName
}: FormCardProps) {
  return <Card className="glass-card h-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-amazon-teal" />
              <CardTitle className="text-base font-medium">{title}</CardTitle>
            </div>
            {childName && <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600 font-medium">
                {childName}
              </span>}
          </div>
          <StatusBadge status={status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        <div className="w-full h-1 bg-gray-100 rounded mt-4"></div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          Last updated: {lastUpdated}
        </span>
        <ChevronRight className="h-4 w-4 text-amazon-orange" />
      </CardFooter>
    </Card>;
}
interface FormsDocumentsProps {
  childSpecificForms: {
    childName: string;
    forms: {
      title: string;
      description: string;
      lastUpdated: string;
      status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
    }[];
  }[];
  familyForms: {
    title: string;
    description: string;
    lastUpdated: string;
    status: 'Approved' | 'Submitted' | 'In Progress' | 'Needs Revision' | 'Draft';
  }[];
}
export function FormsDocuments({
  childSpecificForms,
  familyForms
}: FormsDocumentsProps) {
  // Combine all forms into a single list
  const allForms = useMemo(() => {
    return [
      ...familyForms.map((form, index) => ({
        ...form,
        childName: undefined,
        _key: `family-${index}`
      })),
      ...childSpecificForms.flatMap((child, childIndex) =>
        child.forms.map((form, formIndex) => ({
          ...form,
          childName: child.childName,
          _key: `child-${childIndex}-form-${formIndex}`
        }))
      )
    ];
  }, [familyForms, childSpecificForms]);
  return <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">
          Forms & Documents
        </h2>
      </div>
      {allForms.length === 0 ? <div className="rounded-lg border border-dashed border-gray-200 bg-white/40 p-6 text-sm text-muted-foreground">
          No forms available yet. This section will populate once assignments are available from the backend service.
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allForms.map(form => <FormCard key={form._key} title={form.title} description={form.description} lastUpdated={form.lastUpdated} status={form.status} childName={form.childName} />)}
        </div>}
    </div>;
}