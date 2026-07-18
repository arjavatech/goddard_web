import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
interface QuickAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  helperText?: string;
}
interface QuickActionsProps {
  actions: QuickAction[];
  emptyMessage?: string;
}
export function QuickActions({
  actions,
  emptyMessage = 'Action shortcuts will display here once the backend exposes next steps for guardians.'
}: QuickActionsProps) {
  return <Card className="glass-card">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">
          Quick Actions
        </h2>
        {actions.length === 0 ? <p className="text-sm text-slate-500">
            {emptyMessage}
          </p> : <div className="space-y-3">
            {actions.map((action, index) => <Button key={index} type="button" variant="outline" disabled={action.disabled} onClick={action.onClick} className="w-full justify-start text-foreground border-gray-200 h-12 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {action.icon ?? <FileText className="h-5 w-5 mr-3 text-amazon-teal" />}
                <span className="flex-1 text-left">{action.label}</span>
                {action.helperText && <span className="text-xs text-muted-foreground ml-4">
                    {action.helperText}
                  </span>}
              </Button>)}
          </div>}
      </CardContent>
    </Card>;
}