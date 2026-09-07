// Row validators for the inline table editors. Each takes a draft row (and the
// other draft rows, for uniqueness) and returns { field: message } for whatever
// is wrong right now — they run on every keystroke, so the table can flag a
// problem before Save rather than after the API refuses it.
//
// The rules mirror the API's constraints. Where the mapping layer would quietly
// coerce a bad value (an unknown Company Type becoming null, junk Terms becoming
// 0), the rule is stricter than the API on purpose: silently saving something
// other than what was typed is worse than being told it's wrong.

import { ACCOUNT_CLASSES, COMPANY_TYPES, TAX_TYPES } from './options.js'

const text = (v) => String(v ?? '').trim()

const required = (v) => (text(v) ? '' : 'Required.')
const tooLong = (v, max) =>
  String(v ?? '').length > max ? `Keep this to ${max} characters or fewer.` : ''

// Empty is allowed everywhere below; only a filled-in value is checked.
function optional(v, check) {
  return text(v) ? check() : ''
}

function numberInRange(v, { min, max, label = 'This' }) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 'Must be a number.'
  if (n < min) return `${label} cannot be below ${min}.`
  if (max != null && n > max) return `${label} cannot be above ${max}.`
  return ''
}

function oneOf(v, allowed, label) {
  return allowed.some((a) => a.toLowerCase() === text(v).toLowerCase())
    ? ''
    : `${label} must be one of: ${allowed.join(', ')}.`
}

function duplicate(row, rows, key, label) {
  const mine = text(row[key]).toLowerCase()
  if (!mine) return ''
  const clash = rows.some((r) => r.id !== row.id && text(r[key]).toLowerCase() === mine)
  return clash ? `${label} is already used on another row.` : ''
}

// Drops the empty strings, so callers can treat {} as "this row is fine".
function clean(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}

const TIN_RE = /^\d{3}-\d{3}-\d{3}-\d{5}$/

/** Delivery must not precede the order date — the API rejects it outright. */
export function deliveryDateError(dateOrdered, deliveryDate) {
  if (!dateOrdered || !deliveryDate) return ''
  return deliveryDate < dateOrdered ? 'Delivery is before the order date.' : ''
}

/** Series To must not be below Series From. Both are digit strings. */
export function seriesError(from, to) {
  if (!text(from) || !text(to)) return ''
  return Number(to) < Number(from) ? 'Series To is lower than Series From.' : ''
}

export function validateJobOrderRow(row) {
  return clean({
    jobDescription: tooLong(row.jobDescription, 160),
    deliveryDate: deliveryDateError(row.dateOrdered, row.deliveryDate),
    qty: optional(row.qty, () => numberInRange(row.qty, { min: 0, label: 'Qty' })),
    unitPrice: optional(row.unitPrice, () =>
      numberInRange(row.unitPrice, { min: 0, label: 'Unit price' }),
    ),
  })
}

/** The Job Order Detail cards edit the same record with more fields on show. */
export function validateJobOrderDetail(draft) {
  return clean({
    ...validateJobOrderRow(draft),
    specification: tooLong(draft.specification, 160),
    seriesFrom: tooLong(draft.seriesFrom, 20),
    seriesTo: seriesError(draft.seriesFrom, draft.seriesTo) || tooLong(draft.seriesTo, 20),
    branch: tooLong(draft.branch, 80),
    po: tooLong(draft.po, 40),
    atp: tooLong(draft.atp, 40),
    invoiceNo: tooLong(draft.invoiceNo, 40),
    orNo: tooLong(draft.orNo, 40),
    size: tooLong(draft.size, 40),
  })
}

// Terms is free text in the table: "COD", or a number of days.
function termsError(v) {
  if (!text(v) || text(v).toUpperCase() === 'COD') return ''
  if (!/^\d+$/.test(text(v))) return 'Use COD or a number of days.'
  return numberInRange(v, { min: 0, max: 365, label: 'Terms' })
}

// "WI011 (10%)" or just "WI011".
function atcError(v) {
  return optional(v, () => {
    const m = text(v).match(/^([A-Za-z0-9]+)\s*(?:\(\s*([\d.]+)\s*%\s*\))?$/)
    if (!m) return 'Use a code like WI011 (10%).'
    if (m[1].length > 10) return 'Code is too long.'
    return m[2] == null ? '' : numberInRange(m[2], { min: 0, max: 100, label: 'Rate' })
  })
}

export function validatePartyRow(row) {
  return clean({
    name: required(row.name) || tooLong(row.name, 200),
    address: tooLong(row.address, 4000),
    zip: optional(row.zip, () =>
      /^\d{1,20}$/.test(text(row.zip)) ? '' : 'Digits only.',
    ),
    terms: termsError(row.terms),
    tin: optional(row.tin, () => (TIN_RE.test(text(row.tin)) ? '' : 'Must look like 000-000-000-00000.')),
    branchCode: tooLong(row.branchCode, 10),
    companyType: optional(row.companyType, () => oneOf(row.companyType, COMPANY_TYPES, 'Company Type')),
    taxType: optional(row.taxType, () => oneOf(row.taxType, TAX_TYPES, 'Tax Type')),
    wtax1: atcError(row.wtax1),
    wtax2: atcError(row.wtax2),
  })
}

export function validateAccountRow(row, rows = []) {
  return clean({
    code: required(row.code) || tooLong(row.code, 20) || duplicate(row, rows, 'code', 'Account code'),
    title: required(row.title) || tooLong(row.title, 200),
    type: required(row.type) || oneOf(row.type, ACCOUNT_CLASSES, 'Type'),
    subType: tooLong(row.subType, 40),
    atcCode: tooLong(row.atcCode, 10),
    taxRate: optional(row.taxRate, () =>
      numberInRange(row.taxRate, { min: 0, max: 100, label: 'Tax rate' }),
    ),
    referenceForm: tooLong(row.referenceForm, 60),
  })
}

export function validateMaterialRow(row, rows = []) {
  return clean({
    code: required(row.code) || tooLong(row.code, 20) || duplicate(row, rows, 'code', 'Material code'),
    description: required(row.description) || tooLong(row.description, 160),
    unitPrice: required(row.unitPrice) || numberInRange(row.unitPrice, { min: 0, label: 'Unit price' }),
  })
}

/** Runs a row validator over a draft. Returns { [rowId]: { field: message } }. */
export function validateRows(rows, validator) {
  const out = {}
  for (const row of rows) {
    const errors = validator(row, rows)
    if (Object.keys(errors).length) out[row.id] = errors
  }
  return out
}

export const countErrors = (byRow) =>
  Object.values(byRow).reduce((n, fields) => n + Object.keys(fields).length, 0)
