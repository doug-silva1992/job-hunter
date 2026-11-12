import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import BusinessOutlined from '@mui/icons-material/BusinessOutlined'
import CancelRounded from '@mui/icons-material/CancelRounded'
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined'
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import QuizOutlined from '@mui/icons-material/QuizOutlined'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import ReplayRounded from '@mui/icons-material/ReplayRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import SchoolOutlined from '@mui/icons-material/SchoolOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import LinearProgress from '@mui/material/LinearProgress'
import Pagination from '@mui/material/Pagination'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { canPrepare, hasPreparationData, isCandidate, paginate, safeJobUrl, stages, type Job } from '../api/jobs'
import { preparationApi, type ExamQuestion, type ExamResult, type GradedQuestion, type PreparationExam } from '../api/preparation'
import { WORK_MODE_LABELS } from '../api/settings'
import { CompanyAvatar } from '../components/CompanyAvatar'
import type { LayoutContext } from '../components/AppLayout'
import { MatchBadge } from '../components/MatchBadge'
import { paginationLabel } from '../components/paginationLabels'
import { ScoreBadge } from '../components/ScoreBadge'

/** Ordem da lista: quem tem entrevista marcada precisa se preparar antes. */
const STAGE_ORDER: Job['stage'][] = ['interview', 'offer', 'applied']

const PAGE_SIZE = 10

/** Preparatório: escolha da vaga (/preparatorio) ou o preparatório de uma vaga (/preparatorio/:jobId). */
export function PreparationPage() {
  const { jobId } = useParams()
  return jobId ? <JobPreparation key={jobId} jobId={jobId} /> : <JobPicker />
}

function JobPicker() {
  const navigate = useNavigate()
  const { allJobs, loading, error } = useOutletContext<LayoutContext>()
  const [page, setPage] = useState(1)
  const jobs = allJobs
    .filter(canPrepare)
    .sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || b.match - a.match)
  const current = paginate(jobs, page, PAGE_SIZE)

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Preparatório
        </Typography>
        <Typography color="text.secondary">
          Escolha uma vaga em que você é candidato para estudar a empresa e testar o que você sabe sobre o conteúdo
          da vaga.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card component="section" aria-label="Vagas para se preparar">
        {loading && jobs.length === 0 ? (
          <Stack sx={{ p: 5, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        ) : jobs.length === 0 ? (
          <Stack sx={{ p: 5, alignItems: 'center', textAlign: 'center', gap: 1 }}>
            <SchoolOutlined sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="subtitle1">Nenhuma vaga para se preparar</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
              Aparecem aqui as vagas em que você é candidato e que têm empresa e tags informadas.
            </Typography>
            <Button variant="contained" sx={{ mt: 1 }} onClick={() => navigate('/vagas')}>
              Ver vagas
            </Button>
          </Stack>
        ) : (
          current.items.map((job, i) => {
            const stage = stages.find((s) => s.id === job.stage)
            return (
              <Fragment key={job.id}>
                {i > 0 && <Divider />}
                <CardActionArea
                  onClick={() => navigate(`/preparatorio/${job.id}`)}
                  aria-label={`Preparar para ${job.role} na ${job.company}`}
                >
                  <Stack direction="row" sx={{ px: 2.5, py: 2, gap: 2, alignItems: 'center' }}>
                    <CompanyAvatar name={job.company} size={40} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap>
                        {job.role}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {[job.company, job.location, WORK_MODE_LABELS[job.workMode]].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    {stage && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={stage.label}
                        sx={{ display: { xs: 'none', sm: 'inline-flex' }, borderColor: stage.color, color: stage.color }}
                      />
                    )}
                    <ChevronRightRounded color="action" />
                  </Stack>
                </CardActionArea>
              </Fragment>
            )
          })
        )}
      </Card>

      {jobs.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {current.from}–{current.to} de {jobs.length} {jobs.length === 1 ? 'vaga' : 'vagas'}
          </Typography>
          {current.pageCount > 1 && (
            <Pagination
              count={current.pageCount}
              page={current.page}
              onChange={(_, p) => {
                setPage(p)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              color="primary"
              shape="rounded"
              siblingCount={1}
              getItemAriaLabel={paginationLabel}
            />
          )}
        </Stack>
      )}
    </>
  )
}

const messageOf = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback)

function JobPreparation({ jobId }: { jobId: string }) {
  const navigate = useNavigate()
  const { allJobs, loading: jobsLoading } = useOutletContext<LayoutContext>()
  const job = allJobs.find((j) => j.id === jobId) ?? null
  const [exam, setExam] = useState<PreparationExam | null>(null)
  const [loadingExam, setLoadingExam] = useState(true)
  /** Resposta do n8n quando ele respondeu mas nada foi gravado na base. */
  const [rawResponse, setRawResponse] = useState<unknown>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    preparationApi
      .get(jobId)
      .then((e) => mounted.current && setExam(e))
      .catch((err: unknown) => mounted.current && setError(messageOf(err, 'Não foi possível carregar o preparatório.')))
      .finally(() => mounted.current && setLoadingExam(false))
    return () => {
      mounted.current = false
    }
  }, [jobId])

  async function generate() {
    setGenerating(true)
    setError(null)
    setRawResponse(null)
    try {
      const response = await preparationApi.generate(jobId)
      const saved = await preparationApi.get(jobId)
      if (!mounted.current) return
      // só troca a prova se o n8n gravou uma nova linha
      if (saved && saved.id !== exam?.id) setExam(saved)
      else if (response === null || response === '') setError('O n8n respondeu sem conteúdo e nada foi gravado na base.')
      else setRawResponse(response)
    } catch (err) {
      if (mounted.current) setError(messageOf(err, 'Não foi possível gerar o preparatório.'))
    } finally {
      if (mounted.current) setGenerating(false)
    }
  }

  const back = (
    <Box>
      <Button startIcon={<ArrowBackRounded />} onClick={() => navigate('/preparatorio')}>
        Preparatório
      </Button>
    </Box>
  )

  if (!job) {
    return (
      <>
        {back}
        {jobsLoading ? (
          <Stack sx={{ p: 5, alignItems: 'center' }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Alert severity="warning">Vaga não encontrada. Ela pode ter sido excluída.</Alert>
        )}
      </>
    )
  }

  if (!isCandidate(job)) {
    return (
      <>
        {back}
        <Alert severity="info">
          O preparatório é só para vagas em que você é candidato. Mova “{job.role}” para Candidatado no pipeline para
          se preparar para ela.
        </Alert>
      </>
    )
  }

  if (!hasPreparationData(job)) {
    return (
      <>
        {back}
        <Alert severity="info">
          O preparatório precisa da empresa e das tags da vaga, e “{job.role}” não tem essas informações.
        </Alert>
      </>
    )
  }

  const url = safeJobUrl(job.link)

  return (
    <>
      {back}

      <Card component="section" aria-label="Vaga" sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 2.5, alignItems: { sm: 'center' } }}>
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <CompanyAvatar name={job.company} size={48} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h5" component="h1" sx={{ overflowWrap: 'anywhere' }}>
                {job.role}
              </Typography>
              <Typography color="text.secondary">
                {[job.company, job.location, WORK_MODE_LABELS[job.workMode]].filter(Boolean).join(' · ')}
              </Typography>
            </Box>
          </Stack>
          {exam?.score != null ? (
            <Stack sx={{ alignItems: 'center' }}>
              <ScoreBadge value={exam.score} size={64} />
              <Typography variant="caption" color="text.secondary">
                Última nota
              </Typography>
            </Stack>
          ) : (
            <MatchBadge value={job.match} size={56} />
          )}
        </Stack>
        {job.tags.length > 0 && (
          <Stack direction="row" sx={{ mt: 2, flexWrap: 'wrap', gap: 0.75 }}>
            {job.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
          </Stack>
        )}
        <Stack direction="row" sx={{ mt: 2.5, gap: 1.5, flexWrap: 'wrap' }}>
          {exam && (
            <Button startIcon={<RefreshRounded />} onClick={() => void generate()} disabled={generating}>
              Gerar novo preparatório
            </Button>
          )}
          {url && (
            <Button variant="outlined" endIcon={<OpenInNewRounded />} href={url} target="_blank" rel="noopener noreferrer">
              Ver vaga
            </Button>
          )}
        </Stack>
      </Card>

      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void generate()} disabled={generating}>
              Tentar de novo
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {generating ? (
        <Card sx={{ p: 4 }}>
          <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1.5 }} role="status">
            <CircularProgress size={32} />
            <Typography variant="subtitle1">Gerando o preparatório…</Typography>
            <Typography variant="body2" color="text.secondary">
              Aguardando a resposta do n8n.
            </Typography>
          </Stack>
        </Card>
      ) : loadingExam ? (
        <Stack sx={{ p: 5, alignItems: 'center' }}>
          <CircularProgress size={28} />
        </Stack>
      ) : exam ? (
        <>
          <CompanyCard company={exam.company} />
          <Exam key={exam.id} jobId={jobId} exam={exam} onScored={(score) => setExam({ ...exam, score })} />
        </>
      ) : rawResponse !== null ? (
        <Card component="section" aria-label="Resposta do n8n" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            O n8n respondeu, mas nenhum preparatório foi gravado na base para esta vaga. Resposta recebida:
          </Alert>
          <N8nValue value={rawResponse} />
        </Card>
      ) : (
        <Card sx={{ p: 4 }}>
          <Stack sx={{ alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
            <SchoolOutlined sx={{ fontSize: 44, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              Prepare-se para esta vaga
            </Typography>
            <Button variant="contained" size="large" startIcon={<AutoAwesomeOutlined />} onClick={() => void generate()} sx={{ mt: 1 }}>
              Gerar preparatório
            </Button>
          </Stack>
        </Card>
      )}
    </>
  )
}

/** Informações gerais da empresa, como o n8n gravou na coluna company. */
function CompanyCard({ company }: { company: unknown }) {
  const isObject = !!company && typeof company === 'object' && !Array.isArray(company)
  const { nome, ...rest } = isObject ? (company as Record<string, unknown>) : { nome: undefined }
  const title = typeof nome === 'string' && nome.trim() ? nome : null

  return (
    <Card component="section" aria-labelledby="company-title" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 2 }}>
        <BusinessOutlined color="primary" />
        <Typography id="company-title" variant="h6" component="h2">
          {title ? `Sobre a ${title}` : 'Informações gerais'}
        </Typography>
      </Stack>
      {isObject ? (
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
          {Object.entries(rest).map(([key, value]) => (
            <Box key={key} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
                {keyLabel(key)}
              </Typography>
              <N8nValue value={value} depth={1} />
            </Box>
          ))}
        </Box>
      ) : (
        <N8nValue value={company} />
      )}
    </Card>
  )
}

/** Prova: o candidato marca uma alternativa por pergunta; o backend corrige e grava a nota. */
function Exam({ jobId, exam, onScored }: { jobId: string; exam: PreparationExam; onScored: (score: number) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ExamResult | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const total = exam.questions.length
  const answered = exam.questions.filter((q) => answers[String(q.numero)]).length
  const graded = new Map(result?.resultado.map((r) => [r.numero, r]))

  async function submit() {
    setSending(true)
    setError(null)
    try {
      const res = await preparationApi.submit(jobId, exam.id, answers)
      setResult(res)
      onScored(res.score)
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(messageOf(err, 'Não foi possível enviar a prova.'))
    } finally {
      setSending(false)
    }
  }

  function restart() {
    setAnswers({})
    setResult(null)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (total === 0) return <Alert severity="info">Este preparatório não tem perguntas.</Alert>

  return (
    <Box component="section" aria-labelledby="exam-title" ref={topRef} sx={{ display: 'grid', gap: 2, scrollMarginTop: 80 }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <QuizOutlined color="primary" />
        <Typography id="exam-title" variant="h6" component="h2" sx={{ flex: 1 }}>
          Prova
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {result ? `${result.acertos} de ${result.total} certas` : `${answered} de ${total} respondidas`}
        </Typography>
      </Stack>

      {result ? (
        <Alert
          severity={result.score >= 7 ? 'success' : result.score >= 5 ? 'warning' : 'error'}
          action={
            <Button color="inherit" size="small" startIcon={<ReplayRounded />} onClick={restart}>
              Refazer
            </Button>
          }
        >
          <Typography variant="subtitle2" component="span" sx={{ display: 'block' }}>
            Nota {result.score.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} de 10
          </Typography>
          Você acertou {result.acertos} de {result.total} perguntas. A nota foi salva.
        </Alert>
      ) : (
        <LinearProgress
          variant="determinate"
          value={(answered / total) * 100}
          aria-label={`${answered} de ${total} perguntas respondidas`}
          sx={{ height: 6, borderRadius: 3 }}
        />
      )}

      {exam.questions.map((q) => (
        <QuestionCard
          key={q.numero}
          question={q}
          selected={answers[String(q.numero)]}
          graded={graded.get(q.numero)}
          disabled={!!result || sending}
          onSelect={(letra) => setAnswers((a) => ({ ...a, [String(q.numero)]: letra }))}
        />
      ))}

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
        {result ? (
          <Button variant="contained" startIcon={<ReplayRounded />} onClick={restart}>
            Refazer prova
          </Button>
        ) : (
          <>
            {answered < total && (
              <Typography variant="body2" color="text.secondary">
                Responda todas as perguntas para enviar.
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendRounded />}
              onClick={() => void submit()}
              disabled={answered < total || sending}
            >
              Enviar prova
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}

type QuestionCardProps = {
  question: ExamQuestion
  selected: string | undefined
  graded: GradedQuestion | undefined
  disabled: boolean
  onSelect: (letra: string) => void
}

function QuestionCard({ question, selected, graded, disabled, onSelect }: QuestionCardProps) {
  const labelId = `exam-q-${question.numero}`
  const meta = [question.tecnologia, question.nivel].filter(Boolean).join(' · ')

  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Pergunta {question.numero}
            {meta && ` · ${meta}`}
          </Typography>
          <Typography id={labelId} variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
            {question.pergunta}
          </Typography>
        </Box>
        {graded &&
          (graded.acertou ? (
            <CheckCircleRounded color="success" aria-label="Resposta certa" />
          ) : (
            <CancelRounded color="error" aria-label="Resposta errada" />
          ))}
      </Stack>

      <RadioGroup aria-labelledby={labelId} value={selected ?? ''} onChange={(e) => onSelect(e.target.value)} sx={{ mt: 1, gap: 0.75 }}>
        {question.alternativas.map((alt) => {
          const isCorrect = !!graded && alt.letra === graded.correta
          const isWrongPick = !!graded && !graded.acertou && alt.letra === graded.resposta
          return (
            <FormControlLabel
              key={alt.letra}
              value={alt.letra}
              disabled={disabled}
              control={<Radio size="small" />}
              label={
                <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  <Box component="span" sx={{ fontWeight: 600, mr: 0.75 }}>
                    {alt.letra})
                  </Box>
                  {alt.texto}
                </Typography>
              }
              sx={{
                m: 0,
                pr: 1.5,
                py: 0.25,
                borderRadius: 2,
                border: 1,
                borderColor: isCorrect ? 'success.main' : isWrongPick ? 'error.main' : 'divider',
                bgcolor: isCorrect ? 'rgba(5, 118, 66, .08)' : isWrongPick ? 'rgba(201, 55, 44, .08)' : 'transparent',
                '& .MuiFormControlLabel-label.Mui-disabled': { color: 'text.primary' },
              }}
            />
          )
        })}
      </RadioGroup>

      {graded && (
        <Alert severity={graded.acertou ? 'success' : 'info'} icon={<LightbulbOutlined />} sx={{ mt: 1.5 }}>
          {!graded.acertou && (
            <Typography variant="subtitle2" component="span" sx={{ display: 'block' }}>
              Resposta certa: {graded.correta}
            </Typography>
          )}
          {graded.explicacao}
        </Alert>
      )}
    </Card>
  )
}

/** Nomes das chaves que o n8n grava em company, para exibir. */
const KEY_LABELS: Record<string, string> = {
  o_que_faz: 'O que faz',
  produtos_servicos: 'Produtos e serviços',
  fundacao: 'Fundação',
  tempo_de_mercado: 'Tempo de mercado',
}

/** "tempo_de_mercado" → "Tempo de mercado" (só para exibir as chaves que o n8n devolver). */
function keyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key]
  const text = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Mostra um valor do n8n como veio: textos, listas e objetos aninhados, sem esperar um formato. */
function N8nValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined || value === '') {
    return (
      <Typography variant="body2" color="text.secondary">
        –
      </Typography>
    )
  }
  if (typeof value !== 'object') {
    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {String(value)}
      </Typography>
    )
  }
  if (Array.isArray(value)) {
    // a resposta do n8n costuma vir num array de um item: mostra o item direto
    if (value.length === 1 && depth === 0) return <N8nValue value={value[0]} depth={depth} />
    return (
      <Box component="ul" sx={{ m: 0, pl: 2.25, display: 'grid', gap: 0.5 }}>
        {value.map((item, i) => (
          <Box component="li" key={i}>
            <N8nValue value={item} depth={depth + 1} />
          </Box>
        ))}
      </Box>
    )
  }
  return (
    <Box sx={{ display: 'grid', gap: 1, ...(depth > 1 && { pl: 1.5, borderLeft: 2, borderColor: 'divider' }) }}>
      {Object.entries(value as Record<string, unknown>).map(([key, v]) => (
        <Box key={key} sx={{ minWidth: 0 }}>
          <Typography variant={depth === 0 ? 'h6' : 'body2'} component={depth === 0 ? 'h2' : 'span'} sx={{ fontWeight: 600 }}>
            {keyLabel(key)}
            {depth > 0 && ': '}
          </Typography>
          {depth > 0 && v !== null && typeof v !== 'object' ? (
            <Typography variant="body2" component="span" sx={{ overflowWrap: 'anywhere' }}>
              {String(v)}
            </Typography>
          ) : (
            <N8nValue value={v} depth={depth + 1} />
          )}
        </Box>
      ))}
    </Box>
  )
}
