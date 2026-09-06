import { useEffect, useState } from 'react'
import { Building2, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'

// `onAdd(name)` should return a promise; the modal closes once it resolves.
export default function AddCorporateProfileModal({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setError('')
      setLoading(false)
    }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a corporate profile name.')
      return
    }
    setLoading(true)
    try {
      await onAdd(name.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Add Corporate Profile"
      description="Create a new company workspace."
      icon={<Building2 />}
      accent="success"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextField
          label="Enter Corporate Profile"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          error={error}
          disabled={loading}
          autoFocus
        />

        <div className="flex justify-end gap-3">
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
