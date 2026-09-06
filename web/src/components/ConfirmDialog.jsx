import { useState } from 'react'
import Modal from './Modal.jsx'
import Button from './Button.jsx'

// Confirm dialog for a single async action (archive, delete, ...).
// `onConfirm` should return a promise; the dialog closes once it resolves.
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

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
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
