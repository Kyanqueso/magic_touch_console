import { Fragment, useEffect, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react'
import Alert from './Alert.jsx'
import EmptyState from './EmptyState.jsx'
import Pagination from './Pagination.jsx'
import SegmentedTabs from './SegmentedTabs.jsx'
import ActionConfirmDialog, { actionAlert } from './ActionConfirmDialog.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

// Reusable scaffold for the supplier's document lists (Sales Invoices, Vouchers).
// `fetchList({ tab, q, page, size })` -> { items, total }. `archiveDoc/restoreDoc/
// deleteDoc(id)` perform the mutation. `onSubmit(values, editTarget)` -> label.
export default function DocumentListTab({
  entityLabel,
  addLabel = 'Add',
  searchPlaceholder,
  title,
  subtitle,
  badge,
  columns,
  renderExpanded,
  renderAddModal,
  fetchList,
  archiveDoc,
  restoreDoc,
  deleteDoc,
  onSubmit,
  alertNoun,
  printDoc,
}) {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('active')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(() => new Set())
  const [alert, setAlert] = useAutoAlert()
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [pending, setPending] = useState(null)

  const term = query.trim()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      fetchList({ tab, q: term, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setAlert({
            variant: 'danger',
            title: `Could not load ${entityLabel.toLowerCase()}s`,
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
  }, [tab, term, page, pageSize, reloadKey])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)

  function toggle(id) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function runPending() {
    const { action, items } = pending
    const ids = items.map((it) => it.id)
    try {
      if (action === 'delete') await Promise.all(ids.map((id) => deleteDoc(id)))
      else if (action === 'restore') await Promise.all(ids.map((id) => restoreDoc(id)))
      else await Promise.all(ids.map((id) => archiveDoc(id)))
      setAlert(actionAlert(action, items, alertNoun || entityLabel.toLowerCase()))
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  async function handleSubmit(values) {
    let label
    try {
      label = await onSubmit(values, editTarget)
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not save ${entityLabel.toLowerCase()}`, message: errMessage(e) })
      throw e
    }
    setAlert({ variant: 'success', title: label })
    setAddOpen(false)
    setEditTarget(null)
    reload()
  }

  async function print(doc) {
    if (!printDoc) return
    try {
      await printDoc(doc)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not print', message: errMessage(e) })
    }
  }

  const actions = (doc) => ({
    tab,
    onPrint: printDoc ? () => print(doc) : undefined,
    onEdit: () => setEditTarget(doc),
    onArchive: () => setPending({ action: 'archive', items: [{ id: doc.id, primary: title(doc) }] }),
    onRestore: () => setPending({ action: 'restore', items: [{ id: doc.id, primary: title(doc) }] }),
    onDelete: () => setPending({ action: 'delete', items: [{ id: doc.id, primary: title(doc) }] }),
  })

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light"
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
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
          onChange={(v) => {
            setTab(v)
            setPage(1)
          }}
        />
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Plus}
            title={term ? `No results for "${term}"` : `No ${entityLabel.toLowerCase()}s yet`}
            subtitle={term ? 'Try a different search.' : `Use "${addLabel}" to create one.`}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-purple-light bg-white md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-purple text-left text-white">
                  <th className="w-8 px-3 py-3" />
                  {columns.map((c) => (
                    <th key={c.label} className="whitespace-nowrap px-3 py-3 font-bold">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-light">
                {rows.map((doc) => {
                  const open = expanded.has(doc.id)
                  return (
                    <Fragment key={doc.id}>
                      <tr
                        onClick={() => toggle(doc.id)}
                        className="cursor-pointer transition-colors hover:bg-component-bg"
                      >
                        <td className="px-3 py-2 text-content-muted">
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </td>
                        {columns.map((c) => (
                          <td key={c.label} className="whitespace-nowrap px-3 py-2 text-content">
                            {c.cell(doc)}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          <DocActions {...actions(doc)} />
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={columns.length + 2} className="bg-component-bg/40 px-6 py-4">
                            {renderExpanded(doc)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {rows.map((doc) => {
              const open = expanded.has(doc.id)
              return (
                <div
                  key={doc.id}
                  className="overflow-hidden rounded-xl border border-purple-light bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggle(doc.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-content">{title(doc)}</p>
                        {badge && badge(doc)}
                      </div>
                      <p className="text-xs text-content-muted">{subtitle(doc)}</p>
                    </div>
                    {open ? (
                      <ChevronDown className="h-5 w-5 shrink-0 text-content-muted" />
                    ) : (
                      <ChevronRight className="h-5 w-5 shrink-0 text-content-muted" />
                    )}
                  </button>
                  {open && (
                    <div className="border-t border-purple-light px-4 py-3">
                      <div className="mb-3">
                        <DocActions {...actions(doc)} />
                      </div>
                      {renderExpanded(doc)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(v) => {
          setPageSize(v)
          setPage(1)
        }}
      />

      {renderAddModal({
        open: addOpen || Boolean(editTarget),
        initial: editTarget,
        onClose: () => {
          setAddOpen(false)
          setEditTarget(null)
        },
        onSubmit: handleSubmit,
      })}

      <ActionConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        action={pending?.action}
        entityLabel={entityLabel}
        items={pending?.items || []}
      />
    </div>
  )
}

function DocActions({ tab, onPrint, onEdit, onArchive, onRestore, onDelete }) {
  return (
    <div className="inline-flex gap-2">
      <button
        type="button"
        onClick={onPrint}
        disabled={!onPrint}
        aria-label="Print"
        className="rounded-md bg-component-bg p-1.5 text-content-muted transition-colors hover:bg-purple-light disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Printer className="h-4 w-4" />
      </button>
      {tab === 'active' ? (
        <>
          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit"
            className="rounded-md bg-info p-1.5 text-white transition-colors hover:bg-info-hover"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onArchive}
            aria-label="Archive"
            className="rounded-md bg-warning p-1.5 text-white transition-colors hover:bg-warning-hover"
          >
            <Archive className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onRestore}
            className="rounded-md bg-warning px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-warning-hover"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            className="rounded-md bg-danger p-1.5 text-white transition-colors hover:bg-danger-hover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  )
}
