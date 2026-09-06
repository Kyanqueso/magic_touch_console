import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import Select from './Select.jsx'
import Combobox from './Combobox.jsx'
import NumberField from './NumberField.jsx'
import NoteField from './NoteField.jsx'

const ACCOUNT_CLASSES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']

const EMPTY = {
  category: '',
  code: '',
  title: '',
  type: '',
  subType: '',
  atcCode: '',
  taxRate: '',
  referenceForm: '',
}

// `onAdd(values)` should return a promise; the modal closes once it resolves.
// `values.category` is free text — it may be an existing category or a new one.
export default function AddAccountModal({
  open,
  onClose,
  onAdd,
  categories,
  subTypes,
  defaultCategory = '',
}) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY, category: defaultCategory })
      setErrors({})
      setLoading(false)
    }
  }, [open, defaultCategory])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!form.category.trim()) next.category = 'Required.'
    if (!form.type) next.type = 'Required.'
    if (!form.code.trim()) next.code = 'Required.'
    if (!form.title.trim()) next.title = 'Required.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onAdd({
        ...form,
        category: form.category.trim(),
        code: form.code.trim(),
        title: form.title.trim(),
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
      title="Add Sub Account"
      description="Add a new account under a category."
      icon={<Plus />}
      accent="success"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-base font-bold text-content">Category</label>
          <Combobox
            wrapperClassName="w-full"
            placeholder="Select or type a category"
            value={form.category}
            onChange={(v) => set('category', v)}
            options={categories.map((c) => c.name)}
            invalid={Boolean(errors.category)}
          />
          {errors.category && (
            <p className="mt-2 text-sm text-danger">{errors.category}</p>
          )}
        </div>

        <TextField
          label="Enter Code"
          name="code"
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          error={errors.code}
          disabled={loading}
        />
        <TextField
          label="Enter Title"
          name="title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          disabled={loading}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-bold text-content">Account Class</label>
            <Select
              wrapperClassName="w-full"
              placeholder="Select class"
              value={form.type}
              onChange={(v) => set('type', v)}
              options={ACCOUNT_CLASSES.map((s) => ({ value: s, label: s }))}
              invalid={Boolean(errors.type)}
            />
            {errors.type && <p className="mt-2 text-sm text-danger">{errors.type}</p>}
          </div>
          <div>
            <label className="mb-2 block text-base font-bold text-content">Sub-type</label>
            <Select
              wrapperClassName="w-full"
              placeholder="Select sub-type"
              value={form.subType}
              onChange={(v) => set('subType', v)}
              options={subTypes.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="ATC Code"
            name="atcCode"
            value={form.atcCode}
            onChange={(e) => set('atcCode', e.target.value)}
            disabled={loading}
          />
          <NumberField
            label="Tax Rate"
            mode="percent"
            min={0}
            max={100}
            suffix="%"
            value={form.taxRate}
            onChange={(v) => set('taxRate', v)}
            disabled={loading}
          />
        </div>

        <NoteField
          label="Reference Form"
          rows={2}
          value={form.referenceForm}
          onChange={(v) => set('referenceForm', v)}
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
