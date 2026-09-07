import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

function reason(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong. Please try again.'
}

// Confirm dialog for a single async action (archive, delete, ...).
// `onConfirm` should return a promise; the dialog closes once it resolves and
// shows the reason inline (staying open) if it rejects.
export default function ConfirmDialog({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  loadingLabel,
  confirmVariant = 'danger',
  confirmIcon = null,
  hideConfirmIcon = false,
  onConfirm,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) setError('')
  }, [open])

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (e) {
      setError(reason(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      icon={confirmIcon}
      accent={confirmVariant}
    >
      <div className="text-base text-content">{children}</div>

      {error && (
        <p className="rounded-lg bg-danger-tooltip-bg px-3 py-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="dark" size="sm" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={confirmVariant}
          size="sm"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        >
          {!loading && !hideConfirmIcon && confirmIcon}
          {loading ? loadingLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
