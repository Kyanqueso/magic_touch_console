import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Select from './Select.jsx'
import NoteField from './NoteField.jsx'
import { maskTIN, maskZip } from '../lib/masks.js'

export const TERMS = ['COD', '30', '60', '90']
export const SCOPES = ['Local', 'Global']
export const COMPANY_TYPES = ['Single', 'OPC', 'Partnership', 'Corporation']
export const TAX_TYPES = ['VAT', 'Non-VAT', 'VAT Exempt', 'Zero Rated']
export const WTAX_ATC = [
  'WI011 (10%)',
  'WI100 (5%)',
  'WI157 (2%)',
  'WI158 (1%)',
  'WC100 (5%)',
  'WC157 (2%)',
  'WC158 (1%)',
  'WC160 (2%)',
]

const EMPTY = {
  name: '',
  address: '',
  tin: '',
  zip: '',
  branchCode: '',
  terms: '30',
  companyType: '',
  taxType: '',
  wtax1: '',
  wtax2: '',
  scope: 'Local',
}

// `onSubmit(values)` should return a promise; the modal closes once it resolves.
// `scopeLocked` hides the Local/Global picker and forces scope to 'Global'
// (used by the top-level Customers/Suppliers pages).
export default function CompanyFormModal({
  open,
  onClose,
  onSubmit,
  title,
  submitLabel = 'Add',
  scopeLocked = false,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    scope: scopeLocked ? 'Global' : EMPTY.scope,
  }))
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, scope: scopeLocked ? 'Global' : EMPTY.scope })
      setErrors({})
      setLoading(false)
    }
  }, [open, scopeLocked])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setErrors({ name: 'Required.' })
      return
    }
    setLoading(true)
    try {
      await onSubmit({ ...form, name: form.name.trim() })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      description="Fill in the company details."
      icon={<Plus />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Company Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          disabled={loading}
        />
        <NoteField
          label="Company Address"
          rows={2}
          showCounter={false}
          value={form.address}
          onChange={(v) => set('address', v)}
          disabled={loading}
        />
        <TextField
          label="TIN"
          inputMode="numeric"
          placeholder="000-000-000-000"
          value={form.tin}
          onChange={(e) => set('tin', maskTIN(e.target.value))}
          disabled={loading}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Zip Code"
            inputMode="numeric"
            value={form.zip}
            onChange={(e) => set('zip', maskZip(e.target.value))}
            disabled={loading}
          />
          <TextField
            label="Branch Code"
            value={form.branchCode}
            onChange={(e) => set('branchCode', e.target.value)}
            disabled={loading}
          />
        </div>

        <PillGroup label="Terms" options={TERMS} value={form.terms} onChange={(v) => set('terms', v)} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Type">
            <Select
              wrapperClassName="w-full"
              placeholder="Select"
              value={form.companyType}
              onChange={(v) => set('companyType', v)}
              options={COMPANY_TYPES.map((o) => ({ value: o, label: o }))}
            />
          </Field>
          <Field label="Tax Type">
            <Select
              wrapperClassName="w-full"
              placeholder="Select"
              value={form.taxType}
              onChange={(v) => set('taxType', v)}
              options={TAX_TYPES.map((o) => ({ value: o, label: o }))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WTAX ATC 1">
            <Select
              wrapperClassName="w-full"
              placeholder="Select"
              value={form.wtax1}
              onChange={(v) => set('wtax1', v)}
              options={WTAX_ATC.map((o) => ({ value: o, label: o }))}
            />
          </Field>
          <Field label="WTAX ATC 2">
            <Select
              wrapperClassName="w-full"
              placeholder="Select"
              value={form.wtax2}
              onChange={(v) => set('wtax2', v)}
              options={WTAX_ATC.map((o) => ({ value: o, label: o }))}
            />
          </Field>
        </div>

        {!scopeLocked && (
          <PillGroup
            label="Scope"
            options={SCOPES}
            value={form.scope}
            onChange={(v) => set('scope', v)}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="dark" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={loading} disabled={loading}>
            {!loading && <Plus className="h-4 w-4" />}
            {loading ? 'Adding...' : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-2 block text-base font-bold text-content">{label}</label>
      {children}
    </div>
  )
}

function PillGroup({ label, options, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              value === o
                ? 'border-purple bg-purple-light text-content'
                : 'border-purple-light bg-white text-content-muted hover:border-purple'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </Field>
  )
}
