// Voz do entrevistador: toca o áudio gravado da pergunta quando houver;
// se não houver (ou o arquivo falhar), lê o texto com o sintetizador do navegador (Web Speech API).
import { useCallback, useEffect, useRef, useState } from 'react'

const LANG = 'pt-BR'

/** Fala as perguntas: áudio gravado (`audioUrl`) com fallback para voz sintetizada. */
export function useSpeechSynthesis() {
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const supported = ttsSupported || typeof Audio !== 'undefined'
  const [speaking, setSpeaking] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopAudio = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.onended = audio.onerror = null
    audio.pause()
    audioRef.current = null
  }

  const cancel = useCallback(() => {
    stopAudio()
    if (ttsSupported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [ttsSupported])

  const speakText = useCallback(
    (text: string) => {
      if (!ttsSupported) return setSpeaking(false)
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
    [ttsSupported],
  )

  const speak = useCallback(
    (text: string, audioUrl?: string) => {
      cancel()
      if (!audioUrl) return speakText(text)
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      const fallback = () => {
        if (audioRef.current !== audio) return
        stopAudio()
        speakText(text)
      }
      audio.onended = () => {
        if (audioRef.current === audio) audioRef.current = null
        setSpeaking(false)
      }
      audio.onerror = fallback // arquivo ausente ou inválido
      setSpeaking(true)
      audio.play().catch((e: unknown) => {
        // autoplay bloqueado não é motivo para trocar de voz; arquivo ausente cai no onerror
        if (e instanceof DOMException && e.name === 'NotAllowedError') {
          if (audioRef.current === audio) stopAudio()
          setSpeaking(false)
        } else fallback()
      })
    },
    [cancel, speakText],
  )

  useEffect(
    () => () => {
      stopAudio()
      window.speechSynthesis?.cancel()
    },
    [],
  )

  return { supported, speaking, speak, cancel }
}
