import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import { LoadingScreen } from '../components/Loading.jsx'
import { getUser } from '../api/users.js'

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileError: null,
})

const IDLE_LIMIT_MS = 30 * 60 * 1000
const LAST_ACTIVE_KEY = 'mtc.lastActiveAt'
const SIGN_OUT_REASON_KEY = 'mtc.signedOutReason'

/**
 * Reads and clears the reason for the last automatic sign-out, so the login
 * page can explain what happened. Read-once: a stale notice on a later visit
 * would be confusing. Signing out via the Logout button sets nothing, so no
 * message appears for a deliberate sign-out.
 */
export function takeSignOutReason() {
  try {
    const reason = localStorage.getItem(SIGN_OUT_REASON_KEY)
    if (reason) localStorage.removeItem(SIGN_OUT_REASON_KEY)
    return reason
  } catch {
    return null
  }
}

/**
 * Signs the user out after 30 minutes without interaction.
 *
 * The timestamp lives in localStorage rather than a ref so the clock keeps
 * running while the tab is closed - otherwise reopening the app would reset
 * it and the session would effectively never expire. It is also shared across
 * tabs, so activity in one keeps the others alive.
 */
function useIdleSignOut(active, onExpire) {
  useEffect(() => {
    if (!active) return undefined

    const read = () => Number(localStorage.getItem(LAST_ACTIVE_KEY)) || Date.now()
    const touch = () => {
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()))
      } catch {
        /* private mode - fall back to never expiring rather than breaking */
      }
    }
    const expire = () => {
      try {
        localStorage.removeItem(LAST_ACTIVE_KEY)
        localStorage.setItem(SIGN_OUT_REASON_KEY, 'inactivity')
      } catch {
        /* ignore */
      }
      onExpire()
      supabase.auth.signOut()
    }

    // The session restored from a previous visit may already be stale - this
    // is the "closed the tab and came back tomorrow" case.
    if (Date.now() - read() > IDLE_LIMIT_MS) {
      expire()
      return undefined
    }
    touch()

    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'focus']
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }))

    const timer = setInterval(() => {
      if (Date.now() - read() > IDLE_LIMIT_MS) expire()
    }, 30_000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, touch))
      clearInterval(timer)
    }
  }, [active, onExpire])
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  // True from the moment a session is judged stale until Supabase has
  // actually cleared it. Counted as loading so the app never renders for a
  // session that is on its way out.
  const [expiring, setExpiring] = useState(false)

  // Role + grants, fetched rather than read from the token: admins edit them at runtime.
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setSessionLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next ?? null)
      if (next) setExpiring(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const handleExpire = useCallback(() => setExpiring(true), [])
  useIdleSignOut(Boolean(session), handleExpire)

  const userId = expiring ? undefined : session?.user?.id

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      return undefined
    }
    let cancelled = false
    setProfileLoading(true)
    setProfileError(null)
    getUser(userId)
      .then((u) => !cancelled && setProfile(u))
      .catch((e) => {
        if (cancelled) return
        setProfile(null)
        // Usually: signed in to Supabase but no app_users row.
        setProfileError(e)
      })
      .finally(() => !cancelled && setProfileLoading(false))
    return () => {
      cancelled = true
    }
  }, [userId])

  // Signed in, but the profile fetch has not started yet - the effect above
  // runs after this render. Without counting that as loading, callers briefly
  // see a session with no grants and route as if the user had none.
  const profilePending = Boolean(userId) && !profile && !profileError

  const isAdmin = profile?.role === 'admin'

  const hasModule = useCallback(
    (moduleKey) => {
      if (!moduleKey) return true
      if (isAdmin) return true
      const row = (profile?.modules || []).find((m) => m.key === moduleKey)
      return Boolean(row) && row.level !== 'No Access'
    },
    [profile, isAdmin],
  )

  const canEdit = useCallback(
    (moduleKey) => {
      if (isAdmin) return true
      const row = (profile?.modules || []).find((m) => m.key === moduleKey)
      return row?.level === 'Editor'
    },
    [profile, isAdmin],
  )

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      hasModule,
      canEdit,
      profileError,
      loading: sessionLoading || profileLoading || profilePending || (expiring && Boolean(session)),
    }),
    [session, profile, isAdmin, hasModule, canEdit, profileError, sessionLoading, profileLoading, profilePending, expiring],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Wrap a route element: sends signed-out visitors to /login. */
export function RequireAuth({ children }) {
  const { session, loading, profileError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen label="Loading your session..." />
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (profileError) {
    return <ProfileErrorScreen error={profileError} />
  }
  return children
}

/** Route guard for one module. Convenience only; the API enforces the same matrix. */
export function RequireModule({ moduleKey, children }) {
  const { hasModule } = useAuth()
  return (
    <RequireAuth>
      {hasModule(moduleKey) ? children : <Navigate to="/403" replace />}
    </RequireAuth>
  )
}

/**
 * The profile fetch can fail for very different reasons, and saying "no
 * console profile" when the API is simply unreachable sends people looking
 * for the wrong problem.
 */
function ProfileErrorScreen({ error }) {
  const unreachable = error?.status === 0
  const noProfile = error?.code === 'UNKNOWN_USER' || error?.status === 401

  const title = unreachable ? 'Cannot reach the server' : noProfile ? 'No console profile' : 'Something went wrong'
  const body = unreachable
    ? 'The console loaded but the API did not respond. It may be starting up, or unreachable from here.'
    : noProfile
      ? 'You signed in successfully, but this login has no profile in the console yet. An administrator needs to add you before you can use it.'
      : 'The console could not load your profile.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-component-bg p-6">
      <div className="max-w-md rounded-xl border border-purple-light bg-white p-8 text-center">
        <h1 className="text-xl font-extrabold text-content">{title}</h1>
        <p className="mt-3 text-base text-content-muted">{body}</p>
        {!unreachable && error?.message && (
          <p className="mt-3 text-sm text-content-muted">{error.message}</p>
        )}
        <div className="mt-6 flex justify-center gap-3">
          {unreachable && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-purple px-4 py-2 text-base font-bold text-white"
            >
              Try again
            </button>
          )}
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg border border-purple-light px-4 py-2 text-base font-bold text-purple"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
