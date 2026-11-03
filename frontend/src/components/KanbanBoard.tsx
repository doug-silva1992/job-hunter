import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { useState } from 'react'
import { stages, type Job, type Stage } from '../data/mock'
import { CompanyAvatar } from './CompanyAvatar'
import { matchColor } from './matchColor'

type Props = {
  jobs: Job[]
  onMove: (id: number, stage: Stage) => void
}

export function KanbanBoard({ jobs, onMove }: Props) {
  const [dragOver, setDragOver] = useState<Stage | null>(null)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="h6" component="h2">
          Pipeline de candidaturas
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
          Arraste os cards entre as colunas
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: 'repeat(4, minmax(240px, 1fr))', lg: 'repeat(4, 1fr)' },
          overflowX: 'auto',
          pb: 1,
        }}
      >
        {stages.map((stage) => {
          const items = jobs.filter((j) => j.stage === stage.id)
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
                const id = Number(e.dataTransfer.getData('text/plain'))
                if (id) onMove(id, stage.id)
                setDragOver(null)
              }}
              sx={{
                p: 1.5,
                bgcolor: isOver ? alpha(stage.color, 0.08) : '#EEF1F5',
                outline: isOver ? `2px dashed ${alpha(stage.color, 0.5)}` : '2px dashed transparent',
                transition: 'background-color .15s, outline-color .15s',
                minHeight: 220,
                minWidth: 0,
              }}
            >
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 0.5, mb: 1.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.color }} />
                <Typography variant="subtitle2">{stage.label}</Typography>
                <Typography
                  variant="caption"
                  sx={{ ml: 'auto', px: 1, borderRadius: 999, bgcolor: 'background.paper', color: 'text.secondary', fontWeight: 600 }}
                >
                  {items.length}
                </Typography>
              </Stack>

              <Stack sx={{ gap: 1 }}>
                {items.map((job) => (
                  <Card
                    key={job.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(job.id))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    sx={{
                      p: 1.5,
                      cursor: 'grab',
                      transition: 'box-shadow .15s, transform .15s',
                      '&:hover': { boxShadow: '0 4px 12px rgba(16,24,40,.08)', transform: 'translateY(-1px)' },
                      '&:active': { cursor: 'grabbing' },
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
                    </Stack>
                  </Card>
                ))}
                {items.length === 0 && (
                  <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', py: 3 }}>
                    Nenhum item
                  </Typography>
                )}
              </Stack>
            </Paper>
          )
        })}
      </Box>
    </Box>
  )
}
