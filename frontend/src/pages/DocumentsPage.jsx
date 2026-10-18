import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'
import { useAuth } from '../contexts/AuthContext'
import ClassificationBadge from '../components/ui/ClassificationBadge'
import Pagination from '../components/ui/Pagination'
import { Plus, Search, FileText, Calendar, ArrowRight, Lock, Users, Globe } from 'lucide-react'

const TABS = [
  { id: 'All',         label: 'All' },
  { id: 'PRIVATE',     label: 'PRIVATE',     icon: Lock },
  { id: 'SHARED WITH', label: 'SHARED WITH', icon: Users },
  { id: 'PUBLIC',      label: 'PUBLIC',      icon: Globe }
]
const PER_PAGE = 10

export default function DocumentsPage() {
  const { user } = useAuth()
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('All')
  const [page, setPage]         = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then(r => r.data)
  })

  const docs = data?.documents || []

  const filtered = useMemo(() => {
    let result = docs
    if (tab !== 'All') result = result.filter(d => d.classification === tab)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(d => d.title.toLowerCase().includes(q) || d.username?.toLowerCase().includes(q))
    }
    return result
  }, [docs, tab, search])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const currentDocs = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleSearch = (v) => { setSearch(v); setPage(1) }
  const handleTab    = (t) => { setTab(t); setPage(1) }

  // Tab styling helper with rich, lively colors
  const getTabClass = (tabId) => {
    const isAct = tab === tabId
    if (tabId === 'All') {
      return isAct
        ? 'bg-[#1b3b36] text-white shadow-md shadow-[#1b3b36]/30 border-2 border-[#1b3b36]'
        : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-[#1b3b36] hover:bg-slate-50'
    }
    if (tabId === 'PRIVATE') {
      return isAct
        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 border-2 border-rose-600'
        : 'bg-rose-50 text-rose-700 border-2 border-rose-200 hover:bg-rose-100 hover:border-rose-400'
    }
    if (tabId === 'SHARED WITH') {
      return isAct
        ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 border-2 border-amber-500'
        : 'bg-amber-50 text-amber-800 border-2 border-amber-200 hover:bg-amber-100 hover:border-amber-400'
    }
    if (tabId === 'PUBLIC') {
      return isAct
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border-2 border-emerald-600'
        : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400'
    }
    return ''
  }

  // Row icon theme helper matching classification
  const getDocIconTheme = (classification) => {
    if (classification === 'PRIVATE')     return 'bg-rose-100 text-rose-600'
    if (classification === 'SHARED WITH') return 'bg-amber-100 text-amber-600'
    return 'bg-emerald-100 text-emerald-600'
  }

  return (
    <div className="max-w-6xl space-y-4">
      {/* Header with vibrant CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Document Vault</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="font-bold text-[#1b3b36]">{docs.length}</span> encrypted documents accessible to you
          </p>
        </div>
        <Link
          to="/documents/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#1b3b36] hover:from-emerald-500 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Document</span>
        </Link>
      </div>

      {/* Search + colorful filter pills */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3 flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by title or author…"
            className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#1b3b36] transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => handleTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${getTabClass(t.id)}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-[#1b3b36] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-semibold text-sm">No documents found</p>
            <p className="text-xs mt-1">Try a different filter or create a new document.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Classification</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Author</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentDocs.map(doc => {
                  const iconTheme = getDocIconTheme(doc.classification)
                  const isAuthor = doc.user_id === user?.id

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs ${iconTheme}`}>
                            <FileText className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <span className="font-bold text-slate-800 truncate max-w-[240px] text-xs">
                            {doc.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ClassificationBadge value={doc.classification} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{doc.username || '—'}</span>
                          {isAuthor && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          to={`/documents/${doc.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-xs shadow-emerald-600/30 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 stroke-[3]" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
