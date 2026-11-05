import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { settingsApi, type Settings, type SettingsResponse } from '../api/settings'
import { useAuth } from '../auth/context'
import { AccountSettings } from '../components/settings/AccountSettings'
import { NotificationSettings } from '../components/settings/NotificationSettings'
import { SearchSettings } from '../components/settings/SearchSettings'

const TABS = [
  { id: 'busca', label: 'Busca de vagas' },
  { id: 'notificacoes', label: 'Notificações' },
  { id: 'conta', label: 'Conta' },
] as const
type TabId = (typeof TABS)[number]['id']

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Não foi possível concluir a operação.'

/**
 * Só os campos editáveis, um a um: campos extras (ex.: `searchFrequency` de sessões
 * antigas guardadas no navegador) seriam recusados pela API ao salvar.
 */
function toSettings(s: SettingsResponse): Settings {
  return {
    minMatch: s.minMatch,
    keywords: s.keywords,
    excludedKeywords: s.excludedKeywords,
    seniority: s.seniority,
    workModes: s.workModes,
    locations: s.locations,
    minSalary: s.minSalary,
    maxJobAgeDays: s.maxJobAgeDays,
    notifyNewJobs: s.notifyNewJobs,
    weeklySummary: s.weeklySummary,
  }
}

const sameSettings = (a: Settings, b: Settings) => JSON.stringify(a) === JSON.stringify(b)

function formatSaved(iso: string | null) {
  if (!iso) return 'Usando as configurações padrão.'
  const d = new Date(iso)
  return `Salvo em ${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
}

export function SettingsPage() {
  const { user, settings: sessionSettings, updateSettings } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: TabId = TABS.some((t) => t.id === params.get('aba')) ? (params.get('aba') as TabId) : 'busca'

  // começa com o que veio no login; só busca na API se a sessão ainda não tiver as preferências
  const [saved, setSaved] = useState<SettingsResponse | null>(sessionSettings)
  const [draft, setDraft] = useState<Settings | null>(() => (sessionSettings ? toSettings(sessionSettings) : null))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const hasInitial = sessionSettings !== null
  useEffect(() => {
    if (hasInitial && reloadKey === 0) return
    let active = true
    settingsApi
      .get()
      .then((res) => {
        if (!active) return
        setSaved(res)
        setDraft(toSettings(res))
        setLoadError(null)
        updateSettings(res)
      })
      .catch((err: unknown) => active && setLoadError(messageOf(err)))
    return () => {
      active = false
    }
    // só na montagem e no "Tentar novamente"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey])

  const dirty = saved !== null && draft !== null && !sameSettings(toSettings(saved), draft)
  const invalid = draft !== null && draft.workModes.length === 0

  // avisa antes de fechar/recarregar a aba com alterações não salvas
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const patch = (p: Partial<Settings>) => setDraft((prev) => (prev ? { ...prev, ...p } : prev))

  async function save() {
    if (!draft || invalid) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await settingsApi.save(draft)
      setSaved(res)
      setDraft(toSettings(res))
      // atualiza a sessão: vagas, dashboard e notificações passam a usar as novas preferências
      updateSettings(res)
      setToast('Configurações salvas e aplicadas.')
    } catch (err) {
      setSaveError(messageOf(err))
    } finally {
      setSaving(false)
    }
  }

  function discard() {
    if (saved) setDraft(toSettings(saved))
    setSaveError(null)
  }

  const preferencesTab = tab === 'busca' || tab === 'notificacoes'

  return (
    <>
      <Box>
        <Typography variant="h5" component="h1">
          Configurações
        </Typography>
        <Typography color="text.secondary">
          Defina quais vagas o Job Hunter deve buscar para você e como quer ser avisado.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: -1 }}>
        <Tabs
          value={tab}
          onChange={(_, value: TabId) => setParams(value === 'busca' ? {} : { aba: value }, { replace: true })}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Seções de configurações"
        >
          {TABS.map((t) => (
            <Tab key={t.id} value={t.id} label={t.label} id={`tab-${t.id}`} aria-controls={`panel-${t.id}`} />
          ))}
        </Tabs>
      </Box>

      <Box
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: 960 }}
      >
        {tab === 'conta' ? (
          <AccountSettings />
        ) : loadError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
                Tentar novamente
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : !draft ? (
          <Stack sx={{ alignItems: 'center', py: 8 }}>
            <CircularProgress size={28} aria-label="Carregando configurações" />
          </Stack>
        ) : tab === 'busca' ? (
          <SearchSettings value={draft} onChange={patch} />
        ) : (
          <NotificationSettings value={draft} email={user?.email ?? ''} onChange={patch} />
        )}
      </Box>

      {preferencesTab && draft && (
        <Paper
          variant="outlined"
          sx={{
            position: 'sticky',
            bottom: { xs: 12, md: 24 },
            maxWidth: 960,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 2,
            boxShadow: dirty ? '0 8px 24px rgba(16, 24, 40, 0.12)' : 'none',
            borderColor: dirty ? 'primary.main' : 'divider',
            transition: 'box-shadow .2s, border-color .2s',
          }}
        >
          <Typography
            variant="body2"
            color={saveError ? 'error.main' : 'text.secondary'}
            role="status"
            sx={{ flex: 1, minWidth: 200 }}
          >
            {saveError ?? (invalid ? 'Escolha pelo menos uma modalidade de trabalho.' : dirty ? 'Você tem alterações não salvas.' : formatSaved(saved?.updatedAt ?? null))}
          </Typography>
          <Stack direction="row" sx={{ gap: 1 }}>
            <Button onClick={discard} disabled={!dirty || saving}>
              Descartar
            </Button>
            <Button variant="contained" onClick={() => void save()} disabled={!dirty || invalid} loading={saving}>
              Salvar alterações
            </Button>
          </Stack>
        </Paper>
      )}

      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}
