// Money: ₱1,234.50 — thousands separators, always two decimals.
export const peso = (n) =>
  `₱${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Dates everywhere render as "Jun 8, 2025". Accepts an ISO string
// ("2025-06-08"), a Date, or empty.
export function formatDate(value) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const today = () => formatDate(new Date())
