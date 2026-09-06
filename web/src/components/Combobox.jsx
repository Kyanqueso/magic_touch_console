import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const SIZES = {
  md: 'py-3 text-base',
  sm: 'py-2 text-sm',
}

// A typeable dropdown: pick an option, or type a value that isn't in the list
// and it passes straight through.
export default function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select or type...',
  size = 'md',
  wrapperClassName = '',
  invalid = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)

  const text = value || ''

  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.toLowerCase().includes(q))
  }, [options, text])

  const isNew =
    text.trim().length > 0 &&
    !options.some((o) => o.toLowerCase() === text.trim().toLowerCase())

  useEffect(() => {
    if (!open) return undefined
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function choose(v) {
    onChange(v)
    setOpen(false)
    setActive(-1)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' && open && active >= 0 && filtered[active]) {
      e.preventDefault()
      choose(filtered[active])
    }
  }

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`}>
      <div
        className={`flex items-center rounded-lg border bg-white pr-3 transition-colors ${
          disabled ? 'opacity-60' : ''
        } ${
          open
            ? 'border-purple ring-2 ring-purple-light'
            : invalid
              ? 'border-danger'
              : 'border-purple-light'
        }`}
      >
        <input
          value={text}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className={`w-full bg-transparent pl-4 text-content outline-none placeholder:text-content-muted disabled:cursor-not-allowed ${SIZES[size]}`}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label="Toggle options"
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {open && (filtered.length > 0 || isNew) && (
        <ul
          role="listbox"
          className="animate-dropdown absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-purple-light bg-white p-1 shadow-lg"
        >
          {filtered.map((o, i) => (
            <li
              key={o}
              role="option"
              aria-selected={o === text}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
              className={`flex cursor-pointer items-center justify-between gap-6 rounded-md px-3 py-2 text-sm transition-colors ${
                i === active ? 'bg-component-bg' : ''
              } ${o === text ? 'font-bold text-purple' : 'text-content'}`}
            >
              {o}
            </li>
          ))}
          {isNew && (
            <li
              role="option"
              onClick={() => choose(text.trim())}
              className="cursor-pointer rounded-md px-3 py-2 text-sm text-content-muted transition-colors hover:bg-component-bg"
            >
              Use &ldquo;{text.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
