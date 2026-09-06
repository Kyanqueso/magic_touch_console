import { Check, Info, X, AlertCircle } from 'lucide-react'

const VARIANTS = {
  success: {
    box: 'bg-success-tooltip-bg border-success-tooltip-border text-success-tooltip-text',
    icon: 'text-success-tooltip-icon',
    Icon: Check,
  },
  danger: {
    box: 'bg-danger-tooltip-bg border-danger-tooltip-border text-danger-tooltip-text',
    icon: 'text-danger-tooltip-icon',
    Icon: AlertCircle,
  },
  neutral: {
    box: 'bg-neutral-tooltip-bg border-neutral-tooltip-border text-neutral-tooltip-text',
    icon: 'text-neutral-tooltip-icon',
    Icon: Info,
  },
}

export default function Alert({ variant = 'neutral', title, children, onDismiss }) {
  const { box, icon, Icon } = VARIANTS[variant] || VARIANTS.neutral

  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${box}`} role="status">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${icon}`} strokeWidth={2.5} />
      <div className="flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <p className={title ? 'mt-1' : ''}>{children}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
