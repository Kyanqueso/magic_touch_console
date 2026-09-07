import { useEffect, useState } from 'react'
import { ClipboardList, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Select from './Select.jsx'
import Combobox from './Combobox.jsx'
import DateField from './DateField.jsx'
import NumberField from './NumberField.jsx'
import NoteField from './NoteField.jsx'
import DiscardChangesDialog from './DiscardChangesDialog.jsx'
import { maskDigits, dateRangeError } from '../lib/masks.js'

// One label style for every field in the form, so selects and text inputs line up.
const LABEL = 'mb-2 block text-base font-bold text-content'

const BRANCHES = ['Main Branch', 'Lapuz', 'Mandurriao', 'Jaro', 'Molo']
const EQUIPMENT = ['offset', 'riso', 'comcolor', 'digital']
const UNITS = ['pcs', 'sets', 'booklets', 'pads', 'reams']

const opts = (list) => list.map((o) => ({ value: o, label: o }))

const EMPTY = {
  customerId: '',
  branch: 'Main Branch',
  seriesFrom: '',
  seriesTo: '',
  jobDescription: '',
  specification: '',
  equipment: 'offset',
  dateOrdered: '',
  deliveryDate: '',
  po: '',
  atp: '',
  atpDate: '',
  invoiceNo: '',
  invoiceDate: '',
  orNo: '',
  orDate: '',
  qty: '',
  unit: 'pcs',
  size: '',
  unitPrice: '',
  operator: '',
  collate: '',
  otherInstructions: '',
}

// `onAdd(values)` returns a promise; the modal closes once it resolves.
export default function AddJobOrderModal({ open, onClose, onAdd, customerOptions = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
      setLoading(false)
      setConfirmDiscard(false)
    }
  }, [open])

  const dirty = Object.keys(EMPTY).some((k) => form[k] !== EMPTY[k])

  // Closing a form with something in it should not silently bin the work.
  function requestClose() {
    if (loading) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const seriesError =
    form.seriesFrom && form.seriesTo && Number(form.seriesTo) < Number(form.seriesFrom)
      ? 'Series To is lower than Series From.'
      : ''
  const deliveryError = dateRangeError(
    form.dateOrdered,
    form.deliveryDate,
    'Delivery is before the order date.',
  )

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.customerId) next.customerId = 'Required.'
    if (!form.jobDescription.trim()) next.jobDescription = 'Required.'
    if (seriesError) next.seriesTo = seriesError
    if (deliveryError) next.deliveryDate = deliveryError
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onAdd({
        ...form,
        qty: Number(form.qty) || 0,
        unitPrice: Number(form.unitPrice) || 0,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const text = (label, key, { mask, error, ...props } = {}) => (
    <TextField
      label={label}
      value={form[key]}
      onChange={(e) => set(key, mask ? mask(e.target.value) : e.target.value)}
      error={errors[key] || error}
      disabled={loading}
      {...props}
    />
  )

  const num = (label, key, props = {}) => (
    <NumberField
      label={label}
      value={form[key]}
      onChange={(v) => set(key, v)}
      error={errors[key]}
      disabled={loading}
      {...props}
    />
  )

  const date = (label, key, error) => (
    <DateField
      label={label}
      value={form[key]}
      onChange={(v) => set(key, v)}
      error={errors[key] || error}
      disabled={loading}
    />
  )

  const select = (label, key, list) => (
    <div>
      <label className={LABEL}>{label}</label>
      <Select
        wrapperClassName="w-full"
        placeholder="Select"
        value={form[key]}
        onChange={(v) => set(key, v)}
        options={opts(list)}
      />
    </div>
  )

  // Branch is a combobox: pick a known branch, or type one that isn't listed yet.
  const branch = (
    <div>
      <label className={LABEL}>Branch</label>
      <Combobox
        wrapperClassName="w-full"
        placeholder="Select or type a branch"
        value={form.branch}
        onChange={(v) => set('branch', v)}
        options={BRANCHES}
        disabled={loading}
      />
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title="Add Job Order"
      description="Materials are added on the job order after it's created."
      icon={<ClipboardList />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-6">
        <Group title="Job">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Customer</label>
              <Select
                wrapperClassName="w-full"
                placeholder="Select a customer"
                value={form.customerId}
                onChange={(v) => set('customerId', v)}
                options={customerOptions}
                invalid={Boolean(errors.customerId)}
              />
              {errors.customerId && (
                <p className="mt-2 text-sm text-danger">{errors.customerId}</p>
              )}
            </div>
            {branch}
            {select('Equipment', 'equipment', EQUIPMENT)}
            {text('Job Description', 'jobDescription')}
            {text('Specification', 'specification')}
            {text('Series From', 'seriesFrom', { mask: maskDigits, inputMode: 'numeric' })}
            {text('Series To', 'seriesTo', { mask: maskDigits, inputMode: 'numeric', error: seriesError })}
          </div>
        </Group>

        <Group title="Order">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {date('Date Ordered', 'dateOrdered')}
            {date('Delivery Date', 'deliveryDate', deliveryError)}
            {text('PO', 'po')}
            {text('ATP', 'atp')}
            {date('ATP Issue Date', 'atpDate')}
            {text('Invoice No', 'invoiceNo')}
            {date('Invoice Date', 'invoiceDate')}
            {text('OR No', 'orNo')}
            {date('OR Date', 'orDate')}
          </div>
        </Group>

        <Group title="Quantity &amp; Pricing">
          <div className="grid grid-cols-2 gap-4">
            {num('QTY', 'qty', { mode: 'integer', min: 0 })}
            {select('Unit', 'unit', UNITS)}
            {text('Size', 'size')}
            {num('Unit Price', 'unitPrice', { mode: 'money', min: 0 })}
          </div>
        </Group>

        <Group title="Personnel">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('Operator', 'operator')}
            {text('Collate', 'collate')}
          </div>
        </Group>

        <NoteField
          label="Other Instructions"
          value={form.otherInstructions}
          onChange={(v) => set('otherInstructions', v)}
          rows={2}
          disabled={loading}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="dark" size="sm" onClick={requestClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={loading} disabled={loading}>
            {!loading && <Plus className="h-4 w-4" />}
            {loading ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>

      <DiscardChangesDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={onClose}
        entityLabel="job order"
      />
    </Modal>
  )
}

function Group({ title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-content-muted">{title}</h3>
      {children}
    </section>
  )
}
