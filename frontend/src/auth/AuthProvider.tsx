import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, normalizeEmail, type User } from './context'

const STORAGE_KEY = 'job-hunter:session'

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<User>) : null
    // sessões antigas (salvas com "username") são descartadas
    if (typeof parsed?.email !== 'string') return null
    return typeof parsed.username === 'string'
      ? { email: parsed.email, username: parsed.username }
      : { email: parsed.email }
  } catch {
    return null
  }
}

function writeSession(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // armazenamento indisponível: a sessão vale só enquanto a aba estiver aberta
  }
}

/**
 * Autenticação simulada no frontend. Aceita qualquer e-mail/senha válidos
 * e guarda apenas o e-mail (nunca a senha) para manter a sessão.
 * Trocar `login`/`register` por chamadas a /api/auth quando o backend existir.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readSession)

  const startSession = useCallback(async (email: string, username?: string) => {
    await new Promise((r) => setTimeout(r, 500))
    const next: User = { email: normalizeEmail(email) }
    if (username) next.username = username.trim()
    writeSession(next)
    setUser(next)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login: (email: string, _password: string) => startSession(email),
      register: (username: string, email: string, _password: string) => startSession(email, username),
      logout: () => {
        writeSession(null)
        setUser(null)
      },
    }),
    [user, startSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
