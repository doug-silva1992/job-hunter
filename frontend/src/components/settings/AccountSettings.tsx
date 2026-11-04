import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { usersApi } from '../../api/users'
import { EMAIL_RULE, normalizeEmail, PASSWORD_MIN, USERNAME_RULE, useAuth } from '../../auth/context'
import { SettingsField, SettingsSection } from './SettingsSection'

const messageOf = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Não foi possível concluir a operação.'

type Feedback = { type: 'success' | 'error'; text: string } | null

function ProfileForm() {
  const { user, updateUser } = useAuth()
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const emailChanged = normalizeEmail(email) !== user?.email
  const usernameChanged = username.trim() !== user?.username
  const usernameError = usernameChanged && !USERNAME_RULE.test(username.trim())
    ? 'Use de 3 a 30 caracteres: letras, números, ponto, hífen ou underline.'
    : null
  const emailError = emailChanged && !EMAIL_RULE.test(normalizeEmail(email)) ? 'Informe um e-mail válido.' : null
  const canSave = (emailChanged || usernameChanged) && !usernameError && !emailError && (!emailChanged || currentPassword)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setFeedback(null)
    try {
      const updated = await usersApi.update({
        username: usernameChanged ? username.trim() : undefined,
        email: emailChanged ? normalizeEmail(email) : undefined,
        currentPassword: emailChanged ? currentPassword : undefined,
      })
      updateUser(updated)
      setUsername(updated.username)
      setEmail(updated.email)
      setCurrentPassword('')
      setFeedback({ type: 'success', text: 'Perfil atualizado.' })
    } catch (err) {
      setFeedback({ type: 'error', text: messageOf(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title="Perfil" description="Como você aparece no Job Hunter e onde recebe os avisos.">
      <Box component="form" noValidate onSubmit={submit}>
        <SettingsField label="Nome de usuário" htmlFor="username">
          <TextField
            id="username"
            size="small"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={Boolean(usernameError)}
            helperText={usernameError}
            autoComplete="username"
          />
        </SettingsField>
        <SettingsField label="E-mail" htmlFor="email">
          <TextField
            id="email"
            size="small"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={Boolean(emailError)}
            helperText={emailError}
            autoComplete="email"
          />
        </SettingsField>
        {emailChanged && (
          <SettingsField label="Senha atual" hint="Necessária para trocar o e-mail." htmlFor="profile-current-password">
            <TextField
              id="profile-current-password"
              size="small"
              type="password"
              fullWidth
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </SettingsField>
        )}
        <Stack direction="row" sx={{ py: 2, gap: 2, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {feedback && (
            <Alert severity={feedback.type} sx={{ py: 0, flex: 1, minWidth: 220 }}>
              {feedback.text}
            </Alert>
          )}
          <Button type="submit" variant="contained" disabled={!canSave} loading={saving}>
            Salvar perfil
          </Button>
        </Stack>
      </Box>
    </SettingsSection>
  )
}

function PasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const tooShort = next.length > 0 && next.length < PASSWORD_MIN
  const mismatch = confirm.length > 0 && confirm !== next
  const canSave = current && next.length >= PASSWORD_MIN && confirm === next

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setFeedback(null)
    try {
      await usersApi.update({ currentPassword: current, newPassword: next })
      setCurrent('')
      setNext('')
      setConfirm('')
      setFeedback({ type: 'success', text: 'Senha alterada.' })
    } catch (err) {
      setFeedback({ type: 'error', text: messageOf(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title="Senha">
      <Box component="form" noValidate onSubmit={submit}>
        <SettingsField label="Senha atual" htmlFor="current-password">
          <TextField
            id="current-password"
            size="small"
            type="password"
            fullWidth
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </SettingsField>
        <SettingsField label="Nova senha" hint={`Pelo menos ${PASSWORD_MIN} caracteres.`} htmlFor="new-password">
          <TextField
            id="new-password"
            size="small"
            type="password"
            fullWidth
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={tooShort}
            helperText={tooShort ? `A senha deve ter pelo menos ${PASSWORD_MIN} caracteres.` : undefined}
            autoComplete="new-password"
          />
        </SettingsField>
        <SettingsField label="Confirmar nova senha" htmlFor="confirm-password">
          <TextField
            id="confirm-password"
            size="small"
            type="password"
            fullWidth
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch}
            helperText={mismatch ? 'As senhas não conferem.' : undefined}
            autoComplete="new-password"
          />
        </SettingsField>
        <Stack direction="row" sx={{ py: 2, gap: 2, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {feedback && (
            <Alert severity={feedback.type} sx={{ py: 0, flex: 1, minWidth: 220 }}>
              {feedback.text}
            </Alert>
          )}
          <Button type="submit" variant="contained" disabled={!canSave} loading={saving}>
            Alterar senha
          </Button>
        </Stack>
      </Box>
    </SettingsSection>
  )
}

function DeleteAccount() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirmed = typed.trim().toLowerCase() === user?.username.toLowerCase()

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await usersApi.remove()
      logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(messageOf(err))
      setDeleting(false)
    }
  }

  const close = () => {
    if (deleting) return
    setOpen(false)
    setTyped('')
    setError(null)
  }

  return (
    <SettingsSection title="Zona de perigo" tone="danger">
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ py: 2, gap: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="subtitle2">Excluir conta</Typography>
          <Typography variant="body2" color="text.secondary">
            Remove permanentemente sua conta, currículos, vagas e configurações.
          </Typography>
        </Box>
        <Button color="error" variant="outlined" onClick={() => setOpen(true)} sx={{ flexShrink: 0 }}>
          Excluir conta
        </Button>
      </Stack>

      <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
        <DialogTitle>Excluir conta?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Esta ação não pode ser desfeita. Para confirmar, digite seu nome de usuário: <strong>{user?.username}</strong>
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            slotProps={{ htmlInput: { 'aria-label': 'Nome de usuário para confirmar' } }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={deleting}>
            Cancelar
          </Button>
          <Button color="error" variant="contained" disabled={!confirmed} loading={deleting} onClick={() => void remove()}>
            Excluir permanentemente
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSection>
  )
}

export function AccountSettings() {
  return (
    <>
      <ProfileForm />
      <PasswordForm />
      <DeleteAccount />
    </>
  )
}
