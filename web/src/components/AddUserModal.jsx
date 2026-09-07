import { useEffect, useState } from 'react'
import { Plus, ShieldCheck, UserPlus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import SegmentedTabs from './SegmentedTabs.jsx'
import AccessToggle from './AccessToggle.jsx'
import { maskPhone, sanitizeEmail, isEmail } from '../lib/masks.js'

const EMPTY = { firstName: '', lastName: '', email: '', contactNo: '' }
const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' },
]

// `onAdd(data)` should return a promise; the modal closes once it resolves.
// `modules` is [{ key, name }] from the backend.
export default function AddUserModal({ open, onClose, onAdd, modules = [] }) {
  const [form, setForm] = useState(EMPTY)
  const [role, setRole] = useState('user')
  const [matrix, setMatrix] = useState([])
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setRole('user')
      setMatrix(modules.map((m) => ({ key: m.key, name: m.name, level: 'No Access' })))
      setErrors({})
      setLoading(false)
    }
  }, [open, modules])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const setLevel = (key, level) =>
    setMatrix((rows) => rows.map((r) => (r.key === key ? { ...r, level } : r)))

  async function submit(e) {
    e.preventDefault()
    const next = {}
    if (!form.firstName.trim()) next.firstName = 'Required.'
    if (!form.lastName.trim()) next.lastName = 'Required.'
    if (!form.email.trim()) next.email = 'Required.'
    else if (!isEmail(form.email)) next.email = 'Enter a valid email address.'
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setLoading(true)
    try {
      await onAdd({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        contactNo: form.contactNo.trim(),
        role,
        matrix,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const isAdmin = role === 'admin'

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Add User"
      description="Creates their login and sets module access."
      icon={<UserPlus />}
      accent="success"
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-lg bg-component-bg px-3 py-2 text-sm text-content-muted">
          No password is set here. Tell them to open the login page, choose{' '}
          <span className="font-semibold text-content">Forgot password?</span>, and enter this
          email to receive a code and set their own.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="First Name"
            value={form.firstName}
            onChange={(e) => set('firstName', e.target.value)}
            error={errors.firstName}
            disabled={loading}
            maxLength={50}
          />
          <TextField
            label="Last Name"
            value={form.lastName}
            onChange={(e) => set('lastName', e.target.value)}
            error={errors.lastName}
            disabled={loading}
            maxLength={50}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => set('email', sanitizeEmail(e.target.value))}
          error={errors.email}
          disabled={loading}
        />
        <TextField
          label="Contact No."
          inputMode="tel"
          placeholder="0917-123-4567"
          value={form.contactNo}
          onChange={(e) => set('contactNo', maskPhone(e.target.value))}
          disabled={loading}
        />

        <div>
          <p className="mb-2 text-base font-bold text-content">Role</p>
          <SegmentedTabs
            full
            value={role}
            options={ROLE_OPTIONS}
            disabled={loading}
            onChange={setRole}
          />
        </div>

        {isAdmin ? (
          <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-tooltip-bg px-3 py-2.5 text-sm text-content-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <span>
              Admins have full access to every module and can manage other users; the per-module
              list does not apply.{' '}
              <span className="font-bold text-danger">
                This is permanent — an admin can't be demoted or deleted afterward.
              </span>
            </span>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-base font-bold text-content">Access per module</p>
            <div className="space-y-2">
              {matrix.map((m) => (
                <div
                  key={m.key}
                  className="flex flex-col gap-2 rounded-lg border border-purple-light p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-semibold text-content">{m.name}</span>
                  <AccessToggle value={m.level} onChange={(lvl) => setLevel(m.key, lvl)} />
                </div>
              ))}
            </div>
          </div>
        )}

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
