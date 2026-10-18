import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { startAuthentication } from '@simplewebauthn/browser'
import api from '../api/axios'
import { AlertCircle, Eye, EyeOff, ArrowRight, Fingerprint, Smartphone, Loader2, RefreshCw } from 'lucide-react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword]     = useState('')
  const [showPwd, setShowPwd]       = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  // ── État WebAuthn (Étape 2 après mot de passe validé) ─────────────────────
  const [webAuthnStep, setWebAuthnStep]     = useState(false)  // true = passer à l'écran biométrie
  const [webAuthnBusy, setWebAuthnBusy]     = useState(false)  // true = attente téléphone
  const [webAuthnError, setWebAuthnError]   = useState('')

  const { login, setUser } = useAuth()
  const navigate = useNavigate()

  // ── ÉTAPE 1 : Connexion avec mot de passe ─────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(identifier, password)
      if (result?.requiresWebAuthn) {
        // Mot de passe correct, mais WebAuthn requis → passer à l'écran 2
        setWebAuthnStep(true)
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Échec de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  // ── ÉTAPE 2 : Vérification biométrique WebAuthn ───────────────────────────
  const handleWebAuthn = useCallback(async () => {
    setWebAuthnError('')
    setWebAuthnBusy(true)
    try {
      // 1. Demander le challenge au serveur (utilise le cookie jwt_pending)
      const optRes = await api.post('/auth/webauthn/login-options')
      const options = optRes.data

      // 2. Déclencher la fenêtre native du navigateur (QR Code → téléphone → empreinte)
      const authResp = await startAuthentication(options)

      // 3. Vérifier la signature côté serveur → délivrance du cookie JWT
      const verifyRes = await api.post('/auth/webauthn/login-verify', authResp)
      const { user } = verifyRes.data

      // 4. Mettre à jour le contexte auth et rediriger
      setUser(user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setWebAuthnError('Verification cancelled. Click "Restart" and place your finger on your phone\'s sensor.')
      } else if (err.name === 'AbortError') {
        setWebAuthnError('Verification timed out. Click "Restart".')
      } else {
        setWebAuthnError(err.response?.data?.error || 'Biometric verification error. Please try again.')
      }
    } finally {
      setWebAuthnBusy(false)
    }
  }, [navigate, setUser])

  // Lancer automatiquement WebAuthn dès l'arrivée sur l'écran 2
  useEffect(() => {
    if (webAuthnStep) {
      handleWebAuthn()
    }
  }, [webAuthnStep])

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 antialiased select-none font-sans">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-slate-200">

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* GAUCHE : COFFRE-FORT FOREST GREEN #1b3b36                      */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="md:w-7/12 bg-[#1b3b36] p-8 lg:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-950/40">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <div>
                <h1 className="font-extrabold text-white text-base tracking-tight">HYPERVAULT</h1>
                <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Enterprise Security Portal</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 my-6 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)]" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="92" fill="#132a26" stroke="#2a5a52" strokeWidth="6"/>
                <circle cx="100" cy="100" r="82" fill="#17342f" stroke="#10b981" strokeWidth="2" strokeDasharray="8 4"/>
                <rect x="94" y="2" width="12" height="14" rx="3" fill="#e2e8f0"/>
                <rect x="94" y="184" width="12" height="14" rx="3" fill="#e2e8f0"/>
                <rect x="2" y="94" width="14" height="12" rx="3" fill="#e2e8f0"/>
                <rect x="184" y="94" width="14" height="12" rx="3" fill="#e2e8f0"/>
                <rect x="30" y="30" width="12" height="12" rx="3" fill="#94a3b8" transform="rotate(45 36 36)"/>
                <rect x="158" y="30" width="12" height="12" rx="3" fill="#94a3b8" transform="rotate(45 164 36)"/>
                <rect x="30" y="158" width="12" height="12" rx="3" fill="#94a3b8" transform="rotate(45 36 164)"/>
                <rect x="158" y="158" width="12" height="12" rx="3" fill="#94a3b8" transform="rotate(45 164 164)"/>
                <circle cx="100" cy="100" r="64" fill="#1b3b36" stroke="#34d399" strokeWidth="3"/>
                <line x1="100" y1="100" x2="100" y2="48" stroke="#f1f5f9" strokeWidth="6" strokeLinecap="round"/>
                <line x1="100" y1="100" x2="55" y2="126" stroke="#f1f5f9" strokeWidth="6" strokeLinecap="round"/>
                <line x1="100" y1="100" x2="145" y2="126" stroke="#f1f5f9" strokeWidth="6" strokeLinecap="round"/>
                <circle cx="100" cy="46" r="6" fill="#10b981"/>
                <circle cx="53" cy="128" r="6" fill="#10b981"/>
                <circle cx="147" cy="128" r="6" fill="#10b981"/>
                <circle cx="100" cy="100" r="26" fill="#0f172a" stroke="#06b6d4" strokeWidth="3"/>
                <circle cx="100" cy="100" r="14" fill="#0284c7"/>
                <path d="M96 98h8v7h-8z M98 98v-3a2 2 0 114 0v3" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-xs text-[#a3c9c2] font-semibold text-center mt-6 max-w-xs leading-relaxed tracking-wide">
              Protect What Matters. Lock What's Sensitive.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-3 border-t border-emerald-900/60">
            <div className="bg-black/30 border border-emerald-400/40 rounded-xl py-2.5 px-1 text-center">
              <p className="text-[10px] font-black text-emerald-300 tracking-wider">AUTHENTIFICATION</p>
            </div>
            <div className="bg-black/30 border border-rose-400/40 rounded-xl py-2.5 px-1 text-center">
              <p className="text-[10px] font-black text-rose-300 tracking-wider">AUTHORIZATION</p>
            </div>
            <div className="bg-black/30 border border-amber-400/40 rounded-xl py-2.5 px-1 text-center">
              <p className="text-[10px] font-black text-amber-300 tracking-wider">AUDIT</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* DROITE : FORMULAIRE (Étape 1 Mot de passe OU Étape 2 WebAuthn) */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="md:w-5/12 p-8 lg:p-10 bg-white flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">

            {/* ── ÉCRAN 1 : Formulaire de connexion ── */}
            {!webAuthnStep && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Connexion Corporate</h2>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-4">
                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Identifiant ou Email
                    </label>
                    <input
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      required
                      placeholder="username or mail"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs text-slate-900 bg-slate-50 font-semibold focus:outline-none focus:border-[#1b3b36] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mot de Passe Maître
                    </label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••••••"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-xs text-slate-900 bg-slate-50 font-semibold focus:outline-none focus:border-[#1b3b36] focus:bg-white transition-all pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1b3b36] hover:from-emerald-500 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Déverrouillage en cours…</span>
                      </>
                    ) : (
                      <>
                        <span>Déverrouiller le Coffre-Fort</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* ── ÉCRAN 2 : Vérification biométrique WebAuthn ── */}
            {webAuthnStep && (
              <div className="flex flex-col items-center text-center gap-6">

                {/* Indicateur animé */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-xl ${webAuthnBusy ? 'bg-emerald-100 animate-pulse' : webAuthnError ? 'bg-rose-100' : 'bg-emerald-500'}`}>
                  {webAuthnBusy ? (
                    <Fingerprint className="w-12 h-12 text-emerald-600" />
                  ) : webAuthnError ? (
                    <AlertCircle className="w-12 h-12 text-rose-500" />
                  ) : (
                    <Fingerprint className="w-12 h-12 text-white" />
                  )}
                </div>

                {/* Texte état */}
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {webAuthnBusy ? 'Waiting for your smartphone…' : webAuthnError ? 'Verification Failed' : 'Biometric Verification'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                    {webAuthnBusy
                      ? 'A prompt appeared on your screen. Scan the QR code with your phone, then touch the fingerprint sensor.'
                      : webAuthnError
                      ? webAuthnError
                      : 'Ready for verification.'}
                  </p>
                </div>

                {/* Icônes d'indication */}
                {webAuthnBusy && (
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-500" />
                      <span>Scan QR</span>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-emerald-500" />
                      <span>Touch sensor</span>
                    </div>
                    <span className="text-slate-300">→</span>
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      <span>Access</span>
                    </div>
                  </div>
                )}

                {/* Bouton Relancer */}
                {!webAuthnBusy && (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={handleWebAuthn}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Restart biometric verification
                    </button>
                    <button
                      onClick={() => { setWebAuthnStep(false); setWebAuthnError(''); setError('') }}
                      className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-all"
                    >
                      ← Back to login
                    </button>
                  </div>
                )}

                {/* Badge sécurité */}
                <div className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 tracking-wide">
                  🔒 FIDO2 / WebAuthn W3C — AAL2 Standard
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
