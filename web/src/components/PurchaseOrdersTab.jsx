import { Fragment, useEffect, useState } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react'
import Alert from './Alert.jsx'
import EmptyState from './EmptyState.jsx'
import Loading from './Loading.jsx'
import Pagination from './Pagination.jsx'
import SegmentedTabs from './SegmentedTabs.jsx'
import ActionConfirmDialog, { actionAlert } from './ActionConfirmDialog.jsx'
import AddPurchaseOrderModal from './AddPurchaseOrderModal.jsx'
import { LineItems } from './DocLineItems.jsx'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { peso, formatDate } from '../lib/format.js'
import { printDocument } from '../lib/print.js'
import {
  listPurchaseOrders,
  listPoMaterialOptions,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  archivePurchaseOrder,
  restorePurchaseOrder,
  deletePurchaseOrder,
} from '../api/purchasing.js'

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

const toItem = (po) => ({ id: po.id, primary: po.poNumber })

export default function PurchaseOrdersTab({ supplier, profileId }) {
  const sid = supplier.id
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [materialOptions, setMaterialOptions] = useState([])
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
    listPoMaterialOptions(profileId, sid)
      .then((opts) => {
        if (!cancelled) setMaterialOptions(opts)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId, sid])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      listPurchaseOrders(profileId, sid, { tab, q: term, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setAlert({ variant: 'danger', title: 'Could not load purchase orders', message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [profileId, sid, tab, term, page, pageSize, reloadKey, setAlert])

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
      if (action === 'delete') await Promise.all(ids.map((id) => deletePurchaseOrder(profileId, sid, id)))
      else if (action === 'restore')
        await Promise.all(ids.map((id) => restorePurchaseOrder(profileId, sid, id)))
      else await Promise.all(ids.map((id) => archivePurchaseOrder(profileId, sid, id)))
      setAlert(actionAlert(action, items, 'purchase order'))
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  async function openEdit(poRow) {
    try {
      const full = await getPurchaseOrder(profileId, sid, poRow.id)
      setEditTarget(full)
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not open purchase order', message: errMessage(e) })
    }
  }

  // The list row carries only a count and a total, so fetch the full document
  // for its line items before printing.
  async function printPo(poRow) {
    try {
      const po = await getPurchaseOrder(profileId, sid, poRow.id)
      printDocument({
        docTitle: 'PURCHASE ORDER',
        number: po.poNumber,
        meta: [
          ['Supplier', supplier.name],
          ['PO Date', formatDate(po.dateOrdered)],
        ],
        items: po.items,
        total: po.total,
        signatures: [
          ['Prepared by', po.preparedBy],
          ['Approved by', po.approvedBy],
        ],
      })
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not print', message: errMessage(e) })
    }
  }

  async function handleSubmit(values) {
    try {
      if (editTarget) {
        await updatePurchaseOrder(profileId, sid, editTarget.id, values, editTarget.items || [])
        setAlert({ variant: 'success', title: `${editTarget.poNumber} updated.` })
      } else {
        const created = await createPurchaseOrder(profileId, sid, values)
        setAlert({ variant: 'success', title: `${created.poNumber} added successfully!` })
      }
    } catch (e) {
      setAlert({ variant: 'danger', title: 'Could not save purchase order', message: errMessage(e) })
      throw e
    }
    setAddOpen(false)
    setEditTarget(null)
    reload()
  }

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
            placeholder="Search Purchase Order..."
            className="w-full rounded-lg border border-purple-light bg-white py-3 pl-10 pr-4 text-base text-content outline-none transition-colors placeholder:text-content-muted focus:border-purple focus:ring-2 focus:ring-purple-light"
          />
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
        >
          <Plus className="h-4 w-4" />
          Add
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
        <Loading label="Loading purchase orders..." />
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Plus}
            title={term ? `No purchase orders match "${term}"` : 'No purchase orders yet'}
            subtitle={term ? 'Try a different search.' : 'Use "Add" to create one.'}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-purple-light bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="bg-purple text-left text-white">
                <th className="w-8 px-3 py-3" />
                <th className="px-3 py-3 font-bold">PO No.</th>
                <th className="px-3 py-3 font-bold">Date Ordered</th>
                <th className="px-3 py-3 font-bold">Items</th>
                <th className="px-3 py-3 font-bold">Total</th>
                <th className="px-3 py-3 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-light">
              {rows.map((po) => {
                const open = expanded.has(po.id)
                return (
                  <Fragment key={po.id}>
                    <tr
                      onClick={() => toggle(po.id)}
                      className="cursor-pointer transition-colors hover:bg-component-bg"
                    >
                      <td className="px-3 py-2 text-content-muted">
                        {open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-bold text-content">{po.poNumber}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-content">
                        {formatDate(po.dateOrdered)}
                      </td>
                      <td className="px-3 py-2 text-content">{po.itemCount}</td>
                      <td className="px-3 py-2 font-semibold text-content">{peso(po.total)}</td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <PoActions
                          tab={tab}
                          onPrint={() => printPo(po)}
                          onEdit={() => openEdit(po)}
                          onArchive={() => setPending({ action: 'archive', items: [toItem(po)] })}
                          onRestore={() => setPending({ action: 'restore', items: [toItem(po)] })}
                          onDelete={() => setPending({ action: 'delete', items: [toItem(po)] })}
                        />
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={6} className="bg-component-bg/40 px-6 py-4">
                          <PoExpanded pid={profileId} sid={sid} id={po.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
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

      <AddPurchaseOrderModal
        open={addOpen || Boolean(editTarget)}
        initial={editTarget}
        materialOptions={materialOptions}
        onClose={() => {
          setAddOpen(false)
          setEditTarget(null)
        }}
        onSubmit={handleSubmit}
      />

      <ActionConfirmDialog
        open={Boolean(pending)}
        onClose={() => setPending(null)}
        onConfirm={runPending}
        action={pending?.action}
        entityLabel="Purchase Order"
        items={pending?.items || []}
      />
    </div>
  )
}

function PoExpanded({ pid, sid, id }) {
  const [po, setPo] = useState(null)
  useEffect(() => {
    let cancelled = false
    getPurchaseOrder(pid, sid, id)
      .then((d) => !cancelled && setPo(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pid, sid, id])
  if (!po) return <p className="text-sm text-content-muted">Loading…</p>
  return (
    <>
      <LineItems items={po.items} />
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-purple-light pt-3 text-sm">
        <Field label="Prepared By" value={po.preparedBy} />
        <Field label="Prepared Date" value={formatDate(po.preparedDate)} />
        <Field label="Approved By" value={po.approvedBy} />
        <Field label="Approved Date" value={formatDate(po.approvedDate)} />
      </div>
    </>
  )
}

function PoActions({ tab, onPrint, onEdit, onArchive, onRestore, onDelete }) {
  return (
    <div className="inline-flex gap-2">
      <button
        type="button"
        onClick={onPrint}
        aria-label="Print"
        className="rounded-md bg-component-bg p-1.5 text-content-muted transition-colors hover:bg-purple-light"
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

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</p>
      <p className="text-sm text-content">{value || '—'}</p>
    </div>
  )
}
