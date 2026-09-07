import { useEffect, useState } from 'react'

const GAP = 8

// Pins a portalled popover to its trigger and keeps it there while ancestors
// scroll. Dropdowns render into document.body so that a scroll container — a
// modal body, a table's horizontal scroller — cannot clip them.
// `height` is the popover's worst-case height, used to decide whether to flip
// above the trigger. `matchWidth` sizes it to the trigger instead of `width`.
export default function usePopoverPosition(open, triggerRef, { width = 0, height = 320, matchWidth = false } = {}) {
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!open) {
      setPos(null)
      return undefined
    }
    function place() {
      const r = triggerRef.current?.getBoundingClientRect()
      if (!r) return
      const w = matchWidth ? r.width : width
      const below = window.innerHeight - r.bottom
      const up = below < height && r.top > below
      setPos({
        width: w,
        left: Math.max(GAP, Math.min(r.left, window.innerWidth - w - GAP)),
        top: up ? undefined : r.bottom + GAP,
        bottom: up ? window.innerHeight - r.top + GAP : undefined,
      })
    }
    place()
    // Capture phase, so scrolling any ancestor counts and not just the page.
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, triggerRef, width, height, matchWidth])

  return pos
}
