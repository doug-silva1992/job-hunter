import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import RecordVoiceOverOutlined from '@mui/icons-material/RecordVoiceOverOutlined'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { interviewsApi, type InterviewReportSummary } from '../api/interviews'
import { CompanyAvatar } from '../components/CompanyAvatar'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDateTime, formatScore } from '../interview/reportFormat'

export function StatusChip({ status }: { status: string | null }) {
  const done = status === 'concluida'
  return (
    <Chip
      size="small"
      label={done ? 'Concluída' : status === 'processando' || !status ? 'Processando' : status}
      color={done ? 'success' : 'default'}
      variant="outlined"
    />
  )
}

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Não foi possível carregar os relatórios.')

/** Lista dos relatórios de simulação de entrevista (tabela interviews, gravada pelo n8n). */
export function InterviewsPage() {
  const navigate = useNavigate()
  const [reports, setReports] = useState<InterviewReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setReports(await interviewsApi.list())
      setError(null)
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    interviewsApi
      .list()
      .then((list) => active && setReports(list))
      .catch((err: unknown) => active && setError(messageOf(err)))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const scored = reports.filter((r) => r.notaGeral !== null)
  const average = scored.length ? scored.reduce((sum, r) => sum + (r.notaGeral ?? 0), 0) / scored.length : null

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2, alignItems: { sm: 'flex-end' } }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" component="h1">
            Entrevistas
          </Typography>
          <Typography color="text.secondary">
            Relatórios das suas simulações de entrevista, com a nota e a avaliação de cada resposta.
          </Typography>
        </Box>
        <Button startIcon={<RefreshRounded />} onClick={() => void load()} disabled={loading}>
          Atualizar
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {reports.length > 0 && (
        <Stack direction="row" sx={{ gap: 2, flexWrap: 'wrap' }}>
          <Stat label="Simulações" value={String(reports.length)} />
          <Stat label="Nota média" value={average === null ? '–' : `${formatScore(average)}/10`} />
          <Stat
            label="Melhor nota"
            value={scored.length ? `${formatScore(Math.max(...scored.map((r) => r.notaGeral ?? 0)))}/10` : '–'}
          />
        </Stack>
      )}

      <Card component="section" aria-label="Relatórios de entrevista">
        {loading && reports.length === 0 ? (
          <Stack sx={{ p: 5, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        ) : reports.length === 0 ? (
          <Stack sx={{ p: 5, alignItems: 'center', textAlign: 'center', gap: 1 }}>
            <RecordVoiceOverOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="subtitle1">Nenhuma entrevista avaliada ainda</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              Abra uma vaga, inicie a “Simulação de entrevista” e responda todas as perguntas. O relatório aparece aqui
              depois da análise.
            </Typography>
            <Button variant="contained" sx={{ mt: 1 }} onClick={() => navigate('/vagas')}>
              Ver vagas
            </Button>
          </Stack>
        ) : (
          reports.map((r, i) => (
            <Fragment key={r.id}>
              {i > 0 && <Divider />}
              <CardActionArea onClick={() => navigate(`/entrevistas/${r.id}`)} aria-label={`Abrir relatório: ${r.cargo ?? 'entrevista'}`}>
                <Stack direction="row" sx={{ px: 2.5, py: 2, gap: 2, alignItems: 'center' }}>
                  <CompanyAvatar name={r.company ?? r.cargo ?? '?'} size={40} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {r.cargo ?? 'Entrevista'}
                      {r.company && (
                        <Typography component="span" variant="body2" color="text.secondary">
                          {' '}
                          · {r.company}
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {formatDateTime(r.createdAt)}
                      {r.requisitos ? ` · ${r.requisitos}` : ''}
                    </Typography>
                    {r.resumo && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.5, display: { xs: 'none', sm: '-webkit-box' }, WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                        {r.resumo}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                    <StatusChip status={r.status} />
                  </Box>
                  <ScoreBadge value={r.notaGeral} />
                  <ChevronRightRounded color="action" />
                </Stack>
              </CardActionArea>
            </Fragment>
          ))
        )}
      </Card>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ px: 2.5, py: 1.5, minWidth: 150 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Card>
  )
}
