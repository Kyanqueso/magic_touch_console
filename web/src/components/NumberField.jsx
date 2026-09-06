import { Minus, Plus } from 'lucide-react'
import {
  maskMoney,
  normalizeMoney,
  maskInteger,
  clampInt,
  maskPercent,
  normalizePercent,
} from '../lib/masks.js'

// Numeric input with live masking. Uses type="text" + inputMode to dodge the
// native number-input quirks (spinner, "e", locale parsing). `onChange` gets a
// string; `mode` is 'integer' | 'money' | 'percent'.

const SIZES = { md: 'py-3 text-base', sm: 'py-1.5 text-sm' }

export default function NumberField({
  value,
  onChange,
  mode = 'integer',
  min = 0,
  max,
  step,
  label,
  labelClassName = 'mb-2 block text-base font-bold text-content',
  error,
  invalid = false,
  disabled = false,
  size = 'md',
  suffix,
  steppers = false,
  wrapperClassName = '',
  className = '',
}) {
  const stepSize = step ?? (mode === 'money' ? 0.25 : 1)

  function handleChange(e) {
    const raw = e.target.value
    if (mode === 'money') onChange(maskMoney(raw))
    else if (mode === 'percent') onChange(maskPercent(raw))
    else onChange(maskInteger(raw))
  }

  function handleBlur() {
    if (value === '' || value == null) return
    if (mode === 'money') onChange(normalizeMoney(value, { min }))
    else if (mode === 'percent') onChange(normalizePercent(value))
    else onChange(clampInt(value, { min, max }))
  }

  function bump(dir) {
    const current = Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0
    let next = Math.round((current + dir * stepSize) * 100) / 100
    next = Math.max(min, next)
    if (max != null) next = Math.min(max, next)
    onChange(mode === 'money' ? next.toFixed(2) : String(next))
  }

  function handleKeyDown(e) {
    if (e.key === 'e' || e.key === 'E' || e.key === '+') e.preventDefault()
    if (e.key === '-' && min >= 0) e.preventDefault()
    if (e.key === '.' && mode !== 'money' && mode !== 'percent') e.preventDefault()
  }

  const borderCls =
    error || invalid
      ? 'border-danger'
      : 'border-purple-light focus-within:border-purple focus-within:ring-2 focus-within:ring-purple-light'

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      {label && <label className={labelClassName}>{label}</label>}
      <div className="flex items-center gap-2">
        <div
          className={`flex flex-1 items-center rounded-lg border bg-white transition-colors ${borderCls} ${
            disabled ? 'opacity-60' : ''
          }`}
        >
          <input
            type="text"
            inputMode={mode === 'integer' ? 'numeric' : 'decimal'}
            value={value ?? ''}
            disabled={disabled}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            aria-invalid={error || invalid ? true : undefined}
            className={`w-full min-w-0 rounded-lg bg-transparent px-4 text-content outline-none ${SIZES[size]}`}
          />
          {suffix && <span className="shrink-0 pr-3 text-sm text-content-muted">{suffix}</span>}
        </div>
        {steppers && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => bump(-1)}
              aria-label="Decrease"
              className="shrink-0 rounded-lg border border-purple-light bg-white p-2 text-content transition-colors hover:bg-component-bg disabled:opacity-50"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => bump(1)}
              aria-label="Increase"
              className="shrink-0 rounded-lg border border-purple-light bg-white p-2 text-content transition-colors hover:bg-component-bg disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
