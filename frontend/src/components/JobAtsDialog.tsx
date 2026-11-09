import RefreshRounded from '@mui/icons-material/RefreshRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Collapse from '@mui/material/Collapse'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { jobsApi, type Job } from '../api/jobs'
import { resumesApi, type Resume } from '../api/resumes'
import { AtsReport } from './AtsDialog'

type Props = {
  job: Job
  /** Erro da última análise (ex.: devolvido no cadastro manual). */
  initialError?: string | null
  onClose: () => void
  /** Chamado com a vaga atualizada depois de uma nova análise. */
  onUpdated: (job: Job) => void
}

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.'
}

/** Análise de ATS da vaga x currículo, com opção de refazer (inclusive com outro currículo). */
export function JobAtsDialog({ job, initialError = null, onClose, onUpdated }: Props) {
  const [resumes, setResumes] = useState<Resume[] | null>(null)
  const [resumeId, setResumeId] = useState(job.resumeId ?? '')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [showDescription, setShowDescription] = useState(false)

  useEffect(() => {
    let active = true
    resumesApi
      .list()
      .then((list) => {
        if (!active) return
        setResumes(list)
        // currículo da última análise; se foi apagado, o principal
        setResumeId((current) => (list.some((r) => r.id === current) ? current : (list[0]?.id ?? '')))
      })
      .catch(() => active && setResumes([]))
    return () => {
      active = false
    }
  }, [])

  const analyze = async () => {
    if (!resumeId) return
    setAnalyzing(true)
    setError(null)
    try {
      onUpdated(await jobsApi.analyze(job.id, resumeId))
    } catch (e) {
      setError(errorText(e))
    } finally {
      setAnalyzing(false)
    }
  }

  const resumeName = resumes?.find((r) => r.id === job.resumeId)?.originalName
  const canAnalyze = !!job.description

  return (
    <Dialog open onClose={analyzing ? undefined : onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pb: 0.5 }}>ATS da vaga</DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
        {job.role} · {job.company}
        {job.ats && resumeName ? ` — comparada com "${resumeName}"` : ''}
      </Typography>

      <DialogContent dividers>
        <Stack sx={{ gap: 3 }}>
          {error && (
            <Alert severity="warning">
              {job.ats ? 'A nova análise falhou: ' : 'A vaga foi salva, mas a análise de ATS falhou: '}
              {error}
            </Alert>
          )}

          {analyzing ? (
            <Stack sx={{ alignItems: 'center', py: 4, gap: 1.5 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary">
                Comparando a vaga com o currículo…
              </Typography>
            </Stack>
          ) : job.ats ? (
            <AtsReport ats={job.ats} scoreLabel="Compatibilidade da vaga com o currículo" />
          ) : (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {canAnalyze
                ? 'Esta vaga ainda não foi analisada.'
                : 'Esta vaga não tem descrição, então não pode ser comparada com um currículo.'}
            </Typography>
          )}

          {job.description && (
            <Box>
              <Button size="small" onClick={() => setShowDescription((v) => !v)} sx={{ ml: -1 }}>
                {showDescription ? 'Ocultar descrição da vaga' : 'Ver descrição da vaga'}
              </Button>
              <Collapse in={showDescription}>
                <Typography
                  variant="body2"
                  sx={{ mt: 1, whiteSpace: 'pre-wrap', bgcolor: 'background.default', p: 2, borderRadius: 2 }}
                >
                  {job.description}
                </Typography>
              </Collapse>
            </Box>
          )}

          {canAnalyze && resumes && resumes.length > 0 && (
            <TextField
              select
              size="small"
              label="Currículo para comparar"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              disabled={analyzing}
            >
              {resumes.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.originalName}
                  {r.isPrimary ? ' (principal)' : ''}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={analyzing}>
          Fechar
        </Button>
        {canAnalyze && (
          <Button
            variant="contained"
            startIcon={<RefreshRounded />}
            onClick={analyze}
            disabled={analyzing || !resumeId}
          >
            {job.ats ? 'Reanalisar' : 'Analisar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
