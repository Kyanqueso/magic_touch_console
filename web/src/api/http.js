import { supabase } from '../lib/supabase.js'

const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

// Matches the Lambda's own 30s timeout - past that there is nothing still
// coming. Without a limit a stalled request never settles, and any screen
// waiting on it sits on a loading spinner indefinitely.
const TIMEOUT_MS = 30_000

/** Thrown for any non-2xx response. Carries the backend's { code, message, fields } envelope. */
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code || null
    this.fields = body?.error?.fields || null
  }
}

async function request(method, path, body) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (networkError) {
    const timedOut = controller.signal.aborted
    throw new ApiError(0, {
      error: {
        message: timedOut
          ? 'The server took too long to respond. Try again.'
          : 'Cannot reach the server. Is the backend running?',
      },
    })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 204) return null

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  // 401 means the token is no longer good - expired, or the account was
  // deleted while they were using the app. Sign out so the router returns
  // them to the login page instead of leaving a signed-in shell that fails
  // every request.
  //
  // UNKNOWN_USER is the exception: the token is fine but there is no console
  // profile for it. Signing out there would just loop them back through a
  // successful login into the same 401.
  if (res.status === 401 && data?.error?.code !== 'UNKNOWN_USER') {
    // Local scope: the token is already rejected, so asking the server to
    // revoke it can only fail or hang. Clearing it here is what matters.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }

  if (!res.ok) throw new ApiError(res.status, data)
  return data
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}

/** Build a query string, skipping empty values. */
export function qs(params) {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}
