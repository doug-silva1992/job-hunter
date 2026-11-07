import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { ApiError } from '../api/client'
import { interviewsApi, type InterviewReport, type TechnicalInterviewResult } from '../api/interviews'

/** Igual ao limite do backend (TechnicalInterviewRequestDto). */
const MAX_LENGTH = 10_000

/** Texto inicial: vaga e pontos que a avaliação pediu para aprofundar. O usuário edita à vontade. */
function initialText(report: InterviewReport): string {
  return [
    report.cargo && `Vaga: ${report.cargo}${report.company ? ` · ${report.company}` : ''}`,
    report.requisitos && `Requisitos: ${report.requisitos}`,
    report.recomendacao && `Focar em: ${report.recomendacao}`,
  ]
    .filter(Boolean)
    .join('\n')
}

type Props = {
  report: InterviewReport
  onClose: () => void
  /** Chamado quando o n8n devolve as perguntas (a página recarrega o relatório). */
  onGenerated?: () => void
}

/**
 * Modal "Gerar entrevista técnica": o texto vai no campo `descricao` do webhook technical_interview
 * do n8n (via POST /api/interviews/:id/technical), que devolve as perguntas geradas.
 * Montar só quando aberta.
 */
export function TechInterviewDialog({ report, onClose, onGenerated }: Props) {
  const [text, setText] = useState(() => initialText(report))
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<TechnicalInterviewResult | null>(null)

  const trimmed = text.trim()

  async function send() {
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    try {
      setResult(await interviewsApi.requestTechnical(report.id, trimmed))
      onGenerated?.()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível gerar a entrevista técnica.')
    } finally {
      setSending(false)
    }
  }

  const questions = (result?.perguntas ?? []).map((p) => p.pergunta).filter((q): q is string => !!q)

  return (
    <Dialog open onClose={sending ? undefined : onClose} fullWidth maxWidth="sm" scroll="paper" aria-labelledby="tech-interview-title">
      <DialogTitle id="tech-interview-title">Gerar entrevista técnica</DialogTitle>

      {result ? (
        <>
          <DialogContent dividers>
            <Alert icon={<CheckCircleRounded />} severity="success" sx={{ mb: 2 }}>
              Entrevista técnica gerada{questions.length ? ` com ${questions.length} perguntas` : ''}.
            </Alert>
            {(result.cargo || result.nivel) && (
              <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {result.cargo && <Chip size="small" label={result.cargo} />}
                {result.nivel && <Chip size="small" color="primary" variant="outlined" label={`Nível: ${result.nivel}`} />}
              </Stack>
            )}
            <Box component="ol" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 1.5 }}>
              {questions.map((q, i) => (
                <Typography component="li" variant="body2" key={i}>
                  {q}
                </Typography>
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="contained" onClick={onClose}>
              Fechar
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Descreva a vaga e o que a entrevista técnica deve cobrir: responsabilidades, requisitos, tecnologias e
              nível. Quanto mais completa a descrição, melhores as perguntas.
            </DialogContentText>
            <TextField
              autoFocus
              multiline
              fullWidth
              minRows={6}
              maxRows={14}
              label="Descrição"
              placeholder="Cole aqui a descrição da vaga ou escreva o que quer treinar."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void send()
              }}
              disabled={sending}
              helperText={`${text.length}/${MAX_LENGTH} · Ctrl+Enter para enviar`}
            />
            {sending && (
              <Stack direction="row" sx={{ mt: 2, gap: 1, alignItems: 'center', color: 'text.secondary' }}>
                <CircularProgress size={14} />
                <Typography variant="caption">Gerando as perguntas… isso pode levar até um minuto.</Typography>
              </Stack>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={sending}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendRounded />}
              onClick={() => void send()}
              disabled={!trimmed || sending}
            >
              {sending ? 'Enviando…' : 'Enviar'}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
