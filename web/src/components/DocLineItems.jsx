import { peso } from '../lib/format.js'

export function LineItems({ items = [] }) {
  return (
    <div className="divide-y divide-purple-light">
      {items.map((it, i) => (
        <div key={it.id || i} className="flex items-start justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="font-bold text-content">
              {i + 1}. {it.materialCode}
            </p>
            {it.description && (
              <p className="truncate text-xs text-content">{it.description}</p>
            )}
            <p className="text-xs text-content-muted">
              {it.qty} {it.unit} x {peso(it.unitPrice)}
            </p>
          </div>
          <span className="shrink-0 font-bold text-content">
            {peso(Number(it.qty) * Number(it.unitPrice))}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DebitCredit({ entries = [] }) {
  return (
    <div className="mt-3 space-y-3 border-t border-purple-light pt-3 text-sm">
      {entries.map((e, i) => (
        <div key={i} className="grid grid-cols-2 gap-x-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Debit</p>
            <p className="mt-0.5 font-medium text-content">{e.debit || '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">
              Credit
            </p>
            <p className="mt-0.5 font-medium text-content">{e.credit || '—'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
