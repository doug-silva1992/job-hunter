import SearchRounded from '@mui/icons-material/SearchRounded'
import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import type { LayoutContext } from '../components/AppLayout'
import { JobList } from '../components/JobList'

export function JobsPage() {
  const { jobs, moveJob } = useOutletContext<LayoutContext>()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  // filtra pela busca e ordena por aderência
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? jobs.filter((j) => [j.company, j.role, j.location, j.workMode, ...j.tags].some((v) => v.toLowerCase().includes(q)))
      : jobs
    return [...filtered].sort((a, b) => b.match - a.match)
  }, [jobs, search])

  const applyJob = (id: number) => {
    moveJob(id, 'applied')
    const job = jobs.find((j) => j.id === id)
    if (job) setToast(`Candidatura enviada para ${job.company}`)
  }

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Vagas
        </Typography>
        <Typography color="text.secondary">
          Vagas encontradas para o seu perfil, ordenadas por compatibilidade.
        </Typography>
      </Box>

      <TextField
        size="small"
        placeholder="Buscar vagas, empresas ou tecnologias…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 520, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: 999 } }}
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar vagas', type: 'search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <JobList jobs={results} onApply={applyJob} />

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
