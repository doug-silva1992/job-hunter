import CheckRounded from '@mui/icons-material/CheckRounded'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import FormHelperText from '@mui/material/FormHelperText'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import {
  JOB_AGE_OPTIONS,
  SENIORITY_LABELS,
  WORK_MODE_LABELS,
  type Settings,
} from '../../api/settings'
import { matchColor } from '../matchColor'
import { SettingsField, SettingsSection } from './SettingsSection'
import { TagInput } from './TagInput'

type Props = { value: Settings; onChange: (patch: Partial<Settings>) => void }

const PRESETS = [
  { label: 'Ampla', value: 50, hint: 'Mais vagas, inclusive as que pedem algo que você ainda não tem.' },
  { label: 'Equilibrada', value: 70, hint: 'Boa aderência sem perder oportunidades próximas do seu perfil.' },
  { label: 'Exigente', value: 85, hint: 'Só vagas muito alinhadas ao seu currículo.' },
]

const KEYWORD_SUGGESTIONS = [
  'Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'Dados', 'QA',
  'React', 'Angular', 'Vue', 'TypeScript', 'JavaScript', 'Node.js', 'NestJS',
  'Java', 'Spring', 'Python', 'C#', '.NET', 'Go', 'PHP', 'Kotlin', 'Swift',
  'AWS', 'Azure', 'Docker', 'Kubernetes', 'PostgreSQL',
]

const LOCATION_SUGGESTIONS = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR', 'Porto Alegre, RS',
  'Florianópolis, SC', 'Campinas, SP', 'Recife, PE', 'Brasília, DF', 'Exterior',
]

function describeMatch(value: number) {
  if (value === 0) return 'Todas as vagas encontradas serão exibidas, independentemente da compatibilidade.'
  return `Só vagas com ${value}% ou mais de compatibilidade com o seu currículo aparecem nas recomendações e geram alertas.`
}

function ToggleChips<T extends string>({
  options,
  selected,
  onChange,
  label,
}: {
  options: Record<T, string>
  selected: T[]
  onChange: (next: T[]) => void
  label: string
}) {
  const keys = Object.keys(options) as T[]
  return (
    <Stack direction="row" role="group" aria-label={label} sx={{ flexWrap: 'wrap', gap: 1 }}>
      {keys.map((key) => {
        const on = selected.includes(key)
        return (
          <Chip
            key={key}
            label={options[key]}
            icon={on ? <CheckRounded /> : undefined}
            color={on ? 'primary' : 'default'}
            variant={on ? 'filled' : 'outlined'}
            aria-pressed={on}
            onClick={() => onChange(on ? selected.filter((k) => k !== key) : keys.filter((k) => k === key || selected.includes(k)))}
          />
        )
      })}
    </Stack>
  )
}

export function SearchSettings({ value, onChange }: Props) {
  const color = matchColor(value.minMatch)
  const noWorkMode = value.workModes.length === 0

  return (
    <>
      <SettingsSection
        title="Compatibilidade das vagas"
        description="A IA compara cada vaga com o seu currículo principal e calcula um percentual de compatibilidade."
      >
        <Box sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: { xs: 2, sm: 4 }, alignItems: { sm: 'center' } }}>
            <Box sx={{ textAlign: { sm: 'center' }, minWidth: 120 }}>
              <Typography
                component="output"
                htmlFor="min-match"
                aria-live="polite"
                sx={{ display: 'block', fontSize: 44, fontWeight: 700, lineHeight: 1, color, letterSpacing: '-0.03em' }}
              >
                {value.minMatch}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                compatibilidade mínima
              </Typography>
            </Box>

            <Box sx={{ flex: 1, px: { xs: 1, sm: 0 } }}>
              <Slider
                id="min-match"
                value={value.minMatch}
                onChange={(_, v) => onChange({ minMatch: v as number })}
                min={0}
                max={100}
                step={5}
                marks={[0, 25, 50, 75, 100].map((v) => ({ value: v, label: `${v}%` }))}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v}%`}
                getAriaValueText={(v) => `${v}%`}
                aria-label="Compatibilidade mínima"
                sx={{ color }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {describeMatch(value.minMatch)}
              </Typography>
            </Box>
          </Stack>

          <Box
            sx={{
              mt: 3,
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
              gap: 1.5,
            }}
          >
            {PRESETS.map((p) => {
              const active = value.minMatch === p.value
              return (
                <Box
                  key={p.value}
                  component="button"
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ minMatch: p.value })}
                  sx={{
                    textAlign: 'left',
                    font: 'inherit',
                    color: 'inherit',
                    cursor: 'pointer',
                    p: 1.5,
                    borderRadius: 2,
                    border: 1,
                    borderColor: active ? 'primary.main' : 'divider',
                    bgcolor: (t) => (active ? alpha(t.palette.primary.main, 0.06) : t.palette.background.paper),
                    transition: 'border-color .15s, background-color .15s',
                    '&:hover': { borderColor: 'primary.main' },
                    '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                  }}
                >
                  <Typography variant="subtitle2">
                    {p.label} · <Box component="span" sx={{ color: matchColor(p.value) }}>{p.value}%</Box>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.hint}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Box>
      </SettingsSection>

      <SettingsSection title="Perfil da vaga" description="O que a busca deve procurar para você.">
        <SettingsField label="Cargos e palavras-chave" hint="Funções, tecnologias ou áreas de interesse." htmlFor="keywords">
          <TagInput
            id="keywords"
            value={value.keywords}
            onChange={(keywords) => onChange({ keywords })}
            suggestions={KEYWORD_SUGGESTIONS}
            placeholder="Ex.: Frontend, React"
            chipColor="primary"
          />
        </SettingsField>

        <SettingsField label="Senioridade" hint="Nenhuma selecionada = qualquer nível.">
          <ToggleChips
            label="Senioridade"
            options={SENIORITY_LABELS}
            selected={value.seniority}
            onChange={(seniority) => onChange({ seniority })}
          />
        </SettingsField>

        <SettingsField label="Modalidade de trabalho">
          <ToggleChips
            label="Modalidade de trabalho"
            options={WORK_MODE_LABELS}
            selected={value.workModes}
            onChange={(workModes) => onChange({ workModes })}
          />
          {noWorkMode && <FormHelperText error>Escolha pelo menos uma modalidade.</FormHelperText>}
        </SettingsField>

        <SettingsField label="Localidades" hint="Para vagas híbridas e presenciais. Vazio = qualquer local." htmlFor="locations">
          <TagInput
            id="locations"
            value={value.locations}
            onChange={(locations) => onChange({ locations })}
            suggestions={LOCATION_SUGGESTIONS}
            placeholder="Ex.: São Paulo, SP"
          />
        </SettingsField>

        <SettingsField label="Pretensão salarial mínima" hint="Valor mensal. Vagas sem salário informado não são descartadas." htmlFor="min-salary">
          <TextField
            id="min-salary"
            size="small"
            type="number"
            placeholder="Não informar"
            value={value.minSalary ?? ''}
            onChange={(e) => {
              const raw = e.target.value
              onChange({ minSalary: raw === '' ? null : Math.min(1_000_000, Math.max(0, Math.trunc(Number(raw)))) })
            }}
            sx={{ maxWidth: 240 }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">R$</InputAdornment> },
              htmlInput: { min: 0, max: 1_000_000, step: 500, inputMode: 'numeric' },
            }}
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection title="Filtros" description="Quais vagas devem ser descartadas.">
        <SettingsField label="Excluir vagas com" hint="Termos ou empresas que você não quer ver." htmlFor="excluded">
          <TagInput
            id="excluded"
            value={value.excludedKeywords}
            onChange={(excludedKeywords) => onChange({ excludedKeywords })}
            placeholder="Ex.: PHP, Empresa X"
            chipColor="error"
          />
        </SettingsField>

        <SettingsField label="Publicadas nos últimos" htmlFor="job-age">
          <TextField
            id="job-age"
            select
            size="small"
            value={value.maxJobAgeDays}
            onChange={(e) => onChange({ maxJobAgeDays: Number(e.target.value) })}
            sx={{ minWidth: 200 }}
          >
            {JOB_AGE_OPTIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {d === 1 ? '1 dia' : `${d} dias`}
              </MenuItem>
            ))}
          </TextField>
        </SettingsField>
      </SettingsSection>
    </>
  )
}
