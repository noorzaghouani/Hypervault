import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  error  : <AlertCircle className="w-5 h-5 text-rose-500" />,
  info   : <Info className="w-5 h-5 text-indigo-500" />
}
const styles = {
  success: 'border-emerald-200 bg-emerald-50',
  error  : 'border-rose-200 bg-rose-50',
  info   : 'border-indigo-200 bg-indigo-50'
}

export default function Toast({ toasts, dismiss }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, dismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration || 4000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, dismiss])

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg shadow-slate-200/50 animate-in slide-in-from-right-full ${styles[toast.type] || styles.info}`}>
      <span className="flex-shrink-0 mt-0.5">{icons[toast.type] || icons.info}</span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-bold text-slate-800">{toast.title}</p>}
        <p className="text-xs text-slate-600 mt-0.5">{toast.message}</p>
      </div>
      <button onClick={() => dismiss(toast.id)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
