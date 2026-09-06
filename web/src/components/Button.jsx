import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-purple text-white hover:bg-purple-hover disabled:bg-purple-disabled',
  secondary: 'bg-component-bg text-content hover:bg-purple-light disabled:opacity-50',
  ghost: 'bg-transparent text-content hover:bg-component-bg disabled:opacity-50',
  dark: 'bg-black text-white hover:bg-black/80 disabled:bg-purple-disabled',
  info: 'bg-info text-white hover:bg-info-hover disabled:bg-purple-disabled',
  success: 'bg-success text-white hover:bg-success-hover disabled:bg-purple-disabled',
  warning: 'bg-warning text-white hover:bg-warning-hover disabled:bg-purple-disabled',
  danger: 'bg-danger text-white hover:bg-danger-hover disabled:bg-purple-disabled',
}

const SIZES = {
  md: 'px-6 py-3 text-base',
  sm: 'px-4 py-2 text-sm',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-colors disabled:cursor-not-allowed ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className={`${size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} animate-spin`} />}
      {children}
    </button>
  )
}
