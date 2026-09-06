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

export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-not-set',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
