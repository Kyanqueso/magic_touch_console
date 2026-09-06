import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import Select from './Select.jsx'
import DateField from './DateField.jsx'

const EMPTY = { invoiceDate: '', poId: '' }

// A Sales Invoice is strictly based on an existing Purchase Order — its line
// items and total come from that PO.
export default function AddSalesInvoiceModal({ open, onClose, onSubmit, initial, poOptions }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setLoading(false)
    setForm(
      initial ? { invoiceDate: initial.invoiceDate || '', poId: initial.poId || '' } : EMPTY,
    )
  }, [open, initial])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.poId) next.poId = 'Required.'
    if (!form.invoiceDate) next.invoiceDate = 'Required.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onSubmit({ poId: form.poId, invoiceDate: form.invoiceDate })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={initial ? 'Edit S Invoice' : 'Add S Invoice'}
      icon={<FileText />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-bold text-content">Purchase Order</label>
          <Select
            wrapperClassName="w-full"
            placeholder="Select"
            value={form.poId}
            invalid={Boolean(errors.poId)}
            onChange={(v) => set('poId', v)}
            options={poOptions}
          />
          {errors.poId && <p className="mt-1 text-sm text-danger">{errors.poId}</p>}
        </div>

        <DateField
          label="Invoice Date"
          value={form.invoiceDate}
          onChange={(v) => set('invoiceDate', v)}
          error={errors.invoiceDate}
          disabled={loading}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="dark" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={loading} disabled={loading}>
            {!loading && <Plus className="h-4 w-4" />}
            {loading ? 'Adding...' : initial ? 'Save' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
