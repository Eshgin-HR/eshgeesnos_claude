import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Flame, Moon, BarChart2, Wallet, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Stats {
  habitsTotal: number
  habitsDone: number
  streak: number
  todaySpend: number
  lastEmotion: string | null
  nightlyDone: boolean
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

const CARDS = [
  { to: '/today', icon: Sun, label: 'Daily Check-in', color: '#1D9E75', desc: 'Log your habits' },
  { to: '/streaks', icon: Flame, label: 'Streaks', color: '#EF9F27', desc: 'Track consistency' },
  { to: '/nightly', icon: Moon, label: 'Nightly Audit', color: '#7F77DD', desc: 'Reflect on the day' },
  { to: '/weekly', icon: BarChart2, label: 'Weekly Review', color: '#1D9E75', desc: 'Big picture view' },
  { to: '/budget', icon: Wallet, label: 'Budget', color: '#EF9F27', desc: 'Track spending' },
  { to: '/notes', icon: FileText, label: 'Notes', color: '#7F77DD', desc: 'Quick capture' },
]

const EMOTION_COLORS: Record<string, string> = {
  Good: '#1D9E75',
  Energized: '#EF9F27',
  Neutral: '#8a8a8a',
  Hard: '#EF4444',
  Tired: '#7F77DD',
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats>({
    habitsTotal: 0,
    habitsDone: 0,
    streak: 0,
    todaySpend: 0,
    lastEmotion: null,
    nightlyDone: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadStats()
  }, [user])

  async function loadStats() {
    const today = todayStr()

    const [habitsRes, checkinRes, spendRes, nightlyRes] = await Promise.all([
      supabase.from('habits').select('id').eq('user_id', user!.id).eq('active', true),
      supabase.from('daily_checkins').select('habit_id, completed').eq('user_id', user!.id).eq('date', today),
      supabase.from('expenses').select('amount').eq('user_id', user!.id).eq('date', today),
      supabase.from('nightly_audits').select('emotion_tag').eq('user_id', user!.id).eq('date', today).maybeSingle(),
    ])

    const habitsTotal = habitsRes.data?.length ?? 0
    const habitsDone = checkinRes.data?.filter(c => c.completed).length ?? 0
    const todaySpend = spendRes.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0
    const lastEmotion = nightlyRes.data?.emotion_tag ?? null
    const nightlyDone = !!nightlyRes.data

    // Simple streak: count consecutive days with at least 1 completed habit
    const streak = await calcStreak(user!.id)

    setStats({ habitsTotal, habitsDone, streak, todaySpend, lastEmotion, nightlyDone })
    setLoading(false)
  }

  async function calcStreak(userId: string): Promise<number> {
    const { data } = await supabase
      .from('daily_checkins')
      .select('date, completed')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('date', { ascending: false })
      .limit(100)

    if (!data || data.length === 0) return 0

    const days = [...new Set(data.map(r => r.date))].sort().reverse()
    let streak = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    for (const day of days) {
      const d = new Date(day + 'T00:00:00')
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
      if (diff > 1) break
      streak++
      cursor = d
    }
    return streak
  }

  const progress = stats.habitsTotal > 0 ? stats.habitsDone / stats.habitsTotal : 0
  const circumference = 2 * Math.PI * 28
  const strokeDash = circumference * progress

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm mb-1" style={{ color: '#787774' }}>{dateLabel}</p>
        <h1 className="text-2xl font-bold">{greeting()}, Eshgin</h1>
      </div>

      {/* Top stats row */}
      {loading ? (
        <div className="flex gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 h-24 rounded-xl animate-pulse" style={{ backgroundColor: '#f7f7f5' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {/* Habit progress */}
          <div
            className="rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
            onClick={() => navigate('/today')}
          >
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="#e3e3e0" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                stroke="#1D9E75" strokeWidth="5"
                strokeDasharray={`${strokeDash} ${circumference}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
              <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#37352f">
                {stats.habitsDone}/{stats.habitsTotal}
              </text>
            </svg>
            <span className="text-xs" style={{ color: '#787774' }}>Habits</span>
          </div>

          {/* Streak */}
          <div
            className="rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
            onClick={() => navigate('/streaks')}
          >
            <Flame size={24} color="#EF9F27" />
            <span className="text-2xl font-bold">{stats.streak}</span>
            <span className="text-xs" style={{ color: '#787774' }}>Day streak</span>
          </div>

          {/* Today's spend */}
          <div
            className="rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
            onClick={() => navigate('/budget')}
          >
            <Wallet size={24} color="#7F77DD" />
            <span className="text-2xl font-bold">
              {stats.todaySpend === 0 ? '—' : `₼${stats.todaySpend.toFixed(0)}`}
            </span>
            <span className="text-xs" style={{ color: '#787774' }}>Spent today</span>
          </div>
        </div>
      )}

      {/* Nightly audit status */}
      {!loading && (
        <button
          onClick={() => navigate('/nightly')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{
            backgroundColor: stats.nightlyDone ? '#0d2b1f' : '#f7f7f5',
            border: `1px solid ${stats.nightlyDone ? '#1D9E75' : '#e3e3e0'}`,
          }}
        >
          <div className="flex items-center gap-3">
            {stats.nightlyDone ? (
              <CheckCircle2 size={18} color="#1D9E75" />
            ) : (
              <Moon size={18} color="#7F77DD" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">
                {stats.nightlyDone ? 'Nightly audit done' : 'Nightly audit pending'}
              </p>
              {stats.lastEmotion && (
                <p className="text-xs" style={{ color: EMOTION_COLORS[stats.lastEmotion] ?? '#8a8a8a' }}>
                  Feeling: {stats.lastEmotion}
                </p>
              )}
              {!stats.nightlyDone && (
                <p className="text-xs" style={{ color: '#787774' }}>Tap to reflect on today</p>
              )}
            </div>
          </div>
          <ArrowRight size={16} color="#8a8a8a" />
        </button>
      )}

      {/* Module cards */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#787774' }}>
          Modules
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CARDS.map(({ to, icon: Icon, label, color, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex flex-col gap-3 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '22' }}
              >
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#787774' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
