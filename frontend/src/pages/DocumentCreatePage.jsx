import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import PasswordStrengthBar from '../components/ui/PasswordStrengthBar'
import { FileText, AlertCircle } from 'lucide-react'

const CLASSIFICATIONS = ['PRIVATE', 'SHARED WITH', 'PUBLIC']
const SHARE_TARGETS   = [
  { value: 'all',         label: 'All roles' },
  { value: 'super_admin', label: 'Super Admins only' },
  { value: 'rh_manager',  label: 'RH Managers only' },
  { value: 'employee',    label: 'Employees only' }
]

export default function DocumentCreatePage() {
  const navigate = useNavigate()
  const { toasts, toast, dismiss } = useToast()

  const [title, setTitle]                 = useState('')
  const [content, setContent]             = useState('')
  const [classification, setClass]        = useState('PRIVATE')
  const [sharedWith, setSharedWith]       = useState('all')
  const [error, setError]                 = useState('')
  const [loading, setLoading]             = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = { title, content, classification }
      if (classification === 'SHARED WITH') payload.shared_with = sharedWith
      await api.post('/documents', payload)
      toast({ type: 'success', title: 'Document created', message: 'Your document was encrypted and saved.' })
      setTimeout(() => navigate('/documents'), 1000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create document.')
    } finally {
      setLoading(false)
    }
  }

  const classInfo = {
    PRIVATE     : { color: 'border-rose-400 bg-rose-50', text: 'text-rose-700',   desc: 'Only visible to you.' },
    'SHARED WITH': { color: 'border-indigo-400 bg-indigo-50', text: 'text-indigo-700', desc: 'Visible to specific roles.' },
    PUBLIC      : { color: 'border-emerald-400 bg-emerald-50', text: 'text-emerald-700', desc: 'Visible to all users.' }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Create New Document</h2>
          <p className="text-sm text-slate-500">Encrypted with AES-256-GCM · Signed with RSA-2048</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Document Title *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="e.g. Q4 Financial Report 2026"
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <p className="text-xs text-slate-400 mt-1">{title.length}/200 characters</p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Content *</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            required
            rows={10}
            maxLength={100000}
            placeholder="Enter the document content here. This will be encrypted with AES-256-GCM."
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">{content.length}/100,000 characters</p>
        </div>

        {/* Classification */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Classification *</label>
          <div className="grid grid-cols-3 gap-3">
            {CLASSIFICATIONS.map(cls => (
              <button
                key={cls}
                type="button"
                onClick={() => setClass(cls)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  classification === cls
                    ? classInfo[cls]?.color + ' ' + classInfo[cls]?.text + ' font-bold'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <p className="text-sm font-bold">{cls}</p>
                <p className="text-xs opacity-70 mt-0.5">{classInfo[cls]?.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Shared with (conditional) */}
        {classification === 'SHARED WITH' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Share with role</label>
            <select
              value={sharedWith}
              onChange={e => setSharedWith(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-indigo-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 bg-indigo-50"
            >
              {SHARE_TARGETS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Encrypting…</>
            ) : 'Create & Encrypt Document'}
          </button>
        </div>
      </form>
    </div>
  )
}
