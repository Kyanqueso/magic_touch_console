import { api, qs } from './http.js'

// Purchasing docs all hang off a supplier inside a corporate profile:
//   /api/v1/profiles/{pid}/suppliers/{sid}/{purchase-orders|sales-invoices|vouchers}
// A PO owns its line items; a Sales Invoice references one PO; a Voucher
// references one Sales Invoice.

const base = (pid, sid) => `/api/v1/profiles/${pid}/suppliers/${sid}`

// ---------------------------------------------------------------- Purchase Orders

export const isNewLine = (id) => String(id).startsWith('n-')
let lineSeq = 0
export const blankLine = () => ({
  id: `n-${Date.now()}-${++lineSeq}`,
  materialId: '',
  materialCode: '',
  description: '',
  qty: 1,
  unit: 'Pcs',
  unitPrice: 0,
})

function toItem(i) {
  return {
    id: String(i.id),
    lineNo: i.lineNo,
    materialId: i.materialId != null ? String(i.materialId) : '',
    materialCode: i.materialCode || '',
    description: i.materialName || '',
    qty: i.qty != null ? Number(i.qty) : 0,
    unit: i.unit || '',
    unitPrice: i.unitPrice != null ? Number(i.unitPrice) : 0,
    amount: i.amount != null ? Number(i.amount) : 0,
  }
}

function toPoRow(r) {
  return {
    id: String(r.id),
    poNumber: r.number,
    dateOrdered: r.poDate || '',
    itemCount: r.itemCount ?? 0,
    total: r.total != null ? Number(r.total) : 0,
    archived: r.archived,
  }
}

function toPo(po) {
  return {
    id: String(po.id),
    poNumber: po.number,
    dateOrdered: po.poDate || '',
    preparedBy: po.preparedBy || '',
    preparedDate: po.preparedDate || '',
    approvedBy: po.approvedBy || '',
    approvedDate: po.approvedDate || '',
    items: (po.items || []).map(toItem),
    total: po.total != null ? Number(po.total) : 0,
    archived: po.archived,
  }
}

function fromPo(v) {
  return {
    poDate: v.dateOrdered || null,
    preparedBy: v.preparedBy || null,
    preparedDate: v.preparedDate || null,
    approvedBy: v.approvedBy || null,
    approvedDate: v.approvedDate || null,
  }
}

const fromItem = (v) => ({
  materialId: v.materialId ? Number(v.materialId) : null,
  qty: v.qty === '' || v.qty == null ? null : Number(v.qty),
  unit: v.unit || null,
  unitPrice: v.unitPrice === '' || v.unitPrice == null ? null : Number(v.unitPrice),
})

export async function listPurchaseOrders(pid, sid, { tab = 'active', q = '', page = 1, size = 20 } = {}) {
  const res = await api.get(`${base(pid, sid)}/purchase-orders` + qs({ tab, q, page, size }))
  return { items: res.items.map(toPoRow), total: res.total, page: res.page, size: res.size }
}

export const getPurchaseOrder = (pid, sid, id) =>
  api.get(`${base(pid, sid)}/purchase-orders/${id}`).then(toPo)

// Material picker data for the PO screen. Gated by the suppliers module (the PO
// path), so it works without a materials grant.
export async function listPoMaterialOptions(pid, sid) {
  const rows = await api.get(`${base(pid, sid)}/purchase-orders/material-options`)
  return rows.map((m) => ({
    value: String(m.id),
    label: `${m.code} — ${m.name}`,
    code: m.code,
    unitPrice: m.unitPrice,
  }))
}

export async function createPurchaseOrder(pid, sid, values) {
  const po = await api.post(`${base(pid, sid)}/purchase-orders`, fromPo(values))
  for (const it of (values.items || []).filter((x) => x.materialId)) {
    await api.post(`${base(pid, sid)}/purchase-orders/${po.id}/items`, fromItem(it))
  }
  return getPurchaseOrder(pid, sid, po.id)
}

export async function updatePurchaseOrder(pid, sid, id, values, originalItems = []) {
  await api.put(`${base(pid, sid)}/purchase-orders/${id}`, fromPo(values))
  const draft = (values.items || []).filter((x) => x.materialId)
  const removed = originalItems.filter((o) => !draft.some((d) => d.id === o.id))
  for (const it of draft) {
    if (isNewLine(it.id)) {
      await api.post(`${base(pid, sid)}/purchase-orders/${id}/items`, fromItem(it))
    } else {
      await api.put(`${base(pid, sid)}/purchase-orders/${id}/items/${it.id}`, fromItem(it))
    }
  }
  for (const it of removed) {
    await api.del(`${base(pid, sid)}/purchase-orders/${id}/items/${it.id}`)
  }
  return getPurchaseOrder(pid, sid, id)
}

export const archivePurchaseOrder = (pid, sid, id) =>
  api.post(`${base(pid, sid)}/purchase-orders/${id}/archive`)
export const restorePurchaseOrder = (pid, sid, id) =>
  api.post(`${base(pid, sid)}/purchase-orders/${id}/restore`)
export const deletePurchaseOrder = (pid, sid, id) =>
  api.del(`${base(pid, sid)}/purchase-orders/${id}`)

// --------------------------------------------------------------- Sales Invoices

function toSinvRow(r) {
  return {
    id: String(r.id),
    invoiceNumber: r.number,
    poId: r.purchaseOrderId != null ? String(r.purchaseOrderId) : '',
    poNumber: r.purchaseOrderNumber || '',
    invoiceDate: r.sinvDate || '',
    itemCount: r.itemCount ?? 0,
    total: r.total != null ? Number(r.total) : 0,
    archived: r.archived,
  }
}

function toSinv(s) {
  return {
    id: String(s.id),
    invoiceNumber: s.number,
    poId: s.purchaseOrderId != null ? String(s.purchaseOrderId) : '',
    poNumber: s.purchaseOrderNumber || '',
    invoiceDate: s.sinvDate || '',
    debit: s.debitAccountId != null ? String(s.debitAccountId) : '',
    credit: s.creditAccountId != null ? String(s.creditAccountId) : '',
    items: (s.items || []).map(toItem),
    total: s.total != null ? Number(s.total) : 0,
    archived: s.archived,
  }
}

const fromSinv = (v) => ({
  purchaseOrderId: v.poId ? Number(v.poId) : null,
  sinvDate: v.invoiceDate || null,
  debitAccountId: v.debit ? Number(v.debit) : null,
  creditAccountId: v.credit ? Number(v.credit) : null,
})

export async function listSalesInvoices(pid, sid, { tab = 'active', q = '', page = 1, size = 20 } = {}) {
  const res = await api.get(`${base(pid, sid)}/sales-invoices` + qs({ tab, q, page, size }))
  return { items: res.items.map(toSinvRow), total: res.total, page: res.page, size: res.size }
}
export const getSalesInvoice = (pid, sid, id) =>
  api.get(`${base(pid, sid)}/sales-invoices/${id}`).then(toSinv)
export const createSalesInvoice = (pid, sid, v) =>
  api.post(`${base(pid, sid)}/sales-invoices`, fromSinv(v)).then(toSinv)
export const updateSalesInvoice = (pid, sid, id, v) =>
  api.put(`${base(pid, sid)}/sales-invoices/${id}`, fromSinv(v)).then(toSinv)
export const archiveSalesInvoice = (pid, sid, id) =>
  api.post(`${base(pid, sid)}/sales-invoices/${id}/archive`)
export const restoreSalesInvoice = (pid, sid, id) =>
  api.post(`${base(pid, sid)}/sales-invoices/${id}/restore`)
export const deleteSalesInvoice = (pid, sid, id) =>
  api.del(`${base(pid, sid)}/sales-invoices/${id}`)

// -------------------------------------------------------------------- Vouchers

function toVoucherRow(r) {
  return {
    id: String(r.id),
    voucherNumber: r.number,
    sInvId: r.salesInvoiceId != null ? String(r.salesInvoiceId) : '',
    sInvNumber: r.salesInvoiceNumber || '',
    date: r.voucherDate || '',
    netAmount: r.netAmount != null ? Number(r.netAmount) : 0,
    paid: r.paid,
    archived: r.archived,
  }
}

function toVoucher(v) {
  return {
    id: String(v.id),
    voucherNumber: v.number,
    sInvId: v.salesInvoiceId != null ? String(v.salesInvoiceId) : '',
    sInvNumber: v.salesInvoiceNumber || '',
    date: v.voucherDate || '',
    netAmount: v.netAmount != null ? Number(v.netAmount) : 0,
    paid: v.paid,
    archived: v.archived,
  }
}

const fromVoucher = (v) => ({
  salesInvoiceId: v.sInvId ? Number(v.sInvId) : null,
  voucherDate: v.date || null,
  netAmount: v.netAmount === '' || v.netAmount == null ? 0 : Number(v.netAmount),
  paid: Boolean(v.paid),
  debitAccountId: null,
  creditCashAccountId: null,
  creditPayableAccountId: null,
})

export async function listVouchers(pid, sid, { tab = 'active', q = '', page = 1, size = 20 } = {}) {
  const res = await api.get(`${base(pid, sid)}/vouchers` + qs({ tab, q, page, size }))
  return { items: res.items.map(toVoucherRow), total: res.total, page: res.page, size: res.size }
}
export const getVoucher = (pid, sid, id) => api.get(`${base(pid, sid)}/vouchers/${id}`).then(toVoucher)
export const createVoucher = (pid, sid, v) =>
  api.post(`${base(pid, sid)}/vouchers`, fromVoucher(v)).then(toVoucher)
export const updateVoucher = (pid, sid, id, v) =>
  api.put(`${base(pid, sid)}/vouchers/${id}`, fromVoucher(v)).then(toVoucher)
export const payVoucher = (pid, sid, id) => api.post(`${base(pid, sid)}/vouchers/${id}/pay`).then(toVoucher)
export const unpayVoucher = (pid, sid, id) =>
  api.post(`${base(pid, sid)}/vouchers/${id}/unpay`).then(toVoucher)
export const archiveVoucher = (pid, sid, id) => api.post(`${base(pid, sid)}/vouchers/${id}/archive`)
export const restoreVoucher = (pid, sid, id) => api.post(`${base(pid, sid)}/vouchers/${id}/restore`)
export const deleteVoucher = (pid, sid, id) => api.del(`${base(pid, sid)}/vouchers/${id}`)
