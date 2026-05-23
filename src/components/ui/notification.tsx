import React from 'react';
import { Dialog, DialogContent } from './dialog';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from './button';

interface NotificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function Notification({ open, onOpenChange, type, title, message }: NotificationProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
      case 'warning':
        return 'border-yellow-200';
      case 'info':
        return 'border-blue-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md border-2 ${getBorderColor()}`}>
        <div className="flex items-start space-x-3 p-4">
          {getIcon()}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
        <div className="flex justify-end p-4 pt-0">
          <Button onClick={() => onOpenChange(false)} className="bg-amazon-teal hover:bg-amazon-teal/90">
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}