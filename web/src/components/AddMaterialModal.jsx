import { useEffect, useState } from 'react'
import { Package, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Combobox from './Combobox.jsx'
import NumberField from './NumberField.jsx'

const round2 = (n) => Math.round(n * 100) / 100

// `onAdd(values)` should return a promise; the modal closes once it resolves.
// `values.group` is free text — an existing group or a new one.
export default function AddMaterialModal({ open, onClose, onAdd, groups }) {
  const [form, setForm] = useState({ group: '', code: '', description: '', unitPrice: '0.00' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ group: '', code: '', description: '', unitPrice: '0.00' })
      setErrors({})
      setLoading(false)
    }
  }, [open])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!form.group.trim()) next.group = 'Required.'
    if (!form.code.trim()) next.code = 'Required.'
    if (!form.description.trim()) next.description = 'Required.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onAdd({
        group: form.group.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
        unitPrice: round2(Number(form.unitPrice) || 0),
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Add Material"
      icon={<Package />}
      accent="success"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-base font-bold text-content">Material Group</label>
          <Combobox
            wrapperClassName="w-full"
            placeholder="Select or type a group"
            value={form.group}
            onChange={(v) => set('group', v)}
            options={groups.map((g) => g.name)}
            invalid={Boolean(errors.group)}
          />
          {errors.group && <p className="mt-2 text-sm text-danger">{errors.group}</p>}
        </div>

        <TextField
          label="Enter Material Code"
          name="code"
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          error={errors.code}
          disabled={loading}
        />
        <TextField
          label="Enter Material Description"
          name="description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          disabled={loading}
        />

        <NumberField
          label="Unit Price"
          mode="money"
          min={0}
          step={0.25}
          steppers
          value={form.unitPrice}
          onChange={(v) => set('unitPrice', v)}
          disabled={loading}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="dark" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="sm" loading={loading} disabled={loading}>
            {!loading && <Plus className="h-4 w-4" />}
            {loading ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
