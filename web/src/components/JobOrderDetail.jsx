import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coins,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react'
import Button from './Button.jsx'
import Select from './Select.jsx'
import Combobox from './Combobox.jsx'
import DateField from './DateField.jsx'
import NumberField from './NumberField.jsx'
import NoteField from './NoteField.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import JobOrderSummary from './JobOrderSummary.jsx'
import LeaveEditDialog from './LeaveEditDialog.jsx'
import { FieldError } from './EditableCell.jsx'
import { validateJobOrderDetail } from '../lib/validate.js'
import { useUnsavedChanges } from '../lib/unsavedChanges.jsx'
import { maskDigits } from '../lib/masks.js'
import { peso, formatDate } from '../lib/format.js'
import { printDocument } from '../lib/print.js'
import { blankMaterial, saveJobOrderDraft } from '../api/jobOrders.js'

const BRANCHES = ['Main Branch', 'Lapuz', 'Mandurriao', 'Jaro', 'Molo']
const EQUIPMENT = ['offset', 'riso', 'comcolor', 'digital']
const UNITS = ['pcs', 'sets', 'booklets', 'pads', 'reams']
const COLORS = ['Black', 'Blue', 'Red', 'Green', 'None']
const PERFORATIONS = ['Top', 'Bottom', 'Left', 'Right', 'Middle', 'None']
const DISTRIBUTIONS = ['Standard', 'Custom', 'None']
const BACK_COPIES = ['Standard', 'Blank', 'None']
const MAX_MATERIALS = 10

const opt = (list) => list.map((o) => ({ value: o, label: o }))

const OVERVIEW = [
  ['jobDescription', 'Job Description', 'text'],
  ['specification', 'Specifications', 'text'],
  ['branch', 'Branch', 'combo', BRANCHES],
  // Digits only, matching the Add Job Order form — leading zeros are kept.
  ['seriesFrom', 'Series From', 'digits'],
  ['seriesTo', 'Series To', 'digits'],
  ['equipment', 'Equipment', 'select', EQUIPMENT],
]
const ORDER = [
  ['dateOrdered', 'Date Ordered', 'date'],
  ['deliveryDate', 'Delivery Date', 'date'],
  ['po', 'PO', 'text'],
  ['invoiceNo', 'Invoice No', 'text'],
  ['invoiceDate', 'Invoice Date', 'date'],
  ['atp', 'ATP', 'text'],
  ['atpDate', 'ATP Issue Date', 'date'],
  ['orNo', 'OR No', 'text'],
  ['orDate', 'OR Date', 'date'],
]
const PRICING = [
  ['qty', 'Qty', 'number'],
  ['unit', 'Unit', 'select', UNITS],
  ['size', 'Size', 'text'],
  ['unitPrice', 'Unit Price', 'peso'],
]

const MAT_FIELDS = [
  ['textColor', 'Text Color', COLORS],
  ['numberColor', 'Number Color', COLORS],
  ['ink1', 'Ink 1', COLORS],
  ['ink2', 'Ink 2', COLORS],
  ['perforation1', 'Perforation 1', PERFORATIONS],
  ['perforation2', 'Perforation 2', PERFORATIONS],
  ['distribution', 'Distribution', DISTRIBUTIONS],
  ['backCopy', 'Back Copy', BACK_COPIES],
]

function display(value, type) {
  if (!value && value !== 0) return '—'
  if (type === 'date') return formatDate(value)
  if (type === 'peso') return peso(value)
  return String(value)
}

export default function JobOrderDetail({
  job,
  profileId,
  customerOptions = [],
  materialOptions = [],
  onBack,
  onSaved,
  onClose,
  onReopen,
  onArchive,
  onError,
}) {
  const closed = job.status === 'Closed'

  const [showSummary, setShowSummary] = useState(false)

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState(job)
  const [history, setHistory] = useState([])
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [deleteMat, setDeleteMat] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  useEffect(() => {
    if (!editing) setDraft(job)
  }, [job, editing])

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

  const view = editing ? draft : job
  const materials = view.materials || []
  const filledCount = materials.filter((m) => m.materialId).length
  const editable = editing && !closed

  function startEdit() {
    setDraft(job)
    setHistory([])
    setEditing(true)
  }

  function exitEdit() {
    setEditing(false)
    setHistory([])
    setDraft(job)
  }

  // Live validation while editing, so a bad delivery date shows up here rather
  // than as a rejected save.
  const errors = useMemo(
    () => (editing ? validateJobOrderDetail(draft) : {}),
    [draft, editing],
  )
  const errorCount = Object.keys(errors).length

  async function saveEdit() {
    if (errorCount > 0) return
    setSaving(true)
    try {
      const fresh = await saveJobOrderDraft(profileId, draft, job.materials || [])
      onSaved(fresh)
      setEditing(false)
      setHistory([])
    } catch (e) {
      onError?.(e)
    } finally {
      setSaving(false)
    }
  }

  // Leaving mid-edit throws the draft away, so ask first — locally for the
  // back button, and through the shared guard for the header and section nav.
  const [leaveTo, setLeaveTo] = useState(null)
  const dirty = editing && history.length > 0
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

  function setField(key, value) {
    setHistory((h) => [...h, draft])
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function setMaterials(nextMaterials) {
    setHistory((h) => [...h, draft])
    setDraft((d) => ({ ...d, materials: nextMaterials }))
  }

  function setMatField(id, patch) {
    setMaterials(materials.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function addMaterial() {
    if (materials.length >= MAX_MATERIALS) return
    const mat = blankMaterial()
    setMaterials([...materials, mat])
    setExpanded((s) => new Set(s).add(mat.id))
  }

  function removeMaterial(id) {
    setMaterials(materials.filter((m) => m.id !== id))
    setExpanded((s) => {
      const n = new Set(s)
      n.delete(id)
      return n
    })
    setDeleteMat(null)
  }

  function toggleMat(id) {
    setExpanded((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const allExpanded = materials.length > 0 && materials.every((m) => expanded.has(m.id))

  // Prints the saved job, not the edit draft - the button only shows when not
  // editing, so what is on screen is what gets printed.
  function printJob() {
    const mats = (job.materials || []).filter((m) => m.material)
    printDocument({
      docTitle: 'JOB ORDER',
      number: `Job No. ${job.id}`,
      meta: [
        ['Customer', job.customerName],
        ['Status', job.status],
        ...OVERVIEW.map(([k, label]) => [label, job[k]]),
        ...ORDER.map(([k, label, type]) => [label, display(job[k], type)]),
        ...PRICING.map(([k, label, type]) => [label, display(job[k], type)]),
        ['Operator', job.operator],
        ['Collate', job.collate],
      ],
      tables: mats.length
        ? [
            {
              caption: 'Materials',
              headers: ['#', 'Material', ...MAT_FIELDS.map(([, label]) => label), 'Size', 'Qty'],
              rows: mats.map((m, i) => [
                i + 1,
                m.material,
                ...MAT_FIELDS.map(([k]) => m[k]),
                m.sizeNeeded,
                m.qtyNeeded,
              ]),
            },
          ]
        : [],
      extras: job.otherInstructions ? [['Other Instructions', job.otherInstructions]] : [],
      signatures: [['Prepared by', ''], ['Approved by', ''], ['Received by', '']],
      landscape: true,
    })
  }

  if (showSummary) {
    return (
      <JobOrderSummary
        profileId={profileId}
        customerId={job.customerId}
        customerName={job.customerName}
        defaultJobTitle={job.jobDescription}
        onBack={() => setShowSummary(false)}
      />
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => guard(onBack)}
            aria-label="Back"
            className="mt-1 shrink-0 rounded-md p-1 text-content transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold text-content">
                {closed ? 'Job Order Summary' : 'Job Order Detail'}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold text-white ${
                  closed ? 'bg-secondary-bg' : 'bg-success'
                }`}
              >
                {job.status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-content-muted">
              Job No. {job.id} · {job.customerName}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="danger" size="sm" onClick={() => setConfirmUndo(true)} disabled={saving}>
                <RotateCcw className="h-4 w-4" />
                Undo All
              </Button>
              <Button
                variant="info"
                size="sm"
                onClick={() => setConfirmSave(true)}
                loading={saving}
                disabled={saving || errorCount > 0}
                title={errorCount > 0 ? 'Fix the highlighted fields first.' : undefined}
              >
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
              {errorCount > 0 && (
                <span className="self-center text-sm font-semibold text-danger">
                  {errorCount === 1 ? '1 field needs fixing' : `${errorCount} fields need fixing`}
                </span>
              )}
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={printJob}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowSummary(true)}>
                <BarChart3 className="h-4 w-4" />
                View Summary
              </Button>
              {closed ? (
                <>
                  <Button variant="info" size="sm" onClick={onReopen}>
                    <LockOpen className="h-4 w-4" />
                    Reopen
                  </Button>
                  <Button variant="warning" size="sm" onClick={onArchive}>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="info" size="sm" onClick={startEdit}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="dark" size="sm" onClick={() => setConfirmClose(true)}>
                    <Lock className="h-4 w-4" />
                    Close
                  </Button>
                  <Button variant="warning" size="sm" onClick={onArchive}>
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card icon={ClipboardList} title="Job Overview" fields={OVERVIEW} data={view} editing={editable} errors={errors} onField={setField} />
        <Card icon={ClipboardList} title="Order Details" fields={ORDER} data={view} editing={editable} errors={errors} onField={setField} />
        <Card icon={Coins} title="Quantity and Pricing" fields={PRICING} data={view} editing={editable} errors={errors} onField={setField} />
      </div>

      {/* Materials */}
      <div className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-extrabold text-content">Materials</h2>
          <span className="rounded-full bg-component-bg px-2.5 py-0.5 text-xs font-bold text-purple">
            {filledCount} out of {MAX_MATERIALS}
          </span>
          <div className="ml-auto flex gap-2">
            {materials.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setExpanded(allExpanded ? new Set() : new Set(materials.map((m) => m.id)))
                }
              >
                {allExpanded ? 'Collapse All' : 'Expand All'}
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            {editable && (
              <Button
                variant="success"
                size="sm"
                onClick={addMaterial}
                disabled={materials.length >= MAX_MATERIALS}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {!editing && !closed && (
          <p className="mt-2 text-sm text-content-muted">
            Click <span className="font-semibold">Edit</span> to add or change materials.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {materials.length === 0 ? (
            <p className="rounded-xl border border-dashed border-purple-light bg-white py-10 text-center text-sm text-content-muted">
              No materials yet.
            </p>
          ) : (
            materials.map((m) => (
              <div key={m.id} className="overflow-hidden rounded-lg border border-purple-light">
                <div className="flex items-center gap-2 bg-purple px-4 py-2.5 text-white">
                  <span className="flex-1 truncate font-bold">
                    {m.material || m.materialCode || 'Untitled material'}
                  </span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => setDeleteMat(m)}
                      aria-label="Delete material"
                      className="rounded bg-danger p-1 transition-colors hover:bg-danger-hover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleMat(m.id)}
                    aria-label={expanded.has(m.id) ? 'Collapse' : 'Expand'}
                    className="rounded p-1 transition-colors hover:bg-white/10"
                  >
                    {expanded.has(m.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {expanded.has(m.id) && (
                  <div className="grid grid-cols-1 gap-3 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-content">Material</label>
                      {editable ? (
                        <Select
                          wrapperClassName="w-full"
                          size="sm"
                          placeholder="Select material"
                          value={m.materialId}
                          onChange={(id) => {
                            const o = materialOptions.find((x) => x.value === id)
                            setMatField(m.id, { materialId: id, material: o?.label || '' })
                          }}
                          options={materialOptions}
                        />
                      ) : (
                        <p className="text-sm text-content-muted">{m.material || '—'}</p>
                      )}
                    </div>
                    {MAT_FIELDS.map(([key, label, list]) => (
                      <MatField
                        key={key}
                        label={label}
                        value={m[key]}
                        options={list}
                        readOnly={!editable}
                        onChange={(v) => setMatField(m.id, { [key]: v })}
                      />
                    ))}
                    <Stepper
                      label="Size Needed"
                      value={m.sizeNeeded}
                      readOnly={!editable}
                      onChange={(v) => setMatField(m.id, { sizeNeeded: v })}
                    />
                    <Stepper
                      label="Qty Needed"
                      value={m.qtyNeeded}
                      readOnly={!editable}
                      onChange={(v) => setMatField(m.id, { qtyNeeded: v })}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Personnel + Notes */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card
          icon={ClipboardList}
          title="Personnel"
          fields={[
            ['operator', 'Operator', 'text'],
            ['collate', 'Collate', 'text'],
          ]}
          data={view}
          editing={editable}
          onField={setField}
        />
        <div className="rounded-xl border border-purple-light bg-white p-5">
          <h3 className="mb-3 font-bold text-content">Notes</h3>
          {editable ? (
            <NoteField
              rows={3}
              value={view.otherInstructions || ''}
              onChange={(v) => setField('otherInstructions', v)}
            />
          ) : (
            <p className="text-sm text-content">{job.otherInstructions || '—'}</p>
          )}
        </div>
      </div>

      {editing && (
        <p className="mt-4 text-sm text-content-muted">
          Editing — <span className="font-semibold">Ctrl&nbsp;+&nbsp;Z</span> undoes your last
          change, or use Undo&nbsp;All.
        </p>
      )}

      <LeaveEditDialog
        open={Boolean(leaveTo)}
        onClose={() => setLeaveTo(null)}
        onConfirm={confirmLeave}
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
        onConfirm={saveEdit}
      >
        <p>Save the changes to this job order?</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmClose}
        onClose={() => setConfirmClose(false)}
        title="Close Job Order"
        confirmLabel="Close"
        cancelLabel="Cancel"
        loadingLabel="Closing..."
        confirmVariant="dark"
        confirmIcon={<Lock className="h-4 w-4" />}
        onConfirm={onClose}
      >
        <p>Close this job order? It becomes a read-only summary until reopened.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleteMat)}
        onClose={() => setDeleteMat(null)}
        title="Delete Material"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loadingLabel="Deleting..."
        confirmVariant="danger"
        confirmIcon={<Trash2 className="h-4 w-4" />}
        onConfirm={() => removeMaterial(deleteMat.id)}
      >
        <p>
          Remove <span className="font-bold">{deleteMat?.material || 'this material'}</span> from the
          job order?
        </p>
      </ConfirmDialog>
    </div>
  )
}

function Card({ icon: Icon, title, fields, data, editing, errors = {}, onField }) {
  return (
    <div className="rounded-xl border border-purple-light bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-component-bg text-purple">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-bold text-content">{title}</h3>
      </div>
      <div className="space-y-3">
        {fields.map(([key, label, type, list]) => (
          <div key={key} className={editing ? '' : 'flex items-center justify-between gap-4'}>
            <span
              className={
                editing
                  ? 'mb-1 block text-xs font-bold text-content'
                  : 'text-sm font-semibold text-content'
              }
            >
              {label}
            </span>
            {editing ? (
              <>
                <FieldInput
                  type={type}
                  value={data[key]}
                  options={list}
                  error={errors[key]}
                  onChange={(v) => onField(key, v)}
                />
                {errors[key] && <FieldError>{errors[key]}</FieldError>}
              </>
            ) : (
              <span className="text-sm text-content-muted">{display(data[key], type)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FieldInput({ type, value, options, error, onChange }) {
  const cls = `block w-full rounded-lg border bg-white px-3 py-2 text-sm text-content outline-none focus:ring-2 ${
    error
      ? 'border-danger focus:border-danger focus:ring-danger/30'
      : 'border-purple-light focus:border-purple focus:ring-purple-light'
  }`
  if (type === 'select') {
    return (
      <Select
        wrapperClassName="w-full"
        size="sm"
        placeholder="Select"
        value={value}
        onChange={onChange}
        options={opt(options)}
        invalid={Boolean(error)}
      />
    )
  }
  if (type === 'combo') {
    return (
      <Combobox
        wrapperClassName="w-full"
        size="sm"
        placeholder="Select or type"
        value={value ?? ''}
        onChange={onChange}
        options={options}
        invalid={Boolean(error)}
      />
    )
  }
  if (type === 'date') {
    return <DateField size="sm" value={value ?? ''} onChange={onChange} invalid={Boolean(error)} />
  }
  if (type === 'number' || type === 'peso') {
    return (
      <NumberField
        size="sm"
        mode={type === 'peso' ? 'money' : 'integer'}
        min={0}
        value={value ?? ''}
        onChange={onChange}
        invalid={Boolean(error)}
      />
    )
  }
  return (
    <input
      type="text"
      value={value ?? ''}
      inputMode={type === 'digits' ? 'numeric' : undefined}
      onChange={(e) => onChange(type === 'digits' ? maskDigits(e.target.value) : e.target.value)}
      aria-invalid={error ? true : undefined}
      className={cls}
    />
  )
}

function MatField({ label, value, options, readOnly, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-content">{label}</label>
      {readOnly ? (
        <p className="text-sm text-content-muted">{value || '—'}</p>
      ) : (
        <Select
          wrapperClassName="w-full"
          size="sm"
          placeholder="Select"
          value={value}
          onChange={onChange}
          options={opt(options)}
        />
      )}
    </div>
  )
}

function Stepper({ label, value, readOnly, onChange }) {
  if (readOnly) {
    return (
      <div>
        <label className="mb-1 block text-xs font-bold text-content">{label}</label>
        <p className="text-sm text-content-muted">{Number(value) || 0}</p>
      </div>
    )
  }
  return (
    <NumberField
      label={label}
      labelClassName="mb-1 block text-xs font-bold text-content"
      size="sm"
      mode="integer"
      min={0}
      steppers
      value={value ?? ''}
      onChange={onChange}
    />
  )
}
