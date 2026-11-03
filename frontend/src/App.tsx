import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { JobList } from './components/JobList'
import { KanbanBoard } from './components/KanbanBoard'
import { MetricCards } from './components/MetricCards'
import { Sidebar } from './components/Sidebar'
import { currentUser, initialJobs, type Job, type Stage } from './data/mock'

function App() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [search, setSearch] = useState('')
  const [menu, setMenu] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) =>
      [j.company, j.role, j.location, ...j.tags].some((v) => v.toLowerCase().includes(q)),
    )
  }, [jobs, search])

  const recommended = useMemo(
    () => [...filtered].sort((a, b) => b.match - a.match),
    [filtered],
  )

  const moveJob = (id: number, stage: Stage) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)))

  const applyJob = (id: number) => {
    moveJob(id, 'applied')
    const job = jobs.find((j) => j.id === id)
    if (job) setToast(`Candidatura enviada para ${job.company}`)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        selected={menu}
        onSelect={setMenu}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header search={search} onSearchChange={setSearch} onMenuClick={() => setMobileOpen(true)} />

        <Box component="main" sx={{
            p: { xs: 2, md: 3 },
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            gap: 3,
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}>
          <Box>
            <Typography variant="h5" component="h1">
              Olá, {currentUser.name.split(' ')[0]} 👋
            </Typography>
            <Typography color="text.secondary">
              Aqui está um resumo da sua busca por vagas hoje.
            </Typography>
          </Box>

          <MetricCards jobs={jobs} />
          <JobList jobs={recommended} onApply={applyJob} />
          <KanbanBoard jobs={filtered} onMove={moveJob} />
        </Box>
      </Box>

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

export default App
