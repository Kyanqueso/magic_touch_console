import { useEffect, useState } from 'react'
import { Plus, ShoppingCart, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Select from './Select.jsx'
import DateField from './DateField.jsx'
import NumberField from './NumberField.jsx'
import { peso } from '../lib/format.js'
import { dateRangeError } from '../lib/masks.js'
import { blankLine } from '../api/purchasing.js'

const TIGHT_LABEL = 'mb-1 block text-xs font-bold text-content'
const PO_UNITS = ['Pcs', 'Reams', 'Boxes', 'Packs', 'Sets', 'Rolls']
const MAX_PO_ITEMS = 10

export default function AddPurchaseOrderModal({ open, onClose, onSubmit, initial, materialOptions = [] }) {
  const [dateOrdered, setDateOrdered] = useState('')
  const [lines, setLines] = useState([blankLine()])
  const [preparedBy, setPreparedBy] = useState('')
  const [preparedDate, setPreparedDate] = useState('')
  const [approvedBy, setApprovedBy] = useState('')
  const [approvedDate, setApprovedDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setSubmitting(false)
    if (initial) {
      setDateOrdered(initial.dateOrdered || '')
      setLines(
        (initial.items || []).length
          ? initial.items.map((it) => ({ ...it }))
          : [blankLine()],
      )
      setPreparedBy(initial.preparedBy || '')
      setPreparedDate(initial.preparedDate || '')
      setApprovedBy(initial.approvedBy || '')
      setApprovedDate(initial.approvedDate || '')
    } else {
      setDateOrdered('')
      setLines([blankLine()])
      setPreparedBy('')
      setPreparedDate('')
      setApprovedBy('')
      setApprovedDate('')
    }
  }, [open, initial])

  function patchLine(id, patch) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))
  }

  function pickMaterial(id, materialId) {
    const m = materialOptions.find((x) => x.value === materialId)
    patchLine(id, {
      materialId,
      materialCode: m?.code || '',
      description: m?.label || '',
      unitPrice: m?.unitPrice ?? 0,
    })
  }

  function addLine() {
    if (lines.length >= MAX_PO_ITEMS) return
    setLines((ls) => [...ls, blankLine()])
  }

  function removeLine(id) {
    setLines((ls) => (ls.length === 1 ? ls : ls.filter((l) => l.id !== id)))
  }

  const withMaterial = lines.filter((l) => l.materialId)
  const grandTotal = withMaterial.reduce(
    (sum, l) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
    0,
  )

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!dateOrdered) next.dateOrdered = 'Required.'
    if (withMaterial.length === 0) next.items = 'Add at least one line item with a material.'
    if (dateRangeError(preparedDate, approvedDate)) {
      next.approvedDate = 'Approved is before the prepared date.'
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await onSubmit({
        dateOrdered,
        preparedBy: preparedBy.trim(),
        preparedDate,
        approvedBy: approvedBy.trim(),
        approvedDate,
        items: withMaterial.map((l) => ({
          id: l.id,
          materialId: l.materialId,
          qty: Number(l.qty) || 0,
          unit: l.unit,
          unitPrice: Number(l.unitPrice) || 0,
        })),
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={initial ? 'Edit Purchase Order' : 'Add Purchase Order'}
      icon={<ShoppingCart />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-5">
        <DateField
          label="Date Ordered"
          value={dateOrdered}
          onChange={(v) => {
            setDateOrdered(v)
            setErrors((x) => ({ ...x, dateOrdered: undefined }))
          }}
          error={errors.dateOrdered}
          disabled={submitting}
        />

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-content">
              Line Items{' '}
              <span className="font-normal text-content-muted">(Max {MAX_PO_ITEMS})</span>
            </p>
            <button
              type="button"
              onClick={addLine}
              disabled={lines.length >= MAX_PO_ITEMS || submitting}
              className="ml-auto inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-success-hover disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          {errors.items && <p className="mt-1 text-sm text-danger">{errors.items}</p>}

          <div className="mt-3 space-y-3">
            {lines.map((l, i) => (
              <div key={l.id} className="rounded-lg border border-purple-light p-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-content">{i + 1}. Material</label>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      aria-label="Remove line"
                      className="ml-auto rounded-md bg-danger p-1 text-white transition-colors hover:bg-danger-hover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Select
                  wrapperClassName="mt-1 w-full"
                  size="sm"
                  placeholder="Select a material"
                  value={l.materialId}
                  onChange={(v) => pickMaterial(l.id, v)}
                  options={materialOptions}
                />

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <NumberField
                    label="QTY"
                    labelClassName={TIGHT_LABEL}
                    size="sm"
                    mode="integer"
                    min={1}
                    steppers
                    value={l.qty}
                    onChange={(v) => patchLine(l.id, { qty: v })}
                  />
                  <div>
                    <label className="mb-1 block text-xs font-bold text-content">Unit</label>
                    <Select
                      wrapperClassName="w-full"
                      size="sm"
                      placeholder="Select"
                      value={l.unit}
                      onChange={(v) => patchLine(l.id, { unit: v })}
                      options={PO_UNITS.map((u) => ({ value: u, label: u }))}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <NumberField
                    label="Unit Price"
                    labelClassName={TIGHT_LABEL}
                    size="sm"
                    mode="money"
                    min={0}
                    step={0.25}
                    steppers
                    value={l.unitPrice}
                    onChange={(v) => patchLine(l.id, { unitPrice: v })}
                  />
                </div>
              </div>
            ))}
          </div>

          {withMaterial.length > 0 && (
            <p className="mt-3 text-right text-sm font-bold text-content">
              Total: {peso(grandTotal)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Prepared By"
            value={preparedBy}
            onChange={(e) => setPreparedBy(e.target.value)}
            disabled={submitting}
          />
          <DateField
            label="Prepared Date"
            value={preparedDate}
            onChange={(v) => setPreparedDate(v)}
            disabled={submitting}
          />
          <TextField
            label="Approved By"
            value={approvedBy}
            onChange={(e) => setApprovedBy(e.target.value)}
            disabled={submitting}
          />
          <DateField
            label="Approved Date"
            value={approvedDate}
            onChange={(v) => setApprovedDate(v)}
            error={dateRangeError(preparedDate, approvedDate, 'Approved is before the prepared date.')}
            disabled={submitting}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="dark" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={submitting} disabled={submitting}>
            {!submitting && <Plus className="h-4 w-4" />}
            {submitting ? 'Saving...' : initial ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
