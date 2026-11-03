import MenuRounded from '@mui/icons-material/MenuRounded'
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined'
import SearchRounded from '@mui/icons-material/SearchRounded'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { currentUser } from '../data/mock'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  onMenuClick: () => void
}

export function Header({ search, onSearchChange, onMenuClick }: Props) {
  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 2, minHeight: { xs: 64 } }}>
        <IconButton
          edge="start"
          aria-label="Abrir menu"
          onClick={onMenuClick}
          sx={{ display: { md: 'none' } }}
        >
          <MenuRounded />
        </IconButton>

        <TextField
          size="small"
          placeholder="Buscar vagas, empresas ou tecnologias…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 520,
            '& .MuiOutlinedInput-root': { bgcolor: 'background.default', borderRadius: 999 },
            '& fieldset': { borderColor: 'transparent' },
          }}
          slotProps={{
            htmlInput: { 'aria-label': 'Buscar vagas' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton aria-label="Notificações">
            <Badge color="primary" variant="dot">
              <NotificationsNoneOutlined />
            </Badge>
          </IconButton>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
              {currentUser.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentUser.title}
            </Typography>
          </Box>
          <Avatar
            alt={currentUser.name}
            src="https://i.pravatar.cc/80?img=12"
            sx={{ width: 38, height: 38, bgcolor: 'primary.main' }}
          >
            {initials}
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
