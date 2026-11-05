import CloseRounded from '@mui/icons-material/CloseRounded'
import MicRounded from '@mui/icons-material/MicRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState, type ReactNode } from 'react'
import { postedLabel, safeJobUrl, stages, type Job, type Stage } from '../api/jobs'
import { WORK_MODE_LABELS } from '../api/settings'
import { CompanyAvatar } from './CompanyAvatar'
import { MatchBadge } from './MatchBadge'

type Props = {
  job: Job
  onClose: () => void
  /** Rejeita se a API falhar (o layout já avisa o usuário e desfaz a mudança). */
  onMove: (id: string, stage: Stage) => Promise<void>
  onInterview: (job: Job) => void
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  )
}

export function JobDetailsDialog({ job, onClose, onMove, onInterview }: Props) {
  const [moving, setMoving] = useState(false)
  const url = safeJobUrl(job.link)
  const stage = stages.find((s) => s.id === job.stage)

  const changeStage = async (next: Stage) => {
    setMoving(true)
    try {
      await onMove(job.id, next)
    } catch {
      // o layout já mostrou o erro e desfez a mudança
    } finally {
      setMoving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" scroll="paper" aria-labelledby="job-details-title">
      <Stack direction="row" sx={{ gap: 2, alignItems: 'center', px: 3, pt: 3, pb: 2 }}>
        <CompanyAvatar name={job.company} size={48} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography id="job-details-title" variant="h6" component="h2" sx={{ lineHeight: 1.3 }}>
            {job.role}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {job.company} · {postedLabel(job)}
          </Typography>
        </Box>
        <MatchBadge value={job.match} size={56} />
        <IconButton onClick={onClose} aria-label="Fechar" sx={{ alignSelf: 'flex-start', mt: -1, mr: -1.5 }}>
          <CloseRounded />
        </IconButton>
      </Stack>

      <DialogContent dividers>
        <Stack sx={{ gap: 3 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" component="label" htmlFor="job-stage">
              Etapa no pipeline
            </Typography>
            <Select
              id="job-stage"
              size="small"
              fullWidth
              value={job.stage}
              disabled={moving}
              onChange={(e) => changeStage(e.target.value as Stage)}
              renderValue={() => (
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage?.color }} />
                  {stage?.label}
                </Stack>
              )}
              sx={{ mt: 0.5 }}
            >
              {stages.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, mr: 1 }} />
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box
            component="dl"
            sx={{ m: 0, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}
          >
            <Field label="Empresa">{job.company}</Field>
            <Field label="Cargo">{job.role}</Field>
            <Field label="Localização">{job.location || 'Não informado'}</Field>
            <Field label="Modalidade">{WORK_MODE_LABELS[job.workMode] ?? job.workMode}</Field>
            <Field label="Compatibilidade">{job.match}%</Field>
            <Field label="Publicada em">{job.postedAt ? dateTime.format(new Date(job.postedAt)) : 'Não informado'}</Field>
            <Field label="Encontrada em">{dateTime.format(new Date(job.createdAt))}</Field>
            <Field label="Atualizada em">{dateTime.format(new Date(job.updatedAt))}</Field>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="h3" sx={{ mb: 1 }}>
              Tecnologias e palavras-chave
            </Typography>
            {job.tags.length > 0 ? (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                {job.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Nenhuma informada
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary" component="h3">
              Link da vaga
            </Typography>
            {url ? (
              <Typography
                variant="body2"
                component="a"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'block', color: 'primary.main', overflowWrap: 'anywhere' }}
              >
                {url}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                Não informado
              </Typography>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button startIcon={<MicRounded />} onClick={() => onInterview(job)}>
          Simular entrevista
        </Button>
        {url && (
          <Button
            variant="contained"
            endIcon={<OpenInNewRounded />}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver vaga
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
