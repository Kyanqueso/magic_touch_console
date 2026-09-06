export default function TextField({
  label,
  id,
  name,
  error,
  className = '',
  multiline = false,
  ...props
}) {
  const fieldId = id || name
  const Field = multiline ? 'textarea' : 'input'

  return (
    <div className={className}>
      {label && (
        <label htmlFor={fieldId} className="mb-2 block text-base font-bold text-content">
          {label}
        </label>
      )}
      <Field
        id={fieldId}
        name={name}
        aria-invalid={error ? true : undefined}
        className={`block w-full rounded-lg border bg-white px-4 py-3 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:ring-2 ${
          multiline ? 'min-h-24 resize-y' : ''
        } ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-purple-light focus:border-purple focus:ring-purple-light'
        }`}
        {...props}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
