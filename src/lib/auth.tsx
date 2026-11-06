import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Role, SessionUser } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { setDemoActor } from '@/lib/data/demo'

export const DEMO_PASSWORD = 'demo'

export const DEMO_USERS: { email: string; nombre: string; rol: Role }[] = [
  { email: 'admin@confecat.com', nombre: 'Marcela Duarte', rol: 'admin' },
  { email: 'rrhh@confecat.com', nombre: 'Sofía Ferreyra', rol: 'rrhh' },
  { email: 'consulta@confecat.com', nombre: 'Estudio Contable', rol: 'consulta' },
]

const SESSION_KEY = 'confecat.rrhh.v1.session'

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  mode: 'demo' | 'supabase'
  signIn: (identifier: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readDemoSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SessionUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const mode: 'demo' | 'supabase' = supabase ? 'supabase' : 'demo'
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadProfile(userId: string, email: string) {
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('id, nombre, email, rol, activo')
        .eq('id', userId)
        .maybeSingle()
      if (!active) return
      if (data && data.activo === false) {
        await supabase.auth.signOut()
        setUser(null)
        return
      }
      setUser({
        id: userId,
        email: data?.email ?? email,
        nombre: data?.nombre ?? email.split('@')[0],
        rol: (data?.rol as Role) ?? 'consulta',
      })
    }

    if (!supabase) {
      const session = readDemoSession()
      if (session) {
        setDemoActor(session.nombre)
        setUser(session)
      }
      setLoading(false)
      return
    }

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        if (data.session?.user) {
          await loadProfile(data.session.user.id, data.session.user.email ?? '')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return
      if (session?.user) {
        await loadProfile(session.user.id, session.user.email ?? '')
      } else {
        setUser(null)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const value = identifier.trim().toLowerCase()
      if (!value || !password) throw new Error('Completá usuario y contraseña.')

      if (!supabase) {
        const match = DEMO_USERS.find(
          (candidate) =>
            candidate.email === value ||
            candidate.email.split('@')[0] === value,
        )
        if (!match || password !== DEMO_PASSWORD) {
          throw new Error('Usuario o contraseña incorrectos.')
        }
        const session: SessionUser = { id: `demo-${match.rol}`, ...match }
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))
        setDemoActor(match.nombre)
        setUser(session)
        return
      }

      const email = value.includes('@') ? value : `${value}@confecat.com`
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Usuario o contraseña incorrectos.'
            : error.message,
        )
      }
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nombre, email, rol, activo')
          .eq('id', data.user.id)
          .maybeSingle()
        if (profile?.activo === false) {
          await supabase.auth.signOut()
          throw new Error('Tu usuario está deshabilitado. Contactá a administración.')
        }
        setUser({
          id: data.user.id,
          email: profile?.email ?? data.user.email ?? email,
          nombre: profile?.nombre ?? (data.user.email ?? email).split('@')[0],
          rol: (profile?.rol as Role) ?? 'consulta',
        })
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    } else {
      localStorage.removeItem(SESSION_KEY)
      setDemoActor('Sistema')
    }
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, mode, signIn, signOut }),
    [user, loading, mode, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return context
}

export function canManage(role: Role | undefined): boolean {
  return role === 'admin' || role === 'rrhh'
}

export function canAdmin(role: Role | undefined): boolean {
  return role === 'admin'
}
