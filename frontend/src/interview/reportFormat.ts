// Formatação dos relatórios de entrevista (notas de 0 a 10 dadas pela avaliação do n8n).

/** Como interpretar a nota geral (mostrado na tela Entrevistas). */
export const SCORE_BANDS = [
  { range: 'Abaixo de 5/10', text: 'Reprovação quase certa.', color: 'error.main' },
  { range: '6/10 a 7/10', text: 'Pode passar para próximas etapas, dependendo da concorrência.', color: 'primary.main' },
  { range: '8/10', text: 'Geralmente considerado um candidato forte.', color: 'success.main' },
  { range: '9/10 ou mais', text: 'Perfil que costuma receber proposta ou avançar rapidamente.', color: 'success.dark' },
] as const

export function scoreColor(score: number) {
  if (score >= 9) return 'success.dark'
  if (score >= 8) return 'success.main'
  if (score >= 6) return 'primary.main'
  if (score >= 5) return 'warning.main' // entre "abaixo de 5" e "6 a 7"
  return 'error.main'
}

/** Interpretação curta da nota, seguindo SCORE_BANDS. */
export function scoreLevel(score: number) {
  if (score >= 9) return 'Costuma receber proposta'
  if (score >= 8) return 'Candidato forte'
  if (score >= 6) return 'Pode avançar, dependendo da concorrência'
  if (score >= 5) return 'No limite: precisa melhorar'
  return 'Reprovação quase certa'
}

export const formatScore = (score: number) => score.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
