import React from 'react';
import { Calendar, FileCheck, Phone } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
type ImportantInfoData = {
  enrollmentDeadline?: string;
  requiredDocuments?: string[];
  contact?: {
    phone?: string | null;
    email?: string | null;
  };
};
interface ImportantInfoProps {
  data?: ImportantInfoData;
  fallbackMessage?: string;
}
export function ImportantInfo({
  data,
  fallbackMessage = 'Important enrollment dates, required documents, and school contact information will appear here once the backend exposes them.'
}: ImportantInfoProps) {
  if (!data) {
    return <Card className="glass-card border-amber-200 bg-amber-50/60">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Important Information
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {fallbackMessage}
          </p>
        </CardContent>
      </Card>;
  }
  const {
    enrollmentDeadline,
    requiredDocuments,
    contact
  } = data;
  return <Card className="glass-card">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Important Information
        </h2>
        <div className="space-y-6">
          {enrollmentDeadline && <div>
              <h3 className="font-medium mb-2 flex items-center text-foreground">
                <Calendar className="h-4 w-4 mr-2 text-amazon-orange" />
                Upcoming Deadline
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete enrollment by: {enrollmentDeadline}
              </p>
            </div>}
          {requiredDocuments && requiredDocuments.length > 0 && <div>
              <h3 className="font-medium mb-2 flex items-center text-foreground">
                <FileCheck className="h-4 w-4 mr-2 text-amazon-orange" />
                Required Documents
              </h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                {requiredDocuments.map((doc, index) => <li key={`${doc}-${index}`}>
                    {doc}
                  </li>)}
              </ul>
            </div>}
          {contact && (contact.phone || contact.email) && <div>
              <h3 className="font-medium mb-2 flex items-center text-foreground">
                <Phone className="h-4 w-4 mr-2 text-amazon-orange" />
                School Contact
              </h3>
              {contact.phone && <p className="text-sm text-muted-foreground">
                  Phone: {contact.phone}
                </p>}
              {contact.email && <p className="text-sm text-muted-foreground">
                  Email: {contact.email}
                </p>}
            </div>}
          {!enrollmentDeadline && (!requiredDocuments || requiredDocuments.length === 0) && (!contact || (!contact.phone && !contact.email)) && <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>}
        </div>
      </CardContent>
    </Card>;
}
