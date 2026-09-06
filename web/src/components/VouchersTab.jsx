import { useEffect, useState } from 'react'
import DocumentListTab from './DocumentListTab.jsx'
import AddVoucherModal from './AddVoucherModal.jsx'
import { peso, formatDate } from '../lib/format.js'
import {
  listSalesInvoices,
  listVouchers,
  createVoucher,
  updateVoucher,
  payVoucher,
  unpayVoucher,
  archiveVoucher,
  restoreVoucher,
  deleteVoucher,
} from '../api/purchasing.js'

export default function VouchersTab({ supplier, profileId }) {
  const sid = supplier.id
  const [sinvOptions, setSinvOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    listSalesInvoices(profileId, sid, { size: 500 })
      .then((res) => {
        if (!cancelled)
          setSinvOptions(
            res.items.map((s) => ({ value: s.id, label: s.invoiceNumber, total: s.total })),
          )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId, sid])

  async function onSubmit(values, editTarget) {
    // netAmount defaults to the linked sales-invoice total
    const total = sinvOptions.find((s) => s.value === values.sInvId)?.total ?? 0
    const body = { ...values, netAmount: values.netAmount ?? total }
    if (editTarget) {
      await updateVoucher(profileId, sid, editTarget.id, body)
      if (Boolean(editTarget.paid) !== Boolean(values.paid)) {
        await (values.paid ? payVoucher : unpayVoucher)(profileId, sid, editTarget.id)
      }
      return `${editTarget.voucherNumber} updated.`
    }
    const created = await createVoucher(profileId, sid, body)
    return `${created.voucherNumber} added successfully!`
  }

  return (
    <DocumentListTab
      entityLabel="Voucher"
      addLabel="Add"
      searchPlaceholder="Search Voucher..."
      alertNoun="voucher"
      title={(d) => d.voucherNumber}
      badge={(d) => (
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-bold text-white ${
            d.paid ? 'bg-success' : 'bg-danger'
          }`}
        >
          {d.paid ? 'Paid' : 'Unpaid'}
        </span>
      )}
      subtitle={(d) => `${d.sInvNumber || '—'}  |  ${formatDate(d.date)}  |  ${peso(d.netAmount)}`}
      columns={[
        { label: 'VOUC No.', cell: (d) => <span className="font-bold text-content">{d.voucherNumber}</span> },
        { label: 'S-INV', cell: (d) => d.sInvNumber || '—' },
        { label: 'Date', cell: (d) => formatDate(d.date) },
        { label: 'Net Amount', cell: (d) => <span className="font-semibold">{peso(d.netAmount)}</span> },
        {
          label: 'Paid',
          cell: (d) => (
            <span className={d.paid ? 'font-semibold text-success' : 'font-semibold text-danger'}>
              {d.paid ? 'Paid' : 'Unpaid'}
            </span>
          ),
        },
      ]}
      renderExpanded={(d) => (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Sales Invoice" value={d.sInvNumber} />
          <Field label="Voucher Date" value={formatDate(d.date)} />
          <Field label="Net Amount" value={peso(d.netAmount)} />
          <Field label="Status" value={d.paid ? 'Paid' : 'Unpaid'} />
        </dl>
      )}
      fetchList={(opts) => listVouchers(profileId, sid, opts)}
      archiveDoc={(id) => archiveVoucher(profileId, sid, id)}
      restoreDoc={(id) => restoreVoucher(profileId, sid, id)}
      deleteDoc={(id) => deleteVoucher(profileId, sid, id)}
      onSubmit={onSubmit}
      renderAddModal={(props) => <AddVoucherModal {...props} sinvOptions={sinvOptions} />}
    />
  )
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-content-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-content">{value || '—'}</dd>
    </div>
  )
}
