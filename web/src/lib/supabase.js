import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in web/.env, then restart the dev server.',
  )
}

/**
 * The session lives in sessionStorage, not the default localStorage, so that
 * closing the tab or the browser signs the user out. sessionStorage is wiped by
 * the browser when the tab goes away, and is untouched by minimising, switching
 * apps or reloading - which is exactly the line we want.
 *
 * This is done through storage rather than a `beforeunload` handler on purpose:
 * an unload handler cannot reliably finish a network call, and never runs at all
 * on a crash, a force quit, or most mobile closes.
 *
 * The trade-off is that sessionStorage is per-tab, so opening the console in a
 * second tab asks for a fresh sign-in.
 */
const sessionOnlyStorage =
  typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : undefined

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-not-set',
  {
    auth: {
      storage: sessionOnlyStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
