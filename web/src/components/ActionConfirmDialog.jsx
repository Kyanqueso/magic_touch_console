import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'

const CONFIG = {
  archive: {
    verb: 'archive',
    past: 'archived',
    label: 'Archive',
    loading: 'Archiving...',
    variant: 'warning',
    Icon: Archive,
  },
  restore: {
    verb: 'restore',
    past: 'restored',
    label: 'Restore',
    loading: 'Restoring...',
    variant: 'warning',
    Icon: RotateCcw,
  },
  delete: {
    verb: 'permanently delete',
    past: 'permanently deleted',
    label: 'Delete',
    loading: 'Deleting...',
    variant: 'danger',
    Icon: Trash2,
  },
}

// Consistent success alert for archive / restore / delete across every page.
export function actionAlert(action, items, noun) {
  const subject =
    items.length === 1
      ? items[0].secondary || items[0].primary
      : `${items.length} ${noun}${items.length === 1 ? '' : 's'}`
  const map = {
    archive: { variant: 'neutral', title: 'Archived', tail: 'moved to the archive tab.' },
    restore: { variant: 'success', title: 'Restored', tail: 'restored to the active tab.' },
    delete: { variant: 'neutral', title: 'Deleted', tail: 'permanently deleted.' },
  }
  const m = map[action]
  return { variant: m.variant, title: m.title, message: `${subject} ${m.tail}` }
}

// `items`: [{ id, primary, secondary?, tag? }]. `onConfirm` returns a promise.
export default function ActionConfirmDialog({
  open,
  onClose,
  onConfirm,
  action = 'archive',
  entityLabel = 'record',
  items = [],
  linkedNote,
}) {
  const cfg = CONFIG[action] || CONFIG.archive
  const { Icon } = cfg
  const many = items.length > 1

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={`${cfg.label} ${entityLabel}${many ? 's' : ''}`}
      confirmLabel={cfg.label}
      cancelLabel="Cancel"
      loadingLabel={cfg.loading}
      confirmVariant={cfg.variant}
      confirmIcon={<Icon className="h-4 w-4" />}
    >
      <div className="space-y-3">
        {many ? (
          <>
            <p>
              Are you sure you want to {cfg.verb} all selected{' '}
              {entityLabel.toLowerCase()}s?
            </p>
            <ol className="list-decimal space-y-1 pl-6">
              {items.map((it) => (
                <li key={it.id}>
                  <span className="font-bold">
                    {it.primary}
                    {it.tag ? ` (${it.tag})` : ''}
                  </span>
                  {it.secondary ? ` - ${it.secondary}` : ''}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p>
            Are you sure you want to {cfg.verb}{' '}
            <span className="font-bold">
              {items[0]?.primary}
              {items[0]?.tag ? ` (${items[0].tag})` : ''}
            </span>
            {items[0]?.secondary ? ` - ${items[0].secondary}` : ''}?
          </p>
        )}
        {linkedNote && (
          <p>
            All {linkedNote} will also be {cfg.past}.
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}
