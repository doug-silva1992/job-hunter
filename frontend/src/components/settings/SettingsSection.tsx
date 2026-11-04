import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

type SectionProps = { title: string; description?: string; children: ReactNode; tone?: 'default' | 'danger' }

/** Card com título e descrição usado por todas as abas de Configurações. */
export function SettingsSection({ title, description, children, tone = 'default' }: SectionProps) {
  return (
    <Card component="section" aria-label={title} sx={tone === 'danger' ? { borderColor: 'error.light' } : undefined}>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Typography variant="h6" component="h2" color={tone === 'danger' ? 'error.main' : undefined}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>
      <Divider />
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 1 }}>{children}</Box>
    </Card>
  )
}

type FieldProps = { label: string; hint?: string; htmlFor?: string; children: ReactNode }

/** Linha "rótulo à esquerda, controle à direita" (empilha no celular). */
export function SettingsField({ label, hint, htmlFor, children }: FieldProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(200px, 1fr) minmax(0, 2fr)' },
        gap: { xs: 1, md: 4 },
        py: 2,
        '& + &': { borderTop: 1, borderColor: 'divider' },
      }}
    >
      <Box>
        <Typography variant="subtitle2" component={htmlFor ? 'label' : 'p'} htmlFor={htmlFor}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="body2" color="text.secondary">
            {hint}
          </Typography>
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  )
}
