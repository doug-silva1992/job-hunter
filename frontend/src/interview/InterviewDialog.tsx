import CloseRounded from '@mui/icons-material/CloseRounded'
import MicOffRounded from '@mui/icons-material/MicOffRounded'
import MicRounded from '@mui/icons-material/MicRounded'
import ReplayRounded from '@mui/icons-material/ReplayRounded'
import SendRounded from '@mui/icons-material/SendRounded'
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
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { keyframes, useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Job } from '../api/jobs'
import { CompanyAvatar } from '../components/CompanyAvatar'
import { interviewer, type InterviewMessage } from './interviewer'
import { useSpeechRecognition, useSpeechSynthesis } from './speech'

type Message = InterviewMessage & { id: number }

let seq = 0
const message = (role: Message['role'], text: string): Message => ({ id: ++seq, role, text })

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(201, 55, 44, .45); }
  70% { box-shadow: 0 0 0 12px rgba(201, 55, 44, 0); }
  100% { box-shadow: 0 0 0 0 rgba(201, 55, 44, 0); }
`

type Props = { job: Job; onClose: () => void }

/** Simulação de entrevista por voz para uma vaga. Montar só quando aberta (o estado zera a cada abertura). */
export function InterviewDialog({ job, onClose }: Props) {
  const theme = useTheme()
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'))

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [thinking, setThinking] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [voiceOn, setVoiceOn] = useState(true)

  const tts = useSpeechSynthesis()
  const appendDraft = useCallback((text: string) => setDraft((d) => (d ? `${d} ${text}` : text)), [])
  const mic = useSpeechRecognition(appendDraft)

  // respostas de uma sessão anterior (reinício/fechamento) são ignoradas
  const sessionRef = useRef(0)
  const voiceRef = useRef(voiceOn)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    voiceRef.current = voiceOn
  }, [voiceOn])

  const { speak, cancel } = tts
  const ask = useCallback(
    (history: InterviewMessage[]) => {
      const session = sessionRef.current
      interviewer(job, history)
        .then((turn) => {
          if (session !== sessionRef.current) return
          setMessages((m) => [...m, message('interviewer', turn.message)])
          setDone(turn.done)
          if (voiceRef.current) speak(turn.message)
        })
        .catch(() => session === sessionRef.current && setError('O entrevistador não respondeu. Tente enviar de novo.'))
        .finally(() => session === sessionRef.current && setThinking(false))
    },
    [job, speak],
  )

  useEffect(() => {
    const session = sessionRef // contador, não um nó do DOM
    ask([])
    return () => {
      session.current++
    }
  }, [ask])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, thinking])

  const send = () => {
    const text = draft.trim()
    if (!text || thinking || done) return
    mic.stop()
    cancel()
    const history = [...messages, message('candidate', text)]
    setMessages(history)
    setDraft('')
    setError(null)
    setThinking(true)
    ask(history.map(({ role, text }) => ({ role, text })))
  }

  const toggleMic = () => {
    if (mic.listening) {
      mic.stop()
    } else {
      cancel() // não captar a própria voz do entrevistador
      mic.start()
    }
  }

  const restart = () => {
    sessionRef.current++
    mic.stop()
    cancel()
    setMessages([])
    setDraft('')
    setDone(false)
    setError(null)
    setThinking(true)
    ask([])
  }

  const close = () => {
    mic.stop()
    cancel()
    onClose()
  }

  const toggleVoice = () => {
    if (voiceOn) cancel()
    setVoiceOn(!voiceOn)
  }

  return (
    <Dialog
      open
      onClose={close}
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
        {tts.supported && (
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
        Modo de treino: perguntas de um roteiro baseado na vaga. O entrevistador com IA ainda está em desenvolvimento.
      </Alert>
      <Divider />

      <Box
        role="log"
        aria-live="polite"
        aria-label="Conversa da entrevista"
        sx={{ flex: 1, overflowY: 'auto', bgcolor: 'background.default', px: 2, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {messages.map((m) => {
          const mine = m.role === 'candidate'
          return (
            <Stack
              key={m.id}
              direction="row"
              sx={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '85%', alignItems: 'flex-end', gap: 0.5 }}
            >
              <Box
                sx={{
                  px: 1.75,
                  py: 1.25,
                  borderRadius: 3,
                  borderBottomRightRadius: mine ? 4 : undefined,
                  borderBottomLeftRadius: mine ? undefined : 4,
                  bgcolor: mine ? 'primary.main' : 'background.paper',
                  color: mine ? 'primary.contrastText' : 'text.primary',
                  border: mine ? 'none' : 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, opacity: 0.8 }}>
                  {mine ? 'Você' : 'Entrevistador'}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {m.text}
                </Typography>
              </Box>
              {!mine && tts.supported && (
                <Tooltip title="Ouvir de novo">
                  <IconButton size="small" onClick={() => speak(m.text)} aria-label="Ouvir esta pergunta de novo">
                    <VolumeUpRounded sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )
        })}

        {thinking && (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, color: 'text.secondary' }}>
            <CircularProgress size={14} />
            <Typography variant="caption">O entrevistador está pensando…</Typography>
          </Stack>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <div ref={endRef} />
      </Box>

      <Divider />
      {done ? (
        <Stack direction="row" sx={{ p: 2, gap: 1.5, alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            Simulação encerrada.
          </Typography>
          <Button startIcon={<ReplayRounded />} onClick={restart}>
            Recomeçar
          </Button>
          <Button variant="contained" onClick={close}>
            Fechar
          </Button>
        </Stack>
      ) : (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" sx={{ gap: 1.5, alignItems: 'flex-end' }}>
            <Tooltip title={!mic.supported ? 'Reconhecimento de voz indisponível neste navegador' : mic.listening ? 'Parar de ouvir' : 'Responder falando'}>
              <span>
                <IconButton
                  onClick={toggleMic}
                  disabled={!mic.supported || thinking}
                  aria-pressed={mic.listening}
                  aria-label={mic.listening ? 'Parar de ouvir' : 'Responder falando'}
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'common.white',
                    bgcolor: mic.listening ? 'error.main' : 'primary.main',
                    '&:hover': { bgcolor: mic.listening ? 'error.dark' : 'primary.dark' },
                    '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                    animation: mic.listening ? `${pulse} 1.5s infinite` : 'none',
                  }}
                >
                  {mic.supported ? <MicRounded /> : <MicOffRounded />}
                </IconButton>
              </span>
            </Tooltip>

            <TextField
              fullWidth
              multiline
              maxRows={5}
              size="small"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={mic.listening ? 'Ouvindo… fale a sua resposta' : mic.supported ? 'Fale ou digite a sua resposta' : 'Digite a sua resposta'}
              slotProps={{ htmlInput: { 'aria-label': 'Sua resposta' } }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' } }}
            />

            <Tooltip title="Enviar resposta">
              <span>
                <IconButton
                  color="primary"
                  onClick={send}
                  disabled={!draft.trim() || thinking}
                  aria-label="Enviar resposta"
                  sx={{ width: 48, height: 48 }}
                >
                  <SendRounded />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>

          <Typography
            variant="caption"
            color={mic.error ? 'error' : 'text.secondary'}
            sx={{ display: 'block', mt: 1, minHeight: 20 }}
            aria-live="polite"
          >
            {mic.error ??
              (mic.listening
                ? mic.interim || 'Ouvindo… toque no microfone de novo quando terminar.'
                : mic.supported
                  ? 'Toque no microfone para responder falando. Revise o texto e envie.'
                  : 'Seu navegador não reconhece voz (use Chrome ou Edge). Você pode digitar a resposta.')}
          </Typography>
        </Box>
      )}
    </Dialog>
  )
}
