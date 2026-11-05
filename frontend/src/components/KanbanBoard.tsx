import MicRounded from '@mui/icons-material/MicRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useMemo, useState } from 'react'
import { matchesSearch, paginate, safeJobUrl, stages, type Job, type Stage } from '../api/jobs'
import { InterviewDialog } from '../interview/InterviewDialog'
import { JobDetailsDialog } from './JobDetailsDialog'
import { CompanyAvatar } from './CompanyAvatar'
import { matchColor } from './matchColor'
import { paginationLabel } from './paginationLabels'
import { SearchField } from './SearchField'

const PAGE_SIZE = 5
const FIRST_PAGES: Record<Stage, number> = { found: 1, applied: 1, interview: 1, offer: 1, rejected: 1 }

type Props = {
  jobs: Job[]
  /** Rejeita se a API falhar (o layout já avisa o usuário e desfaz a mudança). */
  onMove: (id: string, stage: Stage) => Promise<void>
}

export function KanbanBoard({ jobs, onMove }: Props) {
  const [dragOver, setDragOver] = useState<Stage | null>(null)
  const [search, setSearch] = useState('')
  const [pages, setPages] = useState(FIRST_PAGES)
  const [interviewJob, setInterviewJob] = useState<Job | null>(null)
  // guarda só o id: a vaga é lida da lista, então a modal reflete a mudança de etapa
  const [detailsId, setDetailsId] = useState<string | null>(null)
  const detailsJob = detailsId ? jobs.find((j) => j.id === detailsId) : undefined
  const filtered = useMemo(() => jobs.filter((j) => matchesSearch(j, search)), [jobs, search])

  return (
    <Box component="section" aria-labelledby="pipeline-title">
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Box sx={{ mr: 'auto' }}>
          <Typography variant="h6" component="h2" id="pipeline-title">
            Pipeline de candidaturas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            Arraste os cards entre as colunas
          </Typography>
        </Box>
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPages(FIRST_PAGES)
          }}
          placeholder="Buscar no pipeline…"
          label="Buscar no pipeline"
          sx={{ maxWidth: { sm: 320 } }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: `repeat(${stages.length}, minmax(240px, 1fr))`, xl: `repeat(${stages.length}, 1fr)` },
          overflowX: 'auto',
          pb: 1,
        }}
      >
        {stages.map((stage) => {
          const all = filtered.filter((j) => j.stage === stage.id)
          const current = paginate(all, pages[stage.id], PAGE_SIZE)
          const items = current.items
          const isOver = dragOver === stage.id
          return (
            <Paper
              key={stage.id}
              elevation={0}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(stage.id)
              }}
              onDragLeave={() => setDragOver((s) => (s === stage.id ? null : s))}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData('text/plain')
                if (id) onMove(id, stage.id).catch(() => {})
                setDragOver(null)
              }}
              sx={{
                p: 1.5,
                bgcolor: isOver ? alpha(stage.color, 0.08) : '#EEF1F5',
                outline: isOver ? `2px dashed ${alpha(stage.color, 0.5)}` : '2px dashed transparent',
                transition: 'background-color .15s, outline-color .15s',
                minHeight: 220,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 0.5, mb: 1.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.color }} />
                <Typography variant="subtitle2">{stage.label}</Typography>
                <Typography
                  variant="caption"
                  sx={{ ml: 'auto', px: 1, borderRadius: 999, bgcolor: 'background.paper', color: 'text.secondary', fontWeight: 600 }}
                >
                  {all.length}
                </Typography>
              </Stack>

              <Stack sx={{ gap: 1 }}>
                {items.map((job) => {
                  const url = safeJobUrl(job.link)
                  return (
                    <Card
                      key={job.id}
                      draggable
                      role="button"
                      tabIndex={0}
                      aria-label={`Ver detalhes da vaga ${job.role} na ${job.company}`}
                      onClick={() => setDetailsId(job.id)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setDetailsId(job.id)
                        }
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', job.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        transition: 'box-shadow .15s, transform .15s',
                        '&:hover': { boxShadow: '0 4px 12px rgba(16,24,40,.08)', transform: 'translateY(-1px)' },
                        '&:active': { cursor: 'grabbing' },
                        '&:focus-visible': { outline: (t) => `2px solid ${t.palette.primary.main}`, outlineOffset: 2 },
                      }}
                    >
                      <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                        <CompanyAvatar name={job.company} size={32} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                            {job.role}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap component="p">
                            {job.company}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: matchColor(job.match) }}>
                          {job.match}%
                        </Typography>
                        <Tooltip title="Simular entrevista">
                          <IconButton
                            size="small"
                            draggable={false}
                            onClick={(e) => {
                              e.stopPropagation()
                              setInterviewJob(job)
                            }}
                            aria-label={`Simular entrevista para ${job.role} na ${job.company}`}
                            sx={{ ml: -0.5, mr: url ? -1 : -0.75 }}
                          >
                            <MicRounded sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        {url && (
                          <Tooltip title="Abrir vaga em nova aba">
                            <IconButton
                              component="a"
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="small"
                              draggable={false}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Abrir vaga ${job.role} na ${job.company} em nova aba`}
                              sx={{ ml: -0.5, mr: -0.75 }}
                            >
                              <OpenInNewRounded sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Card>
                  )
                })}
                {items.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>
                    {search.trim() ? 'Nenhum resultado' : 'Nenhum item'}
                  </Typography>
                )}
              </Stack>

              {current.pageCount > 1 && (
                <Pagination
                  size="small"
                  count={current.pageCount}
                  page={current.page}
                  onChange={(_, p) => setPages((prev) => ({ ...prev, [stage.id]: p }))}
                  siblingCount={0}
                  boundaryCount={1}
                  getItemAriaLabel={(type, p) => `${stage.label}: ${paginationLabel(type, p)}`}
                  sx={{ mt: 'auto', pt: 1.5, '& .MuiPagination-ul': { justifyContent: 'center' } }}
                />
              )}
            </Paper>
          )
        })}
      </Box>

      {detailsJob && (
        <JobDetailsDialog
          job={detailsJob}
          onClose={() => setDetailsId(null)}
          onMove={onMove}
          onInterview={(job) => {
            setDetailsId(null)
            setInterviewJob(job)
          }}
        />
      )}

      {interviewJob && <InterviewDialog job={interviewJob} onClose={() => setInterviewJob(null)} />}
    </Box>
  )
}
