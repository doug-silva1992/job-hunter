import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import { displayName, useAuth } from '../auth/context'
import type { LayoutContext } from '../components/AppLayout'
import { JobList } from '../components/JobList'
import { KanbanBoard } from '../components/KanbanBoard'
import { MetricCards } from '../components/MetricCards'
import { initialJobs, type Job, type Stage } from '../data/mock'

export function DashboardPage() {
  const { search } = useOutletContext<LayoutContext>()
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) =>
      [j.company, j.role, j.location, ...j.tags].some((v) => v.toLowerCase().includes(q)),
    )
  }, [jobs, search])

  const recommended = useMemo(() => [...filtered].sort((a, b) => b.match - a.match), [filtered])

  const moveJob = (id: number, stage: Stage) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)))

  const applyJob = (id: number) => {
    moveJob(id, 'applied')
    const job = jobs.find((j) => j.id === id)
    if (job) setToast(`Candidatura enviada para ${job.company}`)
  }

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Olá, {displayName(user)} 👋
        </Typography>
        <Typography color="text.secondary">Aqui está um resumo da sua busca por vagas hoje.</Typography>
      </Box>

      <MetricCards jobs={jobs} />
      <JobList jobs={recommended} onApply={applyJob} />
      <KanbanBoard jobs={filtered} onMove={moveJob} />

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
