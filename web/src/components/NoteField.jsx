import { countWords, limitWords } from '../lib/masks.js'

// Multi-line text with a hard word cap and a live word counter.
// `onChange` receives the (word-limited) string.

export default function NoteField({
  value,
  onChange,
  label,
  maxWords = 200,
  rows = 2,
  placeholder,
  disabled = false,
  error,
  showCounter = true,
  wrapperClassName = '',
  className = '',
}) {
  const words = countWords(value)
  const atLimit = words >= maxWords

  return (
    <div className={`${wrapperClassName} ${className}`.trim()}>
      {(label || showCounter) && (
        <div className="mb-2 flex items-baseline justify-between gap-2">
          {label ? (
            <label className="block text-base font-bold text-content">{label}</label>
          ) : (
            <span />
          )}
          {showCounter && (
            <span
              className={`text-xs ${atLimit ? 'font-bold text-danger' : 'text-content-muted'}`}
            >
              {words} / {maxWords} words
            </span>
          )}
        </div>
      )}
      <textarea
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(limitWords(e.target.value, maxWords))}
        aria-invalid={error ? true : undefined}
        className={`block w-full resize-y rounded-lg border bg-white px-4 py-3 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:ring-2 ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-purple-light focus:border-purple focus:ring-purple-light'
        }`}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
