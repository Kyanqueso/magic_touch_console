import { useEffect, useState } from 'react'

// Inline "edit the whole table" mode — snapshot the visible rows into a draft,
// edit cells, Ctrl+Z to undo, "Save Changes" persists, "Undo All" discards.
// `onSave(draftRows, removedIds)` is an async callback that writes the changes;
// the caller is expected to reload its data afterwards.
export default function useTableEdit(onSave) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState([])
  const [snapshot, setSnapshot] = useState([])
  const [history, setHistory] = useState([])

  function start(rows) {
    setSnapshot(rows.map((r) => ({ ...r })))
    setDraft(rows.map((r) => ({ ...r })))
    setHistory([])
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft([])
    setSnapshot([])
    setHistory([])
  }

  async function save() {
    const removedIds = snapshot
      .filter((s) => !draft.some((d) => d.id === s.id))
      .map((s) => s.id)
    setSaving(true)
    try {
      await onSave(draft, removedIds)
      cancel()
    } finally {
      setSaving(false)
    }
  }

  function setCell(id, key, value) {
    setHistory((h) => [...h, draft])
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }

  function removeRow(id) {
    setHistory((h) => [...h, draft])
    setDraft((d) => d.filter((r) => r.id !== id))
  }

  function undo() {
    if (!history.length) return
    setDraft(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  useEffect(() => {
    if (!editing) return undefined
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, history])

  return { editing, loading, saving, draft, start, cancel, save, setCell, removeRow }
}
