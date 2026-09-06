import { ChevronLeft, ChevronRight } from 'lucide-react'
import Select from './Select.jsx'

export const PAGE_SIZES = [10, 20, 50, 100]

// `page` should already be clamped (pass safePage). Prev/next clamp again so
// they never overshoot even if page is briefly stale.
export default function Pagination({ page, pageCount, total, pageSize, onPage, onPageSize }) {
  const go = (n) => onPage(Math.min(pageCount, Math.max(1, n)))

  return (
    <div className="mt-6 flex flex-col items-center gap-4 md:flex-row md:justify-between">
      <Select
        size="sm"
        wrapperClassName="w-40"
        value={pageSize}
        onChange={(v) => onPageSize(Number(v))}
        options={PAGE_SIZES.map((s) => ({ value: s, label: `${s} per page` }))}
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPage(n)}
            className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
              n === page
                ? 'bg-black text-white'
                : 'border border-purple-light bg-white text-content hover:bg-component-bg'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <span className="text-sm text-content-muted">{total} total</span>
    </div>
  )
}
