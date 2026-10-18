import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  Shield, LayoutDashboard, FileText, Users,
  ClipboardList, KeyRound, LogOut, Fingerprint
} from 'lucide-react'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const p = location.pathname

  const isActive = (path) => p === path || (path !== '/dashboard' && p.startsWith(path))

  const navItem = (path, icon, label) => (
    <Link
      key={path}
      to={path}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive(path)
          ? 'bg-white/15 text-white shadow-xs font-semibold'
          : 'text-[#9ec1ba] hover:bg-white/10 hover:text-white'
      }`}
    >
      <span className={isActive(path) ? 'text-emerald-400' : 'text-[#7ca49d]'}>
        {icon}
      </span>
      {label}
    </Link>
  )

  return (
    <aside className="w-64 min-h-screen bg-[#1b3b36] text-slate-200 flex-shrink-0 flex flex-col shadow-xl select-none">
      {/* Brand */}
      <div className="p-6 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-950/40">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <p className="font-bold text-white text-base tracking-tight">HYPERVAULT</p>
          <p className="text-[10px] text-[#8db5ae] font-semibold uppercase tracking-widest">Security Portal</p>
        </div>
      </div>

      {/* User Profile Pill (Modern Ghost & Badge style) */}
      <div className="p-4 mx-4 my-4 rounded-2xl bg-black/20 border border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-emerald-500 text-white font-bold text-sm flex items-center justify-center shadow-sm flex-shrink-0">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="overflow-hidden min-w-0">
          <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-300 border border-white/15 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {user?.role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5">
        <p className="px-3 text-[10px] font-bold text-[#7ca49d] uppercase tracking-wider mb-2">Main Menu</p>
        {navItem('/dashboard', <LayoutDashboard className="w-5 h-5" />, 'Dashboard')}
        {navItem('/documents', <FileText className="w-5 h-5" />, 'My Documents')}

        {user?.role === 'super_admin' && (
          <>
            <p className="px-3 text-[10px] font-bold text-[#7ca49d] uppercase tracking-wider mb-2 mt-5">Administration</p>
            {navItem('/admin/users', <Users className="w-5 h-5" />, 'User Management')}
            {navItem('/audit/logs', <ClipboardList className="w-5 h-5" />, 'Audit Logs')}
          </>
        )}

        <div className="pt-4 mt-4 border-t border-white/10">
          <p className="px-3 text-[10px] font-bold text-[#7ca49d] uppercase tracking-wider mb-2">Security</p>
          {navItem('/change-password', <KeyRound className="w-5 h-5 text-emerald-400" />, 'Change Password')}
          {navItem('/security', <Fingerprint className="w-5 h-5 text-emerald-400" />, 'Biometric Passkey')}
        </div>
      </nav>

      {/* Logout Button (Ghost Style) */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-white/5 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border-2 border-rose-400/40 hover:border-rose-400 transition-all shadow-xs"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
