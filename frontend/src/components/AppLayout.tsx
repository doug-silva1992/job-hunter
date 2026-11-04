import Box from '@mui/material/Box'
import { useState } from 'react'
import { Outlet } from 'react-router'
import { initialJobs, type Job, type Stage } from '../data/mock'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

/** Vagas compartilhadas entre Dashboard (kanban) e Vagas (lista), até virem da API. */
export type LayoutContext = {
  jobs: Job[]
  moveJob: (id: number, stage: Stage) => void
}

export function AppLayout() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [mobileOpen, setMobileOpen] = useState(false)

  const moveJob = (id: number, stage: Stage) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, stage } : j)))

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
          <Outlet context={{ jobs, moveJob } satisfies LayoutContext} />
        </Box>
      </Box>
    </Box>
  )
}
