import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router'
import type { Job } from '../../data/mock'
import { ChartCard, MUTED_BAR } from './ChartCard'

type Props = { jobs: Job[]; minMatch: number }

/** Faixas de compatibilidade: [início, fim) — a última inclui 100. */
const BINS = [
  { from: 0, to: 50, label: '<50%' },
  { from: 50, to: 60, label: '50–59' },
  { from: 60, to: 70, label: '60–69' },
  { from: 70, to: 80, label: '70–79' },
  { from: 80, to: 90, label: '80–89' },
  { from: 90, to: 101, label: '90–100' },
]

const PLOT_HEIGHT = 150

/** Histograma da compatibilidade das vagas, com a linha do mínimo definido em Configurações. */
export function MatchDistributionChart({ jobs, minMatch }: Props) {
  const bins = useMemo(
    () =>
      BINS.map((b) => {
        const inBin = jobs.filter((j) => j.match >= b.from && j.match < b.to)
        const above = inBin.filter((j) => j.match >= minMatch).length
        return { ...b, total: inBin.length, above, below: inBin.length - above }
      }),
    [jobs, minMatch],
  )

  const max = Math.max(1, ...bins.map((b) => b.total))
  const qualified = bins.reduce((s, b) => s + b.above, 0)
  const pct = jobs.length ? Math.round((qualified / jobs.length) * 100) : 0

  // posição da linha do mínimo no eixo de faixas
  const idx = Math.max(0, BINS.findIndex((b) => minMatch >= b.from && minMatch < b.to))
  const frac = (minMatch - BINS[idx].from) / (BINS[idx].to - BINS[idx].from)
  const thresholdX = ((idx + Math.min(1, Math.max(0, frac))) / BINS.length) * 100

  return (
    <ChartCard
      title="Distribuição de compatibilidade"
      subtitle={
        <>
          <Box component="strong" sx={{ color: 'text.primary' }}>
            {qualified} de {jobs.length} vagas ({pct}%)
          </Box>{' '}
          atingem seu mínimo de {minMatch}%.{' '}
          <Box component={RouterLink} to="/configuracoes" sx={{ color: 'primary.main', fontWeight: 500 }}>
            Ajustar
          </Box>
        </>
      }
    >
      <Box sx={{ position: 'relative', height: PLOT_HEIGHT + 20, mt: 1 }}>
        {/* linha do mínimo */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 20,
            left: `${thresholdX}%`,
            borderLeft: '2px dashed',
            borderColor: 'text.secondary',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: -4,
              left: thresholdX > 70 ? 'auto' : 6,
              right: thresholdX > 70 ? 6 : 'auto',
              whiteSpace: 'nowrap',
              color: 'text.secondary',
              bgcolor: 'background.paper',
              px: 0.5,
              fontWeight: 500,
            }}
          >
            mínimo {minMatch}%
          </Typography>
        </Box>

        <Box
          role="list"
          aria-label="Vagas por faixa de compatibilidade"
          sx={{
            position: 'absolute',
            inset: '0 0 20px 0',
            display: 'grid',
            gridTemplateColumns: `repeat(${BINS.length}, 1fr)`,
            alignItems: 'end',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {bins.map((b) => {
            const h = (b.total / max) * (PLOT_HEIGHT - 28)
            const aboveH = b.total ? (b.above / b.total) * h : 0
            const belowH = h - aboveH
            return (
              <Tooltip
                key={b.label}
                placement="top"
                title={`${b.label}: ${b.total} ${b.total === 1 ? 'vaga' : 'vagas'}${b.total ? ` (${b.above} acima do mínimo)` : ''}`}
              >
                <Box
                  role="listitem"
                  aria-label={`${b.label}: ${b.total} vagas, ${b.above} acima do mínimo`}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    cursor: 'default',
                    '&:hover .seg': { filter: 'brightness(0.9)' },
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                    {b.total}
                  </Typography>
                  <Box sx={{ width: '56%', maxWidth: 40, display: 'flex', flexDirection: 'column', gap: aboveH && belowH ? '2px' : 0 }}>
                    {aboveH > 0 && (
                      <Box className="seg" sx={{ height: aboveH, bgcolor: 'primary.main', borderRadius: '4px 4px 0 0', transition: 'height .4s ease' }} />
                    )}
                    {belowH > 0 && (
                      <Box
                        className="seg"
                        sx={{ height: belowH, bgcolor: MUTED_BAR, borderRadius: aboveH ? 0 : '4px 4px 0 0', transition: 'height .4s ease' }}
                      />
                    )}
                  </Box>
                </Box>
              </Tooltip>
            )
          })}
        </Box>

        {/* rótulos do eixo */}
        <Box
          aria-hidden
          sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, display: 'grid', gridTemplateColumns: `repeat(${BINS.length}, 1fr)` }}
        >
          {bins.map((b) => (
            <Typography key={b.label} variant="caption" color="text.secondary" sx={{ textAlign: 'center', lineHeight: '20px' }}>
              {b.label}
            </Typography>
          ))}
        </Box>
      </Box>

      <Stack direction="row" sx={{ mt: 2, gap: 2, flexWrap: 'wrap', color: 'text.secondary' }}>
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: 'primary.main' }} />
          <Typography variant="caption">Atinge o mínimo</Typography>
        </Stack>
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: MUTED_BAR }} />
          <Typography variant="caption">Abaixo do mínimo</Typography>
        </Stack>
      </Stack>
    </ChartCard>
  )
}
