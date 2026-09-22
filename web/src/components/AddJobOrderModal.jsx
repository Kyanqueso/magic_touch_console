import { useEffect, useState } from 'react'
import { ClipboardList, Plus, UserPlus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Select from './Select.jsx'
import Combobox from './Combobox.jsx'
import DateField from './DateField.jsx'
import NumberField from './NumberField.jsx'
import NoteField from './NoteField.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import DiscardChangesDialog from './DiscardChangesDialog.jsx'
import { maskDigits, dateRangeError } from '../lib/masks.js'

// One label style for every field in the form, so selects and text inputs line up.
const LABEL = 'mb-2 block text-base font-bold text-content'

const EQUIPMENT = ['offset', 'riso', 'comcolor', 'digital']
const UNITS = ['pcs', 'sets', 'booklets', 'pads', 'reams']
const SET_SIZE = 50

const opts = (list) => list.map((o) => ({ value: o, label: o }))
const norm = (s) => String(s ?? '').trim().toLowerCase()

const EMPTY = {
  companyName: '',
  branchCode: '',
  seriesFrom: '',
  seriesTo: '',
  noOfSets: '',
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
// `companies`: [{ name, branches: [{ customerId, branchCode }] }] — the Company
// picker is a strict dropdown, Branch is a combobox scoped to that company.
// `onCreateBranch(companyName, branchCode)` creates a new customer record for an
// unlisted branch and resolves to its id.
export default function AddJobOrderModal({ open, onClose, onAdd, companies = [], onCreateBranch }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [confirmNewBranch, setConfirmNewBranch] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setErrors({})
      setLoading(false)
      setConfirmDiscard(false)
      setConfirmNewBranch(false)
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

  // qty/seriesTo stay directly editable, but re-derive from sets/seriesFrom
  // whenever either changes (qty = sets * 50, seriesTo = seriesFrom + qty).
  function recompute(next) {
    const sets = Number(next.noOfSets)
    const from = Number(next.seriesFrom)
    if (next.noOfSets === '' || !Number.isFinite(sets)) return next
    const qty = sets * SET_SIZE
    const seriesTo = next.seriesFrom && Number.isFinite(from) ? String(from + qty) : next.seriesTo
    return { ...next, qty: String(qty), seriesTo }
  }

  function setNoOfSets(v) {
    setForm((f) => recompute({ ...f, noOfSets: v }))
    setErrors((e) => ({ ...e, noOfSets: undefined, qty: undefined, seriesTo: undefined }))
  }

  function setSeriesFrom(v) {
    setForm((f) => recompute({ ...f, seriesFrom: v }))
    setErrors((e) => ({ ...e, seriesFrom: undefined, seriesTo: undefined }))
  }

  const company = companies.find((c) => c.name === form.companyName)
  const branchOptions = (company?.branches || []).map((b) => b.branchCode).filter(Boolean)
  const existingBranch = company?.branches.find((b) => norm(b.branchCode) === norm(form.branchCode))

  const seriesError =
    form.seriesFrom && form.seriesTo && Number(form.seriesTo) < Number(form.seriesFrom)
      ? 'Series To is lower than Series From.'
      : ''
  const deliveryError = dateRangeError(
    form.dateOrdered,
    form.deliveryDate,
    'Delivery is before the order date.',
  )

  function validate() {
    const next = {}
    if (!form.companyName) next.companyName = 'Required.'
    if (!form.branchCode.trim()) next.branchCode = 'Required.'
    if (!form.jobDescription.trim()) next.jobDescription = 'Required.'
    if (seriesError) next.seriesTo = seriesError
    if (deliveryError) next.deliveryDate = deliveryError
    return next
  }

  async function submit(e) {
    e.preventDefault()
    const next = validate()
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    if (existingBranch) {
      await submitWith(existingBranch.customerId)
    } else {
      setConfirmNewBranch(true)
    }
  }

  async function submitWith(customerId) {
    setLoading(true)
    try {
      await onAdd({
        ...form,
        customerId,
        noOfSets: form.noOfSets === '' ? null : Number(form.noOfSets),
        qty: Number(form.qty) || 0,
        unitPrice: Number(form.unitPrice) || 0,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function confirmCreateBranch() {
    setConfirmNewBranch(false)
    setLoading(true)
    try {
      const customerId = await onCreateBranch(form.companyName, form.branchCode.trim())
      await submitWith(customerId)
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
              <label className={LABEL}>Company</label>
              <Select
                wrapperClassName="w-full"
                placeholder="Select a company"
                value={form.companyName}
                onChange={(v) => {
                  setForm((f) => ({ ...f, companyName: v, branchCode: '' }))
                  setErrors((e) => ({ ...e, companyName: undefined, branchCode: undefined }))
                }}
                options={companies.map((c) => ({ value: c.name, label: c.name }))}
                invalid={Boolean(errors.companyName)}
                disabled={loading}
              />
              {errors.companyName && (
                <p className="mt-2 text-sm text-danger">{errors.companyName}</p>
              )}
            </div>
            <div>
              <label className={LABEL}>Branch</label>
              <Combobox
                wrapperClassName="w-full"
                placeholder={form.companyName ? 'Select or type a branch code' : 'Select a company first'}
                value={form.branchCode}
                onChange={(v) => set('branchCode', v)}
                options={branchOptions}
                invalid={Boolean(errors.branchCode)}
                disabled={loading || !form.companyName}
              />
              {errors.branchCode && (
                <p className="mt-2 text-sm text-danger">{errors.branchCode}</p>
              )}
            </div>
            {select('Equipment', 'equipment', EQUIPMENT)}
            {text('Job Description', 'jobDescription')}
            {text('Specification', 'specification')}
          </div>
          {/* Series From/To need the sets recompute, so they bypass the generic text() helper. */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Series From"
              value={form.seriesFrom}
              onChange={(e) => setSeriesFrom(maskDigits(e.target.value))}
              error={errors.seriesFrom}
              disabled={loading}
            />
            <TextField
              label="Series To"
              value={form.seriesTo}
              onChange={(e) => set('seriesTo', maskDigits(e.target.value))}
              error={errors.seriesTo || seriesError}
              disabled={loading}
            />
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
            <NumberField
              label="No. of Sets"
              value={form.noOfSets}
              onChange={setNoOfSets}
              error={errors.noOfSets}
              disabled={loading}
              mode="integer"
              min={0}
            />
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

      <ConfirmDialog
        open={confirmNewBranch}
        onClose={() => setConfirmNewBranch(false)}
        title="Add New Branch"
        confirmLabel="Add Branch"
        cancelLabel="Cancel"
        loadingLabel="Adding..."
        confirmVariant="success"
        confirmIcon={<UserPlus className="h-4 w-4" />}
        onConfirm={confirmCreateBranch}
      >
        <p>
          No branch <span className="font-bold">{form.branchCode.trim()}</span> exists for{' '}
          <span className="font-bold">{form.companyName}</span> yet.
        </p>
        <p className="mt-2">Add it as a new customer record?</p>
      </ConfirmDialog>
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
