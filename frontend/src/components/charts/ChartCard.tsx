import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

type Props = { title: string; subtitle?: ReactNode; children: ReactNode }

export function ChartCard({ title, subtitle, children }: Props) {
  return (
    <Card component="section" aria-label={title} sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ px: 2.5, py: 2.5, flex: 1 }}>{children}</Box>
    </Card>
  )
}

/** Cor neutra para dados "abaixo do mínimo" (validada contra o fundo; sempre com rótulo visível). */
export const MUTED_BAR = '#8A94A6'
