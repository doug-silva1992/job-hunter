import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '../api/client'
import { jobsApi, type Job, type Stage } from '../api/jobs'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Vagas compartilhadas entre Dashboard (kanban) e Vagas (lista). */
export type LayoutContext = {
  jobs: Job[]
  loading: boolean
  error: string | null
  reloadJobs: () => void
  /** Atualiza na tela na hora e grava na API; desfaz e rejeita se a API falhar. */
  moveJob: (id: string, stage: Stage) => Promise<void>
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Não foi possível concluir a operação.')

export function AppLayout() {
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header onMenuClick={() => setMobileOpen(true)} />
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
          <Outlet context={{ jobs, loading, error, reloadJobs, moveJob } satisfies LayoutContext} />
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
