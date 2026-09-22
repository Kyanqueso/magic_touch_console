import { api, qs } from './http.js'

// Chart of Accounts. Categories are a flat lookup; accounts hang off a category
// by free-text name (server creates the category if it's new). Both are scoped
// LOCAL/GLOBAL like customers/suppliers: top-level pages hit the global path,
// a corporate profile's own Chart of Accounts hits the scoped path.

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

const SCOPE_TO_UI = { GLOBAL: 'Global', LOCAL: 'Local' }

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

const PATH = {
  accounts: { global: '/api/v1/accounts', scoped: (pid) => `/api/v1/profiles/${pid}/accounts` },
  categories: {
    global: '/api/v1/account-categories',
    scoped: (pid) => `/api/v1/profiles/${pid}/account-categories`,
  },
}

const base = (which, profileId) => (profileId ? PATH[which].scoped(profileId) : PATH[which].global)

function toRow(a) {
  return {
    id: String(a.id),
    scope: SCOPE_TO_UI[a.scope] || 'Global',
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

// Accepts an AddAccountModal payload (`category`, `title`, `type`, `scope`) or a toRow() row.
function fromForm(v, { profileId } = {}) {
  const wantsLocal = Boolean(profileId) && v.scope === 'Local'
  return {
    scope: wantsLocal ? 'LOCAL' : 'GLOBAL',
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

// ctx = { profileId: string | null }

export async function listCategories(ctx = {}) {
  const rows = await api.get(base('categories', ctx.profileId))
  return rows.map((c) => ({ id: String(c.id), name: c.name, scope: SCOPE_TO_UI[c.scope] || 'Global' }))
}

export async function listAccounts(
  ctx = {},
  { tab = 'active', q = '', sort = '', scope = 'All' } = {},
) {
  const params = { tab, q, sort: SORT_MAP[sort] || '', page: 1, size: 500 }
  if (ctx.profileId && scope && scope !== 'All') params.scope = scope
  const res = await api.get(base('accounts', ctx.profileId) + qs(params))
  return res.items.map(toRow)
}

export async function createAccount(ctx, values) {
  return toRow(await api.post(base('accounts', ctx.profileId), fromForm(values, ctx)))
}

export async function updateAccount(ctx, id, values) {
  return toRow(await api.put(`${base('accounts', ctx.profileId)}/${id}`, fromForm(values, ctx)))
}

export const archiveAccount = (ctx, id) => api.post(`${base('accounts', ctx.profileId)}/${id}/archive`)
export const restoreAccount = (ctx, id) => api.post(`${base('accounts', ctx.profileId)}/${id}/restore`)
export const deleteAccount = (ctx, id) => api.del(`${base('accounts', ctx.profileId)}/${id}`)
