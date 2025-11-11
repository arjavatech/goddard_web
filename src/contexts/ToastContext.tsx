import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Toast } from '../components/ui/toast'

interface ToastState {
  id: string
  type: 'success' | 'error'
  title?: string
  message: string
}

interface ToastContextType {
  showToast: (type: 'success' | 'error', message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = (type: 'success' | 'error', message: string, title?: string) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, {
      id,
      type,
      title: title || '',
      message
    }])
  }

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] space-y-2">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
            index={index}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}