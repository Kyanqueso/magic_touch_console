import { api, qs } from './http.js'

// Inventory (formerly Materials). Per corporate profile — no Global option.
// Groups are a flat per-profile lookup; a material hangs off a group by
// free-text name (server creates the group if it's new).

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

const base = (pid) => `/api/v1/profiles/${pid}/materials`
const groupsBase = (pid) => `/api/v1/profiles/${pid}/material-groups`

export async function listGroups(pid) {
  const rows = await api.get(groupsBase(pid))
  return rows.map((g) => ({ id: String(g.id), name: g.name }))
}

export async function listMaterials(pid, { tab = 'active', q = '', sort = '' } = {}) {
  const res = await api.get(
    `${base(pid)}${qs({ tab, q, sort: SORT_MAP[sort] || '', page: 1, size: 500 })}`,
  )
  return res.items.map(toRow)
}

export async function createMaterial(pid, values) {
  return toRow(await api.post(base(pid), fromForm(values)))
}

export async function updateMaterial(pid, id, values) {
  return toRow(await api.put(`${base(pid)}/${id}`, fromForm(values)))
}

export const archiveMaterial = (pid, id) => api.post(`${base(pid)}/${id}/archive`)
export const restoreMaterial = (pid, id) => api.post(`${base(pid)}/${id}/restore`)
export const deleteMaterial = (pid, id) => api.del(`${base(pid)}/${id}`)
