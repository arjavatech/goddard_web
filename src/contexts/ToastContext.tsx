import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { Toast } from '../components/ui/toast'

interface ToastState {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

interface ToastContextType {
  showToast: (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string,
    duration?: number
  ) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = useCallback((
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    title?: string,
    duration?: number
  ) => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, {
      id,
      type,
      title: title || '',
      message,
      duration,
    }])
  }, [])

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] space-y-2 w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[320px] sm:max-w-sm">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            duration={toast.duration}
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
