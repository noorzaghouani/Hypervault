import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../api/axios'
import Toast from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import PasswordStrengthBar from '../components/ui/PasswordStrengthBar'
import { KeyRound, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

// Declared OUTSIDE the parent component to avoid re-creation on every render
// (which caused cursor-loss on every keystroke)
function PwdField({ label, value, onChange, show, toggle, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          required
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 transition-colors pr-11"
        />
        <button type="button" onClick={toggle} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

export default function ChangePasswordPage() {
  const { toasts, toast, dismiss } = useToast()
  const [current,  setCurrent]  = useState('')
  const [newPwd,   setNew]      = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showCur,  setShowCur]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [showCon,  setShowCon]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  const mutation = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      current_password: current,
      new_password:     newPwd,
      confirm_password: confirm
    }),
    onSuccess: () => {
      setSuccess(true)
      setCurrent('')
      setNew('')
      setConfirm('')
      toast({ type: 'success', title: 'Password changed', message: 'Your credentials have been updated with Argon2id.' })
    },
    onError: (err) => {
      setError(err.response?.data?.error || 'Failed to change password.')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    mutation.mutate()
  }


  return (

    <div className="max-w-lg space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
          <KeyRound className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Change Password</h2>
          <p className="text-sm text-slate-500">Hashed with Argon2id (64MB, 3 iterations)</p>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-800">Password changed successfully!</p>
            <p className="text-emerald-700 text-sm">Your new password is now secured with Argon2id.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <PwdField
          label="Current Password *"
          value={current} onChange={setCurrent}
          show={showCur} toggle={() => setShowCur(!showCur)}
          placeholder="Your current password"
        />

        <div className="pt-2 border-t border-slate-100" />

        <PwdField
          label="New Password *"
          value={newPwd} onChange={setNew}
          show={showNew} toggle={() => setShowNew(!showNew)}
          placeholder="Min 12 chars, upper, lower, digit, special"
        />
        <PasswordStrengthBar password={newPwd} />

        <PwdField
          label="Confirm New Password *"
          value={confirm} onChange={setConfirm}
          show={showCon} toggle={() => setShowCon(!showCon)}
          placeholder="Re-type new password"
        />
        {confirm && newPwd !== confirm && (
          <p className="text-xs text-rose-600 font-semibold">⚠ Passwords do not match</p>
        )}

        {/* Policy box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
          <p className="font-bold text-slate-700 mb-2">Password Policy</p>
          {[
            'At least 12 characters',
            'One uppercase (A-Z) and lowercase (a-z)',
            'At least one digit (0-9)',
            'At least one special character (!@#$%…)'
          ].map(p => (
            <div key={p} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {p}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={mutation.isPending || (confirm && newPwd !== confirm)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {mutation.isPending ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Updating…</>
          ) : 'Change Password Securely'}
        </button>
      </form>
    </div>
  )
}
