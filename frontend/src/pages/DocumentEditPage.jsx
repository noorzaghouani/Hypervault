import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import Toast from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { AlertCircle, FileText } from 'lucide-react'

const CLASSIFICATIONS = ['PRIVATE', 'SHARED WITH', 'PUBLIC']
const SHARE_TARGETS = [
  { value: 'all',         label: 'All roles' },
  { value: 'super_admin', label: 'Super Admins only' },
  { value: 'rh_manager',  label: 'RH Managers only' },
  { value: 'employee',    label: 'Employees only' }
]

export default function DocumentEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()

  const [title, setTitle]           = useState('')
  const [content, setContent]       = useState('')
  const [classification, setClass]  = useState('PRIVATE')
  const [sharedWith, setSharedWith] = useState('all')
  const [error, setError]           = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`).then(r => r.data)
  })

  useEffect(() => {
    if (data?.document) {
      const doc = data.document
      setTitle(doc.title || '')
      setContent(doc.content || '')
      setClass(doc.classification || 'PRIVATE')
      setSharedWith(doc.shared_with || 'all')
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload) => api.put(`/documents/${id}`, payload),
    onSuccess: () => {
      toast({ type: 'success', title: 'Saved', message: 'Document re-encrypted and updated.' })
      qc.invalidateQueries(['document', id])
      qc.invalidateQueries(['documents'])
      setTimeout(() => navigate(`/documents/${id}`), 1000)
    },
    onError: (err) => setError(err.response?.data?.error || 'Failed to update document.')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const payload = { title, content, classification }
    if (classification === 'SHARED WITH') payload.shared_with = sharedWith
    mutation.mutate(payload)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const classInfo = {
    PRIVATE      : { color: 'border-rose-400 bg-rose-50',    text: 'text-rose-700',    desc: 'Only visible to you.' },
    'SHARED WITH': { color: 'border-indigo-400 bg-indigo-50', text: 'text-indigo-700',  desc: 'Visible to specific roles.' },
    PUBLIC       : { color: 'border-emerald-400 bg-emerald-50', text: 'text-emerald-700', desc: 'Visible to all users.' }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <FileText className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Edit Document</h2>
          <p className="text-sm text-slate-500">Re-encrypted on save · RSA signature refreshed</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Title *</label>
          <input
            type="text" value={title} onChange={e => setTitle(e.target.value)}
            required maxLength={200}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Content *</label>
          <textarea
            value={content} onChange={e => setContent(e.target.value)}
            required rows={10} maxLength={100000}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">{content.length}/100,000 characters</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Classification *</label>
          <div className="grid grid-cols-3 gap-3">
            {CLASSIFICATIONS.map(cls => (
              <button key={cls} type="button" onClick={() => setClass(cls)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  classification === cls
                    ? `${classInfo[cls]?.color} ${classInfo[cls]?.text} font-bold`
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}>
                <p className="text-sm font-bold">{cls}</p>
                <p className="text-xs opacity-70 mt-0.5">{classInfo[cls]?.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {classification === 'SHARED WITH' && (
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Share with role</label>
            <select value={sharedWith} onChange={e => setSharedWith(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-indigo-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 bg-indigo-50">
              {SHARE_TARGETS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(`/documents/${id}`)}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold shadow-lg shadow-amber-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2">
            {mutation.isPending ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
            ) : 'Save & Re-encrypt'}
          </button>
        </div>
      </form>
    </div>
  )
}
