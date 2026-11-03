import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined'
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded'
import StarRounded from '@mui/icons-material/StarRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'

const MAX_SIZE_MB = 5
const ACCEPTED_EXT = ['.pdf', '.doc', '.docx']

type Resume = {
  id: string
  file: File
  uploadedAt: Date
  progress: number // 0–100
  primary: boolean
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function validate(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EXT.includes(ext)) return `"${file.name}" não é PDF ou Word.`
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return `"${file.name}" passa de ${MAX_SIZE_MB} MB.`
  return null
}

export function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearInterval), [])

  // Upload simulado: o progresso avança localmente até existir um endpoint no backend.
  function simulateUpload(id: string) {
    const timer = window.setInterval(() => {
      setResumes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, progress: Math.min(100, r.progress + 20) } : r)),
      )
    }, 200)
    timers.current.push(timer)
    window.setTimeout(() => clearInterval(timer), 1100)
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const files = Array.from(list)
    const problems = files.map(validate).filter((e): e is string => e !== null)
    const valid = files.filter((f) => validate(f) === null)
    setErrors(problems)

    const added = valid.map((file) => ({
      id: crypto.randomUUID(),
      file,
      uploadedAt: new Date(),
      progress: 0,
      primary: false,
    }))
    setResumes((prev) => {
      const next = [...added, ...prev]
      // o primeiro currículo enviado vira o principal automaticamente
      if (next.length && !next.some((r) => r.primary)) {
        const last = next.length - 1
        next[last] = { ...next[last], primary: true }
      }
      return next
    })
    added.forEach((r) => simulateUpload(r.id))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  function remove(id: string) {
    setResumes((prev) => {
      const next = prev.filter((r) => r.id !== id)
      if (next.length && !next.some((r) => r.primary)) next[0] = { ...next[0], primary: true }
      return next
    })
  }

  function makePrimary(id: string) {
    setResumes((prev) => prev.map((r) => ({ ...r, primary: r.id === id })))
  }

  function download(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Currículos
        </Typography>
        <Typography color="text.secondary">
          Envie suas versões de currículo. O Job Hunter sugere a mais adequada para cada vaga.
        </Typography>
      </Box>

      <Card
        component="section"
        aria-label="Enviar currículo"
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={(theme) => ({
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
          transition: 'border-color .15s, background-color .15s',
        })}
      >
        <Box
          sx={(theme) => ({
            width: 56,
            height: 56,
            borderRadius: '50%',
            mx: 'auto',
            mb: 2,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          })}
        >
          <CloudUploadOutlined />
        </Box>
        <Typography variant="subtitle1">Arraste e solte seu currículo aqui</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          PDF, DOC ou DOCX · até {MAX_SIZE_MB} MB
        </Typography>
        <Button variant="contained" onClick={() => inputRef.current?.click()}>
          Selecionar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept={ACCEPTED_EXT.join(',')}
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </Card>

      {errors.length > 0 && (
        <Alert severity="warning" onClose={() => setErrors([])}>
          {errors.length === 1 ? errors[0] : (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {errors.map((e) => <li key={e}>{e}</li>)}
            </Box>
          )}
        </Alert>
      )}

      <Card>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Meus currículos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {resumes.length} {resumes.length === 1 ? 'arquivo' : 'arquivos'}
          </Typography>
        </Box>
        <Divider />

        {resumes.length === 0 ? (
          <Stack sx={{ alignItems: 'center', py: 6, gap: 1, color: 'text.secondary' }}>
            <DescriptionOutlined />
            <Typography variant="body2">Nenhum currículo enviado ainda.</Typography>
          </Stack>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {resumes.map((r, i) => {
              const isPdf = r.file.name.toLowerCase().endsWith('.pdf')
              const uploading = r.progress < 100
              return (
                <Fragment key={r.id}>
                  {i > 0 && <Divider component="li" aria-hidden />}
                  <Box component="li" sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        color: isPdf ? '#C9372C' : 'primary.main',
                        bgcolor: isPdf ? '#C9372C14' : '#0A66C214',
                      }}
                    >
                      {isPdf ? <PictureAsPdfOutlined /> : <DescriptionOutlined />}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {r.file.name}
                        </Typography>
                        {r.primary && <Chip label="Principal" size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />}
                      </Stack>
                      {uploading ? (
                        <LinearProgress variant="determinate" value={r.progress} sx={{ mt: 1, borderRadius: 999, maxWidth: 280 }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {formatSize(r.file.size)} · enviado em{' '}
                          {r.uploadedAt.toLocaleDateString('pt-BR')} às{' '}
                          {r.uploadedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0 }}>
                      <Tooltip title={r.primary ? 'Currículo principal' : 'Definir como principal'}>
                        <span>
                          <IconButton
                            aria-label="Definir como principal"
                            onClick={() => makePrimary(r.id)}
                            disabled={uploading || r.primary}
                            color={r.primary ? 'primary' : 'default'}
                          >
                            {r.primary ? <StarRounded /> : <StarOutlineRounded />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Baixar">
                        <span>
                          <IconButton aria-label="Baixar" onClick={() => download(r.file)} disabled={uploading}>
                            <FileDownloadOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <IconButton aria-label="Remover" onClick={() => remove(r.id)}>
                          <DeleteOutlineRounded />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Fragment>
              )
            })}
          </Box>
        )}
      </Card>
    </>
  )
}
