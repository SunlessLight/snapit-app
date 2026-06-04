import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export const register = async (email, password, username) => {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } })
  if (error) throw new Error(error.message)
  return data
}

export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}

// Phase 7: the backend now requires `Authorization: Bearer <access_token>` on
// every paid route. getSession() returns the current (auto-refreshed) session,
// so the token is always fresh. Returns null when signed out.
export const getAccessToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

// Convenience for fetch(): spreads to `{}` when signed out so callers can do
// `headers: { ...(await authHeader()) }` unconditionally. Never sets
// Content-Type — FormData must set its own multipart boundary.
export const authHeader = async () => {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const authService = { register, login, logout, getSession, onAuthStateChange, getAccessToken, authHeader }
