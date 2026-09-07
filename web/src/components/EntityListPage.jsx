import { useEffect, useState } from 'react'
import {
  Archive,
  Building2,
  CalendarDays,
  Fingerprint,
  Loader2,
  Pencil,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Search,
  Trash2,
} from 'lucide-react'
import AppHeader from './AppHeader.jsx'
import Select from './Select.jsx'
import Alert from './Alert.jsx'
import Modal from './Modal.jsx'
import Pagination from './Pagination.jsx'
import SegmentedTabs from './SegmentedTabs.jsx'
import Loading from './Loading.jsx'
import CompanyFormModal from './CompanyFormModal.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import ActionConfirmDialog, { actionAlert } from './ActionConfirmDialog.jsx'
import EditableCell from './EditableCell.jsx'
import EditBar from './EditBar.jsx'
import LeaveEditDialog from './LeaveEditDialog.jsx'
import useTableEdit from '../hooks/useTableEdit.js'
import useAutoAlert from '../hooks/useAutoAlert.js'
import { validatePartyRow } from '../lib/validate.js'
import {
  listParties,
  createParty,
  updateParty,
  archiveParty,
  restoreParty,
  deleteParty,
} from '../api/parties.js'

const READONLY_KEYS = new Set(['id', 'scope', 'dateAdded'])

function errMessage(e) {
  if (e?.fields) return Object.values(e.fields).join(' ')
  return e?.message || 'Something went wrong.'
}

const toItem = (r) => ({ id: r.id, primary: r.id, secondary: r.name, tag: r.scope })

const TABS = [
  { value: 'active', label: 'Active' },
  { value: 'archive', label: 'Archive' },
]
const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
  { value: 'id-asc', label: 'ID: ascending' },
  { value: 'id-desc', label: 'ID: descending' },
]
const SCOPE_DOT = { Global: 'bg-info', Local: 'bg-success' }

// Shared list page for Customers and Suppliers — same table, same add form.
// `kind` selects the shared store slice. `profileId` (set when embedded in a
// corporate profile) limits rows to Global + that profile's Local ones.
export default function EntityListPage({
  kind,
  title,
  searchPlaceholder,
  addLabel,
  idPrefix,
  columns,
  formTitle,
  detailNoun,
  embedded = false,
  profileId = null,
  // When provided, a row click calls this instead of opening the detail modal
  // (used by the in-profile Suppliers list to drill into the supplier).
  onRowOpen,
  // Scope legend/filter options. Top-level (global) pages pass nothing, so the
  // Local filter is hidden; the profile-scoped view passes the full set.
  scopeOptions = [],
}) {
  const ctx = { kind, profileId: profileId ? String(profileId) : null }

  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((k) => k + 1)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('')
  const [tab, setTab] = useState('active')
  const [scope, setScope] = useState('All')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [alert, setAlert] = useAutoAlert()
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [pending, setPending] = useState(null)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)

  const edit = useTableEdit(async (draft, removedIds) => {
    await Promise.all([
      ...draft.map((r) => updateParty(ctx, r.id, r)),
      ...removedIds.map((id) => archiveParty(ctx, id)),
    ])
    setSelected(new Set())
    setAlert({ variant: 'success', title: 'Changes saved.' })
    reload()
  }, validatePartyRow)

  // Leaving mid-edit throws the draft away, so ask first.
  const [leaveTo, setLeaveTo] = useState(null)
  function guard(action) {
    if (edit.dirty) setLeaveTo(() => action)
    else action()
  }
  function confirmLeave() {
    const action = leaveTo
    setLeaveTo(null)
    edit.cancel()
    action?.()
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const t = setTimeout(() => {
      listParties(ctx, { tab, q: query.trim(), sort, scope, page, size: pageSize })
        .then((res) => {
          if (cancelled) return
          setRows(res.items)
          setTotal(res.total)
        })
        .catch((e) => {
          if (cancelled) return
          setRows([])
          setTotal(0)
          setAlert({ variant: 'danger', title: `Could not load ${detailNoun}s`, message: errMessage(e) })
        })
        .finally(() => !cancelled && setLoading(false))
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, profileId, tab, query, sort, scope, page, pageSize, reloadKey, setAlert])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows

  const reset = (fn) => (v) => {
    fn(v)
    setPage(1)
    setSelected(new Set())
  }

  function toggleRow(id) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const allSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))

  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev)
      pageRows.forEach((r) => (allSelected ? n.delete(r.id) : n.add(r.id)))
      return n
    })
  }

  const selectedItems = () => rows.filter((r) => selected.has(r.id)).map(toItem)

  async function runPending() {
    const { action, items } = pending
    const ids = items.map((it) => it.id)
    try {
      if (action === 'delete') await Promise.all(ids.map((id) => deleteParty(ctx, id)))
      else if (action === 'archive') await Promise.all(ids.map((id) => archiveParty(ctx, id)))
      else await Promise.all(ids.map((id) => restoreParty(ctx, id)))
      setSelected(new Set())
      setAlert(actionAlert(action, items, detailNoun))
      reload()
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not ${action}`, message: errMessage(e) })
    }
  }

  async function handleAdd(values) {
    try {
      await createParty(ctx, values)
    } catch (e) {
      setAlert({ variant: 'danger', title: `Could not add ${detailNoun}`, message: errMessage(e) })
      throw e // keep the modal open
    }
    setTab('active')
    setPage(1)
    setAlert({ variant: 'success', title: `${values.name} added successfully!` })
    reload()
  }

  const content = (
    <>
      {!embedded && (
        <h1 className="text-2xl font-extrabold text-content">{title}</h1>
      )}

      <div
        className={`flex flex-col gap-4 md:flex-row md:items-center ${
          embedded ? '' : 'mt-4'
        }`}
      >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-content-muted" />
            <input
              type="search"
              value={query}
              disabled={edit.editing}
              onChange={(e) => reset(setQuery)(e.target.value)}
              placeholder={searchPlaceholder}
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

          {tab === 'active' && !edit.editing && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-transparent bg-success px-4 py-3 text-base font-bold text-white transition-colors hover:bg-success-hover md:ml-auto"
            >
              <Plus className="h-4 w-4" />
              {addLabel}
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

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <SegmentedTabs
            value={tab}
            options={TABS}
            onChange={(v) => guard(() => reset(setTab)(v))}
          />

          {tab === 'active' &&
            (edit.editing ? (
              <EditBar
                errorCount={edit.errorCount}
                saving={edit.saving}
                onUndo={() => setConfirmUndo(true)}
                onSave={() => setConfirmSave(true)}
              />
            ) : (
              <button
                type="button"
                onClick={() => edit.start(pageRows)}
                disabled={edit.loading || pageRows.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg bg-info px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-info-hover disabled:opacity-60"
              >
                {edit.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pencil className="h-4 w-4" />
                )}
                Edit Table
              </button>
            ))}

          {!edit.editing && scopeOptions.length > 1 && (
            <div className="inline-flex overflow-hidden rounded-lg border border-purple-light text-sm">
              {scopeOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => reset(setScope)(s)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors ${
                    scope === s
                      ? 'bg-secondary-bg text-white'
                      : 'bg-white text-content hover:bg-component-bg'
                  }`}
                >
                  {SCOPE_DOT[s] && (
                    <span className={`h-2 w-2 rounded-full ${SCOPE_DOT[s]}`} />
                  )}
                  {s}
                </button>
              ))}
            </div>
          )}

          {!edit.editing && selected.size > 0 && (
            <div className="ml-auto flex gap-2">
              {tab === 'active' ? (
                <button
                  type="button"
                  onClick={() => setPending({ action: 'archive', items: selectedItems() })}
                  className="rounded-lg bg-warning px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-warning-hover"
                >
                  Archive {selected.size} selected
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

        <p className="mt-4 text-sm text-content-muted">
          {edit.editing
            ? 'Editing this page — Ctrl + Z undoes your last change, or use Undo All.'
            : `Click a row to view the ${detailNoun}’s detail.`}
        </p>

        <div className="mt-2 overflow-x-auto rounded-xl border border-purple-light bg-white">
          <table className="w-full min-w-[1100px] text-sm">
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
                {columns.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-3 py-3 font-bold">
                    {c.label}
                  </th>
                ))}
                {!edit.editing && <th className="px-3 py-3 font-bold">Archive</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-light">
              {loading && !edit.editing ? (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <Loading label={`Loading ${detailNoun}s...`} className="py-10" />
                  </td>
                </tr>
              ) : (edit.editing ? edit.draft : pageRows).length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-3 py-8 text-center text-content-muted"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                (edit.editing ? edit.draft : pageRows).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() =>
                      !edit.editing && (onRowOpen ? onRowOpen(r) : setDetail(r))
                    }
                    className={`transition-colors ${
                      edit.editing ? '' : 'cursor-pointer hover:bg-component-bg'
                    }`}
                  >
                    {!edit.editing && (
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-3 py-2 align-top text-content ${
                          edit.editing ? '' : 'whitespace-nowrap'
                        }`}
                      >
                        {edit.editing && !READONLY_KEYS.has(c.key) ? (
                          <EditableCell
                            value={r[c.key]}
                            error={edit.errorsFor(r.id)[c.key]}
                            onChange={(v) => edit.setCell(r.id, c.key, v)}
                          />
                        ) : c.key === 'scope' ? (
                          <ScopeBadge scope={r[c.key]} />
                        ) : (
                          r[c.key] || '—'
                        )}
                      </td>
                    ))}
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
                ))
              )}
            </tbody>
          </table>
        </div>

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

      <CompanyFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAdd}
        title={`Add ${formTitle}`}
        submitLabel="Add"
        scopeLocked={!profileId}
        entityLabel={detailNoun}
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
        entityLabel={formTitle}
        items={pending?.items || []}
        linkedNote="corporate profiles and job orders linked"
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
        <p>Save the changes to this page of {detailNoun}s?</p>
      </ConfirmDialog>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name || 'Details'}
        description={detail?.id}
        icon={<Building2 />}
      >
        {detail && <CompanyDetail row={detail} columns={columns} />}
      </Modal>
    </>
  )

  if (embedded) return content

  return (
    <div className="min-h-full bg-component-bg">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-6 py-8">{content}</main>
    </div>
  )
}

const DETAIL_SECTIONS = [
  { title: 'Company', icon: Building2, keys: ['scope', 'address', 'zip'] },
  { title: 'Government IDs', icon: Fingerprint, keys: ['tin', 'branchCode'] },
  { title: 'Terms', icon: Scale, keys: ['terms', 'companyType', 'taxType'] },
  { title: 'Withholding Tax', icon: Percent, keys: ['wtax1', 'wtax2'] },
]

function CompanyDetail({ row, columns }) {
  const labelOf = (key) => columns.find((c) => c.key === key)?.label || key

  return (
    <div className="space-y-4">
      {DETAIL_SECTIONS.map(({ title, icon: Icon, keys }) => (
        <section key={title} className="rounded-xl border border-purple-light p-4">
          <div className="mb-3 flex items-center gap-2 text-content-muted">
            <Icon className="h-4 w-4 text-purple" />
            <h3 className="text-xs font-bold uppercase tracking-wide">{title}</h3>
          </div>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {keys.map((key) => (
              <div key={key}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">
                  {labelOf(key)}
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-content">
                  {key === 'scope' ? (
                    <ScopeBadge scope={row[key]} />
                  ) : (
                    row[key] || '—'
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {row.dateAdded && (
        <p className="flex items-center gap-2 px-1 text-xs text-content-muted">
          <CalendarDays className="h-3.5 w-3.5" />
          Added on <span className="font-semibold text-content">{row.dateAdded}</span>
        </p>
      )}
    </div>
  )
}

function ScopeBadge({ scope }) {
  if (!scope) return <span className="text-content-muted">—</span>
  const style =
    scope === 'Global'
      ? 'bg-info/15 text-info'
      : scope === 'Local'
        ? 'bg-success/15 text-success'
        : 'bg-component-bg text-content-muted'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          scope === 'Global' ? 'bg-info' : scope === 'Local' ? 'bg-success' : 'bg-content-muted'
        }`}
      />
      {scope}
    </span>
  )
}
