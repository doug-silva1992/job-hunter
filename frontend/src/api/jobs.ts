import { api } from './client'
import { WORK_MODE_LABELS, type WorkMode } from './settings'

/** Colunas do Pipeline de candidaturas (enum `job_stage` no banco). */
export type Stage = 'found' | 'applied' | 'interview' | 'offer' | 'rejected'

/** Vaga como devolvida por GET /api/jobs (datas em ISO). */
export type Job = {
  id: string
  company: string
  role: string
  location: string
  workMode: WorkMode
  match: number
  tags: string[]
  stage: Stage
  /** Página da vaga no site de origem. */
  link: string | null
  postedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ListJobsQuery = { stage?: Stage; minMatch?: number; search?: string }

function toQueryString(query: ListJobsQuery): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const jobsApi = {
  /** Ordenadas por aderência (maior primeiro). */
  list: (query: ListJobsQuery = {}) => api<Job[]>(`/jobs${toQueryString(query)}`),

  /** Move a vaga para outra coluna do pipeline. */
  updateStage: (id: string, stage: Stage) =>
    api<Job>(`/jobs/${id}/stage`, { method: 'PATCH', json: { stage } }),

  /** Pede ao n8n (via backend) para gerar vagas a partir do currículo escolhido. */
  search: (resumeId: string) => api<unknown>('/jobs/search', { method: 'POST', json: { resumeId } }),
}

export const stages: { id: Stage; label: string; color: string }[] = [
  { id: 'found', label: 'Encontradas', color: '#5E6C84' },
  { id: 'applied', label: 'Candidatado', color: '#0A66C2' },
  { id: 'interview', label: 'Entrevista', color: '#B26A00' },
  { id: 'offer', label: 'Oferta', color: '#057642' },
  { id: 'rejected', label: 'Rejeitados', color: '#C9372C' },
]

/** Só abre links http(s): o valor vem de fora (n8n) e não deve executar `javascript:`. */
export function safeJobUrl(link: string | null): string | null {
  if (!link) return null
  try {
    const url = new URL(link.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** "há 2 horas", "ontem"... a partir da publicação (ou da data em que a vaga foi encontrada). */
export function postedLabel(job: Job, now = Date.now()): string {
  const seconds = Math.round((new Date(job.postedAt ?? job.createdAt).getTime() - now) / 1000)
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit)
  }
  return 'agora'
}

/** Vagas encontradas desde a meia-noite de hoje. */
export function foundToday(jobs: Job[], now = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return jobs.filter((j) => new Date(j.createdAt).getTime() >= start).length
}

/** Busca em cargo, empresa, local, modalidade e tecnologias (sem diferenciar maiúsculas e acentos). */
export function matchesSearch(job: Job, search: string): boolean {
  const q = normalize(search.trim())
  if (!q) return true
  return [job.company, job.role, job.location, WORK_MODE_LABELS[job.workMode], ...job.tags].some((v) =>
    normalize(v).includes(q),
  )
}

/** Minúsculas e sem acentos, para comparar textos. */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export type PageSlice<T> = { items: T[]; page: number; pageCount: number; from: number; to: number }

/** Recorta a página (1-based); se a lista encolheu, fica na última página que existe. */
export function paginate<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * pageSize
  const slice = items.slice(start, start + pageSize)
  return { items: slice, page: current, pageCount, from: slice.length ? start + 1 : 0, to: start + slice.length }
}
