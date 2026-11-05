import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router'
import { ApiError } from '../api/client'
import { jobsApi } from '../api/jobs'
import { resumesApi, type Resume } from '../api/resumes'

type Props = {
  open: boolean
  onClose: () => void
  /** Chamado depois que o n8n aceitou o pedido. */
  onSent: (resume: Resume) => void
}

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.'
}

export function GenerateJobsDialog({ open, onClose, onSent }: Props) {
  const [resumes, setResumes] = useState<Resume[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // quem usa passa uma `key` nova a cada abertura, então a lista é recarregada
  // (o usuário pode ter enviado um currículo novo) e o estado começa limpo
  useEffect(() => {
    if (!open) return
    let active = true
    resumesApi
      .list()
      .then((list) => {
        if (!active) return
        setResumes(list)
        // a API devolve o principal primeiro
        setSelected(list[0]?.id ?? '')
      })
      .catch((error: unknown) => active && setLoadError(errorText(error)))
    return () => {
      active = false
    }
  }, [open])

  const send = async () => {
    const resume = resumes?.find((r) => r.id === selected)
    if (!resume) return
    setSending(true)
    setSendError(null)
    try {
      await jobsApi.search(resume.id)
      onSent(resume)
    } catch (error) {
      setSendError(errorText(error))
    } finally {
      setSending(false)
    }
  }

  const close = () => {
    if (!sending) onClose()
  }

  let content
  if (loadError) {
    content = <Alert severity="error">{loadError}</Alert>
  } else if (!resumes) {
    content = (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
        <CircularProgress size={28} aria-label="Carregando currículos" />
      </Box>
    )
  } else if (resumes.length === 0) {
    content = (
      <Alert
        severity="info"
        action={
          <Button component={RouterLink} to="/curriculos" color="inherit" size="small" onClick={onClose}>
            Enviar currículo
          </Button>
        }
      >
        Você ainda não cadastrou nenhum currículo.
      </Alert>
    )
  } else {
    content = (
      <RadioGroup
        aria-label="Currículo"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        sx={{ gap: 1 }}
      >
        {resumes.map((r) => (
          <FormControlLabel
            key={r.id}
            value={r.id}
            disabled={sending}
            control={<Radio />}
            sx={{
              m: 0,
              pr: 1.5,
              border: 1,
              borderRadius: 2,
              borderColor: selected === r.id ? 'primary.main' : 'divider',
              bgcolor: selected === r.id ? 'action.selected' : undefined,
              '& .MuiFormControlLabel-label': { flex: 1, minWidth: 0 },
            }}
            label={
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, py: 1 }}>
                <DescriptionOutlined color="action" />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {r.originalName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Enviado em {dateFormat.format(new Date(r.createdAt))}
                  </Typography>
                </Box>
                {r.isPrimary && <Chip label="Principal" size="small" color="primary" variant="outlined" />}
              </Stack>
            }
          />
        ))}
      </RadioGroup>
    )
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pb: 0.5 }}>Gerar vagas</DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
        Escolha o currículo que será usado para buscar vagas compatíveis com o seu perfil.
      </Typography>
      <DialogContent dividers>
        <Stack sx={{ gap: 2 }}>
          {content}
          {sendError && <Alert severity="error">{sendError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} disabled={sending}>
          Cancelar
        </Button>
        {resumes && resumes.length > 0 && (
          <Button
            variant="contained"
            onClick={send}
            disabled={!selected || sending}
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
