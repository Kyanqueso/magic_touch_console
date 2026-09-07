import { api, qs } from './http.js'

const ROLE_TO_UI = { USER: 'user', ADMIN: 'admin' }
const ROLE_TO_API = { user: 'USER', admin: 'ADMIN' }
const LEVEL_TO_UI = { NO_ACCESS: 'No Access', VIEWER: 'Viewer', EDITOR: 'Editor' }
const LEVEL_TO_API = { 'No Access': 'NO_ACCESS', Viewer: 'VIEWER', Editor: 'EDITOR' }

function toUser(u) {
  return {
    id: u.id,
    employeeNo: u.employeeNo || '',
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || '',
    contactNo: u.phone || '',
    role: ROLE_TO_UI[u.role] || 'user',
    disabled: Boolean(u.disabled),
  }
}

// [{ key, name, access }] -> [{ key, name, level }]
const toMatrix = (rows) =>
  (rows || []).map((r) => ({ key: r.key, name: r.name, level: LEVEL_TO_UI[r.access] || 'No Access' }))

const grantsFrom = (matrixRows) => {
  const g = {}
  for (const r of matrixRows) g[r.key] = LEVEL_TO_API[r.level] || 'NO_ACCESS'
  return g
}

export async function listModules() {
  const rows = await api.get('/api/v1/modules')
  return rows.map((m) => ({ key: m.key, name: m.name }))
}

export async function getUser(id) {
  const u = await api.get(`/api/v1/users/${id}`)
  return { ...toUser(u), modules: toMatrix(u.modules) }
}

export async function listUsers({ q = '', sort = '', page = 1, size = 20 } = {}) {
  const res = await api.get(`/api/v1/users${qs({ q, sort, page, size })}`)
  return { items: res.items.map(toUser), total: res.total }
}

export async function createUser({ firstName, lastName, email, contactNo, role = 'user', matrix = [] }) {
  const isAdmin = ROLE_TO_API[role] === 'ADMIN'
  const u = await api.post('/api/v1/users', {
    firstName,
    lastName,
    email,
    phone: contactNo || null,
    role: ROLE_TO_API[role] || 'USER',
    // Admins bypass the module matrix, so don't bother sending grants for one.
    grants: isAdmin ? {} : grantsFrom(matrix),
  })
  return toUser(u)
}

// Promote to admin. Sends the user's existing profile fields (the API requires them).
// Admin is one-way: the backend rejects any demotion.
export async function setUserRole(id, user, role) {
  return updateUserProfile(id, { ...user, role })
}

export async function updateUserProfile(id, { firstName, lastName, email, contactNo, role }) {
  const u = await api.put(`/api/v1/users/${id}`, {
    firstName,
    lastName,
    email,
    phone: contactNo || null,
    role: ROLE_TO_API[role] || 'USER',
  })
  return toUser(u)
}

export const deleteUser = (id) => api.del(`/api/v1/users/${id}`)

export const getUserMatrix = (id) => api.get(`/api/v1/users/${id}/modules`).then(toMatrix)

export const setUserMatrix = (id, matrixRows) =>
  api.put(`/api/v1/users/${id}/modules`, { grants: grantsFrom(matrixRows) }).then(toMatrix)
