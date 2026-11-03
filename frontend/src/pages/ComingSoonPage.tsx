import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Card sx={{ p: { xs: 4, sm: 6 }, textAlign: 'center' }}>
      <ConstructionOutlined color="primary" sx={{ fontSize: 40, mb: 1 }} />
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        Esta seção está em construção.
      </Typography>
      <Button component={RouterLink} to="/" variant="outlined">
        Voltar ao Dashboard
      </Button>
    </Card>
  )
}
