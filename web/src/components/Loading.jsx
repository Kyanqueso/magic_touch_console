import { Loader2 } from 'lucide-react'

// Spinner with a line saying what is being fetched. Name the thing —
// "Loading customers..." — so a slow page explains itself instead of sitting blank.
export default function Loading({ label = 'Loading...', className = '' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-16 ${className}`}
    >
      <Loader2 className="h-7 w-7 animate-spin text-purple" />
      <p className="text-sm text-content-muted">{label}</p>
    </div>
  )
}

// Fills the viewport, for when there is no page chrome to show yet.
export function LoadingScreen({ label = 'Loading...' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-component-bg">
      <Loading label={label} />
    </div>
  )
}
