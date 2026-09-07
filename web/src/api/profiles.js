import { api, qs } from './http.js'

// ---------------------------------------------------------------------------
// Shape mapping between the backend (normalized) and what the screens expect.
// ---------------------------------------------------------------------------

const STATUS_LABEL = { COMPLETE: 'Filled Up', DRAFT: 'To be filled up' }
const SORT_MAP = { latest: '-createdAt', earliest: 'createdAt', az: 'name', za: '-name' }

function toCard(row) {
  return {
    id: String(row.id),
    name: row.name,
    status: STATUS_LABEL[row.status] || row.status,
    addedAt: (row.createdAt || '').slice(0, 10), // date part only, for formatDate
    archived: row.archived,
    jobOrdersEnabled: Boolean(row.jobOrdersEnabled),
    customers: row.customerCount ?? 0,
    jobOrders: row.jobOrderCount ?? 0,
    suppliers: row.supplierCount ?? 0,
  }
}

function toDetail(row, jobOrdersEnabled) {
  const reg = (body) => (row.registrations || []).find((r) => r.body === body) || {}
  const dti = reg('DTI')
  const sec = reg('SEC')
  return {
    id: String(row.id),
    name: row.name,
    address: row.address || '',
    status: STATUS_LABEL[row.status] || row.status,
    archived: row.archived,
    jobOrdersEnabled: Boolean(jobOrdersEnabled),
    details: {
      tin: row.tin || '',
      sss: row.sss || '',
      phic: row.phic || '',
      hdmf: row.hdmf || '',
      companyType: '', // not stored on corporate_profiles (backend)
      taxType: '',
      dtiNo: dti.registrationNo || '',
      dtiRegistered: dti.registeredAt || '',
      dtiExpired: dti.expiresAt || '',
      secNo: sec.registrationNo || '',
      secRegistered: sec.registeredAt || '',
      secExpired: sec.expiresAt || '',
      wtax1: row.wtaxAtc1 || '',
      wtax2: row.wtaxAtc2 || '',
      filingTaxTypes: row.filingTypes || [],
    },
  }
}

function fromForm(data) {
  const d = data.details || {}
  const registrations = []
  if (d.dtiNo) {
    registrations.push({
      body: 'DTI',
      registrationNo: d.dtiNo,
      registeredAt: d.dtiRegistered || null,
      expiresAt: d.dtiExpired || null,
    })
  }
  if (d.secNo) {
    registrations.push({
      body: 'SEC',
      registrationNo: d.secNo,
      registeredAt: d.secRegistered || null,
      expiresAt: d.secExpired || null,
    })
  }
  return {
    name: data.name,
    address: data.address || null,
    tin: d.tin || null,
    sss: d.sss || null,
    phic: d.phic || null,
    hdmf: d.hdmf || null,
    wtaxAtc1: d.wtax1 || null,
    wtaxAtc2: d.wtax2 || null,
    registrations,
    filingTypes: (d.filingTaxTypes || []).filter(Boolean),
  }
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function listProfiles({ tab = 'active', q = '', sort = '', page = 1, size = 20 } = {}) {
  const res = await api.get(
    `/api/v1/profiles${qs({ tab, q, sort: SORT_MAP[sort] || '', page, size })}`,
  )
  return { items: res.items.map(toCard), total: res.total, page: res.page, size: res.size }
}

export async function getProfile(id) {
  const [row, gates] = await Promise.all([
    api.get(`/api/v1/profiles/${id}`),
    api.get(`/api/v1/profiles/${id}/modules`).catch(() => []),
  ])
  const jo = gates.find((g) => g.key === 'job_orders')
  return toDetail(row, jo?.enabled)
}

export async function createProfile(name) {
  return toCard(await api.post('/api/v1/profiles', { name }))
}

export async function saveProfileDetails(id, data) {
  const row = await api.put(`/api/v1/profiles/${id}`, fromForm(data))
  await api.put(`/api/v1/profiles/${id}/modules`, {
    gates: { job_orders: Boolean(data.jobOrdersEnabled) },
  })
  return toDetail(row, data.jobOrdersEnabled)
}

export const archiveProfile = (id) => api.post(`/api/v1/profiles/${id}/archive`)
export const restoreProfile = (id) => api.post(`/api/v1/profiles/${id}/restore`)
export const deleteProfile = (id) => api.del(`/api/v1/profiles/${id}`)
