// Formatação dos relatórios de entrevista (notas de 0 a 10 dadas pela avaliação do n8n).

export function scoreColor(score: number) {
  if (score >= 8) return 'success.main'
  if (score >= 6) return 'primary.main'
  if (score >= 4) return 'warning.main'
  return 'error.main'
}

export const formatScore = (score: number) => score.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}
