import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Toast from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import { Fingerprint, ShieldCheck, ShieldOff, Smartphone, Trash2, Wifi, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function WebAuthnSetupPage() {
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['webauthn-status'],
    queryFn: () => api.get('/auth/webauthn/status').then(r => r.data)
  })

  const removeMut = useMutation({
    mutationFn: () => api.delete('/auth/webauthn/remove'),
    onSuccess: () => {
      qc.invalidateQueries(['webauthn-status'])
      toast({ type: 'success', message: 'Biometric passkey removed successfully.' })
    },
    onError: (err) => toast({ type: 'error', message: err.response?.data?.error || 'Failed to remove passkey.' })
  })

  const handleRegister = async () => {
    setError('')
    setRegistering(true)
    try {
      // 1. Request options from server
      const optRes = await api.post('/auth/webauthn/register-options')
      const options = optRes.data

      // 2. Trigger native browser WebAuthn prompt (QR Code + Bluetooth to phone)
      const attResp = await startRegistration(options)

      // 3. Send phone response for verification and storage
      await api.post('/auth/webauthn/register-verify', attResp)

      qc.invalidateQueries(['webauthn-status'])
      toast({ type: 'success', message: 'Biometric passkey registered successfully! Your next login is now protected.' })
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Verification cancelled or rejected. Please try again and touch your sensor.')
      } else if (err.name === 'InvalidStateError') {
        setError('This device is already enrolled for this account.')
      } else {
        setError(err.response?.data?.error || err.message || 'Unexpected error during passkey registration.')
      }
    } finally {
      setRegistering(false)
    }
  }

  const enrolled = data?.enrolled || false

  return (
    <div className="max-w-2xl space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Fingerprint className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Security — Biometric Passkey</h2>
          <p className="text-sm text-slate-500">WebAuthn / FIDO2 Strong Authentication (W3C Standard)</p>
        </div>
      </div>

      {/* Current Status Card */}
      <div className={`rounded-2xl border-2 p-5 flex items-center gap-4 ${enrolled ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
        {isLoading ? (
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        ) : enrolled ? (
          <>
            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-200">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-emerald-800 text-base">Biometric Passkey Active</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Your sign-in requires your phone biometric fingerprint in addition to your master password.
              </p>
              {data?.createdAt && (
                <p className="text-xs text-emerald-600 mt-1">
                  Enrolled on: {new Date(data.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
              <ShieldOff className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-base">Passkey Not Configured</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Your account is currently protected by password only. Enable Passkey for two-factor authentication.
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* How it Works / Instructions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-slate-500" />
          How does it work?
        </h3>
        <ol className="space-y-3">
          {[
            { n: '1', txt: 'Click "Register Passkey (Smartphone)" below.', icon: <Fingerprint className="w-4 h-4 text-emerald-600" /> },
            { n: '2', txt: 'A QR Code prompt appears in your browser dialog.', icon: <Wifi className="w-4 h-4 text-blue-600" /> },
            { n: '3', txt: 'Scan the QR Code with your smartphone camera.', icon: <Smartphone className="w-4 h-4 text-violet-600" /> },
            { n: '4', txt: 'Touch your phone fingerprint sensor to confirm.', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> },
          ].map(s => (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">{s.n}</span>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                {s.icon}
                <span>{s.txt}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {!enrolled ? (
          <button
            onClick={handleRegister}
            disabled={registering}
            className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all cursor-pointer"
          >
            {registering ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Waiting for phone biometric prompt...
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                Register Passkey (Smartphone)
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-semibold text-sm hover:bg-emerald-50 disabled:opacity-60 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              Re-enroll Device
            </button>
            <button
              onClick={() => removeMut.mutate()}
              disabled={removeMut.isPending}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 border-rose-200 text-rose-600 font-semibold text-sm hover:bg-rose-50 disabled:opacity-60 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Remove Passkey
            </button>
          </>
        )}
      </div>
    </div>
  )
}
