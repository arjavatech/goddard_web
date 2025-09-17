import React from 'react';
import { FileText, Upload, MessageSquare, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
export function QuickActions() {
  const actions = [{
    icon: <FileText className="h-5 w-5 mr-3 text-amazon-teal" />,
    label: 'Resume Current Form'
  }, {
    icon: <Upload className="h-5 w-5 mr-3 text-amazon-teal" />,
    label: 'Upload Documents'
  }, {
    icon: <MessageSquare className="h-5 w-5 mr-3 text-amazon-teal" />,
    label: 'Contact School'
  }, {
    icon: <HelpCircle className="h-5 w-5 mr-3 text-amazon-teal" />,
    label: 'View Help Resources'
  }];
  return <Card className="glass-card">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Quick Actions
        </h2>
        <div className="space-y-3">
          {actions.map((action, index) => <Button key={index} variant="outline" className="w-full justify-start text-foreground border-gray-200 h-12 hover:bg-gray-50 hover:border-gray-300 transition-all">
              {action.icon}
              {action.label}
            </Button>)}
        </div>
      </CardContent>
    </Card>;
}