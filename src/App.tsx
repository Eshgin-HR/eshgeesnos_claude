import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import DailyCheckin from './pages/DailyCheckin'
import StreakTracker from './pages/StreakTracker'
import NightlyAudit from './pages/NightlyAudit'
import WeeklyReview from './pages/WeeklyReview'
import BudgetTracker from './pages/BudgetTracker'
import QuickNotes from './pages/QuickNotes'
import Settings from './pages/Settings'
import HabitManager from './pages/HabitManager'
import EditHabit from './pages/EditHabit'

function ProtectedRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return (
    <Layout>
      <Routes>
        <Route path="/today" element={<DailyCheckin />} />
        <Route path="/streaks" element={<StreakTracker />} />
        <Route path="/nightly" element={<NightlyAudit />} />
        <Route path="/weekly" element={<WeeklyReview />} />
        <Route path="/budget" element={<BudgetTracker />} />
        <Route path="/notes" element={<QuickNotes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/habits" element={<HabitManager />} />
        <Route path="/settings/habits/:id" element={<EditHabit />} />
        <Route path="/" element={<Navigate to="/today" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function LoginWrapper() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/today" replace />
  return <Login />
}
