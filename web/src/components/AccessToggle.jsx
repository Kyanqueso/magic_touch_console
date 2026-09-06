export const ACCESS_LEVELS = ['No Access', 'Viewer', 'Editor']

// Segmented "No Access / Viewer / Editor" control. Read-only unless `editing`.
// Fills the container on mobile; natural size from `sm` up.
export default function AccessToggle({ value, editing = true, onChange }) {
  return (
    <div className="flex w-full overflow-hidden rounded-lg border border-purple-light sm:inline-flex sm:w-auto">
      {ACCESS_LEVELS.map((lvl) => {
        const active = value === lvl
        return (
          <button
            key={lvl}
            type="button"
            disabled={!editing}
            onClick={() => onChange?.(lvl)}
            className={`flex-1 px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
              active
                ? 'bg-secondary-bg text-white'
                : `bg-white text-content ${editing ? 'hover:bg-component-bg' : ''}`
            } ${editing ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {lvl}
          </button>
        )
      })}
    </div>
  )
}
