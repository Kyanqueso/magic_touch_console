import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import Modal from './Modal.jsx'
import Alert from './Alert.jsx'
import Button from './Button.jsx'
import TextField from './TextField.jsx'
import { sanitizeEmail, maskOTP, OTP_LENGTH } from '../lib/masks.js'
import { supabase } from '../lib/supabase.js'

const MIN_PASSWORD = 8

// Supabase recovery: email a code, verify it for a session, then set the password.
// Also how a new user sets their first one. Needs the Supabase "Reset Password"
// template to emit {{ .Token }} - see api/supabase-email-setup.md.

async function requestOtp(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
  if (error) throw new Error(error.message)
}

async function verifyOtp(email, code) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'recovery',
  })
  if (error) throw new Error(error.message)
}

async function resetPassword(_email, _code, password, confirm) {
  if (password.length < MIN_PASSWORD) throw new Error(`Password must be at least ${MIN_PASSWORD} characters.`)
  if (password !== confirm) throw new Error('Passwords do not match.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error(error.message)
  await supabase.auth.signOut()
}

const STEPS = { EMAIL: 'email', OTP: 'otp', PASSWORD: 'password', DONE: 'done' }

const CONTEXT_ALERT = {
  [STEPS.OTP]: {
    title: 'Valid Email!',
    body: 'Please enter the OTP you have received in that email.',
  },
  [STEPS.PASSWORD]: {
    title: 'Valid OTP!',
    body: 'Please set your new password.',
  },
  [STEPS.DONE]: {
    title: 'Password Set!',
    body: 'You may now login with your new password.',
  },
}

const EMPTY = { email: '', otp: '', password: '', confirm: '' }

export default function ResetPasswordModal({ open, onClose }) {
  const [step, setStep] = useState(STEPS.EMAIL)
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [alertDismissed, setAlertDismissed] = useState(false)

  // Reset everything each time the modal opens.
  useEffect(() => {
    if (open) {
      setStep(STEPS.EMAIL)
      setForm(EMPTY)
      setStatus('idle')
      setError('')
      setAlertDismissed(false)
    }
  }, [open])

  const busy = status === 'submitting'

  function update(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  // Live password hints.
  const pwShort = form.password.length > 0 && form.password.length < MIN_PASSWORD
  const pwMismatch = form.confirm.length > 0 && form.confirm !== form.password
  const pwReady = form.password.length >= MIN_PASSWORD && form.confirm === form.password

  async function run(fn, nextStep) {
    setStatus('submitting')
    setError('')
    setAlertDismissed(false)
    try {
      await fn()
      setStatus('idle')
      setStep(nextStep)
    } catch (err) {
      setStatus('idle')
      setError(err.message)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (step === STEPS.EMAIL) run(() => requestOtp(form.email), STEPS.OTP)
    else if (step === STEPS.OTP) run(() => verifyOtp(form.email, form.otp), STEPS.PASSWORD)
    else if (step === STEPS.PASSWORD)
      run(
        () => resetPassword(form.email, form.otp, form.password, form.confirm),
        STEPS.DONE,
      )
  }

  const context = CONTEXT_ALERT[step]

  // Verifying the code signs them in. Backing out here must drop that session,
  // or they end up logged in with a password they never set.
  async function handleClose() {
    if (step === STEPS.PASSWORD) {
      await supabase.auth.signOut()
    }
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : handleClose}
      title="Reset Password"
      description="We'll walk you through it step by step."
      icon={<KeyRound />}
    >
      {error ? (
        <Alert variant="danger" title={error} onDismiss={() => setError('')} />
      ) : (
        context &&
        !alertDismissed && (
          <Alert
            variant="success"
            title={context.title}
            onDismiss={() => setAlertDismissed(true)}
          >
            {context.body}
          </Alert>
        )
      )}

      {step === STEPS.DONE ? (
        <Button className="w-full" onClick={handleClose}>
          Back to login
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {step === STEPS.EMAIL && (
            <>
              <div className="space-y-2">
                <p className="text-base text-black">
                  Enter your email to receive a reset OTP.
                </p>
                <TextField
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => update('email', sanitizeEmail(e.target.value))}
                  disabled={busy}
                />
              </div>
              <Button type="submit" className="w-full" loading={busy} disabled={busy}>
                {busy ? 'Sending...' : 'Send OTP'}
              </Button>
            </>
          )}

          {step === STEPS.OTP && (
            <>
              <TextField
                label="OTP"
                name="otp"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                placeholder={'0'.repeat(OTP_LENGTH)}
                value={form.otp}
                onChange={(e) => update('otp', maskOTP(e.target.value))}
                disabled={busy}
              />
              <Button
                type="submit"
                className="w-full"
                loading={busy}
                disabled={busy || form.otp.length !== OTP_LENGTH}
              >
                {busy ? 'Confirming...' : 'Confirm'}
              </Button>
            </>
          )}

          {step === STEPS.PASSWORD && (
            <>
              <TextField
                label="New Password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                error={pwShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
                disabled={busy}
              />
              <TextField
                label="Confirm Password"
                name="confirm"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => update('confirm', e.target.value)}
                error={pwMismatch ? 'Passwords do not match.' : undefined}
                disabled={busy}
              />
              <Button
                type="submit"
                className="w-full"
                loading={busy}
                disabled={busy || !pwReady}
              >
                {busy ? 'Setting New Password...' : 'Set'}
              </Button>
            </>
          )}
        </form>
      )}
    </Modal>
  )
}
