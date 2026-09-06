import { useEffect, useState } from 'react'
import { Plus, ReceiptText } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import Select from './Select.jsx'
import DateField from './DateField.jsx'

const EMPTY = { date: '', sInvId: '', paid: true }

// A Voucher is strictly based on an existing Sales Invoice. Its net amount
// defaults to that invoice's total.
export default function AddVoucherModal({ open, onClose, onSubmit, initial, sinvOptions }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setLoading(false)
    setForm(
      initial
        ? { date: initial.date || '', sInvId: initial.sInvId || '', paid: Boolean(initial.paid) }
        : EMPTY,
    )
  }, [open, initial])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.sInvId) next.sInvId = 'Required.'
    if (!form.date) next.date = 'Required.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onSubmit({ date: form.date, sInvId: form.sInvId, paid: form.paid })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={initial ? 'Edit Voucher' : 'Add Voucher'}
      icon={<ReceiptText />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField
            label="Date"
            value={form.date}
            onChange={(v) => set('date', v)}
            error={errors.date}
            disabled={loading}
          />
          <div>
            <label className="mb-2 block text-sm font-bold text-content">Sales Invoice</label>
            <Select
              wrapperClassName="w-full"
              placeholder="Select"
              value={form.sInvId}
              invalid={Boolean(errors.sInvId)}
              onChange={(v) => set('sInvId', v)}
              options={sinvOptions}
            />
            {errors.sInvId && <p className="mt-1 text-sm text-danger">{errors.sInvId}</p>}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-content">Paid?</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-purple-light">
            {[
              { v: true, l: 'Yes' },
              { v: false, l: 'No' },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() => set('paid', o.v)}
                className={`px-6 py-1.5 text-sm font-medium transition-colors ${
                  form.paid === o.v
                    ? 'bg-secondary-bg text-white'
                    : 'bg-white text-content hover:bg-component-bg'
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

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
