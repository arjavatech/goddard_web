import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
export type MissingApiItem = {
  endpoint: string;
  description: string;
};
interface MissingApiNoticeProps {
  items: MissingApiItem[];
}
export function MissingApiNotice({ items }: MissingApiNoticeProps) {
  if (items.length === 0) return null;
  return <Card className="glass-card border-amber-200 bg-amber-50/60 mb-6">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Missing API integrations</h2>
        </div>
        <ul className="space-y-2 text-sm text-amber-800">
          {items.map(item => <li key={item.endpoint}>
              <span className="font-medium">{item.endpoint}</span>
              <span className="ml-2 text-amber-900/80">{item.description}</span>
            </li>)}
        </ul>
      </CardContent>
    </Card>;
}
