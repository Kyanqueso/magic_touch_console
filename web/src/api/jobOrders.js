import { api, qs } from './http.js'

// Job orders live under a corporate profile. The list returns lean summary rows;
// the detail carries every field plus material lines. Field names are kept close
// to the old mock (po / atp / collate) and translated here.

const STATUS_TO_UI = { OPEN: 'Open', CLOSED: 'Closed' }
const SORT_MAP = {
  'customer-asc': 'customer',
  'customer-desc': '-customer',
  'id-asc': 'id',
  'id-desc': '-id',
}

// The list endpoint returns lean rows — the wide detail table lives in JobOrderDetail.
export const JOB_ORDER_LIST_COLUMNS = [
  { key: 'id', label: 'Job No.' },
  { key: 'customerName', label: 'Customer' },
  { key: 'jobDescription', label: 'Job Description' },
  { key: 'dateOrdered', label: 'Date Ordered', type: 'date' },
  { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
  { key: 'qty', label: 'QTY' },
  { key: 'unitPrice', label: 'Unit Price', type: 'peso' },
]

// A material line the user added but hasn't persisted yet has a client id.
export const isNewLine = (id) => String(id).startsWith('m-')
let lineSeq = 0
export function blankMaterial() {
  return {
    id: `m-${Date.now()}-${++lineSeq}`,
    materialId: '',
    material: '',
    materialCode: '',
    textColor: 'Black',
    numberColor: 'Black',
    ink1: 'Black',
    ink2: 'None',
    perforation1: 'None',
    perforation2: 'None',
    distribution: 'Standard',
    backCopy: 'Standard',
    sizeNeeded: 1,
    qtyNeeded: 1,
  }
}

function toRow(r) {
  return {
    id: String(r.id),
    customerId: r.customerId != null ? String(r.customerId) : '',
    customerName: r.customerName || '',
    jobDescription: r.jobDescription || '',
    status: STATUS_TO_UI[r.status] || 'Open',
    dateOrdered: r.dateOrdered || '',
    deliveryDate: r.deliveryDate || '',
    qty: r.qty ?? '',
    unitPrice: r.unitPrice != null ? Number(r.unitPrice) : '',
    archived: r.archived,
  }
}

function toMat(m) {
  return {
    id: String(m.id),
    lineNo: m.lineNo,
    materialId: m.materialId != null ? String(m.materialId) : '',
    material: m.materialName || '',
    materialCode: m.materialCode || '',
    textColor: m.textColor || '',
    numberColor: m.numberColor || '',
    ink1: m.ink1 || '',
    ink2: m.ink2 || '',
    perforation1: m.perforation1 || '',
    perforation2: m.perforation2 || '',
    distribution: m.distribution || '',
    backCopy: m.backCopy || '',
    sizeNeeded: m.sizeNeeded ?? 1,
    qtyNeeded: m.qtyNeeded ?? 1,
  }
}

function toJob(j) {
  return {
    id: String(j.id),
    profileId: j.corporateProfileId != null ? String(j.corporateProfileId) : null,
    customerId: j.customerId != null ? String(j.customerId) : '',
    customerName: j.customerName || '',
    status: STATUS_TO_UI[j.status] || 'Open',
    branch: j.branch || '',
    seriesFrom: j.seriesFrom || '',
    seriesTo: j.seriesTo || '',
    jobDescription: j.jobDescription || '',
    specification: j.specification || '',
    equipment: j.equipment || '',
    dateOrdered: j.dateOrdered || '',
    deliveryDate: j.deliveryDate || '',
    po: j.customerPoRef || '',
    atp: j.atpNo || '',
    atpDate: j.atpDate || '',
    invoiceNo: j.invoiceNo || '',
    invoiceDate: j.invoiceDate || '',
    orNo: j.orNo || '',
    orDate: j.orDate || '',
    qty: j.qty ?? '',
    unit: j.unit || '',
    size: j.size || '',
    unitPrice: j.unitPrice != null ? Number(j.unitPrice) : '',
    operator: j.operator || '',
    collate: j.collator || '',
    otherInstructions: j.otherInstructions || '',
    materials: (j.materials || []).map(toMat),
    archived: j.archived,
  }
}

function fromJob(v) {
  return {
    customerId: v.customerId ? Number(v.customerId) : null,
    branch: v.branch || null,
    seriesFrom: v.seriesFrom || null,
    seriesTo: v.seriesTo || null,
    jobDescription: v.jobDescription || null,
    specification: v.specification || null,
    equipment: v.equipment || null,
    dateOrdered: v.dateOrdered || null,
    deliveryDate: v.deliveryDate || null,
    customerPoRef: v.po || null,
    atpNo: v.atp || null,
    atpDate: v.atpDate || null,
    invoiceNo: v.invoiceNo || null,
    invoiceDate: v.invoiceDate || null,
    orNo: v.orNo || null,
    orDate: v.orDate || null,
    qty: v.qty === '' || v.qty == null ? null : Number(v.qty),
    unit: v.unit || null,
    size: v.size || null,
    unitPrice: v.unitPrice === '' || v.unitPrice == null ? null : Number(v.unitPrice),
    operator: v.operator || null,
    collator: v.collate || null,
    otherInstructions: v.otherInstructions || null,
  }
}

function fromMat(v) {
  return {
    materialId: v.materialId ? Number(v.materialId) : null,
    textColor: v.textColor || null,
    numberColor: v.numberColor || null,
    ink1: v.ink1 || null,
    ink2: v.ink2 || null,
    perforation1: v.perforation1 || null,
    perforation2: v.perforation2 || null,
    distribution: v.distribution || null,
    backCopy: v.backCopy || null,
    sizeNeeded: v.sizeNeeded === '' || v.sizeNeeded == null ? null : Number(v.sizeNeeded),
    qtyNeeded: v.qtyNeeded === '' || v.qtyNeeded == null ? null : Number(v.qtyNeeded),
  }
}

const jobBase = (pid) => `/api/v1/profiles/${pid}/job-orders`

export async function listJobOrders(profileId, { tab = 'active', q = '', sort = '', page = 1, size = 20 } = {}) {
  const res = await api.get(
    jobBase(profileId) + qs({ tab, q, sort: SORT_MAP[sort] || '', page, size }),
  )
  return { items: res.items.map(toRow), total: res.total, page: res.page, size: res.size }
}

export const getJobOrder = (pid, id) => api.get(`${jobBase(pid)}/${id}`).then(toJob)

// Every active job order for one customer, materials included, in a single call.
export const getJobOrderSummary = (pid, customerId) =>
  api.get(`${jobBase(pid)}/summary${qs({ customerId })}`).then((rows) => rows.map(toJob))

// Customer + material picker data. Gated by job_orders, so it works even if the
// user has no customers / materials grant of their own.
export async function getJobOrderLookups(pid) {
  const d = await api.get(`${jobBase(pid)}/lookups`)
  return {
    customers: (d.customers || []).map((c) => ({ value: String(c.id), label: c.name })),
    materials: (d.materials || []).map((m) => ({
      value: String(m.id),
      label: `${m.code} — ${m.name}`,
      code: m.code,
      unitPrice: m.unitPrice,
    })),
  }
}
export const createJobOrder = (pid, v) => api.post(jobBase(pid), fromJob(v)).then(toJob)
export const updateJobOrder = (pid, id, v) => api.put(`${jobBase(pid)}/${id}`, fromJob(v)).then(toJob)
export const closeJobOrder = (pid, id) => api.post(`${jobBase(pid)}/${id}/close`).then(toJob)
export const reopenJobOrder = (pid, id) => api.post(`${jobBase(pid)}/${id}/reopen`).then(toJob)
export const archiveJobOrder = (pid, id) => api.post(`${jobBase(pid)}/${id}/archive`)
export const restoreJobOrder = (pid, id) => api.post(`${jobBase(pid)}/${id}/restore`)
export const deleteJobOrder = (pid, id) => api.del(`${jobBase(pid)}/${id}`)

const matBase = (pid, jid) => `${jobBase(pid)}/${jid}/materials`
export const addJobMaterial = (pid, jid, v) => api.post(matBase(pid, jid), fromMat(v)).then(toMat)
export const updateJobMaterial = (pid, jid, lineId, v) =>
  api.put(`${matBase(pid, jid)}/${lineId}`, fromMat(v)).then(toMat)
export const removeJobMaterial = (pid, jid, lineId) => api.del(`${matBase(pid, jid)}/${lineId}`)

// Persist a job-order draft: scalar fields + reconcile material lines against
// `originalMaterials` (the last loaded server state). Returns the fresh job.
export async function saveJobOrderDraft(pid, draft, originalMaterials = []) {
  const draftMats = (draft.materials || []).filter((m) => m.materialId)
  const removed = originalMaterials.filter((o) => !draftMats.some((d) => d.id === o.id))

  await updateJobOrder(pid, draft.id, draft)
  for (const m of draftMats) {
    if (isNewLine(m.id)) await addJobMaterial(pid, draft.id, m)
    else await updateJobMaterial(pid, draft.id, m.id, m)
  }
  for (const m of removed) await removeJobMaterial(pid, draft.id, m.id)

  return getJobOrder(pid, draft.id)
}
