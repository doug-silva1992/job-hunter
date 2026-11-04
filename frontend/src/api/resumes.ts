import { api, uploadWithProgress } from './client'

/** Avaliação de ATS gravada pelo n8n na coluna `resumes.ats`. Todos os campos são opcionais. */
export type AtsResult = {
  atsScore?: number
  classificacao?: string
  pontosFortes?: string[]
  pontosFracos?: string[]
  sugestoes?: string[]
  tecnologiasIdentificadas?: string[]
}

export type Resume = {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  isPrimary: boolean
  ats: AtsResult | null
  createdAt: string
}

export const resumesApi = {
  list: () => api<Resume[]>('/resumes'),

  upload: (file: File, onProgress: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return uploadWithProgress<Resume>('/resumes', form, onProgress)
  },

  setPrimary: (id: string) => api<Resume>(`/resumes/${id}/primary`, { method: 'PATCH' }),

  remove: (id: string) => api<void>(`/resumes/${id}`, { method: 'DELETE' }),

  download: (id: string) => api<Blob>(`/resumes/${id}/download`),
}
