import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import Select from './Select.jsx'

export const PAGE_SIZES = [10, 20, 50, 100]

// Page numbers to show: first, last, the current page and its neighbours, with
// "…" filling the gaps. Keeps the control compact when there are many pages.
function pageWindow(current, count) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
  const pages = new Set([1, count, current, current - 1, current + 1])
  const sorted = [...pages].filter((n) => n >= 1 && n <= count).sort((a, b) => a - b)
  const out = []
  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push('gap-' + n)
    out.push(n)
    prev = n
  }
  return out
}

// `page` should already be clamped (pass safePage). Buttons clamp again so they
// never overshoot even if page is briefly stale.
export default function Pagination({ page, pageCount, total, pageSize, onPage, onPageSize }) {
  const go = (n) => onPage(Math.min(pageCount, Math.max(1, n)))
  const jump = pageCount > 3 // show the ±10 skip buttons once paging gets long

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
        {jump && (
          <button
            type="button"
            onClick={() => go(page - 10)}
            disabled={page <= 1}
            aria-label="Back 10 pages"
            className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, pageCount).map((n) =>
          typeof n === 'string' ? (
            <span key={n} className="px-1 text-sm text-content-muted">
              …
            </span>
          ) : (
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
          ),
        )}

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {jump && (
          <button
            type="button"
            onClick={() => go(page + 10)}
            disabled={page >= pageCount}
            aria-label="Forward 10 pages"
            className="rounded-md border border-purple-light bg-white p-2 text-content transition-colors disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <span className="text-sm text-content-muted">{total} total</span>
    </div>
  )
}
