import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '../api/client'
import { foundToday, jobsApi, type Job, type Stage } from '../api/jobs'
import { DEFAULT_SETTINGS, visibleJobs } from '../api/preferences'
import type { Settings } from '../api/settings'
import { useAuth } from '../auth/context'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Vagas compartilhadas entre Dashboard (kanban) e Vagas (lista). */
export type LayoutContext = {
  /** Vagas filtradas pelas preferências (as do pipeline, de "Candidatado" em diante, sempre aparecem). */
  jobs: Job[]
  /** Todas as vagas, sem o filtro das preferências. */
  allJobs: Job[]
  /** Vagas "encontradas" escondidas pelas preferências. */
  hiddenCount: number
  /** Preferências do usuário (padrões enquanto não carregam). */
  settings: Settings
  loading: boolean
  error: string | null
  reloadJobs: () => void
  /** Atualiza na tela na hora e grava na API; desfaz e rejeita se a API falhar. */
  moveJob: (id: string, stage: Stage) => Promise<void>
  /** Insere ou substitui a vaga na tela (depois de cadastrar ou reanalisar). */
  saveJob: (job: Job) => void
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Não foi possível concluir a operação.')

export function AppLayout() {
  const { settings: savedSettings } = useAuth()
  const settings = savedSettings ?? DEFAULT_SETTINGS
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const jobsRef = useRef(jobs)
  useEffect(() => {
    jobsRef.current = jobs
  }, [jobs])

  const fetchJobs = useCallback(() => {
    jobsApi
      .list()
      .then(setJobs)
      .catch((e) => setError(message(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(fetchJobs, [fetchJobs])

  const reloadJobs = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchJobs()
  }, [fetchJobs])

  const moveJob = useCallback(async (id: string, stage: Stage) => {
    const previous = jobsRef.current.find((j) => j.id === id)
    if (!previous || previous.stage === stage) return

    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)))
    try {
      const updated = await jobsApi.updateStage(id, stage)
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)))
    } catch (e) {
      // volta para a coluna anterior, a menos que o card já tenha sido movido de novo
      setJobs((prev) => prev.map((j) => (j.id === id && j.stage === stage ? { ...j, stage: previous.stage } : j)))
      setToast(`Não foi possível mover a vaga: ${message(e)}`)
      throw e
    }
  }, [])

  const saveJob = useCallback((job: Job) => {
    setJobs((prev) => (prev.some((j) => j.id === job.id) ? prev.map((j) => (j.id === job.id ? job : j)) : [job, ...prev]))
  }, [])

  const visible = useMemo(() => visibleJobs(jobs, settings), [jobs, settings])
  const newToday = foundToday(visible.filter((j) => j.stage === 'found'))

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header
          onMenuClick={() => setMobileOpen(true)}
          notificationsEnabled={settings.notifyNewJobs}
          newJobs={newToday}
        />
        <Box
          component="main"
          sx={{
            p: { xs: 2, md: 3 },
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignContent: 'start',
            gap: 3,
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet
            context={
              {
                jobs: visible,
                allJobs: jobs,
                hiddenCount: jobs.length - visible.length,
                settings,
                loading,
                error,
                reloadJobs,
                moveJob,
                saveJob,
              } satisfies LayoutContext
            }
          />
        </Box>
      </Box>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
