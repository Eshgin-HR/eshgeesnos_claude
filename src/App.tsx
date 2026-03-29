import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import DailyTasks from './pages/DailyTasks'
import Inbox from './pages/Inbox'
import ContextViews from './pages/ContextViews'
import DailyRituals from './pages/DailyRituals'
import NightlyAudit from './pages/NightlyAudit'
import WeeklyReview from './pages/WeeklyReview'
import WeeklyReflection from './pages/WeeklyReflection'
import Budget from './pages/Budget'
import QuickNotes from './pages/QuickNotes'
import StreakTracker from './pages/StreakTracker'
import Settings from './pages/Settings'
import HabitManager from './pages/HabitManager'
import EditHabit from './pages/EditHabit'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0F0F0F' }}>
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold"
          style={{ backgroundColor: '#378ADD', color: '#fff' }}
        >
          E
        </div>
        <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold"
            style={{ backgroundColor: '#378ADD', color: '#fff' }}
          >
            E
          </div>
          <p className="font-semibold" style={{ color: '#F5F5F5', fontSize: '18px' }}>EshgeenOS</p>
          <p style={{ fontSize: '14px', color: '#E24B4A' }}>
            Could not connect. Check your internet and reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-lg font-medium"
            style={{ backgroundColor: '#378ADD', color: '#fff', fontSize: '14px' }}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/tasks" element={<DailyTasks />} />
        <Route path="/context" element={<ContextViews />} />
        <Route path="/rituals" element={<DailyRituals />} />
        <Route path="/nightly" element={<NightlyAudit />} />
        <Route path="/weekly" element={<WeeklyReview />} />
        <Route path="/reflection" element={<WeeklyReflection />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/notes" element={<QuickNotes />} />
        <Route path="/streaks" element={<StreakTracker />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/habits" element={<HabitManager />} />
        <Route path="/settings/habits/:id" element={<EditHabit />} />
        <Route path="/*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
