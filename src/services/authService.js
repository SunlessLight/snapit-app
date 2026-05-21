import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const register = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
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

export const authService = { register, login, logout, getSession, onAuthStateChange }
