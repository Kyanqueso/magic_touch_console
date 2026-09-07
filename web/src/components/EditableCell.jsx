// A text cell in a table's edit mode. Turns red and explains itself while the
// value is invalid, so the problem is visible before Save rather than after the
// API refuses it.
export default function EditableCell({ value, onChange, error, className = '', ...props }) {
  return (
    <div className="min-w-28">
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className={`w-full rounded border bg-white px-2 py-1 text-sm outline-none transition-colors ${
          error
            ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger/30'
            : 'border-purple-light focus:border-purple focus:ring-1 focus:ring-purple-light'
        } ${className}`}
        {...props}
      />
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}

/** The message under an invalid cell. Wraps, so a table row can grow to fit it. */
export function FieldError({ children }) {
  return <p className="mt-1 whitespace-normal text-xs font-medium text-danger">{children}</p>
}
