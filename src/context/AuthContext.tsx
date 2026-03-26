import { createContext, useContext, ReactNode } from 'react'

// Fixed user — no login needed, single-user personal app
export const FIXED_USER_ID = '776aafc6-d0fe-4eb7-a227-a5167ae43888'

const MOCK_USER = {
  id: FIXED_USER_ID,
  email: 'eshgeen@eshgeenos.app',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '',
}

interface AuthContextType {
  session: { user: typeof MOCK_USER } | null
  user: typeof MOCK_USER | null
  loading: boolean
  signInWithPassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{
      session: { user: MOCK_USER },
      user: MOCK_USER,
      loading: false,
      signInWithPassword: async () => null,
      signOut: async () => { window.location.reload() },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
