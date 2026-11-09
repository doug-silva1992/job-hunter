import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined'
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import type { JobAtsResult } from '../api/jobs'
import type { AtsResult } from '../api/resumes'

type Props = {
  open: boolean
  fileName: string
  ats: AtsResult | null
  onClose: () => void
}

function scoreColor(score: number) {
  if (score >= 75) return 'success.main'
  if (score >= 50) return 'warning.main'
  return 'error.main'
}

function Score({ value }: { value: number }) {
  const score = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <CircularProgress variant="determinate" value={100} size={88} thickness={4} sx={{ color: 'action.hover' }} />
      <CircularProgress
        variant="determinate"
        value={score}
        size={88}
        thickness={4}
        sx={{ color: scoreColor(score), position: 'absolute', left: 0 }}
        aria-label={`Nota ATS ${score} de 100`}
      />
      <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 700, lineHeight: 1 }}>
          {score}
          <Typography component="span" variant="caption" color="text.secondary">
            /100
          </Typography>
        </Typography>
      </Box>
    </Box>
  )
}

/** O JSON vem do n8n: só aceita listas de textos não vazios. */
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : []
}

function Chips({ title, items, color }: { title: string; items: unknown; color?: 'success' | 'warning' }) {
  const list = strings(items)
  if (!list.length) return null
  return (
    <Box component="section">
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        {list.map((t) => (
          <Chip key={t} label={t} size="small" variant="outlined" color={color} />
        ))}
      </Stack>
    </Box>
  )
}

function Section({ title, icon, color, items: raw }: { title: string; icon: ReactNode; color: string; items?: unknown }) {
  const items = strings(raw)
  if (!items.length) return null
  return (
    <Box component="section">
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1, color }}>
        {icon}
        <Typography variant="subtitle2" component="h3" color="text.primary">
          {title}
        </Typography>
      </Stack>
      <Box component="ul" sx={{ m: 0, pl: 3.5, display: 'grid', gap: 0.75 }}>
        {items.map((item) => (
          <Typography key={item} component="li" variant="body2">
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}

/** Nota, classificação e listas de uma análise de ATS (do currículo ou da vaga x currículo). */
export function AtsReport({
  ats,
  scoreLabel = 'Compatibilidade com ATS',
}: {
  ats: AtsResult & JobAtsResult
  scoreLabel?: string
}) {
  const score = typeof ats.atsScore === 'number' ? ats.atsScore : null
  const classificacao = typeof ats.classificacao === 'string' ? ats.classificacao : null
  const resumo = typeof ats.resumo === 'string' ? ats.resumo : null
  return (
    <Stack sx={{ gap: 3 }}>
      {(score !== null || classificacao) && (
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2.5 }}>
          {score !== null && <Score value={score} />}
          <Box>
            <Typography variant="overline" color="text.secondary">
              {scoreLabel}
            </Typography>
            {classificacao && <Typography variant="subtitle1">{classificacao}</Typography>}
          </Box>
        </Stack>
      )}

      {resumo && <Typography variant="body2">{resumo}</Typography>}

      <Chips title="Palavras-chave da vaga no currículo" items={ats.palavrasChaveEncontradas} color="success" />
      <Chips title="Palavras-chave da vaga ausentes no currículo" items={ats.palavrasChaveFaltando} color="warning" />

      <Section
        title="Pontos fortes"
        icon={<CheckCircleOutlineRounded fontSize="small" />}
        color="success.main"
        items={ats.pontosFortes}
      />
      <Section
        title="Pontos fracos"
        icon={<ReportProblemOutlined fontSize="small" />}
        color="warning.main"
        items={ats.pontosFracos}
      />
      <Section
        title="Sugestões"
        icon={<LightbulbOutlined fontSize="small" />}
        color="primary.main"
        items={ats.sugestoes}
      />

      <Chips title="Tecnologias identificadas" items={ats.tecnologiasIdentificadas} />
    </Stack>
  )
}

export function AtsDialog({ open, fileName, ats, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pb: 0.5 }}>Avaliação do currículo</DialogTitle>
      <Typography variant="body2" color="text.secondary" noWrap sx={{ px: 3, pb: 2 }}>
        {fileName}
      </Typography>
      <DialogContent dividers>
        {!ats ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            Este currículo ainda não foi avaliado.
          </Typography>
        ) : (
          <AtsReport ats={ats} />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  )
}
