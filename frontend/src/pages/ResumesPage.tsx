import CloseRounded from '@mui/icons-material/CloseRounded'
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import ErrorOutlineRounded from '@mui/icons-material/ErrorOutlineRounded'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined'
import StarOutlineRounded from '@mui/icons-material/StarOutlineRounded'
import StarRounded from '@mui/icons-material/StarRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useCallback, useEffect, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import { resumesApi, type Resume } from '../api/resumes'
import { AtsDialog } from '../components/AtsDialog'

const MAX_SIZE_MB = 5
const ACCEPTED_EXT = ['.pdf', '.doc', '.docx']

type Upload = { key: string; name: string; progress: number; error?: string }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

/** Validação rápida no navegador; o backend valida de novo (inclusive o conteúdo). */
function validate(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EXT.includes(ext)) return `"${file.name}" não é PDF ou Word.`
  if (file.size > MAX_SIZE_MB * 1024 * 1024) return `"${file.name}" passa de ${MAX_SIZE_MB} MB.`
  return null
}

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Não foi possível concluir a operação.'

function FileIcon({ name }: { name: string }) {
  const isPdf = name.toLowerCase().endsWith('.pdf')
  return (
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
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      {children}
    </Box>
  )
}

export function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [invalidFiles, setInvalidFiles] = useState<string[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Resume | null>(null)
  const [evaluating, setEvaluating] = useState<Resume | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setResumes(await resumesApi.list())
      setLoadError(null)
    } catch (err) {
      setLoadError(messageOf(err))
    } finally {
      setLoading(false)
    }
  }, [])

  // carga inicial (ignora a resposta se a página já foi fechada)
  useEffect(() => {
    let active = true
    resumesApi
      .list()
      .then((list) => active && setResumes(list))
      .catch((err: unknown) => active && setLoadError(messageOf(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const patchUpload = (key: string, patch: Partial<Upload>) =>
    setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)))

  async function uploadFile(file: File) {
    const key = crypto.randomUUID()
    setUploads((prev) => [{ key, name: file.name, progress: 0 }, ...prev])
    try {
      await resumesApi.upload(file, (progress) => patchUpload(key, { progress }))
      setUploads((prev) => prev.filter((u) => u.key !== key))
      setToast(`"${file.name}" enviado.`)
      await load() // recarrega para refletir o currículo principal
    } catch (err) {
      patchUpload(key, { error: messageOf(err) })
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const files = Array.from(list)
    setInvalidFiles(files.map(validate).filter((e): e is string => e !== null))
    files.filter((f) => validate(f) === null).forEach((f) => void uploadFile(f))
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function runAction(id: string, action: () => Promise<void>) {
    setBusyId(id)
    try {
      await action()
    } catch (err) {
      setToast(messageOf(err))
    } finally {
      setBusyId(null)
    }
  }

  const makePrimary = (r: Resume) =>
    runAction(r.id, async () => {
      await resumesApi.setPrimary(r.id)
      await load()
      setToast(`"${r.originalName}" agora é o currículo principal.`)
    })

  const download = (r: Resume) =>
    runAction(r.id, async () => {
      const blob = await resumesApi.download(r.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.originalName
      a.click()
      URL.revokeObjectURL(url)
    })

  function confirmDelete() {
    const r = toDelete
    if (!r) return
    setToDelete(null)
    void runAction(r.id, async () => {
      await resumesApi.remove(r.id)
      await load()
      setToast(`"${r.originalName}" removido.`)
    })
  }

  const total = resumes.length

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

      {invalidFiles.length > 0 && (
        <Alert severity="warning" onClose={() => setInvalidFiles([])}>
          {invalidFiles.length === 1 ? (
            invalidFiles[0]
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {invalidFiles.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Card>
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="h2">
            Meus currículos
          </Typography>
          {!loading && !loadError && (
            <Typography variant="body2" color="text.secondary">
              {total} {total === 1 ? 'arquivo' : 'arquivos'}
            </Typography>
          )}
        </Box>
        <Divider />

        {loading ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress size={28} aria-label="Carregando currículos" />
          </Stack>
        ) : loadError ? (
          <Box sx={{ p: 2.5 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void load()}>
                  Tentar novamente
                </Button>
              }
            >
              {loadError}
            </Alert>
          </Box>
        ) : total === 0 && uploads.length === 0 ? (
          <Stack sx={{ alignItems: 'center', py: 6, gap: 1, color: 'text.secondary' }}>
            <DescriptionOutlined />
            <Typography variant="body2">Nenhum currículo enviado ainda.</Typography>
          </Stack>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {uploads.map((u) => (
              <Box key={u.key} component="li" sx={{ borderBottom: 1, borderColor: 'divider', listStyle: 'none' }}>
                <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FileIcon name={u.name} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {u.name}
                    </Typography>
                    {u.error ? (
                      <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', color: 'error.main' }}>
                        <ErrorOutlineRounded sx={{ fontSize: 16 }} />
                        <Typography variant="caption">{u.error}</Typography>
                      </Stack>
                    ) : (
                      <LinearProgress
                        variant="determinate"
                        value={u.progress}
                        aria-label={`Enviando ${u.name}`}
                        sx={{ mt: 1, borderRadius: 999, maxWidth: 280 }}
                      />
                    )}
                  </Box>
                  {u.error && (
                    <Tooltip title="Dispensar">
                      <IconButton
                        aria-label="Dispensar"
                        onClick={() => setUploads((prev) => prev.filter((x) => x.key !== u.key))}
                      >
                        <CloseRounded />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>
            ))}

            {resumes.map((r, i) => {
              const busy = busyId === r.id
              return (
                <Box key={r.id} component="li" sx={{ listStyle: 'none' }}>
                  {i > 0 && <Divider />}
                  <Row>
                    <FileIcon name={r.originalName} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" noWrap>
                          {r.originalName}
                        </Typography>
                        {r.isPrimary && (
                          <Chip label="Principal" size="small" color="primary" sx={{ height: 20, fontSize: 11, flexShrink: 0 }} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {formatSize(r.sizeBytes)} · enviado em {formatDate(r.createdAt)}
                      </Typography>
                    </Box>

                    <Stack direction="row" sx={{ gap: 0.5, flexShrink: 0, alignItems: 'center' }}>
                      {busy && <CircularProgress size={18} sx={{ mr: 1 }} aria-label="Processando" />}
                      {r.isPrimary ? (
                        <Tooltip title="Currículo principal">
                          <Box sx={{ width: 40, height: 40, display: 'grid', placeItems: 'center', color: 'primary.main' }}>
                            <StarRounded aria-label="Currículo principal" />
                          </Box>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Definir como principal">
                          <span>
                            <IconButton
                              aria-label="Definir como principal"
                              onClick={() => void makePrimary(r)}
                              disabled={busy}
                            >
                              <StarOutlineRounded />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={r.ats ? 'Avaliar currículo' : 'Avaliação ainda não disponível'}>
                        <span>
                          <IconButton
                            aria-label="Avaliar currículo"
                            onClick={() => setEvaluating(r)}
                            disabled={busy || !r.ats}
                          >
                            <FactCheckOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Baixar">
                        <span>
                          <IconButton aria-label="Baixar" onClick={() => void download(r)} disabled={busy}>
                            <FileDownloadOutlined />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Remover">
                        <span>
                          <IconButton aria-label="Remover" onClick={() => setToDelete(r)} disabled={busy}>
                            <DeleteOutlineRounded />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </Row>
                </Box>
              )
            })}
          </Box>
        )}
      </Card>

      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle>Remover currículo?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            "{toDelete?.originalName}" será excluído permanentemente.
            {toDelete?.isPrimary && ' Como ele é o principal, o currículo mais recente passa a ser o principal.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Remover
          </Button>
        </DialogActions>
      </Dialog>

      <AtsDialog
        open={evaluating !== null}
        fileName={evaluating?.originalName ?? ''}
        ats={evaluating?.ats ?? null}
        onClose={() => setEvaluating(null)}
      />

      <Snackbar
        open={toast !== null}
        autoHideDuration={3500}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
