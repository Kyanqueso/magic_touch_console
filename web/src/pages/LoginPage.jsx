import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle, Check, Lock } from 'lucide-react'
import Header from '../components/Header.jsx'
import { NAV_ITEMS } from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import TextField from '../components/TextField.jsx'
import ResetPasswordModal from '../components/ResetPasswordModal.jsx'
import { sanitizeEmail, isEmail } from '../lib/masks.js'
import { supabase } from '../lib/supabase.js'
import { useAuth, takeSignOutReason } from '../lib/auth.jsx'

const STATUS = {
  IDLE: 'idle',
  SUBMITTING: 'submitting',
  SUCCESS: 'success',
  ERROR: 'error',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, loading, hasModule } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState(STATUS.IDLE)
  const [formError, setFormError] = useState('')
  const [resetOpen, setResetOpen] = useState(false)

  // Read once on mount, so a deliberate logout or a later visit shows nothing.
  const [signedOutNotice] = useState(() => takeSignOutReason() === 'inactivity')

  const busy = status === STATUS.SUBMITTING || status === STATUS.SUCCESS

  // First page this user can actually open; My Profile is the floor since it
  // has no module gate. `loading` covers the profile fetch, so grants are known.
  const firstAllowed = NAV_ITEMS.find((item) => hasModule(item.moduleKey))
  const dest = location.state?.from || firstAllowed?.to || '/my-profile'

  // Already signed in, skip the form - unless the reset modal is open, where
  // verifying the code creates a session that would otherwise unmount it.
  if (!loading && session && !resetOpen) {
    return <Navigate to={dest} replace />
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: name === 'email' ? sanitizeEmail(value) : value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function validate() {
    const errors = {}
    if (!form.email.trim()) errors.email = 'Email is required.'
    else if (!isEmail(form.email)) errors.email = 'Enter a valid email address.'
    if (!form.password) errors.password = 'Password is required.'
    return errors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const errors = validate()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setStatus(STATUS.SUBMITTING)
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    })
    if (error) {
      setStatus(STATUS.ERROR)
      setFormError(error.message || 'Invalid email or password.')
      return
    }
    setStatus(STATUS.SUCCESS)
    setTimeout(() => navigate(dest, { replace: true }), 600)
  }

  return (
    <div className="flex min-h-full flex-col bg-component-bg">
      <Header />

      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex justify-center">
            <Badge status={status} />
          </div>

          {signedOutNotice && (
            <div
              role="status"
              className="mb-4 rounded-xl border border-purple-light bg-white px-4 py-3 text-center"
            >
              <p className="text-base font-bold text-content">Signed out for your security</p>
              <p className="mt-1 text-sm text-content-muted">
                Your session ended after 30 minutes of inactivity. Please sign in again.
              </p>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-purple-light bg-white p-8 shadow-sm"
          >
            <TextField
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={fieldErrors.email}
              disabled={busy}
            />

            <TextField
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              error={fieldErrors.password}
              disabled={busy}
            />

            {formError && (
              <p className="text-base text-danger" role="alert">
                {formError}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                disabled={busy}
                className="text-sm italic text-purple hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={status === STATUS.SUBMITTING}
              disabled={busy}
            >
              {busy ? 'Logging In...' : 'Login'}
            </Button>
          </form>
        </div>
      </main>

      <ResetPasswordModal open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  )
}

function Badge({ status }) {
  const base = 'flex h-16 w-16 items-center justify-center rounded-full text-white'

  if (status === STATUS.SUCCESS) {
    return (
      <span className={`${base} bg-success`}>
        <Check className="h-8 w-8" strokeWidth={3} />
      </span>
    )
  }

  if (status === STATUS.ERROR) {
    return (
      <span className={`${base} bg-danger`}>
        <AlertCircle className="h-8 w-8" />
      </span>
    )
  }

  return (
    <span className={`${base} bg-purple`}>
      <Lock className="h-8 w-8" />
    </span>
  )
}
