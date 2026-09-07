// Picklists for customer / supplier fields. Shared by the add form, the inline
// table editor and the validators, so the three cannot drift apart.

export const TERMS = ['COD', '30', '60', '90']
export const SCOPES = ['Local', 'Global']

// These two are enums on the API — anything else is rejected, so they are
// always picked from a list, never typed.
export const COMPANY_TYPES = ['Single', 'OPC', 'Partnership', 'Corporation']
export const TAX_TYPES = ['VAT', 'Non-VAT', 'VAT Exempt', 'Zero Rated']

// Chart of Accounts. accountClass is an enum on the API; subType is free-form
// there but only ever picked from this list in the console.
export const ACCOUNT_CLASSES = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']
export const ACCOUNT_SUB_TYPES = [
  'Current Asset',
  'Non Current Asset',
  'Current Liability',
  'Non Current Liability',
  'Equity',
  'Revenue',
  'Direct Cost',
  'Operating Expense',
  'Non Taxable',
  'Other',
]

export const WTAX_ATC = [
  'WI011 (10%)',
  'WI100 (5%)',
  'WI157 (2%)',
  'WI158 (1%)',
  'WC100 (5%)',
  'WC157 (2%)',
  'WC158 (1%)',
  'WC160 (2%)',
]

// "WI011 (10%)" <-> code "WI011" + rate 10. Shared by the party and
// corporate-profile forms so they can't drift apart.
export function splitAtc(label) {
  if (!label) return { code: null, rate: null }
  const m = String(label).match(/^\s*([A-Za-z0-9]+)\s*(?:\(\s*([\d.]+)\s*%\s*\))?\s*$/)
  if (!m) return { code: String(label).trim() || null, rate: null }
  return { code: m[1], rate: m[2] != null ? Number(m[2]) : null }
}

export function joinAtc(code, rate) {
  if (!code) return ''
  return rate != null ? `${code} (${Number(rate)}%)` : code
}
