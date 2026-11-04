import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'

type Props = { loading: boolean; error: string | null; onRetry: () => void }

/** Aviso de carregamento ou de erro ao buscar as vagas na API. */
export function JobsStatus({ loading, error, onRetry }: Props) {
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry} disabled={loading}>
            Tentar de novo
          </Button>
        }
      >
        Não foi possível carregar as vagas. {error}
      </Alert>
    )
  }
  if (loading) return <LinearProgress aria-label="Carregando vagas" sx={{ borderRadius: 1 }} />
  return null
}
