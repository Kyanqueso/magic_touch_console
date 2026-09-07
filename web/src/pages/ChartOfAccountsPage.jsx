import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Layers,
  Loader2,
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
import AddAccountModal from '../components/AddAccountModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ActionConfirmDialog, { actionAlert } from '../components/ActionConfirmDialog.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Loading from '../components/Loading.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { maskPercent } from '../lib/masks.js'
import {
  listCategories,
  listAccounts,
  createAccount,
  updateAccount,
  archiveAccount,
  restoreAccount,
  deleteAccount,
} from '../api/accounts.js'

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

const toItem = (a) => ({ id: a.id, primary: a.code, secondary: a.title })

// Only Tax Rate gets live masking in the inline editor for now.
const maskCell = (key, value) => (key === 'taxRate' ? maskPercent(value) : value)

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]

const SUB_TYPES = [
  'Current Asset',
  'Non Current Asset',
  'Current Liability',
  'Non Current Liability',
  'Equity',
  'Revenue',
  'Direct Cost',
  'Operating Expense',
  'Non Taxable',
  'Other',
]

const COLUMNS = [
  { key: 'code', label: 'Account Code' },
  { key: 'title', label: 'Account Title' },
  { key: 'type', label: 'Type' },
  { key: 'subType', label: 'Sub Type' },
  { key: 'atcCode', label: 'ATC Code' },
  { key: 'taxRate', label: 'Tax Rate' },
  { key: 'referenceForm', label: 'Reference Form' },
]

const SORT_OPTIONS = [
  { value: 'az', label: 'Title: A to Z' },
  { value: 'za', label: 'Title: Z to A' },
  { value: 'code-asc', label: 'Code: ascending' },
  { value: 'code-desc', label: 'Code: descending' },
]

function makeSorter(sort) {
  switch (sort) {
    case 'code-desc':
      return (a, b) => b.code.localeCompare(a.code)
    case 'az':
      return (a, b) => a.title.localeCompare(b.title)
    case 'za':
      return (a, b) => b.title.localeCompare(a.title)
    default:
      return (a, b) => a.code.localeCompare(b.code)
  }
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)
  const [expandName, setExpandName] = useState(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [tab, setTab] = useState('active')
  const [expanded, setExpanded] = useState(() => new Set())
  const [alert, setAlert] = useAutoAlert()
  const [addOpen, setAddOpen] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [pending, setPending] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      Promise.all([listCategories(), listAccounts({ tab, q: query.trim(), sort })])
        .then(([cats, accs]) => {
          if (cancelled) return
          setCategories(cats)
          setAccounts(accs)
          if (expandName) {
            const hit = cats.find(
              (c) => c.name.trim().toLowerCase() === expandName.trim().toLowerCase(),
            )
            if (hit) setExpanded((prev) => new Set(prev).add(hit.id))
            setExpandName(null)
          }
        })
        .catch((e) => {
          if (cancelled) return
          setCategories([])
          setAccounts([])
          setAlert({
            variant: 'danger',
            title: 'Could not load chart of accounts',
            message: errMessage(e),
          })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, query, sort, reloadKey])

  // Edit mode (one category at a time) + undo history for Ctrl+Z.
  const [editingId, setEditingId] = useState(null)
  const [editLoadingId, setEditLoadingId] = useState(null)
  const [draft, setDraft] = useState([])
  const [history, setHistory] = useState([])

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

  function accountsFor(categoryId) {
    return accounts
      .filter((a) => a.categoryId === categoryId)
      .filter((a) => (tab === 'active' ? !a.archived : a.archived))
      .filter(
        (a) =>
          !term ||
          a.code.toLowerCase().includes(term) ||
          a.title.toLowerCase().includes(term),
      )
      .sort(sorter)
  }

  // On the archive tab (or while searching) only show categories that actually
  // have matching accounts; the active tab shows every category.
  const visibleCategories = categories.filter((c) =>
    tab === 'archive' || term ? accountsFor(c.id).length > 0 : true,
  )

  function toggle(categoryId) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(categoryId) ? next.delete(categoryId) : next.add(categoryId)
      return next
    })
  }

  function startEdit(categoryId) {
    if (editingId) return
    setEditingId(categoryId)
    setDraft(
      accounts
        .filter((a) => a.categoryId === categoryId && !a.archived)
        .map((a) => ({ ...a })),
    )
    setHistory([])
    setExpanded((prev) => new Set(prev).add(categoryId))
  }

  const activeInCategory = (cid) => accounts.filter((a) => a.categoryId === cid && !a.archived)
  const archivedInCategory = (cid) => accounts.filter((a) => a.categoryId === cid && a.archived)

  function exitEdit() {
    setEditingId(null)
    setDraft([])
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
    const snapshot = accounts.filter((a) => a.categoryId === editingId)
    const removedIds = snapshot
      .filter((s) => !draft.some((d) => d.id === s.id))
      .map((s) => s.id)
    try {
      await Promise.all([
        ...draft.map((r) => updateAccount(r.id, r)),
        ...removedIds.map((id) => archiveAccount(id)),
      ])
      setAlert({ variant: 'success', title: 'Changes saved.' })
      exitEdit()
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Save failed', message: errMessage(e) })
    }
  }

  async function handleAddAccount(values) {
    try {
      await createAccount(values)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not add account', message: errMessage(e) })
      throw e // keep the modal open
    }
    setExpandName(values.category)
    setTab('active')
    setAlert({ variant: 'success', title: `Account ${values.code} added successfully!` })
    reload()
  }

  async function runPending() {
    const { action, items } = pending
    const ids = items.map((it) => it.id)
    try {
      if (action === 'delete') await Promise.all(ids.map((id) => deleteAccount(id)))
      else if (action === 'restore') await Promise.all(ids.map((id) => restoreAccount(id)))
      else await Promise.all(ids.map((id) => archiveAccount(id)))
      setAlert(actionAlert(action, items, 'account'))
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  function rowAction(row) {
    if (editingId) removeDraftRow(row.id)
    else if (tab === 'active') setPending({ action: 'archive', items: [toItem(row)] })
    else setPending({ action: 'restore', items: [toItem(row)] })
  }

  function rowDelete(row) {
    setPending({ action: 'delete', items: [toItem(row)] })
  }

  return (
    <div className="min-h-full bg-component-bg">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-2xl font-extrabold text-content">Chart of Accounts</h1>

        {/* Controls */}
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search account..."
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
              onClick={() => setAddOpen(true)}
              className="hidden items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto md:inline-flex"
            >
              <Plus className="h-4 w-4" />
              Add Account
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

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SegmentedTabs
            value={tab}
            options={TABS}
            onChange={(v) => {
              setTab(v)
              exitEdit()
            }}
          />

          {tab === 'active' && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-success-hover md:hidden"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          )}
        </div>

        {/* Category accordion */}
        <div className="mt-6 space-y-4">
          {loading && <Loading label="Loading chart of accounts..." />}
          {!loading && visibleCategories.map((cat) => {
            const editing = editingId === cat.id
            const open = editing || term ? true : expanded.has(cat.id)
            const rows = editing ? draft : accountsFor(cat.id)

            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-xl border border-purple-light bg-white"
              >
                <div className="flex items-center gap-3 bg-purple px-5 py-3 text-white">
                  <span className="flex-1 font-bold">{cat.name}</span>

                  {editing ? (
                    <>
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
                        className="rounded-md bg-info px-3 py-1.5 text-xs font-bold transition-colors hover:bg-info-hover"
                      >
                        Save Changes
                      </button>
                    </>
                  ) : tab === 'active' ? (
                    <>
                      {activeInCategory(cat.id).length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPending({
                              action: 'archive',
                              items: activeInCategory(cat.id).map(toItem),
                            })
                          }
                          aria-label="Archive category"
                          className="rounded-md bg-warning p-1.5 transition-colors hover:bg-warning-hover"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(cat.id)}
                        disabled={editLoadingId === cat.id}
                        aria-label="Edit accounts"
                        className="rounded-md bg-info p-1.5 transition-colors hover:bg-info-hover disabled:opacity-60"
                      >
                        {editLoadingId === cat.id ? (
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
                            items: archivedInCategory(cat.id).map(toItem),
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
                            items: archivedInCategory(cat.id).map(toItem),
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
                    onClick={() => !editing && toggle(cat.id)}
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
                      <AccountTable
                        rows={rows}
                        editing={editing}
                        tab={tab}
                        onCell={updateCell}
                        onRowAction={rowAction}
                        onRowDelete={rowDelete}
                      />
                    </div>
                    <div className="md:hidden">
                      <AccountCards
                        rows={rows}
                        editing={editing}
                        tab={tab}
                        onCell={updateCell}
                        onRowAction={rowAction}
                        onRowDelete={rowDelete}
                        onEdit={() => startEdit(cat.id)}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {!loading && visibleCategories.length === 0 && (
            <EmptyState
              icon={tab === 'archive' ? Archive : Layers}
              title={
                term
                  ? `No accounts match "${query.trim()}"`
                  : tab === 'archive'
                    ? 'Archive is empty'
                    : 'No accounts yet'
              }
              subtitle={
                term
                  ? 'Try a different search term.'
                  : tab === 'archive'
                    ? 'Accounts you archive will show up here.'
                    : 'Use “Add Account” to create your first one.'
              }
            />
          )}
        </div>

        {editingId && (
          <p className="mt-4 text-sm text-content-muted">
            Editing — <span className="font-semibold">Ctrl&nbsp;+&nbsp;Z</span> undoes your
            last change, or use Undo&nbsp;All.
          </p>
        )}
      </main>

      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddAccount}
        categories={categories}
        subTypes={SUB_TYPES}
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
        <p>Save your changes to this category?</p>
      </ConfirmDialog>

      <ActionConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        action={pending?.action}
        entityLabel="Account"
        items={pending?.items || []}
        linkedNote={
          (pending?.items?.length ?? 0) > 1
            ? 'job orders with these accounts'
            : 'job orders with this account'
        }
      />
    </div>
  )
}

function AccountTable({ rows, editing, tab, onCell, onRowAction, onRowDelete }) {
  return (
    <table className="w-full min-w-[760px] text-sm">
      <thead>
        <tr className="bg-component-bg text-left text-content-muted">
          {COLUMNS.map((c) => (
            <th key={c.key} className="px-3 py-2 font-semibold">
              {c.label}
            </th>
          ))}
          <th className="px-3 py-2 text-right font-semibold">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-purple-light">
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={COLUMNS.length + 1}
              className="px-3 py-6 text-center text-content-muted"
            >
              No accounts.
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={row.id} className="align-top">
              {COLUMNS.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {editing ? (
                    <input
                      value={row[c.key] ?? ''}
                      onChange={(e) => onCell(row.id, c.key, maskCell(c.key, e.target.value))}
                      className="w-full min-w-24 rounded border border-purple-light bg-white px-2 py-1 text-sm outline-none focus:border-purple focus:ring-1 focus:ring-purple-light"
                    />
                  ) : (
                    <span className="text-content">{row[c.key] || '—'}</span>
                  )}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                <RowActionButton
                  editing={editing}
                  tab={tab}
                  onClick={() => onRowAction(row)}
                  onDelete={() => onRowDelete(row)}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}

function AccountCards({ rows, editing, tab, onCell, onRowAction, onRowDelete, onEdit }) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-content-muted">No accounts.</p>
  }

  const groups = []
  for (const row of rows) {
    const key = row.subType || 'Other'
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, items: [] }
      groups.push(group)
    }
    group.items.push(row)
  }

  return (
    <div className="divide-y divide-purple-light">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="bg-component-bg px-5 py-2 text-sm font-bold text-content">
            {group.key}
          </div>
          {group.items.map((row) => (
            <div key={row.id} className="px-5 py-3">
              {editing ? (
                <div className="space-y-2">
                  {COLUMNS.map((c) => (
                    <input
                      key={c.key}
                      value={row[c.key] ?? ''}
                      onChange={(e) => onCell(row.id, c.key, maskCell(c.key, e.target.value))}
                      placeholder={c.label}
                      className="w-full rounded border border-purple-light bg-white px-2 py-1 text-sm outline-none focus:border-purple"
                    />
                  ))}
                  <div className="flex justify-end">
                    <RowActionButton
                      editing
                      tab={tab}
                      onClick={() => onRowAction(row)}
                      onDelete={() => onRowDelete(row)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-content">{row.code}</p>
                    <p className="truncate text-sm text-content">{row.title || '—'}</p>
                    <p className="mt-0.5 text-xs text-content-muted">
                      {[
                        row.atcCode || 'ATC Code',
                        row.taxRate || 'Tax Rate',
                        row.referenceForm || 'Reference Form',
                      ].join('  |  ')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label="Edit accounts"
                    className="rounded-md bg-info p-1.5 text-white transition-colors hover:bg-info-hover"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <RowActionButton
                    editing={false}
                    tab={tab}
                    onClick={() => onRowAction(row)}
                    onDelete={() => onRowDelete(row)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function RowActionButton({ editing, tab, onClick, onDelete }) {
  if (!editing && tab === 'archive') {
    return (
      <div className="inline-flex gap-2">
        <button
          type="button"
          onClick={onClick}
          className="rounded-md bg-warning px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-warning-hover"
        >
          Restore
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete account"
          className="rounded-md bg-danger p-1.5 text-white transition-colors hover:bg-danger-hover"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={editing ? 'Remove row' : 'Archive account'}
      className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
    >
      <Archive className="h-4 w-4" />
    </button>
  )
}
