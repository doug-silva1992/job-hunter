import Switch from '@mui/material/Switch'
import type { Settings } from '../../api/settings'
import { SettingsField, SettingsSection } from './SettingsSection'

type Props = { value: Settings; email: string; onChange: (patch: Partial<Settings>) => void }

export function NotificationSettings({ value, email, onChange }: Props) {
  return (
    <SettingsSection title="Notificações por e-mail" description={`Enviadas para ${email}.`}>
      <SettingsField
        label="Novas vagas compatíveis"
        hint={`Avisar quando a busca encontrar vagas com ${value.minMatch}% ou mais de compatibilidade.`}
        htmlFor="notify-new-jobs"
      >
        <Switch
          id="notify-new-jobs"
          checked={value.notifyNewJobs}
          onChange={(e) => onChange({ notifyNewJobs: e.target.checked })}
        />
      </SettingsField>
      <SettingsField
        label="Resumo semanal"
        hint="Toda segunda-feira: vagas da semana, candidaturas e entrevistas."
        htmlFor="weekly-summary"
      >
        <Switch
          id="weekly-summary"
          checked={value.weeklySummary}
          onChange={(e) => onChange({ weeklySummary: e.target.checked })}
        />
      </SettingsField>
    </SettingsSection>
  )
}
