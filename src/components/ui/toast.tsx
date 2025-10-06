import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export function Toast({ open, onOpenChange, type, title, message, duration = 4000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      setTimeout(() => setIsVisible(true), 50);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onOpenChange(false), 300);
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open, duration, onOpenChange]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-none">
      <div
        className={`
          ${getBgColor()}
          border rounded-lg shadow-xl px-6 py-3 pointer-events-auto
          transform transition-all duration-300 ease-out
          ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
        `}
      >
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className="font-medium text-gray-900 text-sm">{message}</span>
        </div>
      </div>
    </div>
  );
}