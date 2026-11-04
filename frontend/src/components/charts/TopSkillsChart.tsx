import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRounded from '@mui/icons-material/RadioButtonUncheckedRounded'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import type { Job } from '../../data/mock'
import { ChartCard } from './ChartCard'

type Props = {
  jobs: Job[]
  /** Tecnologias do currículo principal (análise de ATS); null = sem análise disponível. */
  resumeSkills: string[] | null
}

const TOP = 8
const norm = (s: string) => s.trim().toLowerCase()

/** Barras horizontais: quantas vagas pedem cada tecnologia. */
export function TopSkillsChart({ jobs, resumeSkills }: Props) {
  const rows = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>()
    for (const job of jobs) {
      for (const tag of new Set(job.tags.map(norm))) {
        const label = job.tags.find((t) => norm(t) === tag) ?? tag
        const entry = counts.get(tag) ?? { label, count: 0 }
        entry.count += 1
        counts.set(tag, entry)
      }
    }
    return [...counts.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, TOP)
  }, [jobs])

  const owned = useMemo(() => new Set((resumeSkills ?? []).map(norm)), [resumeSkills])
  const max = rows[0]?.count ?? 1
  const covered = rows.filter((r) => owned.has(r.key)).length

  const subtitle = resumeSkills
    ? `Seu currículo principal cobre ${covered} das ${rows.length} tecnologias mais pedidas.`
    : 'Envie e avalie um currículo para comparar com o que as vagas pedem.'

  return (
    <ChartCard title="Tecnologias mais pedidas" subtitle={subtitle}>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Nenhuma vaga com tecnologias informadas ainda.
        </Typography>
      ) : (
        <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
          {rows.map((r) => {
            const pct = Math.round((r.count / jobs.length) * 100)
            const has = owned.has(r.key)
            return (
              <Tooltip
                key={r.key}
                title={`${r.label}: ${r.count} de ${jobs.length} vagas (${pct}%)${resumeSkills ? (has ? ' · no seu currículo' : ' · fora do seu currículo') : ''}`}
                placement="top"
                followCursor
              >
                <Box
                  component="li"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(84px, 120px) minmax(0, 1fr) auto',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 0.25,
                    borderRadius: 1,
                    '&:hover .bar': { filter: 'brightness(0.9)' },
                  }}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                    {resumeSkills &&
                      (has ? (
                        <CheckCircleRounded sx={{ fontSize: 16, color: 'success.main' }} aria-label="No seu currículo" />
                      ) : (
                        <RadioButtonUncheckedRounded sx={{ fontSize: 16, color: 'text.disabled' }} aria-label="Fora do seu currículo" />
                      ))}
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                      {r.label}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 10, bgcolor: 'background.default', borderRadius: '0 4px 4px 0' }}>
                    <Box
                      className="bar"
                      sx={{
                        height: '100%',
                        width: `${(r.count / max) * 100}%`,
                        bgcolor: 'primary.main',
                        borderRadius: '0 4px 4px 0',
                        transition: 'width .4s ease, filter .15s',
                      }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 72, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {r.count} {r.count === 1 ? 'vaga' : 'vagas'}
                  </Typography>
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      )}

      {resumeSkills && rows.length > 0 && (
        <Stack direction="row" sx={{ mt: 2, gap: 2, flexWrap: 'wrap', color: 'text.secondary' }}>
          <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
            <CheckCircleRounded sx={{ fontSize: 14, color: 'success.main' }} />
            <Typography variant="caption">No seu currículo</Typography>
          </Stack>
          <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
            <RadioButtonUncheckedRounded sx={{ fontSize: 14, color: 'text.disabled' }} />
            <Typography variant="caption">Oportunidade de aprender</Typography>
          </Stack>
        </Stack>
      )}
    </ChartCard>
  )
}
