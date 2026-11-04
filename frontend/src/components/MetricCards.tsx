import EventAvailableOutlined from '@mui/icons-material/EventAvailableOutlined'
import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import SendOutlined from '@mui/icons-material/SendOutlined'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { foundToday, type Job } from '../api/jobs'

type Metric = { label: string; value: string; hint: string; icon: ReactNode; color: string }

export function MetricCards({ jobs }: { jobs: Job[] }) {
  const theme = useTheme()
  const avgMatch = jobs.length ? Math.round(jobs.reduce((s, j) => s + j.match, 0) / jobs.length) : 0
  const sent = jobs.filter((j) => j.stage !== 'found').length
  const interviews = jobs.filter((j) => j.stage === 'interview' || j.stage === 'offer').length
  const today = foundToday(jobs)

  const metrics: Metric[] = [
    { label: 'Vagas Encontradas', value: String(jobs.length), hint: today ? `+${today} hoje` : 'nenhuma nova hoje', icon: <WorkOutlineOutlined />, color: theme.palette.primary.main },
    { label: 'Match Médio', value: `${avgMatch}%`, hint: 'com base no seu perfil', icon: <InsightsOutlined />, color: theme.palette.success.main },
    { label: 'Currículos Enviados', value: String(sent), hint: 'candidaturas no pipeline', icon: <SendOutlined />, color: '#7A3EB1' },
    { label: 'Entrevistas', value: String(interviews), hint: 'incluindo ofertas', icon: <EventAvailableOutlined />, color: theme.palette.warning.main },
  ]

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
      }}
    >
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                color: m.color,
                bgcolor: alpha(m.color, 0.1),
                flexShrink: 0,
              }}
            >
              {m.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary" noWrap>
                {m.label}
              </Typography>
              <Typography variant="h5" component="p" sx={{ lineHeight: 1.2 }}>
                {m.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {m.hint}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
