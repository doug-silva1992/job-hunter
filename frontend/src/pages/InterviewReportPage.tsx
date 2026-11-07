import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import CodeRounded from '@mui/icons-material/CodeRounded'
import MicRounded from '@mui/icons-material/MicRounded'
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded'
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import ThumbUpAltOutlined from '@mui/icons-material/ThumbUpAltOutlined'
import TrendingUpRounded from '@mui/icons-material/TrendingUpRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { interviewsApi, type InterviewAnswer, type InterviewReport } from '../api/interviews'
import { CompanyAvatar } from '../components/CompanyAvatar'
import { ScoreBadge } from '../components/ScoreBadge'
import { QUESTIONS } from '../interview/interviewer'
import { TechInterviewDialog } from '../interview/TechInterviewDialog'
import { InterviewDialog } from '../interview/InterviewDialog'
import type { Job } from '../api/jobs'
import type { LayoutContext } from '../components/AppLayout'
import { JobDetailsDialog } from '../components/JobDetailsDialog'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import { formatDateTime, formatScore, scoreColor, scoreLevel } from '../interview/reportFormat'
import { StatusChip } from './InterviewsPage'

const messageOf = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

/** Relatório de uma simulação de entrevista: avaliação geral e de cada resposta, com o áudio gravado. */
export function InterviewReportPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [techOpen, setTechOpen] = useState(false)
  const [jobOpen, setJobOpen] = useState(false)
  const [interviewJob, setInterviewJob] = useState<Job | null>(null)
  const { allJobs, moveJob } = useOutletContext<LayoutContext>()
  // relatórios antigos (sem job_id) ou de vaga excluída não têm o botão "Ver vaga"
  const job = report?.jobId ? (allJobs.find((j) => j.id === report.jobId) ?? null) : null
  // nota 5 ou menor = reprovação quase certa: não oferece a próxima etapa
  const canGenerateTech = report?.notaGeral != null && report.notaGeral > 5
  // se houver registro em technical_interview para este relatório, "Gerar" vira "Fazer entrevista técnica"
  const technical = report?.technical ?? null
  const hasTechQuestions = !!technical?.perguntas.length
  const [techChatOpen, setTechChatOpen] = useState(false)

  /** Recarrega o relatório (ex.: depois de gerar a entrevista técnica). */
  async function reload() {
    try {
      setReport(await interviewsApi.get(id))
    } catch {
      // mantém o relatório que já está na tela
    }
  }

  useEffect(() => {
    let active = true
    interviewsApi
      .get(id)
      .then((r) => active && setReport(r))
      .catch((err: unknown) => active && setError(messageOf(err, 'Não foi possível carregar o relatório.')))
    return () => {
      active = false
    }
  }, [id])

  async function remove() {
    setDeleting(true)
    try {
      await interviewsApi.remove(id)
      navigate('/entrevistas', { replace: true })
    } catch (err) {
      setError(messageOf(err, 'Não foi possível excluir o relatório.'))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const back = (
    <Box>
      <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/entrevistas')}>
        Entrevistas
      </Button>
    </Box>
  )

  if (!report) {
    return (
      <>
        {back}
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Stack sx={{ p: 5, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        )}
      </>
    )
  }

  return (
    <>
      {back}

      <Card component="section" aria-label="Avaliação geral" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 3, alignItems: { sm: 'center' } }}>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <CompanyAvatar name={report.company ?? report.cargo ?? '?'} size={48} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h1" sx={{ overflowWrap: 'anywhere' }}>
                {report.cargo ?? 'Simulação de entrevista'}
              </Typography>
              <Typography color="text.secondary">
                {[report.company, formatDateTime(report.createdAt), report.candidatoNome].filter(Boolean).join(' · ')}
              </Typography>
              {report.requisitos && (
                <Typography variant="body2" color="text.secondary">
                  Requisitos: {report.requisitos}
                </Typography>
              )}
            </Box>
          </Stack>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
            <StatusChip status={report.status} />
            <Stack sx={{ alignItems: 'center' }}>
              <ScoreBadge value={report.notaGeral} size={72} />
              <Typography variant="caption" color="text.secondary">
                Nota geral
              </Typography>
              {report.notaGeral !== null && (
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: scoreColor(report.notaGeral), textAlign: 'center', maxWidth: 160 }}
                >
                  {scoreLevel(report.notaGeral)}
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>

        {(report.resumo || report.recomendacao) && (
          <Stack sx={{ mt: 3, gap: 2 }}>
            {report.resumo && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Resumo
                </Typography>
                <Typography variant="body2">{report.resumo}</Typography>
              </Box>
            )}
            {report.recomendacao && (
              <Alert severity="info" icon={<LightbulbOutlined />}>
                <Typography variant="subtitle2" component="span" sx={{ display: 'block' }}>
                  Recomendação
                </Typography>
                {report.recomendacao}
              </Alert>
            )}
          </Stack>
        )}

        {(technical || canGenerateTech || job) && (
          <Stack direction="row" sx={{ mt: 3, gap: 1.5, flexWrap: 'wrap' }}>
            {/* já gerada: faz a entrevista; senão oferece gerar (só com nota acima de 5) */}
            {technical ? (
              <Tooltip title={hasTechQuestions ? '' : 'As perguntas ainda não foram geradas. Atualize a página em instantes.'}>
                <span>
                  <Button
                    variant="contained"
                    startIcon={<MicRounded />}
                    onClick={() => setTechChatOpen(true)}
                    disabled={!hasTechQuestions}
                  >
                    Fazer entrevista técnica
                  </Button>
                </span>
              </Tooltip>
            ) : canGenerateTech && (
              <Button variant="contained" startIcon={<CodeRounded />} onClick={() => setTechOpen(true)}>
                Gerar entrevista técnica
              </Button>
            )}
            {job && (
              <Button variant="outlined" startIcon={<WorkOutlineOutlined />} onClick={() => setJobOpen(true)}>
                Ver vaga
              </Button>
            )}
          </Stack>
        )}
      </Card>

      {error && <Alert severity="error">{error}</Alert>}

      <Box component="section" aria-label="Avaliação por resposta" sx={{ display: 'grid', gap: 2 }}>
        <Typography variant="h6" component="h2">
          Respostas
        </Typography>
        {report.respostas.map((a) => (
          <AnswerCard key={a.pergunta} reportId={report.id} answer={a} />
        ))}
      </Box>

      <Box>
        <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmDelete(true)}>
          Excluir relatório
        </Button>
      </Box>

      {jobOpen && job && (
        <JobDetailsDialog
          job={job}
          onClose={() => setJobOpen(false)}
          onMove={moveJob}
          onInterview={(j) => {
            setJobOpen(false)
            setInterviewJob(j)
          }}
        />
      )}

      {interviewJob && <InterviewDialog job={interviewJob} onClose={() => setInterviewJob(null)} />}

      {techChatOpen && technical && hasTechQuestions && (
        <InterviewDialog
          technical={{
            questions: technical.perguntas,
            company: report.company ?? '',
            role: technical.cargo ?? report.cargo ?? '',
          }}
          onClose={() => setTechChatOpen(false)}
        />
      )}

      {techOpen && (
        <TechInterviewDialog
          report={report}
          onClose={() => setTechOpen(false)}
          onGenerated={() => void reload()}
        />
      )}

      <Dialog open={confirmDelete} onClose={() => !deleting && setConfirmDelete(false)}>
        <DialogTitle>Excluir relatório?</DialogTitle>
        <DialogContent>
          <DialogContentText>O relatório e os áudios gravados desta entrevista serão apagados.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" onClick={() => void remove()} disabled={deleting}>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

function AnswerCard({ reportId, answer }: { reportId: string; answer: InterviewAnswer }) {
  const question = QUESTIONS[answer.pergunta - 1]?.text ?? `Pergunta ${answer.pergunta}`
  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Pergunta {answer.pergunta}
          </Typography>
          <Typography variant="subtitle1">{question}</Typography>
        </Box>
        <ScoreBadge value={answer.nota} size={52} />
      </Stack>
      {answer.nota !== null && (
        <LinearProgress
          variant="determinate"
          value={Math.max(0, Math.min(10, answer.nota)) * 10}
          aria-label={`Nota ${formatScore(answer.nota)} de 10`}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: 'divider', '& .MuiLinearProgress-bar': { bgcolor: scoreColor(answer.nota), borderRadius: 3 } }}
        />
      )}

      <Box sx={{ mt: 2 }}>
        <AnswerAudio reportId={reportId} answer={answer} />
      </Box>

      <Box sx={{ mt: 2, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
        <Feedback icon={<ThumbUpAltOutlined fontSize="small" />} color="success.main" title="Pontos fortes" text={answer.pontosFortes} />
        <Feedback icon={<TrendingUpRounded fontSize="small" />} color="warning.main" title="O que melhorar" text={answer.melhorias} />
        <Feedback icon={<LightbulbOutlined fontSize="small" />} color="primary.main" title="Resposta ideal" text={answer.respostaIdeal} />
      </Box>
    </Card>
  )
}

function Feedback({ icon, color, title, text }: { icon: ReactNode; color: string; title: string; text: string | null }) {
  return (
    <Box sx={{ p: 1.75, borderRadius: 2, border: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
      <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center', color, mb: 0.5 }}>
        {icon}
        <Typography variant="subtitle2" component="h3">
          {title}
        </Typography>
      </Stack>
      <Typography variant="body2" color={text ? 'text.primary' : 'text.secondary'}>
        {text ?? 'Sem avaliação.'}
      </Typography>
    </Box>
  )
}

/** O áudio salvo no backend exige o token, então é baixado como blob ao pedir para ouvir. */
function AnswerAudio({ reportId, answer }: { reportId: string; answer: InterviewAnswer }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  if (!answer.hasAudio) {
    return answer.externalAudioUrl ? (
      <Box component="audio" controls preload="none" src={answer.externalAudioUrl} sx={{ width: '100%', maxWidth: 420, height: 40 }} />
    ) : (
      <Typography variant="body2" color="text.secondary">
        Áudio indisponível.
      </Typography>
    )
  }

  if (url) return <Box component="audio" controls autoPlay src={url} sx={{ width: '100%', maxWidth: 420, height: 40 }} />

  async function load() {
    setLoading(true)
    setFailed(false)
    try {
      setUrl(URL.createObjectURL(await interviewsApi.audio(reportId, answer.pergunta)))
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={loading ? <CircularProgress size={16} /> : <PlayArrowRounded />}
        onClick={() => void load()}
        disabled={loading}
      >
        Ouvir minha resposta
      </Button>
      {failed && (
        <Typography variant="body2" color="error">
          Não foi possível carregar o áudio.
        </Typography>
      )}
    </Stack>
  )
}
