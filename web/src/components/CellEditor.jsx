import Select from './Select.jsx'
import Combobox from './Combobox.jsx'
import NumberField from './NumberField.jsx'
import DateField from './DateField.jsx'
import EditableCell, { FieldError } from './EditableCell.jsx'

// One editable table cell, shaped by the column's `edit` spec so a table field
// behaves exactly like the same field on the add form.
//
//   { select: [...] }              strict picker (the API takes an enum)
//   { combo:  [...] }              pick one, or type another valid value
//   { number: 'money' | 'integer' | 'percent', min, max, suffix }
//   { date: true }
//   { mask: fn, inputMode, placeholder }   text that formats as you type
//   {} / undefined                 plain text
export default function CellEditor({ spec = {}, value, error, onChange, className = '' }) {
  if (spec.select) {
    return (
      <Wrap error={error} className={`min-w-40 ${className}`}>
        <Select
          wrapperClassName="w-full"
          size="sm"
          placeholder="Select"
          value={value || ''}
          invalid={Boolean(error)}
          onChange={onChange}
          // A blank entry, so a value set by mistake can be taken back out.
          options={[
            { value: '', label: '— None —' },
            ...spec.select.map((o) => ({ value: o, label: o })),
          ]}
        />
      </Wrap>
    )
  }

  if (spec.combo) {
    return (
      <Wrap error={error} className={`min-w-40 ${className}`}>
        <Combobox
          wrapperClassName="w-full"
          size="sm"
          placeholder="Select or type"
          value={value || ''}
          invalid={Boolean(error)}
          onChange={onChange}
          options={spec.combo}
        />
      </Wrap>
    )
  }

  if (spec.number) {
    return (
      <NumberField
        size="sm"
        mode={spec.number}
        min={spec.min ?? 0}
        max={spec.max}
        step={spec.step}
        suffix={spec.suffix}
        wrapperClassName={`min-w-28 ${className}`}
        value={value ?? ''}
        error={error}
        onChange={onChange}
      />
    )
  }

  if (spec.date) {
    return (
      <DateField
        size="sm"
        wrapperClassName={`min-w-44 ${className}`}
        value={value ?? ''}
        error={error}
        onChange={onChange}
      />
    )
  }

  return (
    <EditableCell
      value={value}
      error={error}
      className={className}
      inputMode={spec.inputMode}
      placeholder={spec.placeholder}
      onChange={(v) => onChange(spec.mask ? spec.mask(v) : v)}
    />
  )
}

function Wrap({ error, className, children }) {
  return (
    <div className={className}>
      {children}
      {error && <FieldError>{error}</FieldError>}
    </div>
  )
}
