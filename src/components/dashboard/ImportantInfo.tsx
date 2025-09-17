import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Calendar, FileCheck, Phone } from 'lucide-react';
export function ImportantInfo() {
  return <Card className="glass-card">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Important Information
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2 flex items-center text-foreground">
              <Calendar className="h-4 w-4 mr-2 text-amazon-orange" />
              Upcoming Deadlines
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete enrollment by: June 15, 2023
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2 flex items-center text-foreground">
              <FileCheck className="h-4 w-4 mr-2 text-amazon-orange" />
              Required Documents
            </h3>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Immunization Records</li>
              <li>Birth Certificate</li>
              <li>Photo ID of Parents/Guardians</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2 flex items-center text-foreground">
              <Phone className="h-4 w-4 mr-2 text-amazon-orange" />
              School Contact
            </h3>
            <p className="text-sm text-muted-foreground">
              Phone: (555) 123-4567
            </p>
            <p className="text-sm text-muted-foreground">
              Email: admin@goddardschool.com
            </p>
          </div>
        </div>
      </CardContent>
    </Card>;
}