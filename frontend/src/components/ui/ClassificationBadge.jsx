const cls = {
  PRIVATE:      'bg-white border-2 border-rose-300 text-rose-800',
  'SHARED WITH':'bg-white border-2 border-amber-300 text-amber-800',
  PUBLIC:       'bg-white border-2 border-emerald-300 text-emerald-800'
}

const dot = {
  PRIVATE:      'bg-rose-500',
  'SHARED WITH':'bg-amber-500',
  PUBLIC:       'bg-emerald-500'
}

export default function ClassificationBadge({ value }) {
  if (!value) return null
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold shadow-xs ${cls[value] || cls.PRIVATE}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[value] || dot.PRIVATE}`} />
      {value}
    </span>
  )
}
