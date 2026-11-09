import CheckRounded from '@mui/icons-material/CheckRounded'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import FmdGoodOutlined from '@mui/icons-material/FmdGoodOutlined'
import MicRounded from '@mui/icons-material/MicRounded'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import SearchOffRounded from '@mui/icons-material/SearchOffRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Fragment, useState, type ReactNode } from 'react'
import { postedLabel, safeJobUrl, type Job } from '../api/jobs'
import { WORK_MODE_LABELS } from '../api/settings'
import { InterviewDialog } from '../interview/InterviewDialog'
import { CompanyAvatar } from './CompanyAvatar'
import { MatchBadge } from './MatchBadge'

type Props = {
  jobs: Job[]
  onApply: (id: string) => void
  /** Vagas com a candidatura sendo gravada na API. */
  pending?: ReadonlySet<string>
  emptyText?: string
  /** Total de vagas no cabeçalho (padrão: as da página). */
  total?: number
  /** Paginação, exibida no rodapé do card. */
  footer?: ReactNode
  /** Abre a análise de ATS (só para vagas com descrição ou já analisadas). */
  onShowAts?: (job: Job) => void
}

export function JobList({
  jobs,
  onApply,
  pending,
  emptyText = 'Nenhuma vaga encontrada para essa busca.',
  total = jobs.length,
  footer,
  onShowAts,
}: Props) {
  const [interviewJob, setInterviewJob] = useState<Job | null>(null)

  return (
    <Card sx={{ height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          Vagas encontradas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {total} {total === 1 ? 'vaga' : 'vagas'}
        </Typography>
      </Box>
      <Divider />

      {jobs.length === 0 ? (
        <Stack sx={{ alignItems: 'center', py: 6, color: 'text.secondary', gap: 1 }}>
          <SearchOffRounded />
          <Typography variant="body2">{emptyText}</Typography>
        </Stack>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {jobs.map((job, i) => {
            const applied = job.stage !== 'found'
            const saving = pending?.has(job.id) ?? false
            const url = safeJobUrl(job.link)
            return (
              <Fragment key={job.id}>
                {i > 0 && <Divider component="li" aria-hidden />}
                <Box
                  component="li"
                  sx={{
                    px: 2.5,
                    py: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: { xs: 'wrap', sm: 'nowrap' },
                    transition: 'background-color .15s',
                    '&:hover': { bgcolor: 'background.default' },
                  }}
                >
                  <CompanyAvatar name={job.company} size={44} />

                  <Box sx={{ flex: { xs: '1 1 calc(100% - 60px)', sm: 1 }, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>
                      {job.role}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {job.company} · {postedLabel(job)}
                    </Typography>
                    <Stack direction="row" sx={{ mt: 1, gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        icon={<FmdGoodOutlined />}
                        label={`${WORK_MODE_LABELS[job.workMode]} · ${job.location}`}
                        variant="outlined"
                      />
                      {job.tags.map((t) => (
                        <Chip key={t} size="small" label={t} sx={{ bgcolor: 'background.default' }} />
                      ))}
                    </Stack>
                  </Box>

                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', gap: 1.5, ml: { xs: 'auto', sm: 0 }, flexWrap: 'wrap', justifyContent: 'flex-end' }}
                  >
                    <MatchBadge value={job.match} />
                    {onShowAts && (job.ats || job.description) && (
                      <Button
                        variant="outlined"
                        color={job.ats ? 'primary' : 'warning'}
                        startIcon={<FactCheckOutlined />}
                        onClick={() => onShowAts(job)}
                        aria-label={`Ver análise de ATS de ${job.role} na ${job.company}`}
                      >
                        {job.ats ? 'ATS' : 'Analisar'}
                      </Button>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<MicRounded />}
                      onClick={() => setInterviewJob(job)}
                      aria-label={`Simular entrevista para ${job.role} na ${job.company}`}
                    >
                      Entrevista
                    </Button>
                    {url && (
                      <Button
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        endIcon={<OpenInNewRounded />}
                        aria-label={`Ver vaga ${job.role} na ${job.company} (abre em nova aba)`}
                      >
                        Ver vaga
                      </Button>
                    )}
                    <Button
                      variant={applied ? 'outlined' : 'contained'}
                      color={applied ? 'success' : 'primary'}
                      disabled={applied || saving}
                      startIcon={applied ? <CheckRounded /> : undefined}
                      onClick={() => onApply(job.id)}
                      sx={{ minWidth: 112 }}
                    >
                      {applied ? 'Aplicado' : saving ? 'Aplicando…' : 'Aplicar'}
                    </Button>
                  </Stack>
                </Box>
              </Fragment>
            )
          })}
        </Box>
      )}

      {footer && (
        <>
          <Divider />
          {footer}
        </>
      )}

      {interviewJob && <InterviewDialog job={interviewJob} onClose={() => setInterviewJob(null)} />}
    </Card>
  )
}
