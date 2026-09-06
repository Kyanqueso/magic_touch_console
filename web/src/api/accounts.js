import { api, qs } from './http.js'

// Chart of Accounts. Categories are a flat lookup; accounts hang off a category
// by free-text name (server creates the category if it's new).

const CLASS_TO_UI = {
  ASSET: 'Asset',
  LIABILITY: 'Liability',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expense',
}
const UI_TO_CLASS = {
  Asset: 'ASSET',
  Liability: 'LIABILITY',
  Equity: 'EQUITY',
  Revenue: 'REVENUE',
  Expense: 'EXPENSE',
}

// Fallback when the form didn't capture an explicit class.
const SUBTYPE_TO_CLASS = {
  'Current Asset': 'ASSET',
  'Non Current Asset': 'ASSET',
  'Current Liability': 'LIABILITY',
  'Non Current Liability': 'LIABILITY',
  Equity: 'EQUITY',
  Revenue: 'REVENUE',
  'Direct Cost': 'EXPENSE',
  'Operating Expense': 'EXPENSE',
  'Non Taxable': 'EXPENSE',
  Other: 'EXPENSE',
}

const SORT_MAP = { 'code-asc': 'code', 'code-desc': '-code', az: 'name', za: '-name' }

function toRow(a) {
  return {
    id: String(a.id),
    categoryId: String(a.categoryId),
    categoryName: a.categoryName || '',
    code: a.code || '',
    title: a.name || '',
    type: CLASS_TO_UI[a.accountClass] || '',
    subType: a.subType || '',
    atcCode: a.atcCode || '',
    taxRate: a.taxRate != null ? String(a.taxRate) : '',
    referenceForm: a.referenceForm || '',
    archived: a.archived,
  }
}

// Accepts an AddAccountModal payload (`category`, `title`, `type`) or a toRow() row.
function fromForm(v) {
  return {
    category: (v.category ?? v.categoryName ?? '').trim(),
    accountClass:
      UI_TO_CLASS[v.type] || SUBTYPE_TO_CLASS[v.subType] || 'ASSET',
    subType: v.subType || null,
    code: (v.code || '').trim(),
    name: (v.title || '').trim(),
    atcCode: v.atcCode || null,
    taxRate: v.taxRate === '' || v.taxRate == null ? null : Number(v.taxRate),
    referenceForm: v.referenceForm || null,
  }
}

export async function listCategories() {
  const rows = await api.get('/api/v1/account-categories')
  return rows.map((c) => ({ id: String(c.id), name: c.name }))
}

export async function listAccounts({ tab = 'active', q = '', sort = '' } = {}) {
  const res = await api.get(
    `/api/v1/accounts${qs({ tab, q, sort: SORT_MAP[sort] || '', page: 1, size: 500 })}`,
  )
  return res.items.map(toRow)
}

export async function createAccount(values) {
  return toRow(await api.post('/api/v1/accounts', fromForm(values)))
}

export async function updateAccount(id, values) {
  return toRow(await api.put(`/api/v1/accounts/${id}`, fromForm(values)))
}

export const archiveAccount = (id) => api.post(`/api/v1/accounts/${id}/archive`)
export const restoreAccount = (id) => api.post(`/api/v1/accounts/${id}/restore`)
export const deleteAccount = (id) => api.del(`/api/v1/accounts/${id}`)
