import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ApiStatus } from './ApiStatus'
import { Logo } from './Logo'

export const SIDEBAR_WIDTH = 248

const menu: { label: string; path: string; icon: ReactNode }[] = [
  { label: 'Dashboard', path: '/', icon: <DashboardOutlined /> },
  { label: 'Vagas', path: '/vagas', icon: <WorkOutlineOutlined /> },
  { label: 'Currículos', path: '/curriculos', icon: <DescriptionOutlined /> },
  { label: 'Configurações', path: '/configuracoes', icon: <SettingsOutlined /> },
]

type Props = { mobileOpen: boolean; onMobileClose: () => void }

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ px: 1, py: 1.5, mb: 2 }}>
        <Logo />
      </Box>

      <List component="nav" aria-label="Menu principal" sx={{ display: 'grid', gap: 0.5 }}>
        {menu.map((item) => (
          <ListItemButton
            key={item.path}
            selected={pathname === item.path}
            onClick={() => {
              navigate(item.path)
              onNavigate?.()
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontWeight: 500, fontSize: 14 } } }} />
          </ListItemButton>
        ))}
      </List>

      <Box sx={{ mt: 'auto', px: 1 }}>
        <ApiStatus />
      </Box>
    </Box>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: Props) {
  const paperSx = { width: SIDEBAR_WIDTH, boxSizing: 'border-box', borderColor: 'divider' } as const

  return (
    <Box component="aside" sx={{ width: { md: SIDEBAR_WIDTH }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': paperSx }}
      >
        <SidebarContent onNavigate={onMobileClose} />
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': paperSx }}
      >
        <SidebarContent />
      </Drawer>
    </Box>
  )
}
