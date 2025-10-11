import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Toast } from '../components/ui/toast'

interface ToastState {
  open: boolean
  type: 'success' | 'error'
  title?: string
  message: string
}

interface ToastContextType {
  showToast: (type: 'success' | 'error', message: string, title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    type: 'error',
    title: '',
    message: ''
  })

  const showToast = (type: 'success' | 'error', message: string, title?: string) => {
    setToast({
      open: true,
      type,
      title: title || '',
      message
    })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, open: false }))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        open={toast.open}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
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