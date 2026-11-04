import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import { matchesSearch, paginate } from '../api/jobs'
import type { LayoutContext } from '../components/AppLayout'
import { JobList } from '../components/JobList'
import { JobsStatus } from '../components/JobsStatus'
import { SearchField } from '../components/SearchField'
import { paginationLabel } from '../components/paginationLabels'

const PAGE_SIZES = [10, 20, 50]

export function JobsPage() {
  const { jobs, loading, error, reloadJobs, moveJob } = useOutletContext<LayoutContext>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())

  // a API já devolve ordenado por aderência; a busca filtra a lista carregada
  const results = useMemo(
    () => jobs.filter((j) => matchesSearch(j, search)).sort((a, b) => b.match - a.match),
    [jobs, search],
  )
  const current = paginate(results, page, pageSize)

  const applyJob = async (id: string) => {
    const job = jobs.find((j) => j.id === id)
    setPending((prev) => new Set(prev).add(id))
    try {
      await moveJob(id, 'applied')
      if (job) setToast(`Candidatura enviada para ${job.company}`)
    } catch {
      // o layout já mostrou o erro e desfez a mudança
    } finally {
      setPending((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const footer = results.length > 0 && (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ px: 2.5, py: 1.5, alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
        <Typography variant="body2" aria-live="polite">
          {current.from}–{current.to} de {results.length}
        </Typography>
        <Select
          size="small"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value))
            setPage(1)
          }}
          inputProps={{ 'aria-label': 'Vagas por página' }}
          sx={{ fontSize: 14, '& .MuiSelect-select': { py: 0.5 } }}
        >
          {PAGE_SIZES.map((n) => (
            <MenuItem key={n} value={n}>
              {n} por página
            </MenuItem>
          ))}
        </Select>
      </Stack>
      {current.pageCount > 1 && (
        <Pagination
          count={current.pageCount}
          page={current.page}
          onChange={(_, p) => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          color="primary"
          shape="rounded"
          siblingCount={1}
          getItemAriaLabel={paginationLabel}
        />
      )}
    </Stack>
  )

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

      <SearchField
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Buscar vagas, empresas ou tecnologias…"
        label="Buscar vagas"
      />

      <JobsStatus loading={loading} error={error} onRetry={reloadJobs} />

      {!loading && !error && (
        <JobList
          jobs={current.items}
          total={results.length}
          onApply={applyJob}
          pending={pending}
          emptyText={jobs.length === 0 ? 'Nenhuma vaga encontrada ainda.' : undefined}
          footer={footer}
        />
      )}

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
