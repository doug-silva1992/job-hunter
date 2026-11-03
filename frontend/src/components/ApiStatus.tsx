import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'

type Status = 'checking' | 'online' | 'offline'

const labels: Record<Status, { text: string; color: string }> = {
  checking: { text: 'Verificando API…', color: 'text.disabled' },
  online: { text: 'API online', color: 'success.main' },
  offline: { text: 'API offline', color: 'error.main' },
}

export function ApiStatus() {
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setStatus(res.ok ? 'online' : 'offline'))
      .catch(() => setStatus('offline'))
  }, [])

  const { text, color } = labels[status]

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary">
        {text}
      </Typography>
    </Box>
  )
}
