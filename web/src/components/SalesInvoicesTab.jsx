import { useEffect, useState } from 'react'
import DocumentListTab from './DocumentListTab.jsx'
import AddSalesInvoiceModal from './AddSalesInvoiceModal.jsx'
import { LineItems, DebitCredit } from './DocLineItems.jsx'
import { peso, formatDate } from '../lib/format.js'
import { printDocument } from '../lib/print.js'
import {
  listPurchaseOrders,
  listSalesInvoices,
  getSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  archiveSalesInvoice,
  restoreSalesInvoice,
  deleteSalesInvoice,
} from '../api/purchasing.js'

export default function SalesInvoicesTab({ supplier, profileId }) {
  const sid = supplier.id
  const [poOptions, setPoOptions] = useState([])

  useEffect(() => {
    let cancelled = false
    listPurchaseOrders(profileId, sid, { size: 500 })
      .then((res) => {
        if (!cancelled) setPoOptions(res.items.map((p) => ({ value: p.id, label: p.poNumber })))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [profileId, sid])

  // Line items live on the full document, not the list row.
  async function printInvoice(row) {
    const doc = await getSalesInvoice(profileId, sid, row.id)
    printDocument({
      docTitle: 'SALES INVOICE',
      number: doc.invoiceNumber,
      meta: [
        ['Supplier', supplier.name],
        ['Invoice Date', formatDate(doc.invoiceDate)],
        ['Purchase Order', doc.poNumber],
      ],
      items: doc.items,
      total: doc.total,
      signatures: [['Received by', ''], ['Authorised by', '']],
    })
  }

  async function onSubmit(values, editTarget) {
    if (editTarget) {
      await updateSalesInvoice(profileId, sid, editTarget.id, values)
      return `${editTarget.invoiceNumber} updated.`
    }
    const created = await createSalesInvoice(profileId, sid, values)
    return `${created.invoiceNumber} added successfully!`
  }

  return (
    <DocumentListTab
      entityLabel="Sales Invoice"
      addLabel="Add"
      searchPlaceholder="Search Sales Invoice..."
      alertNoun="sales invoice"
      title={(d) => d.invoiceNumber}
      subtitle={(d) =>
        `${d.poNumber || '—'}  |  ${formatDate(d.invoiceDate)}  |  ${d.itemCount} ${
          d.itemCount === 1 ? 'item' : 'items'
        }  |  ${peso(d.total)}`
      }
      columns={[
        { label: 'S-INV No.', cell: (d) => <span className="font-bold text-content">{d.invoiceNumber}</span> },
        { label: 'PO', cell: (d) => d.poNumber || '—' },
        { label: 'Invoice Date', cell: (d) => formatDate(d.invoiceDate) },
        { label: 'Items', cell: (d) => d.itemCount },
        { label: 'Total', cell: (d) => <span className="font-semibold">{peso(d.total)}</span> },
      ]}
      renderExpanded={(d) => <ExpandedInvoice pid={profileId} sid={sid} id={d.id} />}
      fetchList={(opts) => listSalesInvoices(profileId, sid, opts)}
      archiveDoc={(id) => archiveSalesInvoice(profileId, sid, id)}
      restoreDoc={(id) => restoreSalesInvoice(profileId, sid, id)}
      deleteDoc={(id) => deleteSalesInvoice(profileId, sid, id)}
      onSubmit={onSubmit}
      printDoc={printInvoice}
      renderAddModal={(props) => <AddSalesInvoiceModal {...props} poOptions={poOptions} />}
    />
  )
}

function ExpandedInvoice({ pid, sid, id }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => {
    let cancelled = false
    getSalesInvoice(pid, sid, id)
      .then((d) => !cancelled && setDoc(d))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [pid, sid, id])
  if (!doc) return <p className="text-sm text-content-muted">Loading…</p>
  return (
    <>
      <LineItems items={doc.items} />
      <DebitCredit entries={[{ debit: doc.debit, credit: doc.credit }]} />
    </>
  )
}
