import { useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const pageMeta = {
  '/dashboard'       : { title: 'Security Overview',     sub: 'Real-time security posture and vault status' },
  '/documents'       : { title: 'Document Vault',        sub: 'Encrypted document archive' },
  '/documents/create': { title: 'New Document',          sub: 'Encrypt and store payload (AES-256-GCM)' },
  '/admin/users'     : { title: 'User Management',       sub: 'RBAC actors, status and credentials' },
  '/audit/logs'      : { title: 'Security Audit Trail',  sub: 'Cryptographic event trail and exports' },
  '/change-password' : { title: 'Change Password',       sub: 'Credential update (Argon2id)' },
  '/security'        : { title: 'Biometric Passkey',     sub: 'WebAuthn / FIDO2 MFA configuration' }
}

export default function Header() {
  const location = useLocation()
  const { user } = useAuth()
  const meta = pageMeta[location.pathname] || { title: 'HyperVault', sub: '' }

  return (
    <header className="bg-white border-b border-slate-200 px-5 py-2 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-slate-900 leading-tight">{meta.title}</h1>
        <span className="text-slate-300">|</span>
        <p className="text-xs text-slate-500">
          Welcome, <span className="font-semibold text-slate-800">{user?.username}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* System Status Ghost Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-emerald-700 border-2 border-emerald-400 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          System Online
        </span>
      </div>
    </header>
  )
}
