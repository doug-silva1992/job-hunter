import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router'
import { PASSWORD_MIN, useAuth, validateCredentials, validateRegistration } from '../auth/context'
import { Logo } from '../components/Logo'

type Mode = 'login' | 'register'

const copy = {
  login: {
    title: 'Entrar',
    subtitle: 'Acesse sua conta para acompanhar suas vagas.',
    submit: 'Entrar',
    switchText: 'Ainda não tem conta?',
    switchLink: 'Criar conta',
    switchTo: '/register',
  },
  register: {
    title: 'Criar conta',
    subtitle: 'Leva menos de um minuto. Só precisamos de alguns dados básicos.',
    submit: 'Criar conta',
    switchText: 'Já tem uma conta?',
    switchLink: 'Entrar',
    switchTo: '/login',
  },
} as const

const highlights = [
  'Vagas classificadas por aderência ao seu perfil',
  'Sugestão do melhor currículo para cada oportunidade',
  'Todas as candidaturas em um único painel',
]

export function AuthPage({ mode }: { mode: Mode }) {
  const t = copy[mode]
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isRegister = mode === 'register'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () =>
    isRegister ? validateRegistration(username, email, password) : validateCredentials(email, password)
  const errors = touched ? validate() : {}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(validate()).length) return

    setSubmitting(true)
    setError(null)
    try {
      if (isRegister) await register(username, email, password)
      else await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/login' ? from : '/', { replace: true })
    } catch {
      setError('Não foi possível concluir. Tente novamente.')
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      {/* Painel institucional (somente desktop) */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          px: 8,
          color: 'primary.contrastText',
          background: 'linear-gradient(145deg, #0A66C2 0%, #004182 100%)',
        }}
      >
        <Typography variant="h4" component="p" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 2, maxWidth: 440 }}>
          Encontre a vaga certa, mais rápido.
        </Typography>
        <Typography sx={{ opacity: 0.85, mb: 4, maxWidth: 440 }}>
          O Job Hunter usa IA para buscar, analisar e organizar oportunidades de tecnologia para você.
        </Typography>
        <Stack sx={{ gap: 1.5 }}>
          {highlights.map((h) => (
            <Stack key={h} direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
              <CheckCircleOutlineRounded fontSize="small" />
              <Typography variant="body2">{h}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Formulário */}
      <Box sx={{ display: 'grid', placeItems: 'center', p: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
          <Box sx={{ mb: 3 }}>
            <Logo />
          </Box>
          <Typography variant="h5" component="h1">
            {t.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            {t.subtitle}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" noValidate onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            {isRegister && (
              <TextField
                label="Nome de usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                fullWidth
                error={!!errors.username}
                helperText={errors.username}
                slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false } }}
              />
            )}
            <TextField
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus={!isRegister}
              fullWidth
              error={!!errors.email}
              helperText={errors.email}
              slotProps={{ htmlInput: { inputMode: 'email', autoCapitalize: 'none', spellCheck: false } }}
            />
            <TextField
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              fullWidth
              error={!!errors.password}
              helperText={errors.password ?? (isRegister ? `Mínimo de ${PASSWORD_MIN} caracteres.` : undefined)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button type="submit" variant="contained" size="large" loading={submitting} sx={{ mt: 1 }}>
              {t.submit}
            </Button>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            {t.switchText}{' '}
            <Link component={RouterLink} to={t.switchTo} sx={{ fontWeight: 600 }}>
              {t.switchLink}
            </Link>
          </Typography>
        </Card>
      </Box>
    </Box>
  )
}
