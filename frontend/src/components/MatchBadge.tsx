import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { matchColor } from './matchColor'

export function MatchBadge({ value, size = 48 }: { value: number; size?: number }) {
  return (
    <Box
      role="img"
      aria-label={`Aderência de ${value}%`}
      sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      <CircularProgress variant="determinate" value={100} size={size} thickness={4} sx={{ color: 'divider' }} />
      <CircularProgress
        variant="determinate"
        value={value}
        size={size}
        thickness={4}
        sx={{ color: matchColor(value), position: 'absolute', left: 0, '& circle': { strokeLinecap: 'round' } }}
      />
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography component="span" sx={{ fontWeight: 700, fontSize: size * 0.26 }}>
          {value}%
        </Typography>
      </Box>
    </Box>
  )
}
