import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type FormEvent } from 'react'
import { Link as RouterLink } from 'react-router'
import { ApiError } from '../api/client'
import { jobsApi, type ManualJobResult } from '../api/jobs'
import { resumesApi, type Resume } from '../api/resumes'
import { WORK_MODE_LABELS, type WorkMode } from '../api/settings'
import { TagInput } from './settings/TagInput'

type Props = {
  open: boolean
  onClose: () => void
  /** Vaga salva (com ou sem a análise de ATS). */
  onCreated: (result: ManualJobResult) => void
}

const MIN_DESCRIPTION = 30
const MAX_DESCRIPTION = 20000

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Não foi possível concluir a operação.'
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Cadastro manual de vaga. Ao salvar, o backend compara a descrição com o currículo escolhido
 * (fluxo de ATS do n8n) e a nota vira a compatibilidade da vaga.
 */
export function AddJobDialog({ open, onClose, onCreated }: Props) {
  const [resumes, setResumes] = useState<Resume[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('remote')
  const [link, setLink] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [resumeId, setResumeId] = useState('')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // quem usa passa uma `key` nova a cada abertura: o formulário começa limpo e a lista é recarregada
  useEffect(() => {
    if (!open) return
    let active = true
    resumesApi
      .list()
      .then((list) => {
        if (!active) return
        setResumes(list)
        setResumeId(list[0]?.id ?? '') // a API devolve o principal primeiro
      })
      .catch((error: unknown) => active && setLoadError(errorText(error)))
    return () => {
      active = false
    }
  }, [open])

  const descriptionLength = description.trim().length
  const errors = {
    company: !company.trim() ? 'Informe a empresa.' : null,
    role: !role.trim() ? 'Informe o cargo.' : null,
    link: link.trim() && !isHttpUrl(link.trim()) ? 'Use um endereço que comece com http:// ou https://.' : null,
    description:
      descriptionLength < MIN_DESCRIPTION
        ? `Cole a descrição da vaga (mínimo de ${MIN_DESCRIPTION} caracteres).`
        : descriptionLength > MAX_DESCRIPTION
          ? `A descrição passa de ${MAX_DESCRIPTION} caracteres.`
          : null,
    resumeId: !resumeId ? 'Escolha um currículo.' : null,
  }
  const valid = Object.values(errors).every((e) => e === null)
  const show = (field: keyof typeof errors) => (touched ? errors[field] : null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const result = await jobsApi.createManual({
        company: company.trim(),
        role: role.trim(),
        location: location.trim(),
        workMode,
        link: link.trim() || undefined,
        tags: tags.map((t) => t.slice(0, 40)),
        description: description.trim(),
        resumeId,
      })
      onCreated(result)
    } catch (error) {
      setSaveError(errorText(error))
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    if (!saving) onClose()
  }

  const noResumes = resumes !== null && resumes.length === 0

  return (
    <Dialog
      open={open}
      onClose={close}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ pb: 0.5 }}>Adicionar vaga</DialogTitle>
      <Typography variant="body2" color="text.secondary" sx={{ px: 3, pb: 2 }}>
        Cadastre uma vaga que você encontrou. A descrição é comparada com o currículo escolhido para calcular a
        compatibilidade com ATS.
      </Typography>

      <DialogContent dividers>
        {loadError ? (
          <Alert severity="error">{loadError}</Alert>
        ) : !resumes ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
            <CircularProgress size={28} aria-label="Carregando currículos" />
          </Box>
        ) : noResumes ? (
          <Alert
            severity="info"
            action={
              <Button component={RouterLink} to="/curriculos" color="inherit" size="small" onClick={onClose}>
                Enviar currículo
              </Button>
            }
          >
            Envie um currículo antes de adicionar vagas: ele é usado na análise de ATS.
          </Alert>
        ) : (
          <Stack component="form" id="add-job-form" onSubmit={submit} noValidate sx={{ gap: 2 }}>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
              <TextField
                label="Empresa"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                error={!!show('company')}
                helperText={show('company')}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                disabled={saving}
                autoFocus
              />
              <TextField
                label="Cargo"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                error={!!show('role')}
                helperText={show('role')}
                slotProps={{ htmlInput: { maxLength: 160 } }}
                disabled={saving}
              />
              <TextField
                label="Localização"
                placeholder="São Paulo, SP"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 120 } }}
                disabled={saving}
              />
              <TextField
                select
                label="Modalidade"
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                disabled={saving}
              >
                {(Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => (
                  <MenuItem key={mode} value={mode}>
                    {WORK_MODE_LABELS[mode]}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <TextField
              label="Link da vaga"
              placeholder="https://"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              error={!!show('link')}
              helperText={show('link')}
              slotProps={{ htmlInput: { maxLength: 2048 } }}
              disabled={saving}
            />

            <Box>
              <Typography variant="caption" color="text.secondary" component="label" htmlFor="job-tags">
                Tecnologias e palavras-chave (opcional)
              </Typography>
              <TagInput id="job-tags" value={tags} onChange={setTags} max={20} placeholder="Digite e pressione Enter" />
            </Box>

            <TextField
              label="Descrição da vaga"
              required
              multiline
              minRows={8}
              maxRows={16}
              placeholder="Cole aqui a descrição completa: responsabilidades, requisitos, diferenciais…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              error={!!show('description')}
              helperText={show('description') ?? `${descriptionLength.toLocaleString('pt-BR')} caracteres`}
              disabled={saving}
            />

            <TextField
              select
              label="Currículo para comparar"
              required
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              error={!!show('resumeId')}
              helperText={show('resumeId')}
              disabled={saving}
            >
              {resumes.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.originalName}
                  {r.isPrimary ? ' (principal)' : ''}
                </MenuItem>
              ))}
            </TextField>

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} disabled={saving}>
          Cancelar
        </Button>
        {resumes && !noResumes && (
          <Button
            type="submit"
            form="add-job-form"
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {saving ? 'Analisando ATS…' : 'Salvar e analisar'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
