export default function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-purple-light bg-white px-6 py-16 text-center">
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-component-bg text-purple">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="text-base font-bold text-content">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-content-muted">{subtitle}</p>}
    </div>
  )
}
