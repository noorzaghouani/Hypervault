import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', confirmClass = 'bg-rose-600 hover:bg-rose-700 text-white', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-300/50 w-full max-w-md p-6 border border-slate-100">
        <button onClick={onCancel} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
