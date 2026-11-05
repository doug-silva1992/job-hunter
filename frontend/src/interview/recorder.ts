// Gravação de áudio pelo microfone (MediaRecorder). Só funciona em https ou localhost.
import { useCallback, useEffect, useRef, useState } from 'react'

export type Take = { blob: Blob; url: string; durationMs: number }

// Chrome/Edge/Firefox gravam WebM/Opus; Safari grava MP4/AAC.
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

function errorMessage(error: unknown): string {
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Permita o uso do microfone no navegador para gravar a resposta.'
  if (name === 'NotFoundError') return 'Nenhum microfone encontrado.'
  if (name === 'NotReadableError') return 'O microfone está sendo usado por outro aplicativo.'
  return 'Não foi possível acessar o microfone.'
}

export function recorderSupport(): string | null {
  if (typeof window === 'undefined') return 'Gravação indisponível.'
  if (!window.isSecureContext) return 'A gravação de áudio só funciona em https ou localhost.'
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
    return 'Este navegador não grava áudio. Use uma versão recente do Chrome, Edge, Firefox ou Safari.'
  return null
}

/** Grava até `maxMs`; ao parar, entrega a gravação em `onTake`. */
export function useAudioRecorder(maxMs: number, onTake: (take: Take) => void) {
  const unsupported = recorderSupport()
  const [status, setStatus] = useState<'idle' | 'requesting' | 'recording'>('idle')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | undefined>(undefined)
  const discardRef = useRef(false)
  const onTakeRef = useRef(onTake)

  useEffect(() => {
    onTakeRef.current = onTake
  }, [onTake])

  const release = useCallback(() => {
    window.clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (unsupported || recorderRef.current) return
    setError(null)
    setElapsedMs(0)
    setStatus('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch (e) {
      setError(errorMessage(e))
      setStatus('idle')
      return
    }

    const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64_000 })
    const chunks: Blob[] = []
    const startedAt = Date.now()
    discardRef.current = false

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAt
      release()
      setStatus('idle')
      if (discardRef.current || chunks.length === 0) return
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' })
      onTakeRef.current({ blob, url: URL.createObjectURL(blob), durationMs })
    }

    streamRef.current = stream
    recorderRef.current = recorder
    recorder.start(1000)
    setStatus('recording')
    timerRef.current = window.setInterval(() => {
      const ms = Date.now() - startedAt
      setElapsedMs(ms)
      if (ms >= maxMs && recorder.state !== 'inactive') recorder.stop()
    }, 250)
  }, [maxMs, release, unsupported])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  /** Para sem entregar a gravação. */
  const cancel = useCallback(() => {
    discardRef.current = true
    stop()
  }, [stop])

  useEffect(
    () => () => {
      discardRef.current = true
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') recorder.stop()
      release()
    },
    [release],
  )

  return { unsupported, status, elapsedMs, error, start, stop, cancel }
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
