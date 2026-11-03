import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setAuthToken, setUnauthorizedHandler } from '../api/client'
import { AuthContext, normalizeEmail, type User } from './context'

const STORAGE_KEY = 'job-hunter:session'

type Session = { token: string; user: User }
type AuthResponse = { accessToken: string; user: User }

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Session>) : null
    // sessões do login simulado (sem token) são descartadas
    if (typeof parsed?.token !== 'string' || typeof parsed.user?.id !== 'string') return null
    return parsed as Session
  } catch {
    return null
  }
}

function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // armazenamento indisponível: a sessão vale só enquanto a aba estiver aberta
  }
}

/** Sessão autenticada pela API (JWT). O token é guardado no navegador; a senha nunca. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const initial = readSession()
    // define o token já na inicialização, antes de qualquer página fazer requisições
    setAuthToken(initial?.token ?? null)
    return initial
  })

  const apply = useCallback((next: Session | null) => {
    setAuthToken(next?.token ?? null)
    writeSession(next)
    setSession(next)
  }, [])

  // token expirado ou conta removida: volta para o login
  useEffect(() => {
    setUnauthorizedHandler(() => apply(null))
    return () => setUnauthorizedHandler(null)
  }, [apply])

  // revalida a sessão salva e atualiza os dados do usuário
  const savedToken = session?.token
  useEffect(() => {
    if (!savedToken) return
    api<User>('/users/me')
      .then((user) => apply({ token: savedToken, user }))
      .catch(() => {
        // 401 já é tratado pelo handler acima; falha de rede mantém a sessão
      })
    // só na montagem / troca de token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedToken])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      login: async (email: string, password: string) => {
        const res = await api<AuthResponse>('/auth/login', {
          method: 'POST',
          json: { email: normalizeEmail(email), password },
        })
        apply({ token: res.accessToken, user: res.user })
      },
      register: async (username: string, email: string, password: string) => {
        const res = await api<AuthResponse>('/auth/register', {
          method: 'POST',
          json: { username: username.trim(), email: normalizeEmail(email), password },
        })
        apply({ token: res.accessToken, user: res.user })
      },
      logout: () => apply(null),
    }),
    [session, apply],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
