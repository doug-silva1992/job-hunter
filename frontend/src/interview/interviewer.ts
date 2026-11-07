export type InterviewRole = 'interviewer' | 'candidate'
/** Na resposta do candidato, `text` é só um marcador: a resposta é o áudio gravado. */
export type InterviewMessage = { role: InterviewRole; text: string }

/** Próxima fala do entrevistador; `done` encerra a simulação. `audioUrl` é o áudio gravado da fala, se houver. */
export type InterviewTurn = { message: string; done: boolean; audioUrl?: string }

/**
 * Contrato do entrevistador: recebe o histórico completo e devolve a próxima fala.
 * É stateless de propósito, para poder ser trocado por uma chamada à API.
 */
export type Interviewer = (history: InterviewMessage[]) => Promise<InterviewTurn>

/** Pergunta do roteiro; sem `audioUrl`, o texto é lido pela voz do navegador. */
export type ScriptQuestion = { text: string; audioUrl?: string }

/**
 * Áudios das perguntas: frontend/public/audio/entrevista/Pergunta N.mp3
 * (servidos em /audio/entrevista/). Se o arquivo não existir, o texto é lido pela voz do navegador.
 */
const AUDIO_DIR = `${import.meta.env.BASE_URL}audio/entrevista/`
const questionAudio = (n: number) => AUDIO_DIR + encodeURIComponent(`Pergunta ${n}.mp3`)
export const CLOSING_AUDIO = AUDIO_DIR + encodeURIComponent('Finalizacao.mp3')

/** Roteiro da "Simulação de entrevista" (o fluxo do n8n avalia exatamente estas 4 perguntas). */
export const QUESTIONS: { text: string; audioUrl: string }[] = [
  'Fale um pouco sobre você e sua trajetória profissional.',
  'Quais são seus principais pontos fortes e como eles contribuem para o seu trabalho?',
  'Conte sobre um desafio que você enfrentou profissionalmente e como o resolveu.',
  'Por que você tem interesse nesta vaga e o que espera alcançar na empresa?',
].map((text, i) => ({ text, audioUrl: questionAudio(i + 1) }))

/** Fala de encerramento (também usada quando o candidato finaliza antes da última pergunta). */
export function closingTurn(history: InterviewMessage[], audioUrl?: string): InterviewTurn {
  const answers = history.filter((m) => m.role === 'candidate').length
  const message = `Obrigado pela conversa! Encerramos a entrevista com ${answers} ${answers === 1 ? 'resposta gravada' : 'respostas gravadas'}.`
  return { message, audioUrl, done: true }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Entrevistador de roteiro fixo: faz as perguntas na ordem e encerra depois da última. */
export function scriptedInterviewer(questions: ScriptQuestion[], closingAudio?: string): Interviewer {
  return async (history) => {
    await pause(600)
    const asked = history.filter((m) => m.role === 'interviewer').length
    if (asked >= questions.length) return closingTurn(history, closingAudio)
    const q = questions[asked]
    return { message: q.text, audioUrl: q.audioUrl, done: false }
  }
}
