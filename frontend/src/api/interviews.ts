import { api } from './client'

export type InterviewAnswer = {
  pergunta: number
  nota: number | null
  pontosFortes: string | null
  melhorias: string | null
  respostaIdeal: string | null
  /** Áudio salvo no backend (baixe com `interviewsApi.audio`). */
  hasAudio: boolean
  /** Link do áudio gravado pelo n8n. */
  externalAudioUrl: string | null
}

export type InterviewReportSummary = {
  id: string
  jobId: string | null
  company: string | null
  cargo: string | null
  requisitos: string | null
  /** 0 a 10 */
  notaGeral: number | null
  resumo: string | null
  status: string | null
  createdAt: string
}

export type InterviewReport = InterviewReportSummary & {
  candidatoNome: string | null
  recomendacao: string | null
  respostas: InterviewAnswer[]
}

export const interviewsApi = {
  list: () => api<InterviewReportSummary[]>('/interviews'),

  get: (id: string) => api<InterviewReport>(`/interviews/${id}`),

  /** Envia os 4 áudios (na ordem das perguntas); espera a avaliação do n8n e devolve o relatório. */
  submit: (jobId: string, answers: Blob[]) => {
    const form = new FormData()
    form.append('jobId', jobId)
    answers.forEach((blob, i) => form.append(`pergunta${i + 1}`, blob, `resposta-${i + 1}`))
    return api<InterviewReport>('/interviews', { method: 'POST', body: form })
  },

  audio: (id: string, pergunta: number) => api<Blob>(`/interviews/${id}/audio/${pergunta}`),

  remove: (id: string) => api<void>(`/interviews/${id}`, { method: 'DELETE' }),
}
