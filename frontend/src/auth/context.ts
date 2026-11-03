import { createContext, useContext } from 'react'

export type User = { email: string; username?: string }

export type AuthContextValue = {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}

export const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const USERNAME_RULE = /^[a-zA-Z0-9._-]{3,30}$/
export const PASSWORD_MIN = 6

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** Nome de usuário, se houver; senão a parte do e-mail antes do "@". */
export function displayName(user: User | null) {
  if (!user) return ''
  return user.username || user.email.split('@')[0]
}

type Errors = { username?: string; email?: string; password?: string }

export function validateCredentials(email: string, password: string): Errors {
  const errors: Errors = {}
  if (!email.trim()) {
    errors.email = 'Informe seu e-mail.'
  } else if (!EMAIL_RULE.test(normalizeEmail(email))) {
    errors.email = 'Informe um e-mail válido, como nome@empresa.com.'
  }
  if (password.length < PASSWORD_MIN) {
    errors.password = `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.`
  }
  return errors
}

export function validateRegistration(username: string, email: string, password: string): Errors {
  const errors = validateCredentials(email, password)
  if (!username.trim()) {
    errors.username = 'Informe um nome de usuário.'
  } else if (!USERNAME_RULE.test(username.trim())) {
    errors.username = 'Use de 3 a 30 caracteres: letras, números, ponto, hífen ou underline.'
  }
  return errors
}
