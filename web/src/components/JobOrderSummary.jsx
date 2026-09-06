import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronDown, ChevronRight, Info, Loader2 } from 'lucide-react'
import Select from './Select.jsx'
import EmptyState from './EmptyState.jsx'
import Pagination from './Pagination.jsx'
import { formatDate } from '../lib/format.js'
import { listJobOrders, getJobOrder } from '../api/jobOrders.js'

const DETAIL_COLUMNS = [
  ['dateOrdered', 'Date Created', 'date'],
  ['id', 'JO#'],
  ['qty', 'Qty'],
  ['branch', 'Branch'],
  ['seriesFrom', 'Series From'],
  ['seriesTo', 'Series To'],
  ['atp', 'BIR ATP No.'],
  ['atpDate', 'BIR ATP Issue Date', 'date'],
  ['unitPrice', 'Price'],
  ['operator', 'Operator'],
  ['collate', 'Collate'],
  ['po', 'PO'],
  ['invoiceDate', 'Invoice Date', 'date'],
  ['invoiceNo', 'Invoice No.'],
]

const MATERIAL_COLUMNS = [
  ['no', 'Material No.'],
  ['material', 'Material Name'],
  ['ink1', 'Ink 1'],
  ['ink2', 'Ink 2'],
  ['distribution', 'Distribution'],
  ['backCopy', 'Back Copy'],
  ['textColor', 'Text Color'],
  ['numberColor', 'Number Color'],
]

function fmt(value, type) {
  if (type === 'date') return formatDate(value)
  return value === 0 || value ? String(value) : '—'
}

export default function JobOrderSummary({ profileId, customerId, customerName, defaultJobTitle, onBack }) {
  const [orders, setOrders] = useState([]) // full job objects for this customer
  const [loading, setLoading] = useState(true)
  const [jobTitle, setJobTitle] = useState(defaultJobTitle || '')
  const [materialsOpen, setMaterialsOpen] = useState(true)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listJobOrders(profileId, { size: 500 })
      .then((res) => {
        const mine = res.items.filter(
          (r) => String(r.customerId) === String(customerId) && !r.archived,
        )
        return Promise.all(mine.map((r) => getJobOrder(profileId, r.id)))
      })
      .then((full) => !cancelled && setOrders(full))
      .catch(() => !cancelled && setOrders([]))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [profileId, customerId])

  const titles = useMemo(
    () => [...new Set(orders.map((o) => o.jobDescription).filter(Boolean))].sort(),
    [orders],
  )

  useEffect(() => {
    if (!jobTitle && titles.length) setJobTitle(titles[0])
  }, [titles, jobTitle])

  const matching = useMemo(
    () => orders.filter((o) => o.jobDescription === jobTitle),
    [orders, jobTitle],
  )

  const representative = matching[0]

  const materials = useMemo(() => {
    const seen = new Map()
    for (const o of matching) {
      for (const m of o.materials || []) {
        if (m.material && !seen.has(m.material)) seen.set(m.material, m)
      }
    }
    return [...seen.values()].map((m, i) => ({ ...m, no: `Material ${i + 1}` }))
  }, [matching])

  const total = matching.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = matching.slice((safePage - 1) * pageSize, safePage * pageSize)

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 rounded-md p-1 text-content transition-colors hover:bg-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-content">Job Order Summary</h1>
          <p className="text-sm text-content-muted">{customerName}</p>
        </div>
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      ) : titles.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Info} title="Nothing to summarize" subtitle="Add job orders first." />
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="w-full lg:max-w-sm">
              <label className="mb-2 block text-sm font-bold text-content">Job Title</label>
              <Select
                wrapperClassName="w-full"
                value={jobTitle}
                onChange={(v) => {
                  setJobTitle(v)
                  setPage(1)
                }}
                options={titles.map((t) => ({ value: t, label: t }))}
              />
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-purple-light bg-white px-5 py-4 lg:min-w-[320px]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                <Info className="h-4 w-4" />
              </span>
              <dl className="flex-1 space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-content">Specifications</dt>
                  <dd className="text-content-muted">{representative?.specification || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="font-bold text-content">Size</dt>
                  <dd className="text-content-muted">{representative?.size || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-lg border border-purple-light">
            <button
              type="button"
              onClick={() => setMaterialsOpen((v) => !v)}
              className="flex w-full items-center gap-2 bg-purple px-4 py-3 text-left text-white"
            >
              <span className="flex-1 font-bold">Material</span>
              {materialsOpen ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </button>
            {materialsOpen && (
              <div className="overflow-x-auto bg-white">
                {materials.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-content-muted">
                    No materials on these job orders.
                  </p>
                ) : (
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="bg-purple/80 text-left text-white">
                        {MATERIAL_COLUMNS.map(([key, label]) => (
                          <th key={key} className="whitespace-nowrap px-3 py-2 font-bold">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-light">
                      {materials.map((m) => (
                        <tr key={m.no}>
                          {MATERIAL_COLUMNS.map(([key]) => (
                            <td key={key} className="whitespace-nowrap px-3 py-2 text-content">
                              {m[key] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          <h2 className="mt-10 text-2xl font-extrabold text-content">Details</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-purple-light bg-white">
            <table className="w-full min-w-[1600px] text-sm">
              <thead>
                <tr className="bg-purple text-left text-white">
                  {DETAIL_COLUMNS.map(([key, label]) => (
                    <th key={key} className="whitespace-nowrap px-3 py-3 font-bold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-light">
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    {DETAIL_COLUMNS.map(([key, , type]) => (
                      <td key={key} className="whitespace-nowrap px-3 py-2 text-content">
                        {fmt(r[key], type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={safePage}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(v) => {
              setPageSize(Number(v))
              setPage(1)
            }}
          />
        </>
      )}
    </div>
  )
}
