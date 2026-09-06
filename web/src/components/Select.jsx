import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

const SIZES = {
  md: 'py-3 text-base',
  sm: 'py-2 text-sm',
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  size = 'md',
  wrapperClassName = '',
  invalid = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  function toggle() {
    if (!open) setActive(options.findIndex((o) => o.value === value))
    setOpen((v) => !v)
  }

  function choose(v) {
    onChange(v)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      setOpen(false)
    } else if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      toggle()
    } else if (open && e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (open && e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (open && e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      choose(options[active].value)
    }
  }

  return (
    <div ref={rootRef} className={`relative ${wrapperClassName}`}>
      <button
        type="button"
        onClick={toggle}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white pl-4 pr-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${SIZES[size]} ${
          open
            ? 'border-purple ring-2 ring-purple-light'
            : invalid
              ? 'border-danger'
              : 'border-purple-light hover:border-purple'
        }`}
      >
        <span className={selected ? 'text-content' : 'text-content-muted'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="animate-dropdown absolute z-20 mt-2 max-h-64 w-full min-w-max overflow-auto rounded-lg border border-purple-light bg-white p-1 shadow-lg"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o.value)}
                className={`flex cursor-pointer items-center justify-between gap-6 rounded-md px-3 py-2 text-sm transition-colors ${
                  i === active ? 'bg-component-bg' : ''
                } ${isSelected ? 'font-bold text-purple' : 'text-content'}`}
              >
                {o.label}
                {isSelected && <Check className="h-4 w-4 shrink-0" />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
