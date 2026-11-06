import type { Job } from '../api/jobs'

export type InterviewRole = 'interviewer' | 'candidate'
/** Na resposta do candidato, `text` é só um marcador: a resposta é o áudio gravado. */
export type InterviewMessage = { role: InterviewRole; text: string }

/** Próxima fala do entrevistador; `done` encerra a simulação. `audioUrl` é o áudio gravado da fala, se houver. */
export type InterviewTurn = { message: string; done: boolean; audioUrl?: string }

/**
 * Contrato do entrevistador: recebe a vaga e o histórico completo e devolve a próxima fala.
 * É stateless de propósito, para poder ser trocado por uma chamada à API (ex.: POST /api/jobs/:id/interview).
 */
export type Interviewer = (job: Job, history: InterviewMessage[]) => Promise<InterviewTurn>

/**
 * Áudios das perguntas: frontend/public/audio/entrevista/Pergunta N.mp3
 * (servidos em /audio/entrevista/). Se o arquivo não existir, o texto é lido pela voz do navegador.
 */
const AUDIO_DIR = `${import.meta.env.BASE_URL}audio/entrevista/`
const questionAudio = (n: number) => AUDIO_DIR + encodeURIComponent(`Pergunta ${n}.mp3`)
const CLOSING_AUDIO = AUDIO_DIR + encodeURIComponent('Finalizacao.mp3')

export const QUESTIONS: { text: string; audioUrl: string }[] = [
  'Fale um pouco sobre você e sua trajetória profissional.',
  'Quais são seus principais pontos fortes e como eles contribuem para o seu trabalho?',
  'Conte sobre um desafio que você enfrentou profissionalmente e como o resolveu.',
  'Por que você tem interesse nesta vaga e o que espera alcançar na empresa?',
].map((text, i) => ({ text, audioUrl: questionAudio(i + 1) }))

/** Fala de encerramento (também usada quando o candidato finaliza antes da última pergunta). */
export function closingTurn(history: InterviewMessage[]): InterviewTurn {
  const answers = history.filter((m) => m.role === 'candidate').length
  const message = `Obrigado pela conversa! Encerramos a simulação com ${answers} ${answers === 1 ? 'resposta gravada' : 'respostas gravadas'}.`
  return { message, audioUrl: CLOSING_AUDIO, done: true }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** PROVISÓRIO: roteiro fixo de perguntas (com áudio gravado), enquanto o entrevistador com IA não fica pronto. */
export const scriptedInterviewer: Interviewer = async (_job, history) => {
  await pause(600)
  const asked = history.filter((m) => m.role === 'interviewer').length
  if (asked >= QUESTIONS.length) return closingTurn(history)
  const q = QUESTIONS[asked]
  return { message: q.text, audioUrl: q.audioUrl, done: false }
}

/** Troque aqui pelo entrevistador com IA quando ele estiver pronto. */
export const interviewer: Interviewer = scriptedInterviewer
