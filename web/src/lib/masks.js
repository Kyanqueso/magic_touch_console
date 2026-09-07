// Live input helpers. Each function is pure: takes the raw field string and
// returns the cleaned/reformatted string to put back in state. `normalize*`
// helpers are meant for onBlur (final tidy-up); the rest for onChange.

export const digitsOnly = (s) => String(s ?? '').replace(/\D+/g, '')

// --- Phone (PH mobile) -------------------------------------------------------
// 0917-123-4567. Accepts a leading +63 / 63 and rewrites it to 0.
export function maskPhone(input) {
  let d = digitsOnly(input)
  if (d.startsWith('63')) d = `0${d.slice(2)}`
  d = d.slice(0, 11)
  if (d.length > 7) return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`
  return d
}

// --- Government IDs ---------------------------------------------------------
// Group digits into dash-separated blocks and cap at the total width.
function groupDigits(input, sizes) {
  const total = sizes.reduce((a, b) => a + b, 0)
  const d = digitsOnly(input).slice(0, total)
  const parts = []
  let i = 0
  for (const size of sizes) {
    if (i >= d.length) break
    parts.push(d.slice(i, i + size))
    i += size
  }
  return parts.join('-')
}

export const maskTIN = (s) => groupDigits(s, [3, 3, 3, 5]) // 000-000-000-00000
export const maskSSS = (s) => groupDigits(s, [2, 7, 1]) //     00-0000000-0
export const maskPHIC = (s) => groupDigits(s, [2, 9, 1]) //    00-000000000-0
export const maskHDMF = (s) => groupDigits(s, [4, 4, 4]) //    0000-0000-0000
export const maskZip = (s) => digitsOnly(s).slice(0, 4)

// --- Money -----------------------------------------------------------------
export function maskMoney(input) {
  let s = String(input ?? '').replace(/[^\d.]/g, '')
  const dot = s.indexOf('.')
  if (dot !== -1) {
    const intPart = s.slice(0, dot)
    const decPart = s.slice(dot + 1).replace(/\./g, '').slice(0, 2)
    s = `${intPart}.${decPart}`
  }
  return s
}

export function normalizeMoney(input, { min = 0 } = {}) {
  const n = Number(maskMoney(input))
  if (!Number.isFinite(n)) return min.toFixed(2)
  return Math.max(min, n).toFixed(2)
}

// --- Whole numbers -------------------------------------------------------------
// Strips leading zeros but keeps a lone "0".
export const maskInteger = (input) => digitsOnly(input).replace(/^0+(?=\d)/, '')

// Keeps leading zeros (invoice / OR series numbers like 000001).
export const maskDigits = (input, max = 20) => digitsOnly(input).slice(0, max)

export function clampInt(input, { min = 0, max } = {}) {
  let n = parseInt(digitsOnly(input) || String(min), 10)
  if (Number.isNaN(n)) n = min
  n = Math.max(min, n)
  if (max != null) n = Math.min(max, n)
  return String(n)
}

// --- Percent -----------------------------------------------------------------
export function maskPercent(input) {
  let s = String(input ?? '').replace(/[^\d.]/g, '')
  const dot = s.indexOf('.')
  if (dot !== -1) {
    s = `${s.slice(0, dot)}.${s.slice(dot + 1).replace(/\./g, '').slice(0, 2)}`
  }
  return s
}

export function normalizePercent(input) {
  const s = maskPercent(input)
  if (s === '' || s === '.') return ''
  const n = Number(s)
  if (!Number.isFinite(n)) return ''
  return String(Math.min(100, Math.max(0, n)))
}

// --- Email -----------------------------------------------------------------
export const sanitizeEmail = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase()
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s ?? '').trim())

// --- OTP -----------------------------------------------------------------------
// Must match Supabase's "Email OTP Length" setting, or the input truncates the code.
export const OTP_LENGTH = 8

export const maskOTP = (s) => digitsOnly(s).slice(0, OTP_LENGTH)

// --- Text --------------------------------------------------------------------
export const noLeadingSpace = (s) => String(s ?? '').replace(/^\s+/, '')

export const countWords = (s) => {
  const t = String(s ?? '').trim()
  return t ? t.split(/\s+/).length : 0
}

// Hard-cap a string to `max` words, keeping the user's original spacing up to
// the cut point.
export function limitWords(input, max) {
  const s = String(input ?? '')
  const re = /\S+/g
  let count = 0
  let end = s.length
  let m = re.exec(s)
  while (m) {
    count += 1
    if (count === max) {
      end = m.index + m[0].length
      break
    }
    m = re.exec(s)
  }
  return count > max ? s.slice(0, end) : s
}

// --- Dates -----------------------------------------------------------------
// Returns an error string when an ISO end date precedes an ISO start date.
export function dateRangeError(startISO, endISO, message = 'End date is before the start date.') {
  if (!startISO || !endISO) return ''
  return endISO < startISO ? message : ''
}
