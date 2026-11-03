import CheckRounded from '@mui/icons-material/CheckRounded'
import FmdGoodOutlined from '@mui/icons-material/FmdGoodOutlined'
import SearchOffRounded from '@mui/icons-material/SearchOffRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Fragment, useState } from 'react'
import type { Job } from '../data/mock'
import { CompanyAvatar } from './CompanyAvatar'
import { MatchBadge } from './MatchBadge'

type Props = {
  jobs: Job[]
  onApply: (id: number) => void
}

const PREVIEW_COUNT = 5

export function JobList({ jobs, onApply }: Props) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? jobs : jobs.slice(0, PREVIEW_COUNT)

  return (
    <Card sx={{ height: '100%' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="h2">
          Vagas recomendadas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {jobs.length} {jobs.length === 1 ? 'vaga' : 'vagas'}
        </Typography>
      </Box>
      <Divider />

      {jobs.length === 0 ? (
        <Stack sx={{ alignItems: 'center', py: 6, color: 'text.secondary', gap: 1 }}>
          <SearchOffRounded />
          <Typography variant="body2">Nenhuma vaga encontrada para essa busca.</Typography>
        </Stack>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
          {visible.map((job, i) => {
            const applied = job.stage !== 'found'
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
                      {job.company} · {job.postedAt}
                    </Typography>
                    <Stack direction="row" sx={{ mt: 1, gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Chip
                        size="small"
                        icon={<FmdGoodOutlined />}
                        label={`${job.workMode} · ${job.location}`}
                        variant="outlined"
                      />
                      {job.tags.map((t) => (
                        <Chip key={t} size="small" label={t} sx={{ bgcolor: 'background.default' }} />
                      ))}
                    </Stack>
                  </Box>

                  <Stack
                    direction="row"
                    sx={{ alignItems: 'center', gap: 2, ml: { xs: 'auto', sm: 0 } }}
                  >
                    <MatchBadge value={job.match} />
                    <Button
                      variant={applied ? 'outlined' : 'contained'}
                      color={applied ? 'success' : 'primary'}
                      disabled={applied}
                      startIcon={applied ? <CheckRounded /> : undefined}
                      onClick={() => onApply(job.id)}
                      sx={{ minWidth: 112 }}
                    >
                      {applied ? 'Aplicado' : 'Aplicar'}
                    </Button>
                  </Stack>
                </Box>
              </Fragment>
            )
          })}
        </Box>
      )}

      {jobs.length > PREVIEW_COUNT && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <Button variant="text" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Mostrar menos' : `Ver todas as ${jobs.length} vagas`}
            </Button>
          </Box>
        </>
      )}
    </Card>
  )
}
