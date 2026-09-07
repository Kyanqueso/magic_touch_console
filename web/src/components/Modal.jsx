import { cloneElement, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

// The open modals, innermost last. Keeps the scroll lock stack-safe and lets
// Escape close only the top one — a confirm dialog raised over a form must not
// dismiss the form underneath it as well.
let stack = []

const ACCENTS = {
  purple: 'bg-component-bg text-purple',
  info: 'bg-info/15 text-info',
  success: 'bg-success-tooltip-bg text-success-tooltip-icon',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger-tooltip-bg text-danger-tooltip-icon',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon,
  accent = 'purple',
  children,
}) {
  const idRef = useRef({})

  // Kept apart from the Escape handler below: that one re-runs whenever the
  // caller passes a fresh onClose, which must not reshuffle the stack.
  useEffect(() => {
    if (!open) return undefined
    const id = idRef.current
    stack.push(id)
    document.body.style.overflow = 'hidden'
    return () => {
      stack = stack.filter((x) => x !== id)
      if (stack.length === 0) document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape' && stack[stack.length - 1] === idRef.current) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-dropdown my-auto flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-4 border-b border-purple-light p-6">
          {icon && (
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                ACCENTS[accent] || ACCENTS.purple
              }`}
            >
              {cloneElement(icon, { className: 'h-5 w-5' })}
            </span>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold leading-tight tracking-tight text-content">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-content-muted">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 self-start rounded-lg p-1.5 text-content-muted transition-colors hover:bg-component-bg hover:text-content"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  )
}
