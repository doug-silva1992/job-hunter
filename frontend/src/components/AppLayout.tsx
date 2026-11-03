import Box from '@mui/material/Box'
import { useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export type LayoutContext = { search: string }

export function AppLayout() {
  const [search, setSearch] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header
          search={search}
          onSearchChange={setSearch}
          showSearch={pathname === '/'}
          onMenuClick={() => setMobileOpen(true)}
        />
        <Box
          component="main"
          sx={{
            p: { xs: 2, md: 3 },
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignContent: 'start',
            gap: 3,
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
          }}
        >
          <Outlet context={{ search } satisfies LayoutContext} />
        </Box>
      </Box>
    </Box>
  )
}
