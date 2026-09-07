import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import AppHeader from '../components/AppHeader.jsx'
import Select from '../components/Select.jsx'
import Alert from '../components/Alert.jsx'
import SegmentedTabs from '../components/SegmentedTabs.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ActionConfirmDialog, { actionAlert } from '../components/ActionConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AddMaterialModal from '../components/AddMaterialModal.jsx'
import NumberField from '../components/NumberField.jsx'
import Loading from '../components/Loading.jsx'
import EditableCell from '../components/EditableCell.jsx'
import LeaveEditDialog from '../components/LeaveEditDialog.jsx'
import { validateMaterialRow, validateRows, countErrors } from '../lib/validate.js'
import { useUnsavedChanges } from '../lib/unsavedChanges.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { peso } from '../lib/format.js'
import {
  listGroups,
  listMaterials,
  createMaterial,
  updateMaterial,
  archiveMaterial,
  restoreMaterial,
  deleteMaterial,
} from '../api/materials.js'

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

const matItem = (m) => ({ id: m.id, primary: m.code, secondary: m.description })

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]

const SORT_OPTIONS = [
  { value: 'code-asc', label: 'Code: ascending' },
  { value: 'code-desc', label: 'Code: descending' },
  { value: 'price-asc', label: 'Price: ascending' },
  { value: 'price-desc', label: 'Price: descending' },
]

const FIELDS = [
  { key: 'code', label: 'Material Code' },
  { key: 'description', label: 'Material Description' },
  { key: 'unitPrice', label: 'Unit Price' },
]

function makeSorter(sort) {
  switch (sort) {
    case 'code-desc':
      return (a, b) => b.code.localeCompare(a.code)
    case 'price-asc':
      return (a, b) => a.unitPrice - b.unitPrice
    case 'price-desc':
      return (a, b) => b.unitPrice - a.unitPrice
    default:
      return (a, b) => a.code.localeCompare(b.code)
  }
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)
  const [expandName, setExpandName] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [tab, setTab] = useState('active')
  const [expanded, setExpanded] = useState(() => new Set())
  const [alert, setAlert] = useAutoAlert()
  const [addMaterialOpen, setAddMaterialOpen] = useState(false)
  const [pending, setPending] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      Promise.all([listGroups(), listMaterials({ tab, q: query.trim(), sort })])
        .then(([grps, mats]) => {
          if (cancelled) return
          setGroups(grps)
          setMaterials(mats)
          if (expandName) {
            const hit = grps.find(
              (g) => g.name.trim().toLowerCase() === expandName.trim().toLowerCase(),
            )
            if (hit) setExpanded((prev) => new Set(prev).add(hit.id))
            setExpandName(null)
          }
        })
        .catch((e) => {
          if (cancelled) return
          setGroups([])
          setMaterials([])
          setAlert({ variant: 'danger', title: 'Could not load materials', message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, sort, reloadKey])

  const [editingId, setEditingId] = useState(null)
  const [editLoadingId, setEditLoadingId] = useState(null)
  const [draft, setDraft] = useState([])
  const [history, setHistory] = useState([])
  const [snapshot, setSnapshot] = useState([])
  const [leaveTo, setLeaveTo] = useState(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  function undo() {
    if (!history.length) return
    setDraft(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  useEffect(() => {
    if (!editingId) return undefined
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, history])

  const term = query.trim().toLowerCase()
  const sorter = useMemo(() => makeSorter(sort), [sort])

  function materialsFor(groupId) {
    return materials
      .filter((m) => m.groupId === groupId)
      .filter((m) => (tab === 'active' ? !m.archived : m.archived))
      .filter(
        (m) =>
          !term ||
          m.code.toLowerCase().includes(term) ||
          m.description.toLowerCase().includes(term),
      )
      .sort(sorter)
  }

  // On the archive tab (or while searching) only show groups that actually
  // have matching items; the active tab shows every group.
  const visibleGroups = groups.filter((g) =>
    tab === 'archive' || term ? materialsFor(g.id).length > 0 : true,
  )

  function toggle(groupId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // Live per-row validation: flags a missing code or a bad price as it is typed
  // rather than letting Save bounce off the API.
  const errors = useMemo(
    () => (editingId ? validateRows(draft, validateMaterialRow) : {}),
    [draft, editingId],
  )
  const errorCount = countErrors(errors)

  const dirty =
    Boolean(editingId) &&
    (draft.length !== snapshot.length ||
      draft.some((r) => {
        const was = snapshot.find((s) => s.id === r.id)
        return !was || Object.keys(r).some((k) => r[k] !== was[k])
      }))

  // Leaving mid-edit throws the draft away, so ask first — locally for the
  // tabs here, and through the shared guard for the header nav.
  useUnsavedChanges(dirty, exitEdit)
  function guard(action) {
    if (dirty) setLeaveTo(() => action)
    else action()
  }
  function confirmLeave() {
    const action = leaveTo
    setLeaveTo(null)
    exitEdit()
    action?.()
  }

  function startEdit(groupId) {
    if (editingId) return
    const rows = materials
      .filter((m) => m.groupId === groupId && !m.archived)
      .map((m) => ({ ...m }))
    setEditingId(groupId)
    setDraft(rows)
    setSnapshot(rows.map((r) => ({ ...r })))
    setHistory([])
    setExpanded((prev) => new Set(prev).add(groupId))
  }

  const activeInGroup = (gid) => materials.filter((m) => m.groupId === gid && !m.archived)
  const archivedInGroup = (gid) => materials.filter((m) => m.groupId === gid && m.archived)

  function exitEdit() {
    setEditingId(null)
    setDraft([])
    setSnapshot([])
    setHistory([])
  }

  function updateCell(rowId, key, value) {
    setHistory((h) => [...h, draft])
    setDraft((d) => d.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)))
  }

  function removeDraftRow(rowId) {
    setHistory((h) => [...h, draft])
    setDraft((d) => d.filter((r) => r.id !== rowId))
  }

  async function saveChanges() {
    if (errorCount > 0) return
    const removedIds = snapshot
      .filter((s) => !draft.some((d) => d.id === s.id))
      .map((s) => s.id)
    // Only write rows that actually changed.
    const changed = draft.filter((r) => {
      const was = snapshot.find((s) => s.id === r.id)
      return !was || Object.keys(r).some((k) => r[k] !== was[k])
    })
    try {
      await Promise.all([
        ...changed.map((r) => updateMaterial(r.id, r)),
        ...removedIds.map((id) => archiveMaterial(id)),
      ])
      setAlert({ variant: 'success', title: 'Changes saved.' })
      exitEdit()
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Save failed', message: errMessage(e) })
    }
  }

  async function handleAddMaterial(values) {
    try {
      await createMaterial(values)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not add material', message: errMessage(e) })
      throw e // keep the modal open
    }
    setExpandName(values.group)
    setTab('active')
    setAlert({ variant: 'success', title: `Material ${values.code} added successfully!` })
    reload()
  }

  async function runPending() {
    const { action, items } = pending
    const ids = items.map((it) => it.id)
    try {
      if (action === 'delete') await Promise.all(ids.map((id) => deleteMaterial(id)))
      else if (action === 'restore') await Promise.all(ids.map((id) => restoreMaterial(id)))
      else await Promise.all(ids.map((id) => archiveMaterial(id)))
      setAlert(actionAlert(action, items, 'material'))
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  return (
    <div className="min-h-full bg-component-bg">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-extrabold text-content">Materials</h1>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Material..."
              className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light"
            />
          </div>

          <Select
            wrapperClassName="w-full md:w-56"
            placeholder="Sort By"
            value={sort}
            onChange={setSort}
            options={SORT_OPTIONS}
          />

          {tab === 'active' && (
            <button
              type="button"
              onClick={() => setAddMaterialOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </button>
          )}
        </div>

        {alert && (
          <div className="mt-4">
            <Alert variant={alert.variant} title={alert.title} onDismiss={() => setAlert(null)}>
              {alert.message}
            </Alert>
          </div>
        )}

        <div className="mt-4">
          <SegmentedTabs
            value={tab}
            options={TABS}
            onChange={(v) =>
              guard(() => {
                setTab(v)
                exitEdit()
              })
            }
          />
        </div>

        <div className="mt-6 space-y-4">
          {loading && <Loading label="Loading materials..." />}
          {!loading && visibleGroups.map((group) => {
            const editing = editingId === group.id
            const open = editing || term ? true : expanded.has(group.id)
            const rows = editing ? draft : materialsFor(group.id)

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-xl border border-purple-light bg-white"
              >
                <div className="flex items-center gap-3 bg-purple px-5 py-3 text-white">
                  <span className="flex-1 font-bold">{group.name}</span>

                  {editing ? (
                    <>
                      {errorCount > 0 && (
                        <span className="rounded bg-danger px-2 py-1 text-xs font-bold">
                          {errorCount === 1 ? '1 field needs fixing' : `${errorCount} fields need fixing`}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setConfirmUndo(true)}
                        className="rounded-md bg-danger px-3 py-1.5 text-xs font-bold transition-colors hover:bg-danger-hover"
                      >
                        Undo All
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmSave(true)}
                        disabled={errorCount > 0}
                        title={errorCount > 0 ? 'Fix the highlighted fields first.' : undefined}
                        className="rounded-md bg-info px-3 py-1.5 text-xs font-bold transition-colors hover:bg-info-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : tab === 'active' ? (
                    <>
                      {activeInGroup(group.id).length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({
                              action: 'archive',
                              items: activeInGroup(group.id).map(matItem),
                            })
                          }
                          aria-label="Archive group"
                          className="rounded-md bg-warning p-1.5 transition-colors hover:bg-warning-hover"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(group.id)}
                        disabled={editLoadingId === group.id}
                        aria-label="Edit materials"
                        className="rounded-md bg-info p-1.5 transition-colors hover:bg-info-hover disabled:opacity-60"
                      >
                        {editLoadingId === group.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Pencil className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setPending({
                            action: 'restore',
                            items: archivedInGroup(group.id).map(matItem),
                          })
                        }
                        className="rounded-md bg-warning px-3 py-1.5 text-xs font-bold transition-colors hover:bg-warning-hover"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPending({
                            action: 'delete',
                            items: archivedInGroup(group.id).map(matItem),
                          })
                        }
                        className="rounded-md bg-danger px-3 py-1.5 text-xs font-bold transition-colors hover:bg-danger-hover"
                      >
                        Delete
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => !editing && toggle(group.id)}
                    aria-label={open ? 'Collapse' : 'Expand'}
                    className={`rounded-md p-1 transition-colors hover:bg-white/10 ${
                      editing ? 'opacity-40' : ''
                    }`}
                  >
                    {open ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {open && (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <MaterialTable
                        rows={rows}
                        editing={editing}
                        tab={tab}
                        errors={errors}
                        onCell={updateCell}
                        onRemove={(row) => removeDraftRow(row.id)}
                        onArchive={(row) =>
                          setPending({ action: 'archive', items: [matItem(row)] })
                        }
                        onRestore={(row) =>
                          setPending({ action: 'restore', items: [matItem(row)] })
                        }
                        onDelete={(row) =>
                          setPending({ action: 'delete', items: [matItem(row)] })
                        }
                        onEdit={() => startEdit(group.id)}
                      />
                    </div>

                    <div className="divide-y divide-purple-light md:hidden">
                      {rows.length === 0 ? (
                        <p className="px-5 py-6 text-center text-sm text-content-muted">
                          No materials.
                        </p>
                      ) : (
                        rows.map((row) => (
                          <MaterialRow
                            key={row.id}
                            row={row}
                            editing={editing}
                            tab={tab}
                            errors={errors[row.id] || {}}
                            onCell={updateCell}
                            onRemove={() => removeDraftRow(row.id)}
                            onArchive={() =>
                              setPending({ action: 'archive', items: [matItem(row)] })
                            }
                            onRestore={() =>
                              setPending({ action: 'restore', items: [matItem(row)] })
                            }
                            onDelete={() =>
                              setPending({ action: 'delete', items: [matItem(row)] })
                            }
                            onEdit={() => startEdit(group.id)}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {!loading && visibleGroups.length === 0 && (
            <EmptyState
              icon={tab === 'archive' ? Archive : Package}
              title={
                term
                  ? `No materials match "${query.trim()}"`
                  : tab === 'archive'
                    ? 'Archive is empty'
                    : 'No materials yet'
              }
              subtitle={
                term
                  ? 'Try a different search term.'
                  : tab === 'archive'
                    ? 'Materials you archive will show up here.'
                    : 'Use “Add Material” to create your first one.'
              }
            />
          )}
        </div>

        {editingId && (
          <p className="mt-4 text-sm text-content-muted">
            Editing — <span className="font-semibold">Ctrl&nbsp;+&nbsp;Z</span> undoes your last
            change, or use Undo&nbsp;All.
          </p>
        )}
      </main>

      <AddMaterialModal
        open={addMaterialOpen}
        onClose={() => setAddMaterialOpen(false)}
        onAdd={handleAddMaterial}
        groups={groups}
      />

      <LeaveEditDialog
        open={Boolean(leaveTo)}
        onClose={() => setLeaveTo(null)}
        onConfirm={confirmLeave}
      />

      <ActionConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        action={pending?.action}
        entityLabel="Material"
        items={pending?.items || []}
        linkedNote={
          (pending?.items?.length ?? 0) > 1
            ? 'job orders with these materials'
            : 'job orders with this material'
        }
      />

      <ConfirmDialog
        open={confirmUndo}
        onClose={() => setConfirmUndo(false)}
        title="Undo All Changes"
        confirmLabel="Undo All"
        cancelLabel="No"
        loadingLabel="Reverting..."
        confirmVariant="danger"
        confirmIcon={<RotateCcw className="h-4 w-4" />}
        onConfirm={exitEdit}
      >
        <p>Are you sure you want to undo all your changes?</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title="Save Changes"
        confirmLabel="Save Changes"
        cancelLabel="Cancel"
        loadingLabel="Saving..."
        confirmVariant="info"
        confirmIcon={<Save className="h-4 w-4" />}
        onConfirm={saveChanges}
      >
        <p>Save your changes to this group?</p>
      </ConfirmDialog>
    </div>
  )
}

function MaterialTable({ rows, editing, tab, errors = {}, onCell, onRemove, onArchive, onRestore, onDelete, onEdit }) {
  const input =
    'w-full rounded border border-purple-light bg-white px-2 py-1 text-sm outline-none focus:border-purple focus:ring-1 focus:ring-purple-light'

  return (
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="bg-component-bg text-left text-content-muted">
          <th className="px-5 py-2 font-semibold">Material Code</th>
          <th className="px-3 py-2 font-semibold">Material Description</th>
          <th className="px-3 py-2 font-semibold">Unit Price</th>
          <th className="px-5 py-2 text-right font-semibold">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-purple-light">
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-5 py-6 text-center text-content-muted">
              No materials.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="align-top">
              <td className="px-5 py-2">
                {editing ? (
                  <EditableCell
                    value={row.code}
                    error={errors[row.id]?.code}
                    className="font-bold"
                    onChange={(v) => onCell(row.id, 'code', v)}
                  />
                ) : (
                  <span className="font-bold text-content">{row.code}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {editing ? (
                  <EditableCell
                    value={row.description}
                    error={errors[row.id]?.description}
                    onChange={(v) => onCell(row.id, 'description', v)}
                  />
                ) : (
                  <span className="text-content">{row.description || '—'}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {editing ? (
                  <NumberField
                    size="sm"
                    mode="money"
                    min={0}
                    step={0.25}
                    wrapperClassName="w-28"
                    value={row.unitPrice}
                    error={errors[row.id]?.unitPrice}
                    onChange={(v) => onCell(row.id, 'unitPrice', v)}
                  />
                ) : (
                  <span className="inline-block rounded-md bg-component-bg px-2 py-1 font-bold text-purple">
                    {peso(row.unitPrice)}
                  </span>
                )}
              </td>
              <td className="px-5 py-2 text-right">
                {editing ? (
                  <button
                    type="button"
                    onClick={() => onRemove(row)}
                    aria-label="Remove row"
                    className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : tab === 'active' ? (
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={onEdit}
                      aria-label="Edit materials"
                      className="rounded-md bg-info p-1.5 text-white transition-colors hover:bg-info-hover"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onArchive(row)}
                      aria-label="Archive material"
                      className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRestore(row)}
                      className="rounded-md bg-warning px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-warning-hover"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      aria-label="Delete material"
                      className="rounded-md bg-danger p-1.5 text-white transition-colors hover:bg-danger-hover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function MaterialRow({ row, editing, tab, errors = {}, onCell, onRemove, onArchive, onRestore, onDelete, onEdit }) {
  if (editing) {
    return (
      <div className="flex flex-wrap items-start gap-3 px-5 py-3">
        <EditableCell
          value={row.code}
          error={errors.code}
          placeholder="Code"
          className="font-bold"
          onChange={(v) => onCell(row.id, 'code', v)}
        />
        <EditableCell
          value={row.description}
          error={errors.description}
          placeholder="Description"
          className="min-w-40"
          onChange={(v) => onCell(row.id, 'description', v)}
        />
        <NumberField
          size="sm"
          mode="money"
          min={0}
          step={0.25}
          wrapperClassName="w-28"
          value={row.unitPrice}
          error={errors.unitPrice}
          onChange={(v) => onCell(row.id, 'unitPrice', v)}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove row"
          className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-content">{row.code}</p>
        <p className="truncate text-sm text-content">{row.description || '—'}</p>
        <p className="mt-1 text-xs text-content-muted">
          Unit Price:{' '}
          <span className="rounded bg-component-bg px-1.5 py-0.5 font-bold text-purple">
            {peso(row.unitPrice)}
          </span>
        </p>
      </div>
      {tab === 'active' ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit materials"
            className="shrink-0 rounded-md bg-info p-1.5 text-white transition-colors hover:bg-info-hover"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onArchive}
            aria-label="Archive material"
            className="shrink-0 rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
          >
            <Archive className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onRestore}
            className="shrink-0 rounded-md bg-warning px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-warning-hover"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete material"
            className="shrink-0 rounded-md bg-danger p-1.5 text-white transition-colors hover:bg-danger-hover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
