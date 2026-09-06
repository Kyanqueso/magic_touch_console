import { useEffect, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
} from 'lucide-react'
import Select from './Select.jsx'
import Alert from './Alert.jsx'
import DateField from './DateField.jsx'
import NumberField from './NumberField.jsx'
import EmptyState from './EmptyState.jsx'
import Pagination from './Pagination.jsx'
import SegmentedTabs from './SegmentedTabs.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import ActionConfirmDialog, { actionAlert } from './ActionConfirmDialog.jsx'
import AddJobOrderModal from './AddJobOrderModal.jsx'
import JobOrderDetail from './JobOrderDetail.jsx'
import useTableEdit from '../hooks/useTableEdit.js'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { formatDate, peso } from '../lib/format.js'
import { listParties } from '../api/parties.js'
import { listMaterials } from '../api/materials.js'
import {
  JOB_ORDER_LIST_COLUMNS,
  listJobOrders,
  getJobOrder,
  createJobOrder,
  updateJobOrder,
  closeJobOrder,
  reopenJobOrder,
  archiveJobOrder,
  restoreJobOrder,
  deleteJobOrder,
} from '../api/jobOrders.js'

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]
const SORT_OPTIONS = [
  { value: 'id-desc', label: 'Job No: newest' },
  { value: 'id-asc', label: 'Job No: oldest' },
  { value: 'customer', label: 'Customer: A to Z' },
]

const EDITABLE = ['jobDescription', 'dateOrdered', 'deliveryDate', 'qty', 'unitPrice']

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

function cell(value, type) {
  if (type === 'date') return formatDate(value)
  if (type === 'peso') return value === 0 || value ? peso(value) : '—'
  return value === 0 || value ? String(value) : '—'
}

const toItem = (r) => ({ id: r.id, primary: r.id, secondary: r.customerName })

export default function JobOrdersSection({ profileId, profileName, onBack }) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [selectedId, setSelectedId] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)

  const [customerOptions, setCustomerOptions] = useState([])
  const [materialOptions, setMaterialOptions] = useState([])

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [tab, setTab] = useState('active')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [alert, setAlert] = useAutoAlert()
  const [addOpen, setAddOpen] = useState(false)
  const [pending, setPending] = useState(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  const term = query.trim().toLowerCase()

  // catalog lookups for the customer / material pickers
  useEffect(() => {
    let cancelled = false
    Promise.all([
      listParties({ kind: 'customer', profileId: String(profileId) }, { size: 500 }),
      listMaterials({ size: 500 }),
    ])
      .then(([cust, mats]) => {
        if (cancelled) return
        setCustomerOptions(cust.items.map((c) => ({ value: c.id, label: c.name })))
        setMaterialOptions(
          mats.map((m) => ({ value: m.id, label: `${m.code} — ${m.description}` })),
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId])

  // list
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      listJobOrders(profileId, { tab, q: term, sort, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setAlert({ variant: 'danger', title: 'Could not load job orders', message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [profileId, tab, term, sort, page, pageSize, reloadKey, setAlert])

  // selected job detail
  useEffect(() => {
    if (!selectedId) {
      setSelectedJob(null)
      return undefined
    }
    let cancelled = false
    getJobOrder(profileId, selectedId)
      .then((j) => !cancelled && setSelectedJob(j))
      .catch((e) => {
        if (cancelled) return
        setAlert({ variant: 'danger', title: 'Could not open job order', message: errMessage(e) })
        setSelectedId(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, profileId, reloadKey, setAlert])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)

  const reset = (fn) => (v) => {
    fn(v)
    setPage(1)
    setSelected(new Set())
  }

  const edit = useTableEdit(async (draft, removedIds) => {
    for (const r of draft) {
      const full = await getJobOrder(profileId, r.id)
      const patch = { ...full }
      for (const k of EDITABLE) patch[k] = r[k]
      await updateJobOrder(profileId, r.id, patch)
    }
    await Promise.all(removedIds.map((id) => archiveJobOrder(profileId, id)))
    setSelected(new Set())
    setAlert({ variant: 'success', title: 'Changes saved.' })
    reload()
  })

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev)
      rows.forEach((r) => (allSelected ? n.delete(r.id) : n.add(r.id)))
      return n
    })
  }
  function toggleRow(id) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const selectedItems = () => rows.filter((r) => selected.has(r.id)).map(toItem)

  async function runPending() {
    const { action, items } = pending
    const ids = items.map((it) => it.id)
    try {
      if (action === 'delete') await Promise.all(ids.map((id) => deleteJobOrder(profileId, id)))
      else if (action === 'restore')
        await Promise.all(ids.map((id) => restoreJobOrder(profileId, id)))
      else await Promise.all(ids.map((id) => archiveJobOrder(profileId, id)))
      setSelected(new Set())
      setAlert(actionAlert(action, items, 'job order'))
      if (pending.from === 'detail') setSelectedId(null)
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  async function handleAdd(values) {
    try {
      await createJobOrder(profileId, values)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not add job order', message: errMessage(e) })
      throw e
    }
    setTab('active')
    setPage(1)
    setAlert({ variant: 'success', title: 'Job order added successfully!' })
    reload()
  }

  async function handleCloseReopen(next) {
    try {
      const fresh =
        next === 'Closed'
          ? await closeJobOrder(profileId, selectedJob.id)
          : await reopenJobOrder(profileId, selectedJob.id)
      setSelectedJob(fresh)
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Update failed', message: errMessage(e) })
    }
  }

  if (selectedId && !selectedJob) {
    return (
      <div className="mt-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
      </div>
    )
  }

  if (selectedJob) {
    return (
      <JobOrderDetail
        job={selectedJob}
        profileId={profileId}
        customerOptions={customerOptions}
        materialOptions={materialOptions}
        onBack={() => setSelectedId(null)}
        onSaved={(fresh) => setSelectedJob(fresh)}
        onClose={() => handleCloseReopen('Closed')}
        onReopen={() => handleCloseReopen('Open')}
        onArchive={() =>
          setPending({ action: 'archive', items: [toItem(selectedJob)], from: 'detail' })
        }
        onError={(e) =>
          setAlert({ variant: 'danger', title: 'Save failed', message: errMessage(e) })
        }
      />
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold text-content">{profileName} Job Orders</h1>
      </div>

      <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
          <input
            type="search"
            value={query}
            disabled={edit.editing}
            onChange={(e) => reset(setQuery)(e.target.value)}
            placeholder="Search Job Order..."
            className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light disabled:opacity-60"
          />
        </div>
        <Select
          wrapperClassName="w-full md:w-56"
          placeholder="Sort By"
          value={sort}
          disabled={edit.editing}
          onChange={reset(setSort)}
          options={SORT_OPTIONS}
        />
        {!edit.editing && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
          >
            <Plus className="h-4 w-4" />
            Add Job Order
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SegmentedTabs value={tab} options={TABS} disabled={edit.editing} onChange={reset(setTab)} />

        {tab === 'active' &&
          (edit.editing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmUndo(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-danger-hover"
              >
                <RotateCcw className="h-4 w-4" />
                Undo All
              </button>
              <button
                type="button"
                onClick={() => setConfirmSave(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-info px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-info-hover"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => edit.start(rows)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-info px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-info-hover disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" />
              Edit Table
            </button>
          ))}

        {!edit.editing && selected.size > 0 && (
          <div className="ml-auto flex gap-2">
            {tab === 'active' ? (
              <button
                type="button"
                onClick={() => setPending({ action: 'archive', items: selectedItems() })}
                className="rounded-lg bg-warning px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-warning-hover"
              >
                Archive {selected.size}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setPending({ action: 'restore', items: selectedItems() })}
                  className="rounded-lg bg-warning px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-warning-hover"
                >
                  Restore {selected.size}
                </button>
                <button
                  type="button"
                  onClick={() => setPending({ action: 'delete', items: selectedItems() })}
                  className="rounded-lg bg-danger px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-danger-hover"
                >
                  Delete {selected.size}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {edit.editing && (
        <p className="mt-4 text-sm text-content-muted">
          Editing this page — <span className="font-semibold">Ctrl&nbsp;+&nbsp;Z</span> undoes your
          last change, or use Undo&nbsp;All.
        </p>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Plus}
            title={term ? `No job orders match "${query.trim()}"` : 'No job orders yet'}
            subtitle={term ? 'Try a different search term.' : 'Use "Add Job Order" to create one.'}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-purple-light bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-purple text-left text-white">
                {!edit.editing && (
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {JOB_ORDER_LIST_COLUMNS.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-3 py-3 font-bold">
                    {c.label}
                  </th>
                ))}
                {!edit.editing && <th className="px-3 py-3 font-bold">Status</th>}
                {!edit.editing && <th className="px-3 py-3 font-bold">Archive</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-light">
              {(edit.editing ? edit.draft : rows).map((r) => (
                <tr
                  key={r.id}
                  onClick={() => !edit.editing && setSelectedId(r.id)}
                  className={`align-top transition-colors ${
                    edit.editing ? '' : 'cursor-pointer hover:bg-component-bg'
                  }`}
                >
                  {!edit.editing && (
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        aria-label={`Select ${r.id}`}
                      />
                    </td>
                  )}
                  {JOB_ORDER_LIST_COLUMNS.map((c) => {
                    const editable = edit.editing && EDITABLE.includes(c.key)
                    let content = cell(r[c.key], c.type)
                    if (editable && c.type === 'date') {
                      content = (
                        <DateField
                          size="sm"
                          wrapperClassName="min-w-44"
                          value={r[c.key] ?? ''}
                          onChange={(v) => edit.setCell(r.id, c.key, v)}
                        />
                      )
                    } else if (editable && (c.key === 'qty' || c.key === 'unitPrice')) {
                      content = (
                        <NumberField
                          size="sm"
                          mode={c.key === 'unitPrice' ? 'money' : 'integer'}
                          min={0}
                          wrapperClassName="min-w-28"
                          value={r[c.key] ?? ''}
                          onChange={(v) => edit.setCell(r.id, c.key, v)}
                        />
                      )
                    } else if (editable) {
                      content = (
                        <input
                          value={r[c.key] ?? ''}
                          onChange={(e) => edit.setCell(r.id, c.key, e.target.value)}
                          className="w-full min-w-28 rounded border border-purple-light bg-white px-2 py-1 text-sm outline-none focus:border-purple focus:ring-1 focus:ring-purple-light"
                        />
                      )
                    }
                    return (
                      <td key={c.key} className="whitespace-nowrap px-3 py-2 text-content">
                        {content}
                      </td>
                    )
                  })}
                  {!edit.editing && (
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs font-bold text-white ${
                          r.status === 'Closed' ? 'bg-secondary-bg' : 'bg-success'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  )}
                  {!edit.editing && (
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {tab === 'active' ? (
                        <button
                          type="button"
                          onClick={() => setPending({ action: 'archive', items: [toItem(r)] })}
                          aria-label="Archive"
                          className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPending({ action: 'restore', items: [toItem(r)] })}
                            className="rounded-md bg-warning px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-warning-hover"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setPending({ action: 'delete', items: [toItem(r)] })}
                            aria-label="Delete"
                            className="rounded-md bg-danger p-1.5 text-white transition-colors hover:bg-danger-hover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={edit.editing ? 'pointer-events-none opacity-50' : ''}>
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(v) => reset(setPageSize)(Number(v))}
        />
      </div>

      <AddJobOrderModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
        customerOptions={customerOptions}
      />

      <ActionConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        action={pending?.action}
        entityLabel="Job Order"
        items={pending?.items || []}
        linkedNote="materials on this job order"
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
        onConfirm={edit.cancel}
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
        onConfirm={edit.save}
      >
        <p>Save the changes to this page of job orders?</p>
      </ConfirmDialog>
    </div>
  )
}
