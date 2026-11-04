import type { Job } from '../api/jobs'

export type InterviewRole = 'interviewer' | 'candidate'
export type InterviewMessage = { role: InterviewRole; text: string }

/** Próxima fala do entrevistador; `done` encerra a simulação. */
export type InterviewTurn = { message: string; done: boolean }

/**
 * Contrato do entrevistador: recebe a vaga e o histórico completo e devolve a próxima fala.
 * É stateless de propósito, para poder ser trocado por uma chamada à API (ex.: POST /api/jobs/:id/interview).
 */
export type Interviewer = (job: Job, history: InterviewMessage[]) => Promise<InterviewTurn>

const ACKS = ['Entendi, obrigado.', 'Ótimo, obrigado por compartilhar.', 'Certo.', 'Interessante.']

function workModeQuestion(job: Job): string {
  switch (job.workMode) {
    case 'remote':
      return 'A vaga é remota. Como você organiza sua rotina e a comunicação com o time trabalhando à distância?'
    case 'hybrid':
      return `O modelo é híbrido, com alguns dias presenciais em ${job.location}. Isso funciona para você?`
    case 'onsite':
      return `A vaga é presencial em ${job.location}. Como fica a sua disponibilidade para trabalhar lá?`
  }
}

function questions(job: Job): string[] {
  return [
    `Olá! Obrigado pelo interesse na vaga de ${job.role} na ${job.company}. Para começar, me conte um pouco sobre você e a sua trajetória profissional.`,
    `O que te atraiu nesta vaga e na ${job.company}?`,
    ...job.tags
      .slice(0, 3)
      .map((t) => `Como tem sido a sua experiência com ${t}? Conte sobre um projeto em que você usou essa tecnologia.`),
    'Fale de um desafio difícil que você enfrentou no trabalho. Qual era a situação, o que você fez e qual foi o resultado?',
    workModeQuestion(job),
    'Para terminar: você tem alguma pergunta sobre a vaga ou sobre a empresa?',
  ]
}

function closing(history: InterviewMessage[]): string {
  const answers = history.filter((m) => m.role === 'candidate')
  const words = answers.reduce((sum, m) => sum + m.text.split(/\s+/).filter(Boolean).length, 0)
  const avg = answers.length ? Math.round(words / answers.length) : 0
  const tip =
    avg < 25
      ? 'Suas respostas foram curtas. Tente o método STAR (Situação, Tarefa, Ação e Resultado) e dê exemplos concretos.'
      : 'Bom nível de detalhe! Para refinar, inclua números e resultados mensuráveis sempre que puder.'
  return `Obrigado pela conversa! Encerramos a simulação. Você respondeu ${answers.length} perguntas, com média de ${avg} palavras por resposta. ${tip}`
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** PROVISÓRIO: roteiro fixo montado a partir da vaga, enquanto o entrevistador com IA não fica pronto. */
export const scriptedInterviewer: Interviewer = async (job, history) => {
  await pause(600)
  const list = questions(job)
  const asked = history.filter((m) => m.role === 'interviewer').length
  if (asked >= list.length) return { message: closing(history), done: true }
  const ack = asked > 0 ? `${ACKS[(asked - 1) % ACKS.length]} ` : ''
  return { message: ack + list[asked], done: false }
}

/** Troque aqui pelo entrevistador com IA quando ele estiver pronto. */
export const interviewer: Interviewer = scriptedInterviewer
