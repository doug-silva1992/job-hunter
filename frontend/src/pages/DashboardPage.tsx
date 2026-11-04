import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { resumesApi } from '../api/resumes'
import { settingsApi } from '../api/settings'
import { displayName, useAuth } from '../auth/context'
import type { LayoutContext } from '../components/AppLayout'
import { JobsStatus } from '../components/JobsStatus'
import { KanbanBoard } from '../components/KanbanBoard'
import { MetricCards } from '../components/MetricCards'
import { MatchDistributionChart } from '../components/charts/MatchDistributionChart'
import { TopSkillsChart } from '../components/charts/TopSkillsChart'

const DEFAULT_MIN_MATCH = 70

export function DashboardPage() {
  const { jobs, loading, error, reloadJobs, moveJob } = useOutletContext<LayoutContext>()
  const { user } = useAuth()
  const [minMatch, setMinMatch] = useState(DEFAULT_MIN_MATCH)
  const [resumeSkills, setResumeSkills] = useState<string[] | null>(null)

  // dados dos relatórios; se a API falhar, os gráficos usam os valores padrão
  useEffect(() => {
    let active = true
    settingsApi
      .get()
      .then((s) => active && setMinMatch(s.minMatch))
      .catch(() => {})
    resumesApi
      .list()
      .then((list) => {
        const skills = list.find((r) => r.isPrimary)?.ats?.tecnologiasIdentificadas
        if (active) setResumeSkills(skills?.length ? skills : null)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Olá, {displayName(user)} 👋
        </Typography>
        <Typography color="text.secondary">Aqui está um resumo da sua busca por vagas hoje.</Typography>
      </Box>

      <JobsStatus loading={loading} error={error} onRetry={reloadJobs} />

      <MetricCards jobs={jobs} />

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        <TopSkillsChart jobs={jobs} resumeSkills={resumeSkills} />
        <MatchDistributionChart jobs={jobs} minMatch={minMatch} />
      </Box>

      <KanbanBoard jobs={jobs} onMove={moveJob} />
    </>
  )
}
