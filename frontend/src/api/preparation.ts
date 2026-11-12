import { api, ApiError } from './client'

export type ExamOption = { letra: string; texto: string }

/** Pergunta da prova, sem a resposta certa (o backend só a revela ao corrigir). */
export type ExamQuestion = {
  numero: number
  tecnologia: string | null
  nivel: string | null
  pergunta: string
  alternativas: ExamOption[]
}

/** Preparatório gravado pelo n8n na tabela "preparations". */
export type PreparationExam = {
  id: string
  jobId: string
  /** Dados da empresa como o n8n gravou (nome, o_que_faz, produtos_servicos, fundacao, cultura, fontes...). */
  company: unknown
  questions: ExamQuestion[]
  /** Nota salva da última prova enviada (0 a 10). */
  score: number | null
  createdAt: string
  updatedAt: string
}

export type GradedQuestion = {
  numero: number
  resposta: string | null
  correta: string
  acertou: boolean
  explicacao: string | null
}

export type ExamResult = { score: number; acertos: number; total: number; resultado: GradedQuestion[] }

export const preparationApi = {
  /** Envia a vaga ao n8n (fluxo interview-prep) e devolve a resposta dele como veio. */
  generate: async (jobId: string): Promise<unknown> => {
    const response = await api<unknown>(`/preparation/${jobId}`, { method: 'POST' })
    // resposta que não é JSON (texto puro ou vazia) chega como Blob
    if (response instanceof Blob) return (await response.text()) || null
    return response ?? null
  },

  /** Preparatório mais recente da vaga; null se ainda não foi gerado. */
  get: async (jobId: string): Promise<PreparationExam | null> => {
    try {
      return await api<PreparationExam>(`/preparation/${jobId}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }
  },

  /** Corrige a prova no backend, que grava a nota em score. `answers` = { numero: letra }. */
  submit: (jobId: string, preparationId: string, answers: Record<string, string>) =>
    api<ExamResult>(`/preparation/${jobId}/answers`, { method: 'POST', json: { preparationId, answers } }),
}
