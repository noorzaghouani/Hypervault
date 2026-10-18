import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import api from '../api/axios'
import Pagination from '../components/ui/Pagination'
import { ClipboardList, Download, Search, CheckCircle, XCircle } from 'lucide-react'

const ACTION_COLORS = {
  LOGIN_SUCCESS   : 'bg-emerald-100 text-emerald-700',
  LOGIN_FAILED    : 'bg-rose-100 text-rose-700',
  ACCOUNT_LOCKED  : 'bg-rose-100 text-rose-700',
  LOGOUT          : 'bg-slate-100 text-slate-600',
  DOCUMENT_CREATED: 'bg-indigo-100 text-indigo-700',
  DOCUMENT_VIEWED : 'bg-indigo-100 text-indigo-700',
  DOCUMENT_UPDATED: 'bg-amber-100 text-amber-700',
  DOCUMENT_DELETED: 'bg-rose-100 text-rose-700',
  USER_CREATED    : 'bg-violet-100 text-violet-700',
  ROLE_CHANGED    : 'bg-violet-100 text-violet-700',
  UNAUTHORIZED_ACCESS: 'bg-rose-100 text-rose-700',
  AUDIT_EXPORTED  : 'bg-teal-100 text-teal-700',
  PASSWORD_CHANGED: 'bg-emerald-100 text-emerald-700',
  PASSWORD_RESET  : 'bg-amber-100 text-amber-700'
}

export default function AuditLogsPage() {
  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => api.get(`/audit/logs?page=${page}`).then(r => r.data),
    placeholderData: keepPreviousData
  })

  const logs  = data?.logs || []
  const pgn   = data?.pagination || { page: 1, totalPages: 1, total: 0 }
  const stats = data?.stats || []

  const topActions = stats.slice(0, 5)

  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(l =>
      l.action?.toLowerCase().includes(q) ||
      l.username?.toLowerCase().includes(q) ||
      l.detailsFormatted?.toLowerCase().includes(q)
    )
  }, [logs, search])

  const handleExport = () => {
    window.location.href = '/api/audit/export'
  }

  return (
    <div className="max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Security Audit Trail</h2>
            <p className="text-sm text-slate-500">{pgn.total} total events recorded</p>
          </div>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1b3b36] hover:from-emerald-500 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-700/25 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
          <Download className="w-4 h-4 stroke-[2.5]" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats strip */}
      {topActions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {topActions.map(s => (
            <div key={s.action} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
              <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${ACTION_COLORS[s.action] || 'bg-slate-100 text-slate-600'}`}>
                {s.action.replace(/_/g, ' ')}
              </span>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{s.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by action, user or details…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Logs table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardList className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold">No logs found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">User</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="text-center px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex text-[10px] font-bold px-2.5 py-1 rounded-full ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{log.username || 'Anonymous'}</p>
                        {log.role && <p className="text-[10px] text-slate-400">{log.role}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 max-w-[280px] truncate">
                      {log.detailsFormatted || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {log.success
                        ? <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                        : <XCircle className="w-4 h-4 text-rose-500 mx-auto" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Page {pgn.page} of {pgn.totalPages} · {pgn.total} events
              </p>
              <Pagination page={pgn.page} totalPages={pgn.totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
