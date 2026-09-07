import { Trash2 } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'

// Asks before throwing away a half-filled add form (Escape, the X, the backdrop
// or Cancel). `entityLabel` names what is being added, e.g. "job order".
export default function DiscardChangesDialog({ open, onClose, onConfirm, entityLabel }) {
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
      confirmIcon={<Trash2 className="h-4 w-4" />}
    >
      <p>Are you sure you want to cancel adding the {entityLabel}?</p>
      <p className="mt-2">All your changes will not be saved.</p>
    </ConfirmDialog>
  )
}
