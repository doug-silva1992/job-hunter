// Cliente HTTP do backend. As rotas são relativas a /api: em desenvolvimento o
// proxy do Vite encaminha para o NestJS; em produção, o nginx.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

/** Token enviado no header Authorization de todas as requisições. */
export function setAuthToken(token: string | null) {
  authToken = token
}

/** Chamado quando a API responde 401 com um token (sessão expirada ou conta removida). */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

function errorMessage(status: number, body: unknown): string {
  if (status === 0) return 'Não foi possível conectar ao servidor. Verifique se a API está rodando.'
  if (status === 413) return 'O arquivo passa de 5 MB.'
  const message = (body as { message?: unknown } | null)?.message
  if (status < 500) {
    if (Array.isArray(message)) return message.join(' ')
    if (typeof message === 'string') return message
  }
  return status >= 500
    ? 'Erro no servidor. Tente novamente em instantes.'
    : 'Não foi possível concluir a operação.'
}

function handleStatus(status: number, hadToken: boolean) {
  if (status === 401 && hadToken) onUnauthorized?.()
}

type RequestOptions = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit }

export async function api<T>(path: string, { json, headers, ...init }: RequestOptions = {}): Promise<T> {
  const finalHeaders = new Headers(headers)
  const hadToken = authToken !== null
  if (authToken) finalHeaders.set('Authorization', `Bearer ${authToken}`)
  let body = init.body
  if (json !== undefined) {
    finalHeaders.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }

  let res: Response
  try {
    res = await fetch(`/api${path}`, { ...init, headers: finalHeaders, body })
  } catch {
    throw new ApiError(0, errorMessage(0, null))
  }

  if (!res.ok) {
    handleStatus(res.status, hadToken)
    const data: unknown = await res.json().catch(() => null)
    throw new ApiError(res.status, errorMessage(res.status, data))
  }
  if (res.status === 204) return undefined as T
  const isJson = res.headers.get('content-type')?.includes('application/json')
  return (isJson ? res.json() : res.blob()) as Promise<T>
}

/** Envio multipart com progresso real (fetch não informa o progresso do upload). */
export function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const hadToken = authToken !== null
    xhr.open('POST', `/api${path}`)
    if (authToken) xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    xhr.responseType = 'json'

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as T)
      } else {
        handleStatus(xhr.status, hadToken)
        reject(new ApiError(xhr.status, errorMessage(xhr.status, xhr.response)))
      }
    }
    xhr.onerror = () => reject(new ApiError(0, errorMessage(0, null)))
    xhr.send(form)
  })
}
