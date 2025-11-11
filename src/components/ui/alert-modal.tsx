import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface AlertModalProps {
  open: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  title?: string;
  message: string;
  confirmText?: string;
}

export function AlertModal({ 
  open, 
  onClose, 
  type, 
  title, 
  message, 
  confirmText = 'OK' 
}: AlertModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" hideCloseButton preventClose>
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {type === 'success' ? (
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-amazon-teal" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amazon-orange" />
              </div>
            )}
          </div>
          <DialogTitle className={cn(
            "text-lg font-semibold",
            type === 'success' ? 'text-green-800' : 'text-red-800'
          )}>
            {title || (type === 'success' ? 'Success' : 'Error')}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={onClose}
            className={cn(
              "min-w-[100px]",
              type === 'success' 
                ? "bg-amazon-teal hover:bg-amazon-teal/90" 
                : "bg-amazon-orange hover:bg-amazon-orange/90"
            )}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}