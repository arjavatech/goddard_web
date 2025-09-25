import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from './button';
type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export function ToastProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      ...toast,
      id
    };
    setToasts(prev => [...prev, newToast]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  return <ToastContext.Provider value={{
    toasts,
    addToast,
    removeToast
  }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>;
}
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
function ToastContainer() {
  const {
    toasts,
    removeToast
  } = useToast();
  if (toasts.length === 0) return null;
  return <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />)}
    </div>;
}
function ToastItem({
  toast,
  onRemove
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };
  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };
  return <div className={`flex items-start p-4 rounded-lg border shadow-lg max-w-sm ${getBgColor()}`}>
      <div className="flex-shrink-0 mr-3">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.description && <p className="text-sm text-gray-600 mt-1">{toast.description}</p>}
      </div>
      <Button variant="ghost" size="sm" className="flex-shrink-0 ml-2 h-6 w-6 p-0" onClick={() => onRemove(toast.id)}>
        <X className="h-4 w-4" />
      </Button>
    </div>;
}