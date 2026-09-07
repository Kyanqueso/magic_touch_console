import { RotateCcw } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'

// Asks before navigating away from a table that is still being edited —
// switching tabs, going back, opening something else.
export default function LeaveEditDialog({ open, onClose, onConfirm }) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Discard changes"
      confirmLabel="Discard"
      cancelLabel="Keep editing"
      loadingLabel="Discarding..."
      confirmVariant="danger"
      confirmIcon={<RotateCcw className="h-4 w-4" />}
    >
      <p>You are still editing this table.</p>
      <p className="mt-2">If you leave now, all your changes will not be saved.</p>
    </ConfirmDialog>
  )
}
