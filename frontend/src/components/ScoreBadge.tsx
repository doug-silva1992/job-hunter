import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { formatScore, scoreColor } from '../interview/reportFormat'

/** Nota de 0 a 10 num anel; sem nota, mostra um traço. */
export function ScoreBadge({ value, size = 48 }: { value: number | null; size?: number }) {
  return (
    <Box
      role="img"
      aria-label={value === null ? 'Sem nota' : `Nota ${formatScore(value)} de 10`}
      sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      <CircularProgress variant="determinate" value={100} size={size} thickness={4} sx={{ color: 'divider' }} />
      {value !== null && (
        <CircularProgress
          variant="determinate"
          value={Math.max(0, Math.min(10, value)) * 10}
          size={size}
          thickness={4}
          sx={{ color: scoreColor(value), position: 'absolute', left: 0, '& circle': { strokeLinecap: 'round' } }}
        />
      )}
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography component="span" sx={{ fontWeight: 700, fontSize: size * 0.3 }}>
          {value === null ? '–' : formatScore(value)}
        </Typography>
      </Box>
    </Box>
  )
}
