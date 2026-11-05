import { api } from './client'

export type WorkMode = 'remote' | 'hybrid' | 'onsite'
export type Seniority = 'intern' | 'junior' | 'mid' | 'senior' | 'specialist'

/** Preferências de busca e notificação (GET/PUT /api/settings). */
export type Settings = {
  minMatch: number
  keywords: string[]
  excludedKeywords: string[]
  seniority: Seniority[]
  workModes: WorkMode[]
  locations: string[]
  minSalary: number | null
  maxJobAgeDays: number
  notifyNewJobs: boolean
  weeklySummary: boolean
}

export type SettingsResponse = Settings & { updatedAt: string | null }

export const settingsApi = {
  get: () => api<SettingsResponse>('/settings'),
  save: (settings: Settings) => api<SettingsResponse>('/settings', { method: 'PUT', json: settings }),
}

// Mesmos valores aceitos pelo backend (backend/src/settings/dto/settings.dto.ts).
export const JOB_AGE_OPTIONS = [1, 3, 7, 15, 30, 60, 90]

export const SENIORITY_LABELS: Record<Seniority, string> = {
  intern: 'Estágio',
  junior: 'Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
  specialist: 'Especialista',
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: 'Remoto',
  hybrid: 'Híbrido',
  onsite: 'Presencial',
}
