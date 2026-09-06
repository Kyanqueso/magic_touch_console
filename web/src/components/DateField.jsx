import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDate } from '../lib/format.js'

// Custom date field so the value shows as "Jun 8, 2025" everywhere instead of
// the browser's locale format. `value` is an ISO string (yyyy-mm-dd) or '';
// `onChange` receives the same ISO string (or '' when cleared).

const SIZES = { md: 'py-3 text-base', sm: 'py-2 text-sm' }
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n) => String(n).padStart(2, '0')
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseISO(value) {
  if (!value) return null
  const [y, m, d] = String(value).split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m: m - 1, d }
}

function todayParts() {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() }
}

// Flat list of cells for the month grid: leading blanks + day numbers.
function buildCells(y, m) {
  const firstDay = new Date(y, m, 1).getDay()
  const dayCount = new Date(y, m + 1, 0).getDate()
  const cells = Array(firstDay).fill(null)
  for (let d = 1; d <= dayCount; d += 1) cells.push(d)
  return cells
}

export default function DateField({
  value,
  onChange,
  label,
  id,
  name,
  placeholder = 'Select date',
  size = 'md',
  disabled = false,
  error,
  invalid = false,
  wrapperClassName = '',
  className = '',
  labelClassName = 'mb-2 block text-base font-bold text-content',
}) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [view, setView] = useState(() => {
    const base = parseISO(value) || todayParts()
    return { y: base.y, m: base.m }
  })
  const rootRef = useRef(null)

  const parsed = parseISO(value)
  const fieldId = id || name

  // Jump the grid back to the selected month each time the popover opens, and
  // flip it above the field when there isn't room below (e.g. low in a modal).
  useEffect(() => {
    if (!open) return
    const base = parseISO(value) || todayParts()
    setView({ y: base.y, m: base.m })
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 340 && rect.top > spaceBelow)
    }
  }, [open, value])

  useEffect(() => {
    if (!open) return undefined
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const cells = useMemo(() => buildCells(view.y, view.m), [view])
  const today = todayParts()

  function step(delta) {
    setView((v) => {
      const m = v.m + delta
      if (m < 0) return { y: v.y - 1, m: 11 }
      if (m > 11) return { y: v.y + 1, m: 0 }
      return { y: v.y, m }
    })
  }

  function pick(day) {
    onChange(toISO(view.y, view.m, day))
    setOpen(false)
  }

  const borderCls =
    error || invalid
      ? 'border-danger'
      : open
        ? 'border-purple ring-2 ring-purple-light'
        : 'border-purple-light hover:border-purple'

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className={labelClassName}>
          {label}
        </label>
      )}
      <div ref={rootRef} className="relative">
        <button
          id={fieldId}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={error || invalid ? true : undefined}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white pl-4 pr-3 text-left outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${borderCls}`}
        >
          <span className={parsed ? 'text-content' : 'text-content-muted'}>
            {parsed ? formatDate(value) : placeholder}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-content-muted" />
        </button>

        {open && (
          <div
            role="dialog"
            className={`animate-dropdown absolute left-0 z-20 w-72 rounded-lg border border-purple-light bg-white p-3 shadow-lg ${
              dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous month"
                className="rounded-md p-1 text-content-muted transition-colors hover:bg-component-bg"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-content">
                {MONTHS[view.m]} {view.y}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next month"
                className="rounded-md p-1 text-content-muted transition-colors hover:bg-component-bg"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1 text-xs font-bold text-content-muted">
                  {w}
                </span>
              ))}
              {cells.map((day, i) => {
                if (!day) return <span key={`b${i}`} />
                const isSelected =
                  parsed && parsed.y === view.y && parsed.m === view.m && parsed.d === day
                const isToday =
                  today.y === view.y && today.m === view.m && today.d === day
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    className={`h-8 rounded-md text-sm transition-colors ${
                      isSelected
                        ? 'bg-purple font-bold text-white'
                        : isToday
                          ? 'font-bold text-purple ring-1 ring-purple-light hover:bg-component-bg'
                          : 'text-content hover:bg-component-bg'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            {parsed && (
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="mt-2 w-full rounded-md py-1.5 text-xs font-semibold text-content-muted transition-colors hover:bg-component-bg"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
