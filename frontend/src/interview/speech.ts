// Voz do navegador (Web Speech API): reconhecimento de fala + leitura em voz alta.
// O reconhecimento existe no Chrome, Edge e Safari; no Firefox o usuário digita a resposta.
// O microfone só funciona em contexto seguro (https ou localhost).
import { useCallback, useEffect, useRef, useState } from 'react'

type RecognitionAlternative = { transcript: string }
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative }
type RecognitionEvent = Event & { resultIndex: number; results: ArrayLike<RecognitionResult> }
type RecognitionErrorEvent = Event & { error: string }

type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}
type RecognitionCtor = new () => Recognition

const RecognitionImpl: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)

const LANG = 'pt-BR'

const ERRORS: Record<string, string> = {
  'not-allowed': 'Permita o uso do microfone no navegador para responder por voz.',
  'service-not-allowed': 'Permita o uso do microfone no navegador para responder por voz.',
  'audio-capture': 'Nenhum microfone encontrado.',
  'no-speech': 'Não ouvi nada. Toque no microfone e tente de novo.',
  network: 'O reconhecimento de voz precisa de conexão com a internet.',
}

/** Transcreve a fala; cada trecho final é entregue em `onText`. */
export function useSpeechRecognition(onText: (text: string) => void) {
  const supported = RecognitionImpl !== undefined
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<Recognition | null>(null)
  const onTextRef = useRef(onText)

  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  const stop = useCallback(() => recRef.current?.stop(), [])

  const start = useCallback(() => {
    if (!RecognitionImpl || recRef.current) return
    const rec = new RecognitionImpl()
    rec.lang = LANG
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      let partial = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) onTextRef.current(text.trim())
        else partial += text
      }
      setInterim(partial)
    }
    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'Não foi possível usar o reconhecimento de voz.')
    }
    rec.onend = () => {
      recRef.current = null
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    setError(null)
    setListening(true)
    try {
      rec.start()
    } catch {
      recRef.current = null
      setListening(false)
    }
  }, [])

  useEffect(() => () => recRef.current?.abort(), [])

  return { supported, listening, interim, error, start, stop }
}

/** Lê textos em voz alta, com voz em português quando houver. */
export function useSpeechSynthesis() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  const cancel = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  const speak = useCallback(
    (text: string) => {
      if (!supported) return
      const synth = window.speechSynthesis
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = LANG
      const voices = synth.getVoices()
      utterance.voice = voices.find((v) => v.lang === LANG) ?? voices.find((v) => v.lang.startsWith('pt')) ?? null
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      synth.speak(utterance)
    },
    [supported],
  )

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  return { supported, speaking, speak, cancel }
}
