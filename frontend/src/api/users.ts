import type { User } from '../auth/context'
import { api } from './client'

export type UpdateMe = {
  username?: string
  email?: string
  newPassword?: string
  /** Obrigatória para alterar e-mail ou senha. */
  currentPassword?: string
}

export const usersApi = {
  update: (data: UpdateMe) => api<User>('/users/me', { method: 'PATCH', json: data }),
  remove: () => api<void>('/users/me', { method: 'DELETE' }),
}
