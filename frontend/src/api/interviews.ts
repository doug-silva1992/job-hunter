import { api } from './client'

export type InterviewStatus = 'in_progress' | 'finished' | 'sent'

export type InterviewAnswer = {
  questionIndex: number
  question: string
  mimeType: string
  sizeBytes: number
  durationMs: number
  createdAt: string
}

export type Interview = {
  id: string
  jobId: string
  status: InterviewStatus
  answers: InterviewAnswer[]
  finishedAt: string | null
  sentAt: string | null
  createdAt: string
}

/** sent = entregue ao n8n; pending = integração ainda não configurada; failed = n8n fora do ar. */
export type Delivery = 'sent' | 'pending' | 'failed'

export type FinishedInterview = Interview & { delivery: Delivery }

export type AnswerUpload = { audio: Blob; questionIndex: number; question: string; durationMs: number }

const EXTENSIONS: Record<string, string> = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' }

export const interviewsApi = {
  start: (jobId: string) => api<Interview>('/interviews', { method: 'POST', json: { jobId } }),

  uploadAnswer: (id: string, { audio, questionIndex, question, durationMs }: AnswerUpload) => {
    const form = new FormData()
    form.append('questionIndex', String(questionIndex))
    form.append('question', question)
    form.append('durationMs', String(Math.round(durationMs)))
    const ext = EXTENSIONS[audio.type.split(';')[0]] ?? 'webm'
    form.append('file', audio, `resposta-${questionIndex + 1}.${ext}`)
    return api<InterviewAnswer>(`/interviews/${id}/answers`, { method: 'POST', body: form })
  },

  /** Encerra e envia os áudios ao n8n; pode ser chamado de novo para reenviar. */
  finish: (id: string) => api<FinishedInterview>(`/interviews/${id}/finish`, { method: 'POST' }),
}
