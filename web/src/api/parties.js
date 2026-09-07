import { api, qs } from './http.js'
import { maskTIN, maskZip } from '../lib/masks.js'
import { COMPANY_TYPES, TAX_TYPES, TERMS, WTAX_ATC } from '../lib/options.js'

// `edit` tells the inline table editor which control to use, so a table field
// behaves like the same field on the add form: government IDs auto-format as
// you type, and the picklists are picked from. See CellEditor for the shape.
// Columns with no `edit` are plain text; id / scope / dateAdded are read-only.
const COMMON_COLUMNS = [
  { key: 'address', label: 'Address' },
  { key: 'zip', label: 'Zip Code', edit: { mask: maskZip, inputMode: 'numeric' } },
  { key: 'terms', label: 'Terms', edit: { select: TERMS } },
  {
    key: 'tin',
    label: 'TIN',
    edit: { mask: maskTIN, inputMode: 'numeric', placeholder: '000-000-000-000' },
  },
  { key: 'branchCode', label: 'Branch Code' },
  { key: 'companyType', label: 'Company Type', edit: { select: COMPANY_TYPES } },
  { key: 'taxType', label: 'Tax Type', edit: { select: TAX_TYPES } },
  { key: 'wtax1', label: 'WTAX ATC 1', edit: { select: WTAX_ATC } },
  { key: 'wtax2', label: 'WTAX ATC 2', edit: { select: WTAX_ATC } },
]

export const CUSTOMER_COLUMNS = [
  { key: 'id', label: 'Customer ID' },
  { key: 'scope', label: 'Scope' },
  { key: 'name', label: 'Customer Name' },
  ...COMMON_COLUMNS.map((c) => (c.key === 'address' ? { ...c, label: 'Customer Address' } : c)),
  { key: 'dateAdded', label: 'Date Added' },
]

export const SUPPLIER_COLUMNS = [
  { key: 'id', label: 'Supplier ID' },
  { key: 'scope', label: 'Scope' },
  { key: 'name', label: 'Supplier Name' },
  ...COMMON_COLUMNS.map((c) => (c.key === 'address' ? { ...c, label: 'Supplier Address' } : c)),
]

// Customers and Suppliers share one backend shape (PartyRequest / PartyResponse).
// Top-level pages hit /api/v1/{customers|suppliers}; inside a corporate profile
// the list is /api/v1/profiles/{profileId}/{customers|suppliers}.

const PATH = {
  customer: { global: '/api/v1/customers', scoped: (pid) => `/api/v1/profiles/${pid}/customers` },
  supplier: { global: '/api/v1/suppliers', scoped: (pid) => `/api/v1/profiles/${pid}/suppliers` },
}

const base = ({ kind, profileId }) =>
  profileId ? PATH[kind].scoped(profileId) : PATH[kind].global

// --- value mapping between UI labels and API tokens ---

const SCOPE_TO_UI = { GLOBAL: 'Global', LOCAL: 'Local' }
const TYPE_TO_UI = { SINGLE: 'Single', OPC: 'OPC', PARTNERSHIP: 'Partnership', CORPORATION: 'Corporation' }
const TYPE_TO_API = { Single: 'SINGLE', OPC: 'OPC', Partnership: 'PARTNERSHIP', Corporation: 'CORPORATION' }
const TAX_TO_UI = { VAT: 'VAT', NON_VAT: 'Non-VAT', VAT_EXEMPT: 'VAT Exempt', ZERO_RATED: 'Zero Rated' }
const TAX_TO_API = { VAT: 'VAT', 'Non-VAT': 'NON_VAT', 'VAT Exempt': 'VAT_EXEMPT', 'Zero Rated': 'ZERO_RATED' }

const SORT_MAP = {
  'name-asc': 'name',
  'name-desc': '-name',
  'id-asc': 'id',
  'id-desc': '-id',
}

// "WI011 (10%)"  <->  code "WI011" + rate 10
function splitAtc(label) {
  if (!label) return { code: null, rate: null }
  const m = String(label).match(/^\s*([A-Za-z0-9]+)\s*(?:\(\s*([\d.]+)\s*%\s*\))?\s*$/)
  if (!m) return { code: String(label).trim() || null, rate: null }
  return { code: m[1], rate: m[2] != null ? Number(m[2]) : null }
}
function joinAtc(code, rate) {
  if (!code) return ''
  return rate != null ? `${code} (${Number(rate)}%)` : code
}

function toRow(p) {
  return {
    id: String(p.id),
    scope: SCOPE_TO_UI[p.scope] || 'Global',
    profileId: p.corporateProfileId != null ? String(p.corporateProfileId) : null,
    name: p.name || '',
    address: p.address || '',
    zip: p.zipCode || '',
    terms: !p.termsDays ? 'COD' : String(p.termsDays),
    tin: p.tin || '',
    branchCode: p.branchCode || '',
    companyType: TYPE_TO_UI[p.companyType] || '',
    taxType: TAX_TO_UI[p.taxType] || '',
    wtax1: joinAtc(p.wtaxAtc1, p.wtaxAtc1Rate),
    wtax2: joinAtc(p.wtaxAtc2, p.wtaxAtc2Rate),
    dateAdded: (p.createdAt || '').slice(0, 10),
    archived: p.archived,
  }
}

// Accepts either a CompanyFormModal payload or a toRow() row (same field names).
function fromForm(v, { profileId } = {}) {
  const wantsLocal = Boolean(profileId) && v.scope === 'Local'
  const a1 = splitAtc(v.wtax1)
  const a2 = splitAtc(v.wtax2)
  return {
    scope: wantsLocal ? 'LOCAL' : 'GLOBAL',
    name: (v.name || '').trim(),
    address: v.address || null,
    zipCode: v.zip || null,
    termsDays: !v.terms || v.terms === 'COD' ? 0 : Number(v.terms) || 0,
    tin: v.tin || null,
    branchCode: v.branchCode || null,
    companyType: TYPE_TO_API[v.companyType] || null,
    taxType: TAX_TO_API[v.taxType] || null,
    wtaxAtc1: a1.code,
    wtaxAtc1Rate: a1.rate,
    wtaxAtc2: a2.code,
    wtaxAtc2Rate: a2.rate,
  }
}

// ctx = { kind: 'customer' | 'supplier', profileId: string | null }

export async function listParties(
  ctx,
  { tab = 'active', q = '', sort = '', scope = 'All', page = 1, size = 20 } = {},
) {
  const params = { tab, q, sort: SORT_MAP[sort] || '', page, size }
  if (ctx.profileId && scope && scope !== 'All') params.scope = scope
  const res = await api.get(base(ctx) + qs(params))
  return { items: res.items.map(toRow), total: res.total, page: res.page, size: res.size }
}

export async function createParty(ctx, values) {
  return toRow(await api.post(base(ctx), fromForm(values, ctx)))
}

export async function updateParty(ctx, id, values) {
  return toRow(await api.put(`${base(ctx)}/${id}`, fromForm(values, ctx)))
}

export const archiveParty = (ctx, id) => api.post(`${base(ctx)}/${id}/archive`)
export const restoreParty = (ctx, id) => api.post(`${base(ctx)}/${id}/restore`)
export const deleteParty = (ctx, id) => api.del(`${base(ctx)}/${id}`)
