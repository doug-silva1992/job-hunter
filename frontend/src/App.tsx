import { Navigate, Route, Routes } from 'react-router'
import { GuestOnly, RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { DashboardPage } from './pages/DashboardPage'
import { ResumesPage } from './pages/ResumesPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage key="login" mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage key="register" mode="register" /></GuestOnly>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="curriculos" element={<ResumesPage />} />
        <Route path="vagas" element={<ComingSoonPage title="Vagas" />} />
        <Route path="candidaturas" element={<ComingSoonPage title="Candidaturas" />} />
        <Route path="configuracoes" element={<ComingSoonPage title="Configurações" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
