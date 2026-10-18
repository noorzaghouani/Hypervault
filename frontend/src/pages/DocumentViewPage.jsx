import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import ClassificationBadge from '../components/ui/ClassificationBadge'
import ConfirmModal from '../components/ui/ConfirmModal'
import Toast from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { Shield, CheckCircle, XCircle, Edit3, Trash2, ArrowLeft, User, Calendar, Lock } from 'lucide-react'

function CryptoBadge({ label, valid }) {
  const ok = Boolean(valid)
  return (
    <div className={`bg-white p-5 rounded-2xl border-2 shadow-sm flex items-start gap-3 ${ok ? 'border-emerald-200' : 'border-rose-200'}`}>
      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${ok ? 'border-emerald-400 text-emerald-600' : 'border-rose-400 text-rose-600'}`}>
        {ok
          ? <CheckCircle className="w-5 h-5" />
          : <XCircle className="w-5 h-5" />
        }
      </div>
      <div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          {ok ? 'Verified' : 'FAILED'}
        </span>
        <p className="text-xs font-bold text-slate-800 mt-2">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {ok ? (label.startsWith('AES') ? 'Payload decrypted' : 'Integrity verified') : 'Verification failed!'}
        </p>
      </div>
    </div>
  )
}

export default function DocumentViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: () => api.get(`/documents/${id}`).then(r => r.data)
  })

  const deleteMut = useMutation({
    mutationFn: () => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast({ type: 'success', title: 'Deleted', message: 'Document permanently removed.' })
      qc.invalidateQueries(['documents'])
      setTimeout(() => navigate('/documents'), 1000)
    },
    onError: (err) => toast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to delete.' })
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl">
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-700 text-center">
        <XCircle className="w-10 h-10 mx-auto mb-3" />
        <p className="font-bold">{error.response?.data?.error || 'Failed to load document.'}</p>
        <Link to="/documents" className="text-sm underline mt-2 inline-block">← Back to documents</Link>
      </div>
    </div>
  )

  const doc = data?.document
  const isOwner = doc?.user_id === user?.id
  const canEdit = isOwner || user?.role === 'super_admin'
  const canDelete = user?.role !== 'rh_manager' && canEdit

  return (
    <div className="max-w-4xl space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />
      <ConfirmModal
        open={confirmOpen}
        title="Delete Document"
        message={`Are you sure you want to permanently delete "${doc?.title}"? This action cannot be undone.`}
        confirmLabel="Delete permanently"
        confirmClass="bg-rose-600 hover:bg-rose-700 text-white"
        onConfirm={() => { setConfirmOpen(false); deleteMut.mutate() }}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link to="/documents" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 hover:text-[#1b3b36] hover:border-[#1b3b36] font-bold transition-colors shadow-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Documents
        </Link>
        <div className="flex items-center gap-2.5">
          {canEdit && (
            <Link to={`/documents/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
              <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
              Edit Document
            </Link>
          )}
          {canDelete && (
            <button onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black shadow-md shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              Delete Document
            </button>
          )}
        </div>
      </div>

      {/* Document header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{doc?.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {doc?.authorUsername}{isOwner ? ' (you)' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(doc?.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <ClassificationBadge value={doc?.classification} />
        </div>
      </div>

      {/* Crypto verification badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CryptoBadge label="AES-256-GCM" valid={doc?.aesValid} />
        <CryptoBadge label="HMAC-SHA256" valid={doc?.hmacValid} />
        <CryptoBadge label="RSA-2048 Signature" valid={doc?.signatureValid} />
      </div>

      {/* Integrity & Decryption warnings */}
      {doc && !doc.aesValid && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-rose-800">AES-256-GCM Decryption Failed</p>
            <p className="text-rose-700 text-sm">Payload ciphertext could not be decrypted or was corrupted.</p>
          </div>
        </div>
      )}

      {doc && !doc.hmacValid && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-rose-800">HMAC Verification Failed</p>
            <p className="text-rose-700 text-sm">The document content may have been tampered with outside the system.</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Decrypted Content</span>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <pre className="text-sm text-slate-800 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {doc?.content}
          </pre>
        </div>
      </div>
    </div>
  )
}
