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

/** Entrevista técnica gerada pelo n8n a partir do relatório (tabela technical_interview). */
export type TechnicalInterview = {
  id: string
  cargo: string | null
  perguntas: string[]
  status: string
  createdAt: string
}

export type InterviewReport = InterviewReportSummary & {
  candidatoNome: string | null
  recomendacao: string | null
  respostas: InterviewAnswer[]
  /** Entrevista técnica mais recente deste relatório, se já foi gerada. */
  technical: TechnicalInterview | null
}

/** Resposta do fluxo "Technical Interview" do n8n (campos opcionais: vêm como o n8n mandar). */
export type TechnicalInterviewResult = {
  sucesso?: boolean
  interview_id?: string
  cargo?: string
  nivel?: string
  perguntas?: ({ pergunta?: string } & Record<string, unknown>)[]
}

export const interviewsApi = {
  /** Gera a entrevista técnica do relatório; `descricao` é o texto digitado na modal. */
  requestTechnical: (id: string, descricao: string) =>
    api<TechnicalInterviewResult>(`/interviews/${id}/technical`, { method: 'POST', json: { descricao } }),

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
