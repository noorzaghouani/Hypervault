import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import RoleBadge from '../components/ui/RoleBadge'
import ConfirmModal from '../components/ui/ConfirmModal'
import Toast from '../components/ui/Toast'
import { useToast } from '../hooks/useToast'
import PasswordStrengthBar from '../components/ui/PasswordStrengthBar'
import { Users, Plus, RotateCcw, Shield, Eye, EyeOff, X, Lock, Unlock, UserX, UserCheck, AlertCircle } from 'lucide-react'

const ROLES = [
  { value: 'employee',    label: 'Employee',    color: 'text-teal-700 border-teal-400 bg-teal-50' },
  { value: 'rh_manager',  label: 'RH Manager',  color: 'text-orange-700 border-orange-400 bg-orange-50' },
  { value: 'super_admin', label: 'Super Admin',  color: 'text-violet-700 border-violet-400 bg-violet-50' }
]

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { toasts, toast, dismiss } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [tempPwd, setTempPwd]       = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data)
  })

  const users = data?.users || []

  const onError = (err) => toast({ type: 'error', message: err.response?.data?.error || 'Action failed.' })
  const invalidate = () => { qc.invalidateQueries(['admin-users']); qc.invalidateQueries(['dashboard']) }

  const toggleMut = useMutation({
    mutationFn: ({ id }) => api.post(`/admin/users/${id}/toggle`),
    onSuccess: () => { invalidate(); toast({ type: 'success', message: 'Account status updated.' }) },
    onError
  })

  const unlockMut = useMutation({
    mutationFn: ({ id }) => api.post(`/admin/users/${id}/unlock`),
    onSuccess: () => { invalidate(); toast({ type: 'success', message: 'Account unlocked.' }) },
    onError
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }) => api.post(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { invalidate(); toast({ type: 'success', message: 'Role updated.' }) },
    onError
  })

  const resetMut = useMutation({
    mutationFn: ({ id }) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: (res) => { invalidate(); setTempPwd(res.data); toast({ type: 'success', message: 'Password reset. Temp password shown below.' }) },
    onError
  })

  return (
    <div className="max-w-7xl space-y-6">
      <Toast toasts={toasts} dismiss={dismiss} />

      {/* Temp password banner */}
      {tempPwd && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800 text-sm">Temporary Password Generated</p>
            <p className="text-amber-700 text-sm mt-1">
              User: <strong>{tempPwd.username}</strong> — Temp password:{' '}
              <code className="bg-amber-100 px-2 py-0.5 rounded font-mono text-amber-900">{tempPwd.tempPassword}</code>
            </p>
            <p className="text-amber-600 text-xs mt-1">Communicate this securely. It will disappear when dismissed.</p>
          </div>
          <button onClick={() => setTempPwd(null)} className="text-amber-500 hover:text-amber-700">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">User Management</h2>
            <p className="text-sm text-slate-500">{users.length} registered actors</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1b3b36] hover:from-emerald-500 hover:to-teal-700 text-white text-sm font-bold shadow-lg shadow-emerald-700/25 transition-all cursor-pointer">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="text-right px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(u => {
                const isLocked = u.locked_until && new Date(u.locked_until) > new Date()
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{u.username}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} />
                        <select
                          defaultValue={u.role}
                          onChange={e => roleMut.mutate({ id: u.id, role: e.target.value })}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:border-indigo-400"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold w-fit ${u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                        {isLocked && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400 hidden lg:table-cell">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <button onClick={() => toggleMut.mutate({ id: u.id })}
                          title={u.is_active ? 'Disable account' : 'Enable account'}
                          className={`p-2 rounded-xl transition-colors ${u.is_active ? 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        {isLocked && (
                          <button onClick={() => unlockMut.mutate({ id: u.id })}
                            title="Unlock account"
                            className="p-2 rounded-xl text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => resetMut.mutate({ id: u.id })}
                          title="Reset password"
                          className="p-2 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create user modal */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={(d) => {
        qc.invalidateQueries(['admin-users'])
        setTempPwd(d)
        setShowCreate(false)
        toast({ type: 'success', title: 'User created', message: `${d.username} has been added.` })
      }} />}
    </div>
  )
}

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm]     = useState({ username: '', email: '', role: 'employee', password: '' })
  const [showPwd, setShow]  = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoad]  = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoad(true)
    try {
      const res = await api.post('/admin/users', form)
      onCreated(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Add New User</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'username', label: 'Username', type: 'text', placeholder: 'john_doe' },
            { key: 'email',    label: 'Email',    type: 'email', placeholder: 'john@company.com' }
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{f.label} *</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)}
                required placeholder={f.placeholder}
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 transition-colors" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Role *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-600">
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Password *</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                required placeholder="Min 12 chars, upper/lower/digit/special"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 transition-colors pr-10" />
              <button type="button" onClick={() => setShow(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrengthBar password={form.password} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1b3b36] hover:from-emerald-500 hover:to-teal-700 text-white text-sm font-bold shadow-lg shadow-emerald-700/25 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer transition-all">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
