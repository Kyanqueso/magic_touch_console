import { RotateCcw, Save } from 'lucide-react'

// The Undo All / Save Changes pair shown while a table is in edit mode, plus
// the count of what still needs fixing. Save stays disabled until the draft is
// valid, so a blocked save always says why.
export default function EditBar({ errorCount = 0, onUndo, onSave, saving = false }) {
  const blocked = errorCount > 0
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-danger-hover"
      >
        <RotateCcw className="h-4 w-4" />
        Undo All
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={blocked || saving}
        title={blocked ? 'Fix the highlighted fields first.' : undefined}
        className="inline-flex items-center gap-1.5 rounded-lg bg-info px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-info-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        Save Changes
      </button>
      {blocked && (
        <span className="text-sm font-semibold text-danger">
          {errorCount === 1 ? '1 field needs fixing' : `${errorCount} fields need fixing`}
        </span>
      )}
    </div>
  )
}
