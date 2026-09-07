import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import LeaveEditDialog from '../components/LeaveEditDialog.jsx'

// One place that knows whether anything on screen has unsaved edits, so every
// way out — the header nav, a profile's section tabs, Active/Archive, a back
// button — can ask before throwing the work away. Editors register their dirty
// state; navigation calls guard().

const Ctx = createContext({ guard: (action) => action(), setDirty: () => {} })

export function UnsavedChangesProvider({ children }) {
  const dirtyKeys = useRef(new Set())
  const [pending, setPending] = useState(null)
  // Editors clear their own draft when the user confirms; collected here so a
  // discard from the header also exits the edit mode that was left behind.
  const discards = useRef(new Map())

  const setDirty = useCallback((key, dirty, onDiscard) => {
    if (dirty) {
      dirtyKeys.current.add(key)
      if (onDiscard) discards.current.set(key, onDiscard)
    } else {
      dirtyKeys.current.delete(key)
      discards.current.delete(key)
    }
  }, [])

  const guard = useCallback((action) => {
    if (dirtyKeys.current.size === 0) {
      action()
      return
    }
    setPending(() => action)
  }, [])

  function confirm() {
    const action = pending
    setPending(null)
    for (const discard of discards.current.values()) discard()
    dirtyKeys.current.clear()
    discards.current.clear()
    action?.()
  }

  const value = useMemo(() => ({ guard, setDirty }), [guard, setDirty])

  return (
    <Ctx.Provider value={value}>
      {children}
      <LeaveEditDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </Ctx.Provider>
  )
}

/** Wrap a navigation action so it asks first when something is unsaved. */
export function useNavigationGuard() {
  return useContext(Ctx).guard
}

/**
 * Registers an editor's unsaved state. `onDiscard` puts the editor back to a
 * clean state when the user confirms leaving.
 */
export function useUnsavedChanges(dirty, onDiscard) {
  const { setDirty } = useContext(Ctx)
  const key = useRef({})
  const discardRef = useRef(onDiscard)
  discardRef.current = onDiscard

  useEffect(() => {
    const id = key.current
    setDirty(id, dirty, () => discardRef.current?.())
    return () => setDirty(id, false)
  }, [dirty, setDirty])
}
