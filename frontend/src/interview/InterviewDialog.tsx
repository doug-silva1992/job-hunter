import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined'
import FlagRounded from '@mui/icons-material/FlagRounded'
import MicRounded from '@mui/icons-material/MicRounded'
import ReplayRounded from '@mui/icons-material/ReplayRounded'
import SendRounded from '@mui/icons-material/SendRounded'
import StopRounded from '@mui/icons-material/StopRounded'
import VolumeOffRounded from '@mui/icons-material/VolumeOffRounded'
import VolumeUpRounded from '@mui/icons-material/VolumeUpRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { keyframes, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { interviewsApi, type InterviewReport } from '../api/interviews'
import type { Job } from '../api/jobs'
import { CompanyAvatar } from '../components/CompanyAvatar'
import { closingTurn, interviewer, QUESTIONS, type InterviewMessage } from './interviewer'
import { formatDuration, useAudioRecorder, type Take } from './recorder'
import { useSpeechSynthesis } from './speech'

const MAX_ANSWER_MS = 5 * 60 * 1000
const AUDIO_ANSWER = '(resposta em áudio)'

type Message =
  | { id: number; role: 'interviewer'; text: string; audioUrl?: string }
  | { id: number; role: 'candidate'; audioUrl: string; blob: Blob; durationMs: number }

type Busy = 'starting' | 'thinking' | 'sending' | null

let seq = 0

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(201, 55, 44, .45); }
  70% { box-shadow: 0 0 0 14px rgba(201, 55, 44, 0); }
  100% { box-shadow: 0 0 0 0 rgba(201, 55, 44, 0); }
`

const toHistory = (messages: Message[]): InterviewMessage[] =>
  messages.map((m) => (m.role === 'interviewer' ? { role: m.role, text: m.text } : { role: m.role, text: AUDIO_ANSWER }))

type Props = { job: Job; onClose: () => void }

/**
 * Simulação de entrevista: o entrevistador pergunta (em voz alta) e o candidato grava a resposta.
 * Ao responder todas as perguntas, os áudios são salvos no backend e enviados ao n8n, que avalia e
 * grava o relatório (tela Entrevistas).
 * Montar só quando aberta: o estado zera a cada abertura.
 */
export function InterviewDialog({ job, onClose }: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [messages, setMessages] = useState<Message[]>([])
  const [take, setTake] = useState<Take | null>(null)
  const [busy, setBusy] = useState<Busy>('starting')
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [voiceOn, setVoiceOn] = useState(true)
  const answersRef = useRef<Blob[]>([])

  const { supported: ttsSupported, speak, cancel: stopSpeaking } = useSpeechSynthesis()
  const recorder = useAudioRecorder(MAX_ANSWER_MS, setTake)

  // respostas de uma sessão anterior (reinício/fechamento) são ignoradas
  const sessionRef = useRef(0)
  const voiceRef = useRef(voiceOn)
  const urlsRef = useRef<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    voiceRef.current = voiceOn
  }, [voiceOn])

  // libera os áudios gravados da memória ao fechar
  useEffect(() => {
    const urls = urlsRef.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, busy, take, finished])

  const answered = messages.filter((m) => m.role === 'candidate').length
  const lastQuestion = [...messages].reverse().find((m) => m.role === 'interviewer')

  const say = useCallback(
    (text: string, audioUrl?: string) => {
      setMessages((m) => [...m, { id: ++seq, role: 'interviewer', text, audioUrl }])
      if (voiceRef.current) speak(text, audioUrl)
    },
    [speak],
  )

  /** Salva e envia os áudios para avaliação; só com todas as perguntas respondidas. */
  const submit = useCallback(async () => {
    const session = sessionRef.current
    setBusy('sending')
    setSendError(null)
    try {
      const created = await interviewsApi.submit(job.id, answersRef.current)
      if (session === sessionRef.current) setReport(created)
    } catch (e) {
      if (session === sessionRef.current)
        setSendError(e instanceof ApiError ? e.message : 'Não foi possível enviar as respostas para análise.')
    } finally {
      if (session === sessionRef.current) setBusy(null)
    }
  }, [job.id])

  const begin = useCallback(async () => {
    const session = sessionRef.current
    try {
      const turn = await interviewer(job, [])
      if (session !== sessionRef.current) return
      say(turn.message, turn.audioUrl)
    } catch {
      if (session === sessionRef.current) setError('Não foi possível iniciar a entrevista.')
    } finally {
      if (session === sessionRef.current) setBusy(null)
    }
  }, [job, say])

  useEffect(() => {
    const session = sessionRef // contador, não um nó do DOM
    // begin() só altera o estado depois que o entrevistador responde
    // oxlint-disable-next-line react/set-state-in-effect
    void begin()
    return () => {
      session.current++
    }
  }, [begin])

  const sendAnswer = async () => {
    if (!take || !lastQuestion || lastQuestion.role !== 'interviewer') return
    const session = sessionRef.current
    stopSpeaking()
    setError(null)

    urlsRef.current.push(take.url)
    const next: Message[] = [
      ...messages,
      { id: ++seq, role: 'candidate', audioUrl: take.url, blob: take.blob, durationMs: take.durationMs },
    ]
    answersRef.current = next.flatMap((m) => (m.role === 'candidate' ? [m.blob] : []))
    setMessages(next)
    setTake(null)
    setBusy('thinking')

    try {
      const turn = await interviewer(job, toHistory(next))
      if (session !== sessionRef.current) return
      say(turn.message, turn.audioUrl)
      if (turn.done) {
        setFinished(true)
        if (answersRef.current.length >= QUESTIONS.length) return void (await submit())
      }
    } catch {
      if (session === sessionRef.current) setError('O entrevistador não respondeu. Tente finalizar a entrevista.')
    }
    if (session === sessionRef.current) setBusy(null)
  }

  const discardTake = () => {
    if (take) URL.revokeObjectURL(take.url)
    setTake(null)
  }

  const record = () => {
    stopSpeaking() // não gravar a voz do entrevistador
    discardTake()
    void recorder.start()
  }

  const finishEarly = () => {
    const turn = closingTurn(toHistory(messages))
    say(turn.message, turn.audioUrl)
    setFinished(true)
  }

  const close = () => {
    recorder.cancel()
    stopSpeaking()
    onClose()
  }

  const toggleVoice = () => {
    if (voiceOn) stopSpeaking()
    setVoiceOn(!voiceOn)
  }

  const recording = recorder.status !== 'idle'
  const canFinishEarly = answered > 0 && !finished && !busy && !recording

  return (
    <Dialog
      open
      onClose={recording ? undefined : close}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      aria-labelledby="interview-title"
      slotProps={{ paper: { sx: { height: fullScreen ? '100%' : 'min(720px, calc(100% - 64px))' } } }}
    >
      <DialogTitle id="interview-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1.5 }}>
        <CompanyAvatar name={job.company} size={40} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" component="span" sx={{ display: 'block', fontWeight: 600 }}>
            Simulação de entrevista
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap component="span" sx={{ display: 'block' }}>
            {job.role} · {job.company}
          </Typography>
        </Box>
        {ttsSupported && (
          <Tooltip title={voiceOn ? 'Não ler as perguntas em voz alta' : 'Ler as perguntas em voz alta'}>
            <IconButton onClick={toggleVoice} aria-pressed={voiceOn} aria-label="Ler perguntas em voz alta">
              {voiceOn ? <VolumeUpRounded /> : <VolumeOffRounded />}
            </IconButton>
          </Tooltip>
        )}
        <IconButton onClick={close} aria-label="Fechar simulação">
          <CloseRounded />
        </IconButton>
      </DialogTitle>

      <Alert severity="info" sx={{ borderRadius: 0, py: 0, '& .MuiAlert-message': { py: 1 } }}>
        Responda cada pergunta gravando um áudio. Ao responder todas, as gravações são salvas e enviadas para
        análise, e o relatório aparece em Entrevistas.
      </Alert>
      <Divider />

      <Box
        role="log"
        aria-live="polite"
        aria-label="Conversa da entrevista"
        sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {messages.map((m) =>
          m.role === 'interviewer' ? (
            <Stack key={m.id} direction="row" sx={{ alignSelf: 'flex-start', maxWidth: '85%', alignItems: 'flex-end', gap: 0.5 }}>
              <Box sx={{ px: 1.75, py: 1.25, borderRadius: 3, borderBottomLeftRadius: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary' }}>
                  Entrevistador
                </Typography>
                <Typography variant="body2">{m.text}</Typography>
              </Box>
              {ttsSupported && (
                <Tooltip title="Ouvir de novo">
                  <IconButton size="small" onClick={() => speak(m.text, m.audioUrl)} aria-label="Ouvir esta pergunta de novo">
                    <VolumeUpRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          ) : (
            <Box
              key={m.id}
              sx={{ alignSelf: 'flex-end', maxWidth: '85%', px: 1.5, py: 1, borderRadius: 3, borderBottomRightRadius: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}
            >
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, opacity: 0.85, mb: 0.5 }}>
                Você · {formatDuration(m.durationMs)}
              </Typography>
              <Box component="audio" controls src={m.audioUrl} preload="metadata" sx={{ display: 'block', width: 240, maxWidth: '100%', height: 36 }} />
            </Box>
          ),
        )}

        {busy === 'starting' && <Progress text="Preparando a entrevista…" />}
        {busy === 'thinking' && <Progress text="O entrevistador está pensando…" />}

        {busy === 'sending' && (
          <Progress text="Salvando e enviando as respostas para análise… isso pode levar alguns minutos." />
        )}

        {finished && busy !== 'sending' && (
          <FinishedNotice
            answered={answered}
            report={report}
            sendError={sendError}
            onRetry={() => void submit()}
            onOpenReport={() => report && navigate(`/entrevistas/${report.id}`)}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}
        <div ref={endRef} />
      </Box>

      <Divider />
      <Box sx={{ p: 2 }}>
        {finished ? (
          <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'flex-end' }}>
            {report ? (
              <Button variant="contained" startIcon={<AssessmentOutlined />} onClick={() => navigate(`/entrevistas/${report.id}`)}>
                Ver relatório
              </Button>
            ) : (
              <Button variant="contained" onClick={close}>
                Fechar
              </Button>
            )}
          </Stack>
        ) : take && !recording ? (
          <Stack sx={{ gap: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Ouça a sua resposta ({formatDuration(take.durationMs)}) antes de enviar:
            </Typography>
            <Box component="audio" controls src={take.url} sx={{ width: '100%', height: 40 }} />
            <Stack direction="row" sx={{ gap: 1.5, justifyContent: 'flex-end' }}>
              <Button startIcon={<MicRounded />} onClick={record} disabled={!!busy}>
                Regravar
              </Button>
              <Button variant="contained" startIcon={<SendRounded />} onClick={() => void sendAnswer()} disabled={!!busy}>
                Enviar resposta
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
            <Tooltip title={recording ? 'Parar gravação' : 'Gravar resposta'}>
              <span>
                <IconButton
                  onClick={recording ? recorder.stop : record}
                  disabled={!!recorder.unsupported || !!busy || !lastQuestion || recorder.status === 'requesting'}
                  aria-label={recording ? 'Parar gravação' : 'Gravar resposta'}
                  sx={{
                    width: 56,
                    height: 56,
                    color: 'common.white',
                    bgcolor: recording ? 'error.main' : 'primary.main',
                    '&:hover': { bgcolor: recording ? 'error.dark' : 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                    animation: recorder.status === 'recording' ? `${pulse} 1.5s infinite` : 'none',
                  }}
                >
                  {recording ? <StopRounded /> : <MicRounded />}
                </IconButton>
              </span>
            </Tooltip>

            <Box sx={{ flex: 1, minWidth: 0 }} aria-live="polite">
              {recorder.status === 'recording' ? (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                    Gravando… {formatDuration(recorder.elapsedMs)} / {formatDuration(MAX_ANSWER_MS)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Toque no botão vermelho quando terminar.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color={recorder.error || recorder.unsupported ? 'error' : 'text.secondary'}>
                  {recorder.unsupported ??
                    recorder.error ??
                    (recorder.status === 'requesting'
                      ? 'Aguardando permissão do microfone…'
                      : `Toque no microfone para gravar a sua resposta (até ${MAX_ANSWER_MS / 60000} minutos).`)}
                </Typography>
              )}
            </Box>

            {recording ? (
              <Button color="inherit" onClick={recorder.cancel}>
                Descartar
              </Button>
            ) : (
              canFinishEarly && (
                <Tooltip title="Encerrar a simulação agora (a análise precisa de todas as respostas)">
                  <Button startIcon={<FlagRounded />} onClick={finishEarly}>
                    Finalizar
                  </Button>
                </Tooltip>
              )
            )}
          </Stack>
        )}
      </Box>
    </Dialog>
  )
}

function Progress({ text }: { text: string }) {
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, color: 'text.secondary' }}>
      <CircularProgress size={14} />
      <Typography variant="caption">{text}</Typography>
    </Stack>
  )
}

type FinishedNoticeProps = {
  answered: number
  report: InterviewReport | null
  sendError: string | null
  onRetry: () => void
  onOpenReport: () => void
}

function FinishedNotice({ answered, report, sendError, onRetry, onOpenReport }: FinishedNoticeProps) {
  if (report) {
    return (
      <Alert
        icon={<CheckCircleRounded />}
        severity="success"
        action={
          <Button color="inherit" size="small" onClick={onOpenReport}>
            Ver relatório
          </Button>
        }
      >
        Respostas salvas e avaliadas
        {report.notaGeral !== null ? ` (nota geral ${report.notaGeral.toLocaleString('pt-BR')}/10)` : ''}.
      </Alert>
    )
  }
  if (sendError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" startIcon={<ReplayRounded />} onClick={onRetry}>
            Tentar de novo
          </Button>
        }
      >
        {sendError}
      </Alert>
    )
  }
  if (answered < QUESTIONS.length) {
    return (
      <Alert severity="info">
        Entrevista finalizada com {answered} de {QUESTIONS.length} respostas. A análise só é feita com todas as
        perguntas respondidas, então estas gravações não foram enviadas.
      </Alert>
    )
  }
  return null
}
