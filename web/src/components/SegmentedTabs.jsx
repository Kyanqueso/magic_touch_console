// Segmented control. `options` is [{ value, label }] or plain strings.
// `full` stretches to the container; `size` bumps the padding.
export default function SegmentedTabs({
  value,
  onChange,
  options,
  disabled = false,
  full = false,
  size = 'md',
  className = '',
}) {
  const pad = size === 'lg' ? 'px-8' : 'px-5'
  return (
    <div
      className={`overflow-hidden rounded-lg border border-purple-light ${
        full ? 'flex w-full' : 'inline-flex'
      } ${className}`}
    >
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        return (
          <button
            key={val}
            type="button"
            disabled={disabled}
            onClick={() => onChange(val)}
            className={`py-2 text-sm font-medium transition-colors disabled:opacity-60 ${pad} ${
              full ? 'flex-1' : ''
            } ${
              value === val
                ? 'bg-secondary-bg text-white'
                : 'bg-white text-content hover:bg-component-bg'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
