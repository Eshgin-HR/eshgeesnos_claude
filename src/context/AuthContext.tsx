import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const AUTO_EMAIL = 'eshgeen@eshgeenos.app'
const AUTO_PASS  = 'Eshgeen2026!'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithPassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Try to reuse existing session
      const { data: { session: existing } } = await supabase.auth.getSession()
      if (existing) {
        setSession(existing)
        setLoading(false)
        return
      }
      // Auto sign-in silently
      const { data, error } = await supabase.auth.signInWithPassword({
        email: AUTO_EMAIL,
        password: AUTO_PASS,
      })
      if (!error) {
        setSession(data.session)
      }
      setLoading(false)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: AUTO_EMAIL,
      password,
    })
    if (error) return error.message
    return null
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
