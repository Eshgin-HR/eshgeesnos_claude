import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Habit } from '../lib/supabase'

interface StreakData {
  habit: Habit
  currentStreak: number
  bestStreak: number
  last14: boolean[]
}

interface WeekDay {
  day: string
  pct: number
}

export default function StreakTracker() {
  const { user } = useAuth()
  const [streaks, setStreaks] = useState<StreakData[]>([])
  const [heatmap, setHeatmap] = useState<{ date: string; pct: number }[]>([])
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [allTime, setAllTime] = useState({ totalCheckins: 0, longestStreak: 0, bestWeek: 0 })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return

    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .eq('streak_tracking', true)
      .order('sort_order')

    if (!habits) { setLoading(false); return }

    // Last 30 days
    const days30: string[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      days30.push(d.toISOString().split('T')[0])
    }

    const { data: logs } = await supabase
      .from('daily_checkins')
      .select('habit_id, date, completed')
      .eq('user_id', user.id)
      .in('date', days30)

    const logMap: Record<string, Record<string, boolean>> = {}
    logs?.forEach((l: { habit_id: string; date: string; completed: boolean }) => {
      if (!logMap[l.date]) logMap[l.date] = {}
      logMap[l.date][l.habit_id] = l.completed
    })

    // Heatmap
    const scoringHabits = (habits as Habit[]).filter(h => h.counts_toward_score)
    const hm = days30.map(date => {
      const done = scoringHabits.filter(h => logMap[date]?.[h.id]).length
      const pct = scoringHabits.length > 0 ? (done / scoringHabits.length) * 100 : 0
      return { date, pct }
    })
    setHeatmap(hm)

    // Week data (Mon-Sun of current week)
    const now = new Date()
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const weekDays: WeekDay[] = []
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - dayOfWeek + i)
      const dateStr = d.toISOString().split('T')[0]
      const done = scoringHabits.filter(h => logMap[dateStr]?.[h.id]).length
      const pct = scoringHabits.length > 0 ? (done / scoringHabits.length) * 100 : 0
      weekDays.push({ day: dayLabels[i], pct: Math.round(pct) })
    }
    setWeekData(weekDays)

    // Per-habit streaks
    const streakData: StreakData[] = (habits as Habit[]).map(habit => {
      const last14: boolean[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const date = d.toISOString().split('T')[0]
        last14.push(!!logMap[date]?.[habit.id])
      }

      let current = 0
      for (let i = last14.length - 1; i >= 0; i--) {
        if (last14[i]) current++
        else break
      }

      let best = 0, run = 0
      last14.forEach(done => { if (done) { run++; best = Math.max(best, run) } else run = 0 })

      return { habit, currentStreak: current, bestStreak: best, last14 }
    })
    setStreaks(streakData)

    // All-time stats
    const totalCheckins = logs?.filter(l => l.completed).length ?? 0
    const longest = Math.max(...streakData.map(s => s.bestStreak), 0)
    setAllTime({ totalCheckins, longestStreak: longest, bestWeek: Math.max(...weekDays.map(w => w.pct), 0) })
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const heatmapColor = (pct: number) => {
    if (pct === 0) return '#e3e3e0'
    if (pct <= 40) return '#F4F6FA22'
    if (pct <= 70) return '#1D9E7544'
    if (pct <= 89) return '#1D9E75'
    return '#EF9F27'
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>Streak Tracker</h1>

      {/* 30-day heatmap */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#787774', letterSpacing: '0.06em' }}>30-Day Heatmap</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {heatmap.map(({ date, pct }) => (
            <div
              key={date}
              className="rounded aspect-square"
              style={{ backgroundColor: heatmapColor(pct) }}
              title={`${date}: ${Math.round(pct)}%`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {[['0%', '#e3e3e0'], ['1–40%', '#F4F6FA22'], ['41–70%', '#1D9E7544'], ['71–89%', '#1D9E75'], ['90–100%', '#EF9F27']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span style={{ fontSize: '9px', color: '#787774' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#787774', letterSpacing: '0.06em' }}>This Week</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#8a8a8a', fontSize: 10, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0', borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: '#fff' }}
              formatter={(v: number) => [`${v}%`, 'Completion']}
            />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {weekData.map((entry, i) => (
                <Cell key={i} fill={entry.pct >= 90 ? '#EF9F27' : '#1D9E75'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Check-ins', value: allTime.totalCheckins },
          { label: 'Longest Streak', value: `${allTime.longestStreak}d` },
          { label: 'Best Week', value: `${Math.round(allTime.bestWeek)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
            <p className="font-bold text-white" style={{ fontSize: '20px' }}>{value}</p>
            <p style={{ fontSize: '9px', color: '#787774', marginTop: '2px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Per-habit streak cards */}
      <div className="flex flex-col gap-3">
        {streaks.map(({ habit, currentStreak, bestStreak, last14 }) => (
          <div key={habit.id} className="rounded-xl p-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '16px' }}>{habit.icon}</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#37352f' }}>{habit.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <p className="font-bold" style={{ fontSize: '14px', color: '#1D9E75' }}>{currentStreak}</p>
                  <p style={{ fontSize: '9px', color: '#787774' }}>current</p>
                </div>
                <div className="text-center">
                  <p className="font-bold" style={{ fontSize: '14px', color: '#EF9F27' }}>{bestStreak}</p>
                  <p style={{ fontSize: '9px', color: '#787774' }}>best</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              {last14.map((done, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{ height: '8px', backgroundColor: done ? '#1D9E75' : '#e3e3e0' }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
