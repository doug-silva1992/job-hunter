import AssignmentTurnedInOutlined from '@mui/icons-material/AssignmentTurnedInOutlined'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import TravelExploreOutlined from '@mui/icons-material/TravelExploreOutlined'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { ApiStatus } from './ApiStatus'

export const SIDEBAR_WIDTH = 248

const menu: { label: string; icon: ReactNode }[] = [
  { label: 'Dashboard', icon: <DashboardOutlined /> },
  { label: 'Vagas', icon: <WorkOutlineOutlined /> },
  { label: 'Currículos', icon: <DescriptionOutlined /> },
  { label: 'Candidaturas', icon: <AssignmentTurnedInOutlined /> },
  { label: 'Configurações', icon: <SettingsOutlined /> },
]

type Props = {
  selected: string
  onSelect: (label: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

function SidebarContent({ selected, onSelect }: Pick<Props, 'selected' | 'onSelect'>) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 1.5, mb: 2 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <TravelExploreOutlined fontSize="small" />
        </Box>
        <Typography variant="h6" component="span">
          Job Hunter
        </Typography>
      </Box>

      <List component="nav" aria-label="Menu principal" sx={{ display: 'grid', gap: 0.5 }}>
        {menu.map((item) => (
          <ListItemButton
            key={item.label}
            selected={selected === item.label}
            onClick={() => onSelect(item.label)}
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

export function Sidebar({ selected, onSelect, mobileOpen, onMobileClose }: Props) {
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
        <SidebarContent
          selected={selected}
          onSelect={(label) => {
            onSelect(label)
            onMobileClose()
          }}
        />
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{ display: { xs: 'none', md: 'block' }, '& .MuiDrawer-paper': paperSx }}
      >
        <SidebarContent selected={selected} onSelect={onSelect} />
      </Drawer>
    </Box>
  )
}
