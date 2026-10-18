export function getPasswordStrength(password) {
  if (!password) return { score: 0, level: 'empty', label: '', color: '' }
  let score = 0
  if (password.length >= 12) score += 25
  if (/[A-Z]/.test(password))  score += 20
  if (/[a-z]/.test(password))  score += 20
  if (/[0-9]/.test(password))  score += 15
  if (/[!@#$%^&*()\-_=+[\]{};'",.<>?]/.test(password)) score += 20

  if (score >= 80) return { score, level: 'strong', label: 'Strong', color: 'bg-emerald-500' }
  if (score >= 50) return { score, level: 'medium', label: 'Medium', color: 'bg-amber-500' }
  return { score, level: 'weak', label: 'Weak', color: 'bg-rose-500' }
}

export default function PasswordStrengthBar({ password }) {
  const { score, level, label, color } = getPasswordStrength(password)
  if (!password) return null

  const missing = []
  if (password.length < 12) missing.push('12+ characters')
  if (!/[A-Z]/.test(password)) missing.push('uppercase letter')
  if (!/[a-z]/.test(password)) missing.push('lowercase letter')
  if (!/[0-9]/.test(password)) missing.push('digit')
  if (!/[!@#$%^&*()\-_=+[\]{};'",.<>?]/.test(password)) missing.push('special character')

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${
          level === 'strong' ? 'text-emerald-600' :
          level === 'medium' ? 'text-amber-600' :
          'text-rose-600'
        }`}>{label}</span>
      </div>
      {missing.length > 0 && (
        <p className="text-xs text-slate-400">Missing: {missing.join(', ')}</p>
      )}
    </div>
  )
}
