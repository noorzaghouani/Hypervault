import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {page > 3 && (
        <>
          <PageBtn n={1} current={page} onClick={onPageChange} />
          {page > 4 && <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">…</span>}
        </>
      )}

      {pages.map(n => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

      {page < totalPages - 2 && (
        <>
          {page < totalPages - 3 && <span className="w-9 h-9 flex items-center justify-center text-slate-400 text-sm">…</span>}
          <PageBtn n={totalPages} current={page} onClick={onPageChange} />
        </>
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function PageBtn({ n, current, onClick }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
        n === current
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {n}
    </button>
  )
}
