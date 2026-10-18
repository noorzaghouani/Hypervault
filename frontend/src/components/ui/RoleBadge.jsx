const styles = {
  super_admin: 'bg-white border-2 border-emerald-400 text-emerald-800',
  rh_manager : 'bg-white border-2 border-amber-400 text-amber-800',
  employee   : 'bg-white border-2 border-slate-300 text-slate-700'
}
const labels = {
  super_admin: 'Super Admin',
  rh_manager : 'RH Manager',
  employee   : 'Employee'
}

export default function RoleBadge({ role }) {
  if (!role) return null
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold shadow-xs ${styles[role] || 'bg-white border-2 border-slate-300 text-slate-700'}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[role] || role}
    </span>
  )
}
