import { Navigate, Route, Routes } from 'react-router'
import { GuestOnly, RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './components/AppLayout'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { InterviewReportPage } from './pages/InterviewReportPage'
import { InterviewsPage } from './pages/InterviewsPage'
import { JobsPage } from './pages/JobsPage'
import { ResumesPage } from './pages/ResumesPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><AuthPage key="login" mode="login" /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><AuthPage key="register" mode="register" /></GuestOnly>} />

      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="curriculos" element={<ResumesPage />} />
        <Route path="vagas" element={<JobsPage />} />
        <Route path="entrevistas" element={<InterviewsPage />} />
        <Route path="entrevistas/:id" element={<InterviewReportPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
