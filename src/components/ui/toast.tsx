import * as React from "react"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToastProps {
  type: 'success' | 'error'
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
        "glass-card flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-sm transition-all duration-300",
        type === 'success' 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-amazon-teal/20 text-green-800" 
          : "bg-gradient-to-r from-red-50 to-orange-50 border-amazon-orange/20 text-red-800"
      )}>
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 text-amazon-teal mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-amazon-orange mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {title && <div className="font-semibold mb-1 text-foreground">{title}</div>}
          <div className="text-sm font-medium">{message}</div>
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