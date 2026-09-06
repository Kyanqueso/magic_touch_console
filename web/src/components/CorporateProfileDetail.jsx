import { useEffect, useState } from 'react'
import { ArrowLeft, Archive, Coins, Fingerprint, Pencil, Plus, ScrollText } from 'lucide-react'
import Button from './Button.jsx'
import Select from './Select.jsx'
import DateField from './DateField.jsx'
import EntityListPage from './EntityListPage.jsx'
import JobOrdersSection from './JobOrdersSection.jsx'
import SupplierDetail from './SupplierDetail.jsx'
import { COMPANY_TYPES, TAX_TYPES } from './CompanyFormModal.jsx'
import { formatDate } from '../lib/format.js'
import { maskTIN, maskSSS, maskPHIC, maskHDMF } from '../lib/masks.js'
import { CUSTOMER_COLUMNS, SUPPLIER_COLUMNS } from '../api/parties.js'

const WTAX = ['WI010', 'WI011', 'WI100', 'WI157', 'WI158', 'WC100', 'WC157', 'WC158', 'WC160']
const FILING_TYPES = [
  '1601 C',
  '1601 E',
  '1601 F',
  '1604 C',
  '1604 E',
  '0619 E',
  '0619 F',
  '2550 M',
  '2550 Q',
  '2551 Q',
]

const opts = (list) => list.map((o) => ({ value: o, label: o }))

const RULES = {
  tin: [/^\d{3}-\d{3}-\d{3}-\d{3}$/, 'Invalid TIN.'],
  sss: [/^\d{2}-\d{7}-\d$/, 'Invalid SSS.'],
  phic: [/^\d{2}-\d{9}-\d$/, 'Invalid PHIC.'],
  hdmf: [/^\d{4}-\d{4}-\d{4}$/, 'Invalid HDMF.'],
  dtiNo: [/^\d{6,}$/, 'Invalid DTI No.'],
  secNo: [/^[A-Za-z]{2}\d{6,}$/, 'Invalid SEC No.'],
}

const EMPTY_DETAILS = {
  tin: '',
  sss: '',
  phic: '',
  hdmf: '',
  companyType: '',
  taxType: '',
  dtiNo: '',
  dtiRegistered: '',
  dtiExpired: '',
  secNo: '',
  secRegistered: '',
  secExpired: '',
  wtax1: '',
  wtax2: '',
  filingTaxTypes: ['', ''],
}

export default function CorporateProfileDetail({
  profile,
  section = 'details',
  onBack,
  onExitSection,
  onSave,
  onArchive,
}) {
  const filled = profile.status === 'Filled Up' && Boolean(profile.details)
  const [editing, setEditing] = useState(!filled)
  const [supplierDrill, setSupplierDrill] = useState(null)

  useEffect(() => {
    if (section !== 'suppliers') setSupplierDrill(null)
  }, [section])

  if (section === 'customers' || section === 'suppliers') {
    const isCustomers = section === 'customers'

    if (section === 'suppliers' && supplierDrill) {
      return (
        <div className="mx-auto max-w-6xl">
          <SupplierDetail
            supplier={supplierDrill}
            profileId={profile.id}
            onBack={() => setSupplierDrill(null)}
          />
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onExitSection}
            aria-label="Back"
            className="rounded-md p-1 text-content transition-colors hover:bg-white"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="text-2xl font-extrabold text-content">{profile.name}</h1>
        </div>
        <div className="mt-6">
          <EntityListPage
            embedded
            kind={isCustomers ? 'customer' : 'supplier'}
            profileId={profile.id}
            scopeOptions={['All', 'Global', 'Local']}
            onRowOpen={isCustomers ? undefined : (r) => setSupplierDrill(r)}
            title={isCustomers ? 'Customers' : 'Suppliers'}
            searchPlaceholder={isCustomers ? 'Search Customer...' : 'Search Supplier...'}
            addLabel={isCustomers ? 'Add Customer' : 'Add Supplier'}
            idPrefix={isCustomers ? 'CUST' : 'Supp'}
            columns={isCustomers ? CUSTOMER_COLUMNS : SUPPLIER_COLUMNS}
            formTitle={isCustomers ? 'Customer' : 'Supplier'}
            detailNoun={isCustomers ? 'customer' : 'supplier'}
          />
        </div>
      </div>
    )
  }

  if (section === 'job-orders') {
    return (
      <div className="mx-auto max-w-6xl">
        <JobOrdersSection
          profileId={profile.id}
          profileName={profile.name}
          onBack={onExitSection}
        />
      </div>
    )
  }

  if (editing) {
    return (
      <ProfileForm
        profile={profile}
        canCancel={filled}
        onCancel={() => setEditing(false)}
        onBack={onBack}
        onSubmit={async (data) => {
          await onSave(data)
          setEditing(false)
        }}
      />
    )
  }

  return (
    <ProfileSummary
      profile={profile}
      onBack={onBack}
      onEdit={() => setEditing(true)}
      onArchive={onArchive}
    />
  )
}

// Form

function ProfileForm({ profile, canCancel, onCancel, onBack, onSubmit }) {
  const [name, setName] = useState(profile.name || '')
  const [address, setAddress] = useState(profile.address || '')
  const [jobOrdersEnabled, setJobOrdersEnabled] = useState(
    Boolean(profile.jobOrdersEnabled),
  )
  const [form, setForm] = useState(() => ({
    ...EMPTY_DETAILS,
    ...(profile.details || {}),
    filingTaxTypes: profile.details?.filingTaxTypes?.length
      ? [...profile.details.filingTaxTypes]
      : ['', ''],
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const setFiling = (i, value) =>
    setForm((f) => ({
      ...f,
      filingTaxTypes: f.filingTaxTypes.map((v, idx) => (idx === i ? value : v)),
    }))

  const addFiling = () =>
    setForm((f) => ({ ...f, filingTaxTypes: [...f.filingTaxTypes, ''] }))

  async function handleSubmit(e) {
    e.preventDefault()
    const next = {}
    if (!name.trim()) next.name = 'Corporate name is required.'
    for (const [key, [re, msg]] of Object.entries(RULES)) {
      if (!re.test(form[key] || '')) next[key] = msg
    }
    if (Object.keys(next).length) {
      setErrors(next)
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim(),
        jobOrdersEnabled,
        details: {
          ...form,
          filingTaxTypes: form.filingTaxTypes.filter(Boolean),
        },
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-extrabold text-content">{name || 'Corporate Profile'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Corporate Name" value={name} onChange={setName} error={errors.name} disabled={saving} />
          <Field label="Corporate Address" value={address} onChange={setAddress} disabled={saving} />
        </div>

        <Section title="Modules">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-purple-light p-4">
            <div>
              <p className="text-sm font-bold text-content">Job Orders</p>
              <p className="text-xs text-content-muted">
                Enable the Job Orders module for this corporate profile.
              </p>
            </div>
            <Toggle checked={jobOrdersEnabled} onChange={setJobOrdersEnabled} disabled={saving} />
          </div>
        </Section>

        <Section title="Government Identifications">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Field label="TIN" value={form.tin} onChange={(v) => set('tin', maskTIN(v))} error={errors.tin} disabled={saving} />
            <Field label="SSS" value={form.sss} onChange={(v) => set('sss', maskSSS(v))} error={errors.sss} disabled={saving} />
            <Field label="PHIC" value={form.phic} onChange={(v) => set('phic', maskPHIC(v))} error={errors.phic} disabled={saving} />
            <Field label="HDMF" value={form.hdmf} onChange={(v) => set('hdmf', maskHDMF(v))} error={errors.hdmf} disabled={saving} />
          </div>
        </Section>

        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Company Type" value={form.companyType} onChange={(v) => set('companyType', v)} options={opts(COMPANY_TYPES)} />
          <SelectField label="Tax Type" value={form.taxType} onChange={(v) => set('taxType', v)} options={opts(TAX_TYPES)} />
        </div>

        <Section title="Business Registrations">
          <RegistrationFields
            prefix="DTI"
            no={form.dtiNo}
            registered={form.dtiRegistered}
            expired={form.dtiExpired}
            error={errors.dtiNo}
            disabled={saving}
            onNo={(v) => set('dtiNo', v)}
            onRegistered={(v) => set('dtiRegistered', v)}
            onExpired={(v) => set('dtiExpired', v)}
          />
          <RegistrationFields
            prefix="SEC"
            no={form.secNo}
            registered={form.secRegistered}
            expired={form.secExpired}
            error={errors.secNo}
            disabled={saving}
            onNo={(v) => set('secNo', v)}
            onRegistered={(v) => set('secRegistered', v)}
            onExpired={(v) => set('secExpired', v)}
          />
        </Section>

        <Section title="Taxes">
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="WTAX ATC 1" value={form.wtax1} onChange={(v) => set('wtax1', v)} options={opts(WTAX)} />
            <SelectField label="WTAX ATC 2" value={form.wtax2} onChange={(v) => set('wtax2', v)} options={opts(WTAX)} />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold text-content">Filing Tax Types</p>
              <button
                type="button"
                onClick={addFiling}
                className="inline-flex items-center gap-1 rounded-md bg-success px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-success-hover"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {form.filingTaxTypes.map((val, i) => (
                <SelectField
                  key={i}
                  label={`Filing Tax Type ${i + 1}`}
                  value={val}
                  onChange={(v) => setFiling(i, v)}
                  options={opts(FILING_TYPES)}
                />
              ))}
            </div>
          </div>
        </Section>

        <div className="flex gap-3">
          {canCancel && (
            <Button type="button" variant="dark" onClick={onCancel} disabled={saving} className="flex-1 sm:flex-none sm:px-10">
              Cancel
            </Button>
          )}
          <Button type="submit" loading={saving} disabled={saving} className="flex-1">
            {saving ? 'Saving...' : canCancel ? 'Save Changes' : 'Complete Corporate Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-content-muted">{title}</h3>
      {children}
    </section>
  )
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-60 ${
        checked ? 'bg-purple' : 'bg-purple-light'
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function Field({ label, value, onChange, error, disabled, className = '' }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-content">{label}</label>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-content outline-none transition-colors focus:ring-2 ${
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-purple-light focus:border-purple focus:ring-purple-light'
        }`}
      />
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  )
}

function SelectField({ label, className = '', ...props }) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-content">{label}</label>
      <Select wrapperClassName="w-full" size="sm" placeholder="Select" {...props} />
    </div>
  )
}

function RegistrationFields({
  prefix,
  no,
  registered,
  expired,
  error,
  disabled,
  onNo,
  onRegistered,
  onExpired,
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Field
        label={`${prefix} No.`}
        value={no}
        onChange={onNo}
        error={error}
        disabled={disabled}
        className="col-span-2 sm:col-span-1"
      />
      <DateField
        label="Date Registered"
        labelClassName="mb-2 block text-sm font-bold text-content"
        size="sm"
        value={registered}
        onChange={onRegistered}
        disabled={disabled}
      />
      <DateField
        label="Date Expired"
        labelClassName="mb-2 block text-sm font-bold text-content"
        size="sm"
        value={expired}
        onChange={onExpired}
        disabled={disabled}
      />
    </div>
  )
}

// Summary

const ACCENTS = {
  purple: 'bg-component-bg text-purple',
  warning: 'bg-warning/15 text-warning',
  success: 'bg-success-tooltip-bg text-success-tooltip-icon',
}

function ProfileSummary({ profile, onBack, onEdit, onArchive }) {
  const d = profile.details || EMPTY_DETAILS

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="mt-1 rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-content">{profile.name}</h1>
            {profile.jobOrdersEnabled && (
              <span className="rounded-full bg-purple-light px-2 py-0.5 text-xs font-bold text-purple">
                Job Orders
              </span>
            )}
          </div>
          {profile.address && (
            <p className="text-sm text-content-muted">{profile.address}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="info" size="sm" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="warning" size="sm" onClick={onArchive}>
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SummaryCard icon={Fingerprint} accent="purple" title="Government Identifications">
          <Row label="TIN" value={d.tin} />
          <Row label="SSS" value={d.sss} />
          <Row label="PHIC" value={d.phic} />
          <Row label="HDMF" value={d.hdmf} />
        </SummaryCard>

        <SummaryCard icon={ScrollText} accent="warning" title="Business Registrations">
          <Registration label="DTI" no={d.dtiNo} registered={d.dtiRegistered} expired={d.dtiExpired} />
          <Registration label="SEC" no={d.secNo} registered={d.secRegistered} expired={d.secExpired} />
        </SummaryCard>

        <SummaryCard icon={Coins} accent="success" title="Taxes">
          <Row label="WTAX ATC 1" value={d.wtax1} />
          <Row label="WTAX ATC 2" value={d.wtax2} />
          <div className="my-3 border-t border-purple-light" />
          {(d.filingTaxTypes || []).map((t, i) => (
            <Row key={i} label={`Filing Tax Type ${i + 1}`} value={t} />
          ))}
        </SummaryCard>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, accent, title, children }) {
  return (
    <div className="rounded-xl border border-purple-light bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENTS[accent]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-bold text-content">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm font-semibold text-content">{label}</span>
      <span className="text-sm text-content-muted">{value || '—'}</span>
    </div>
  )
}

function Registration({ label, no, registered, expired }) {
  const start = registered ? new Date(registered) : null
  const end = expired ? new Date(expired) : null
  const now = new Date()
  const pct =
    start && end && end > start
      ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
      : 0
  const active = end ? now < end : true

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-content">{label}</p>
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-bold text-white ${
            active ? 'bg-info' : 'bg-danger'
          }`}
        >
          {active ? 'Active' : 'Expired'}
        </span>
      </div>
      <p className="text-sm text-content">{no || '—'}</p>
      <p className="mt-0.5 text-xs text-content-muted">
        Registered: {formatDate(registered)} | Expires: {formatDate(expired)}
      </p>
      <div className="mt-2 h-1 rounded-full bg-purple-light">
        <div className="h-1 rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
