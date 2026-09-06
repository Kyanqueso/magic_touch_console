import { api, qs } from './http.js'

// Materials. Groups are a flat lookup; a material hangs off a group by free-text
// name (server creates the group if it's new).

const SORT_MAP = {
  'code-asc': 'code',
  'code-desc': '-code',
  'price-asc': 'unitPrice',
  'price-desc': '-unitPrice',
}

function toRow(m) {
  return {
    id: String(m.id),
    groupId: String(m.groupId),
    groupName: m.groupName || '',
    code: m.code || '',
    description: m.name || '',
    unitPrice: m.unitPrice != null ? Number(m.unitPrice) : 0,
    archived: m.archived,
  }
}

// Accepts an AddMaterialModal payload (`group`, `description`) or a toRow() row.
function fromForm(v) {
  return {
    group: (v.group ?? v.groupName ?? '').trim(),
    code: (v.code || '').trim(),
    name: (v.description || '').trim(),
    unitPrice: Number(v.unitPrice) || 0,
  }
}

export async function listGroups() {
  const rows = await api.get('/api/v1/material-groups')
  return rows.map((g) => ({ id: String(g.id), name: g.name }))
}

export async function listMaterials({ tab = 'active', q = '', sort = '' } = {}) {
  const res = await api.get(
    `/api/v1/materials${qs({ tab, q, sort: SORT_MAP[sort] || '', page: 1, size: 500 })}`,
  )
  return res.items.map(toRow)
}

export async function createMaterial(values) {
  return toRow(await api.post('/api/v1/materials', fromForm(values)))
}

export async function updateMaterial(id, values) {
  return toRow(await api.put(`/api/v1/materials/${id}`, fromForm(values)))
}

export const archiveMaterial = (id) => api.post(`/api/v1/materials/${id}/archive`)
export const restoreMaterial = (id) => api.post(`/api/v1/materials/${id}/restore`)
export const deleteMaterial = (id) => api.del(`/api/v1/materials/${id}`)
