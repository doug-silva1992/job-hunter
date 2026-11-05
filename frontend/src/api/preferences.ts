// Aplica as preferências salvas em Configurações (tabela user_settings) às vagas.
import { normalize, type Job } from './jobs'
import type { Seniority, Settings } from './settings'

/** Mesmos padrões do backend (backend/src/settings/settings.service.ts). */
export const DEFAULT_SETTINGS: Settings = {
  minMatch: 70,
  keywords: [],
  excludedKeywords: [],
  seniority: [],
  workModes: ['remote', 'hybrid', 'onsite'],
  locations: [],
  minSalary: null,
  maxJobAgeDays: 30,
  notifyNewJobs: true,
  weeklySummary: false,
}

// A vaga não tem coluna de senioridade: ela é deduzida do cargo e das tags (texto já normalizado).
const SENIORITY_PATTERNS: Record<Seniority, RegExp> = {
  intern: /\b(estagi\w*|intern(ship)?|trainee)\b/,
  junior: /\b(junior|jr)\b/,
  mid: /\b(pleno|mid(-level)?|middle)\b/,
  senior: /\b(senior|sr)\b/,
  specialist: /\b(especialista|specialist|staff|principal)\b/,
}

const jobText = (job: Job) => normalize([job.role, job.company, job.location, ...job.tags].join(' | '))

/** Níveis citados no cargo/tags da vaga (vazio = não dá para saber). */
export function jobSeniorities(job: Job): Seniority[] {
  const text = normalize([job.role, ...job.tags].join(' '))
  return (Object.keys(SENIORITY_PATTERNS) as Seniority[]).filter((s) => SENIORITY_PATTERNS[s].test(text))
}

/** Quantas palavras-chave das preferências aparecem na vaga (usado para priorizar). */
export function keywordHits(job: Job, settings: Settings): number {
  if (!settings.keywords.length) return 0
  const text = jobText(job)
  return settings.keywords.filter((k) => text.includes(normalize(k.trim()))).length
}

/**
 * A vaga atende às preferências? O salário mínimo não é aplicado: as vagas
 * ainda não trazem salário.
 */
export function matchesPreferences(job: Job, settings: Settings, now = Date.now()): boolean {
  if (job.match < settings.minMatch) return false
  if (settings.workModes.length && !settings.workModes.includes(job.workMode)) return false

  const published = new Date(job.postedAt ?? job.createdAt).getTime()
  if (now - published > settings.maxJobAgeDays * 24 * 3600 * 1000) return false

  const text = jobText(job)
  if (settings.excludedKeywords.some((k) => k.trim() && text.includes(normalize(k.trim())))) return false

  // vaga remota vale de qualquer lugar
  if (settings.locations.length && job.workMode !== 'remote') {
    const location = normalize(job.location)
    if (!settings.locations.some((l) => location.includes(normalize(l.trim())))) return false
  }

  // só descarta se a vaga diz o nível e nenhum deles foi escolhido
  if (settings.seniority.length) {
    const levels = jobSeniorities(job)
    if (levels.length && !levels.some((l) => settings.seniority.includes(l))) return false
  }
  return true
}

/**
 * Vagas que aparecem na tela: as que já estão no pipeline (candidatado em diante)
 * sempre aparecem; as "encontradas" passam pelo filtro das preferências.
 */
export function visibleJobs(jobs: Job[], settings: Settings): Job[] {
  const now = Date.now()
  return jobs.filter((j) => j.stage !== 'found' || matchesPreferences(j, settings, now))
}
