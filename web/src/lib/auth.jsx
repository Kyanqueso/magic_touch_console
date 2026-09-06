import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from './supabase.js'
import { getUser } from '../api/users.js'

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileError: null,
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

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
    })
    return () => sub.subscription.unsubscribe()
  }, [])

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
      loading: sessionLoading || profileLoading,
    }),
    [session, profile, isAdmin, hasModule, canEdit, profileError, sessionLoading, profileLoading],
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
    return <div className="min-h-screen bg-component-bg" />
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (profileError) {
    return <NoProfile error={profileError} />
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

function NoProfile({ error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-component-bg p-6">
      <div className="max-w-md rounded-xl border border-purple-light bg-white p-8 text-center">
        <h1 className="text-xl font-extrabold text-content">No console profile</h1>
        <p className="mt-3 text-base text-content-muted">
          You signed in successfully, but this login has no profile in the console yet. An
          administrator needs to add you before you can use it.
        </p>
        <p className="mt-3 text-sm text-content-muted">{error?.message}</p>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mt-6 rounded-lg bg-purple px-4 py-2 text-base font-bold text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
