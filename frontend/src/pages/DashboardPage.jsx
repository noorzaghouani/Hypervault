import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api/axios'
import RoleBadge from '../components/ui/RoleBadge'
import {
  Shield, Check, Calendar as CalendarIcon,
  ArrowRight, FileText, Plus, Activity,
  AlertTriangle, AlertOctagon
} from 'lucide-react'

// ── Compact Interactive Security Calendar ────────────────────────────────────
function SecurityCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year  = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = (firstDay + 6) % 7
  const totalDays   = new Date(year, month + 1, 0).getDate()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  const days = []
  for (let i = 0; i < startOffset; i++) {
    days.push(<div key={`empty-${i}`} className="h-5" />)
  }
  for (let d = 1; d <= totalDays; d++) {
    const isToday = isCurrentMonth && today.getDate() === d
    const isAuditDay = d === 28
    days.push(
      <div
        key={`day-${d}`}
        className={`h-5 flex items-center justify-center rounded text-[10px] font-semibold transition-colors ${
          isAuditDay
            ? 'bg-[#1b3b36] text-white font-bold'
            : isToday
            ? 'bg-emerald-500 text-white font-bold'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {d}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-slate-900">
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-5 h-5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold cursor-pointer transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-5 h-5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold cursor-pointer transition-colors"
            >
              ›
            </button>
          </div>
        </div>

        {/* Weekdays */}
        <div className="grid grid-cols-7 text-center text-[9px] font-bold text-slate-400 mb-0.5">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5 text-center min-h-[110px]">
          {days}
        </div>
      </div>

        {/* Milestone Badge */}
      <div className="mt-1.5 p-1.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white border border-slate-200 text-[#1b3b36] flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">Milestone</p>
            <p className="text-[11px] font-bold text-slate-800 leading-tight">Scheduled Vault Audit</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-emerald-800 border-2 border-emerald-300 shadow-xs">
          28 {monthNames[month]}
        </span>
      </div>
    </div>
  )
}

// ── Compact SVG Donut Chart ──────────────────────────────────────────────────
function DonutChart({ counts }) {
  const total = (counts.PRIVATE || 0) + (counts['SHARED WITH'] || 0) + (counts.PUBLIC || 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-xs text-slate-400">
        No documents classified yet
      </div>
    )
  }

  const pvt = counts.PRIVATE || 0
  const shd = counts['SHARED WITH'] || 0
  const pub = counts.PUBLIC || 0

  const circumference = 2 * Math.PI * 34
  const pvtStroke = (pvt / total) * circumference
  const shdStroke = (shd / total) * circumference
  const pubStroke = (pub / total) * circumference

  const pvtOffset = 0
  const shdOffset = -pvtStroke
  const pubOffset = -(pvtStroke + shdStroke)

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="34" fill="transparent" stroke="#f1f5f9" strokeWidth="11" />
          {/* PRIVATE (Rose) */}
          <circle cx="44" cy="44" r="34" fill="transparent" stroke="#ef4444" strokeWidth="11"
            strokeDasharray={`${pvtStroke} ${circumference}`} strokeDashoffset={pvtOffset} />
          {/* SHARED WITH (Amber) */}
          <circle cx="44" cy="44" r="34" fill="transparent" stroke="#f59e0b" strokeWidth="11"
            strokeDasharray={`${shdStroke} ${circumference}`} strokeDashoffset={shdOffset} />
          {/* PUBLIC (Emerald) */}
          <circle cx="44" cy="44" r="34" fill="transparent" stroke="#10b981" strokeWidth="11"
            strokeDasharray={`${pubStroke} ${circumference}`} strokeDashoffset={pubOffset} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-slate-900 leading-none">{total}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Docs</span>
        </div>
      </div>

      <div className="flex-1 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-rose-500" />
            <span className="font-semibold text-slate-700">PRIVATE</span>
          </div>
          <span className="font-bold text-slate-900">{pvt} ({Math.round((pvt/total)*100)}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-amber-500" />
            <span className="font-semibold text-slate-700">SHARED WITH</span>
          </div>
          <span className="font-bold text-slate-900">{shd} ({Math.round((shd/total)*100)}%)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-xs bg-emerald-500" />
            <span className="font-semibold text-slate-700">PUBLIC</span>
          </div>
          <span className="font-bold text-slate-900">{pub} ({Math.round((pub/total)*100)}%)</span>
        </div>
      </div>
    </div>
  )
}

// ── Compact Full-Screen Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data)
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1b3b36] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const {
    stats = {},
    classCounts = {},
    recentLogs = [],
    actorFleet = [],
    pendingSecurityTasks = [],
    healthScore = 100,
    healthLevel = 'nominal',
    healthBadge = 'Subsystems Nominal',
    healthMessage = 'Health score • Zero vulnerabilities detected',
    pillars = {},
    isSuperAdmin
  } = data || {}

  const isCritical = healthLevel === 'critical'
  const isWarning  = healthLevel === 'warning'

  const pillarsList = (pillars && Object.keys(pillars).length > 0)
    ? pillars
    : {
        aes:       { name: 'AES-256-GCM', status: 'Active',    level: 'nominal', sub: 'Payload Vault' },
        hmac:      { name: 'HMAC-SHA256', status: 'Verified',  level: 'nominal', sub: 'Anti-Tamper' },
        rsa:       { name: 'RSA-2048',    status: 'Enforced',  level: 'nominal', sub: 'Signatures' },
        zeroTrust: { name: 'Zero Trust',  status: 'Nominal',   level: 'nominal', sub: 'Access Guard' },
        rbac:      { name: 'RBAC Matrix', status: 'Compliant', level: 'nominal', sub: '3 Roles Strict' }
      }

  return (
    <div className="space-y-2.5 max-w-7xl mx-auto">

      {isSuperAdmin ? (
        <>
          {/* Row 1: Cryptographic Vault Health (2/3) + Security Calendar (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">

            {/* Cryptographic Vault Health Card — Dynamique selon healthLevel */}
            <div className={`lg:col-span-2 text-white rounded-xl p-3.5 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all duration-500 ${
              isCritical
                ? 'bg-gradient-to-br from-[#3b0d0d] via-[#2d0a0a] to-[#1c0505] border-2 border-rose-500/80 shadow-lg shadow-rose-950/40'
                : isWarning
                ? 'bg-gradient-to-br from-[#3b2308] via-[#2e1c06] to-[#1c1103] border-2 border-amber-500/60 shadow-md shadow-amber-950/30'
                : 'bg-[#1b3b36]'
            }`}>
              <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-2xl pointer-events-none transition-all duration-500 ${
                isCritical ? 'bg-rose-500/30' : isWarning ? 'bg-amber-500/20' : 'bg-emerald-500/10'
              }`} />

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isCritical ? 'bg-rose-400 animate-ping' : isWarning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                    }`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      isCritical ? 'text-rose-200' : isWarning ? 'text-amber-200' : 'text-[#9ec1ba]'
                    }`}>HyperVault Health</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                    isCritical
                      ? 'bg-rose-500/30 text-rose-200 border-rose-400 animate-pulse'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/50'
                      : 'bg-white/10 text-emerald-300 border-emerald-400/30'
                  }`}>
                    {healthBadge}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline gap-2 mb-2">
                  <p className={`text-2xl lg:text-3xl font-black tracking-tight ${
                    isCritical ? 'text-rose-100' : isWarning ? 'text-amber-100' : 'text-white'
                  }`}>{healthScore}%</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isCritical
                      ? 'text-rose-300 bg-rose-500/20 border-rose-400/40'
                      : isWarning
                      ? 'text-amber-300 bg-amber-500/20 border-amber-400/40'
                      : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                  }`}>
                    Live Evaluation
                  </span>
                  <span className={`text-[10px] ${
                    isCritical ? 'text-rose-200 font-semibold' : isWarning ? 'text-amber-200 font-medium' : 'text-[#9ec1ba]'
                  }`}>
                    {healthMessage}
                  </span>
                </div>
              </div>

              {/* 5 Security Pillar Cards (Dynamiques individuellement) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                {Object.values(pillarsList).map((pillar) => {
                  const isPillarCritical = pillar.level === 'critical'
                  const isPillarWarning  = pillar.level === 'warning'
                  return (
                    <div
                      key={pillar.name}
                      className={`rounded-lg p-2 shadow-xs flex flex-col justify-between transition-all duration-300 ${
                        isPillarCritical
                          ? 'bg-rose-50 border-2 border-rose-400 text-rose-950 animate-pulse'
                          : isPillarWarning
                          ? 'bg-amber-50 border-2 border-amber-300 text-amber-950'
                          : 'bg-white text-slate-800'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 ${
                        isPillarCritical
                          ? 'bg-rose-200 text-rose-700'
                          : isPillarWarning
                          ? 'bg-amber-200 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isPillarCritical ? (
                          <AlertOctagon className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : isPillarWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold leading-tight">{pillar.name}</p>
                        <p className={`text-[8.5px] font-bold mt-0.5 flex items-center gap-1 ${
                          isPillarCritical ? 'text-rose-600 font-black' : isPillarWarning ? 'text-amber-700 font-black' : 'text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isPillarCritical ? 'bg-rose-500' : isPillarWarning ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {pillar.status}
                        </p>
                        <p className={`text-[8px] truncate ${
                          isPillarCritical ? 'text-rose-600 font-bold' : isPillarWarning ? 'text-amber-700 font-semibold' : 'text-slate-400'
                        }`}>
                          {pillar.sub}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Security Calendar Card */}
            <SecurityCalendar />
          </div>

          {/* Row 2: 3 Cards (Pending Tasks, Documents Donut, Actor Fleet) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">

            {/* Card 1: Pending Security Tasks */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900">Pending Security Tasks</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white border-2 border-amber-300 text-amber-800">
                    {pendingSecurityTasks.length} pending
                  </span>
                </div>

                <div className="space-y-1.5">
                  {pendingSecurityTasks.map((t, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <p className="text-[11px] font-bold text-slate-800 truncate">{t.title}</p>
                        <p className="text-[9.5px] text-slate-500 truncate">{t.subtitle}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8.5px] font-bold whitespace-nowrap border-2 ${
                        t.priorityClass === 'rose'
                          ? 'bg-rose-50 border-rose-400 text-rose-800 animate-pulse'
                          : t.priorityClass === 'amber'
                          ? 'bg-white border-amber-300 text-amber-800'
                          : 'bg-white border-teal-300 text-teal-800'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  ))}
                  {pendingSecurityTasks.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">All security checks passed.</p>
                  )}
                </div>
              </div>

              <Link to="/admin/users" className="mt-2 pt-1.5 flex items-center justify-between text-[11px] font-bold text-[#1b3b36] hover:underline border-t border-slate-100">
                <span>Manage Users & Roles</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card 2: Document Classifications (Donut Chart) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900">Document Classifications</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white border-2 border-slate-300 text-slate-700">
                    Vault Breakdown
                  </span>
                </div>
                <DonutChart counts={classCounts} />
              </div>

              <Link to="/documents" className="mt-2 pt-1.5 flex items-center justify-between text-[11px] font-bold text-[#1b3b36] hover:underline border-t border-slate-100">
                <span>Browse All Documents</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Card 3: Actor Fleet */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900">Actor Fleet</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white border-2 border-emerald-300 text-emerald-800">
                    {actorFleet.length} Active
                  </span>
                </div>

                <div className="space-y-1.5">
                  {actorFleet.slice(0, 3).map((actor) => (
                    <div key={actor.id} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[#1b3b36] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {actor.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">{actor.username}</p>
                          <p className="text-[9px] text-slate-400 truncate">{actor.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <RoleBadge role={actor.role} />
                        <span className={`w-1.5 h-1.5 rounded-full ${actor.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Link to="/admin/users" className="mt-2 pt-1.5 flex items-center justify-between text-[11px] font-bold text-[#1b3b36] hover:underline border-t border-slate-100">
                <span>View Full Fleet</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

          </div>

          {/* Row 3: Recent Security Activity (Slim Single Strip) */}
          <div className="bg-white rounded-xl border border-slate-200 px-3.5 py-2 shadow-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 whitespace-nowrap">Recent Activity:</h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-4 text-xs overflow-x-auto scrollbar-thin py-0.5">
                {recentLogs.slice(0, 3).map((log) => (
                  <div key={log.id} className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${log.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="font-semibold text-slate-700 text-[11px] truncate max-w-[220px]">{log.details}</span>
                    <span className="text-[9.5px] text-slate-400">({log.username || 'System'})</span>
                  </div>
                ))}
              </div>
            </div>
            <Link to="/audit/logs" className="text-[11px] text-[#1b3b36] font-bold hover:underline flex-shrink-0 whitespace-nowrap">
              View All Logs →
            </Link>
          </div>
        </>
      ) : (
        /* Non-SuperAdmin View (Employee & RH Manager) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-900">{stats.totalDocuments || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Accessible Documents</p>
              </div>
            </div>
            <Link to="/documents" className="inline-flex items-center gap-2 text-xs font-bold text-[#1b3b36] hover:underline">
              <span>Go to My Documents</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <Link to="/documents/create"
            className="group bg-white rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-600 p-5 shadow-xs flex items-center gap-3 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-[#1b3b36] flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-emerald-700 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Create New Document</p>
              <p className="text-[11px] text-slate-500">Encrypt payload with AES-256-GCM & sign with RSA</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
