import * as React from "react"
import { X, CheckCircle, AlertCircle, ShieldAlert, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose: () => void
  index: number
  id: string
}

export function Toast({ type, title, message, onClose, index, id }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 4000)
    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <div 
      className="animate-in slide-in-from-right-2 duration-300"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={cn(
        "glass-card flex items-start gap-3 p-4 rounded-lg shadow-lg border w-full transition-all duration-300",
        type === 'success'
          ? "bg-white border-emerald-200 text-slate-800"
          : type === 'warning'
          ? "bg-white border-amber-200 text-slate-800"
          : type === 'info'
          ? "bg-white border-blue-200 text-slate-800"
          : "bg-white border-red-200 text-slate-800"
      )}>
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        ) : type === 'warning' ? (
          <ShieldAlert className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        ) : type === 'info' ? (
          <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {title && <div className="text-sm font-semibold text-slate-900 mb-0.5">{title}</div>}
          <div className="text-xs text-slate-500 leading-relaxed">{message}</div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}