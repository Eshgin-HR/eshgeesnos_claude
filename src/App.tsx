import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import DailyCheckin from './pages/DailyCheckin'
import StreakTracker from './pages/StreakTracker'
import NightlyAudit from './pages/NightlyAudit'
import WeeklyReview from './pages/WeeklyReview'
import BudgetTracker from './pages/BudgetTracker'
import QuickNotes from './pages/QuickNotes'
import Settings from './pages/Settings'
import HabitManager from './pages/HabitManager'
import EditHabit from './pages/EditHabit'
import BudgetSettings from './pages/BudgetSettings'
import DailyTasks from './pages/DailyTasks'

function AppRoutes() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: '#0A1628' }}>
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
          style={{ backgroundColor: '#1D9E75', color: '#0A1628' }}
        >
          E
        </div>
        <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#0A1628' }}>
        <div className="text-center flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: '#1D9E75', color: '#0A1628' }}
          >
            E
          </div>
          <p className="font-bold text-white text-xl">EshgeenOS</p>
          <p className="text-sm" style={{ color: '#ef4444' }}>
            Could not connect. Check your internet and reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg font-medium text-white"
            style={{ backgroundColor: '#1D9E75' }}
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
        <Route path="/tasks" element={<DailyTasks />} />
        <Route path="/today" element={<DailyCheckin />} />
        <Route path="/streaks" element={<StreakTracker />} />
        <Route path="/nightly" element={<NightlyAudit />} />
        <Route path="/weekly" element={<WeeklyReview />} />
        <Route path="/budget" element={<BudgetTracker />} />
        <Route path="/notes" element={<QuickNotes />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/habits" element={<HabitManager />} />
        <Route path="/settings/habits/:id" element={<EditHabit />} />
        <Route path="/settings/budget" element={<BudgetSettings />} />
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
