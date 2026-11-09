import AddRounded from '@mui/icons-material/AddRounded'
import TravelExploreRounded from '@mui/icons-material/TravelExploreRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useMemo, useState } from 'react'
import { Link as RouterLink, useOutletContext } from 'react-router'
import { matchesSearch, paginate, type Job } from '../api/jobs'
import { keywordHits } from '../api/preferences'
import { AddJobDialog } from '../components/AddJobDialog'
import type { LayoutContext } from '../components/AppLayout'
import { GenerateJobsDialog } from '../components/GenerateJobsDialog'
import { JobAtsDialog } from '../components/JobAtsDialog'
import { JobList } from '../components/JobList'
import { JobsStatus } from '../components/JobsStatus'
import { SearchField } from '../components/SearchField'
import { paginationLabel } from '../components/paginationLabels'

const PAGE_SIZES = [10, 20, 50]

export function JobsPage() {
  const { jobs: filteredJobs, allJobs, hiddenCount, settings, loading, error, reloadJobs, moveJob, saveJob } =
    useOutletContext<LayoutContext>()
  const [showAll, setShowAll] = useState(false)
  const jobs = showAll ? allJobs : filteredJobs
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set())
  const [generateOpen, setGenerateOpen] = useState(false)
  const [generateKey, setGenerateKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [addKey, setAddKey] = useState(0)
  const [atsView, setAtsView] = useState<{ job: Job; error: string | null } | null>(null)

  // ordena por aderência; no empate, vêm antes as que citam mais palavras-chave das preferências
  const results = useMemo(
    () =>
      jobs
        .filter((j) => matchesSearch(j, search))
        .map((job) => ({ job, hits: keywordHits(job, settings) }))
        .sort((a, b) => b.job.match - a.job.match || b.hits - a.hits)
        .map((r) => r.job),
    [jobs, search, settings],
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}
      >
        <Box>
          <Typography variant="h5" component="h1">
            Vagas
          </Typography>
          <Typography color="text.secondary">
            Vagas encontradas para o seu perfil, ordenadas por compatibilidade.
          </Typography>
        </Box>
        <Stack direction="row" sx={{ gap: 1, flexShrink: 0, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<AddRounded />}
            onClick={() => {
              setAddKey((k) => k + 1)
              setAddOpen(true)
            }}
          >
            Adicionar vaga
          </Button>
          <Button
            variant="contained"
            startIcon={<TravelExploreRounded />}
            onClick={() => {
              setGenerateKey((k) => k + 1)
              setGenerateOpen(true)
            }}
          >
            Gerar vagas
          </Button>
        </Stack>
      </Stack>

      <SearchField
        value={search}
        onChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Buscar vagas, empresas ou tecnologias…"
        label="Buscar vagas"
      />

      {!loading && !error && (hiddenCount > 0 || showAll) && (
        <Alert
          severity="info"
          action={
            <Stack direction="row" sx={{ gap: 0.5 }}>
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setShowAll((v) => !v)
                  setPage(1)
                }}
              >
                {showAll ? 'Aplicar preferências' : 'Mostrar todas'}
              </Button>
              <Button color="inherit" size="small" component={RouterLink} to="/configuracoes">
                Ajustar
              </Button>
            </Stack>
          }
        >
          {showAll
            ? 'Mostrando todas as vagas, sem o filtro das suas preferências.'
            : `${hiddenCount} ${hiddenCount === 1 ? 'vaga oculta' : 'vagas ocultas'} pelas suas preferências (compatibilidade mínima de ${settings.minMatch}%, modalidade, local, senioridade, termos excluídos e publicação nos últimos ${settings.maxJobAgeDays} dias).`}
        </Alert>
      )}

      <JobsStatus loading={loading} error={error} onRetry={reloadJobs} />

      {!loading && !error && (
        <JobList
          jobs={current.items}
          total={results.length}
          onApply={applyJob}
          pending={pending}
          emptyText={
            allJobs.length === 0
              ? 'Nenhuma vaga encontrada ainda.'
              : jobs.length === 0
                ? 'Nenhuma vaga atende às suas preferências.'
                : undefined
          }
          footer={footer}
          onShowAts={(job) => setAtsView({ job, error: null })}
        />
      )}

      <GenerateJobsDialog
        key={generateKey}
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSent={(resume) => {
          setGenerateOpen(false)
          setToast(`Busca de vagas iniciada com "${resume.originalName}"`)
        }}
      />

      <AddJobDialog
        key={addKey}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={({ job, atsError }) => {
          setAddOpen(false)
          saveJob(job)
          setAtsView({ job, error: atsError })
        }}
      />

      {atsView && (
        <JobAtsDialog
          key={atsView.job.id}
          job={atsView.job}
          initialError={atsView.error}
          onClose={() => setAtsView(null)}
          onUpdated={(job) => {
            saveJob(job)
            setAtsView({ job, error: null })
          }}
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
