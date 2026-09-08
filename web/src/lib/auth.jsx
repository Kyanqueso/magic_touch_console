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
const SESSION_LOOKUP_TIMEOUT_MS = 8000
const LAST_ACTIVE_KEY = 'mtc.lastActiveAt'
const SIGN_OUT_REASON_KEY = 'mtc.signedOutReason'

// Both keys live in sessionStorage, alongside the session itself. In
// localStorage the activity timestamp outlived the tab, so the next sign-in
// read a stale "last active" from hours ago and expired itself immediately.
const store = {
  get(key) {
    try {
      return sessionStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value)
    } catch {
      /* private mode - degrade to not expiring rather than breaking */
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

/**
 * Reads and clears the reason for the last automatic sign-out, so the login
 * page can explain what happened. Read-once: a stale notice on a later visit
 * would be confusing. Signing out via the Logout button sets nothing, so no
 * message appears for a deliberate sign-out.
 */
export function takeSignOutReason() {
  const reason = store.get(SIGN_OUT_REASON_KEY)
  if (reason) store.remove(SIGN_OUT_REASON_KEY)
  return reason
}

/** Signs the user out after 30 minutes without interaction. */
function useIdleSignOut(active, onExpire) {
  useEffect(() => {
    if (!active) return undefined

    const read = () => Number(store.get(LAST_ACTIVE_KEY)) || Date.now()
    const touch = () => store.set(LAST_ACTIVE_KEY, String(Date.now()))
    const expire = () => {
      store.remove(LAST_ACTIVE_KEY)
      store.set(SIGN_OUT_REASON_KEY, 'inactivity')
      // Drop the session locally first. The app must never sit waiting on a
      // network round trip to finish signing out - an expired token makes the
      // server call fail, and the UI used to hang on a spinner forever.
      onExpire()
      // scope 'local' clears storage without calling the server at all.
      supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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

  // Role + grants, fetched rather than read from the token: admins edit them at runtime.
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  useEffect(() => {
    let settled = false
    const done = (next) => {
      if (settled) return
      settled = true
      setSession(next ?? null)
      setSessionLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => done(data.session), () => done(null))
    // Nothing here may leave the app on a spinner. If the lookup hangs or the
    // network is down, fall through to signed-out: the login page is a state
    // the user can act on, an endless loader is not.
    const bail = setTimeout(() => done(null), SESSION_LOOKUP_TIMEOUT_MS)

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      settled = true
      setSession(next ?? null)
      setSessionLoading(false)
    })
    return () => {
      clearTimeout(bail)
      sub.subscription.unsubscribe()
    }
  }, [])

  // Expiry drops the session here and now. Waiting for Supabase to confirm the
  // sign-out is what used to wedge the app on a loading screen.
  const handleExpire = useCallback(() => {
    setSession(null)
    setSessionLoading(false)
  }, [])
  useIdleSignOut(Boolean(session), handleExpire)

  const userId = session?.user?.id

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
      loading: sessionLoading || profileLoading || profilePending,
    }),
    [session, profile, isAdmin, hasModule, canEdit, profileError, sessionLoading, profileLoading, profilePending],
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
            // Local scope: this screen shows when the server is unreachable,
            // which is exactly when a server-side sign-out would hang too.
            onClick={() => supabase.auth.signOut({ scope: 'local' }).catch(() => {})}
            className="rounded-lg border border-purple-light px-4 py-2 text-base font-bold text-purple"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
