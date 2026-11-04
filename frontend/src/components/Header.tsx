import LogoutRounded from '@mui/icons-material/LogoutRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { displayName, useAuth } from '../auth/context'

type Props = { onMenuClick: () => void }

export function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const email = user?.email ?? ''
  const name = displayName(user)

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
    >
      <Toolbar sx={{ gap: 2, minHeight: { xs: 64 } }}>
        <IconButton edge="start" aria-label="Abrir menu" onClick={onMenuClick} sx={{ display: { md: 'none' } }}>
          <MenuRounded />
        </IconButton>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton aria-label="Notificações">
            <Badge color="primary" variant="dot">
              <NotificationsNoneOutlined />
            </Badge>
          </IconButton>

          <ButtonBase
            onClick={(e) => setAnchor(e.currentTarget)}
            aria-label="Menu do usuário"
            aria-haspopup="menu"
            sx={{ borderRadius: 999, pl: { sm: 1.5 }, pr: 0.5, py: 0.5, gap: 1.5 }}
          >
            <Typography variant="subtitle2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {name}
            </Typography>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 15, fontWeight: 600 }}>
              {name.charAt(0).toUpperCase()}
            </Avatar>
          </ButtonBase>

          <Menu
            anchorEl={anchor}
            open={anchor !== null}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 200 } } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Conectado como
              </Typography>
              <Typography variant="subtitle2" sx={{ wordBreak: 'break-all' }}>{email}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                setAnchor(null)
                logout()
                navigate('/login', { replace: true })
              }}
            >
              <ListItemIcon>
                <LogoutRounded fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
