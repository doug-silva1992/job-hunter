// Leitura das perguntas em voz alta (Web Speech API, sintetizador do navegador).
import { useCallback, useEffect, useState } from 'react'

const LANG = 'pt-BR'

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
