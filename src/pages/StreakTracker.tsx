import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS, getMondayOfWeek } from '../lib/supabase'
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
  const [eveningStreak, setEveningStreak] = useState(0)
  const [weeklyReviewStreak, setWeeklyReviewStreak] = useState(0)
  const [contextBreakdown, setContextBreakdown] = useState<Record<string, number>>({})
  const [inboxProcessed, setInboxProcessed] = useState(0)
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

    const scoringHabits = (habits as Habit[]).filter(h => h.counts_toward_score)
    const hm = days30.map(date => {
      const done = scoringHabits.filter(h => logMap[date]?.[h.id]).length
      const pct = scoringHabits.length > 0 ? (done / scoringHabits.length) * 100 : 0
      return { date, pct }
    })
    setHeatmap(hm)

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

    const streakData: StreakData[] = (habits as Habit[]).map(habit => {
      const last14: boolean[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const date = d.toISOString().split('T')[0]
        last14.push(!!logMap[date]?.[habit.id])
      }
      let current = 0
      for (let i = last14.length - 1; i >= 0; i--) {
        if (last14[i]) current++; else break
      }
      let best = 0, run = 0
      last14.forEach(done => { if (done) { run++; best = Math.max(best, run) } else run = 0 })
      return { habit, currentStreak: current, bestStreak: best, last14 }
    })
    setStreaks(streakData)

    const totalCheckins = logs?.filter(l => l.completed).length ?? 0
    const longest = Math.max(...streakData.map(s => s.bestStreak), 0)
    setAllTime({ totalCheckins, longestStreak: longest, bestWeek: Math.max(...weekDays.map(w => w.pct), 0) })

    // GTD metrics in parallel
    const weekStart = getMondayOfWeek()
    const weekDates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00'); d.setDate(d.getDate() + i)
      weekDates.push(d.toISOString().slice(0, 10))
    }

    const [
      eveningStreakRes,
      weeklyReviewsRes,
      completedTasksRes,
      inboxProcessedRes,
    ] = await Promise.all([
      supabase.from('daily_rituals').select('date').eq('user_id', user.id).eq('ritual_type', 'evening').eq('completed', true).order('date', { ascending: false }).limit(60),
      supabase.from('weekly_reviews').select('week_start, completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('week_start', { ascending: false }).limit(20),
      supabase.from('daily_tasks').select('context_tag').eq('user_id', user.id).eq('completed', true).in('date', weekDates),
      supabase.from('inbox').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('processed', true).gte('created_at', weekStart),
    ])

    // Evening streak calc
    const eDays = [...new Set((eveningStreakRes.data ?? []).map((r: { date: string }) => r.date))].sort().reverse()
    let eStreak = 0; let eCursor = new Date(); eCursor.setHours(0, 0, 0, 0)
    for (const day of eDays) {
      const d = new Date(day + 'T00:00:00')
      const diff = Math.round((eCursor.getTime() - d.getTime()) / 86400000)
      if (diff > 1) break; eStreak++; eCursor = d
    }
    setEveningStreak(eStreak)

    // Weekly review streak (consecutive Saturdays)
    const completedWeeks = (weeklyReviewsRes.data ?? []).map((r: { week_start: string }) => r.week_start).sort().reverse()
    let wStreak = 0
    if (completedWeeks.length > 0) {
      // Get all Saturdays going back
      const saturdays: string[] = []
      const satCursor = new Date(); satCursor.setHours(0, 0, 0, 0)
      while (satCursor.getDay() !== 6) satCursor.setDate(satCursor.getDate() - 1)
      for (let i = 0; i < 20; i++) {
        // Week start (Monday) of that Saturday's week
        const mon = new Date(satCursor)
        mon.setDate(satCursor.getDate() - 5)
        saturdays.push(mon.toISOString().slice(0, 10))
        satCursor.setDate(satCursor.getDate() - 7)
      }
      for (const sat of saturdays) {
        if (completedWeeks.includes(sat)) wStreak++; else break
      }
    }
    setWeeklyReviewStreak(wStreak)

    // Context breakdown
    const breakdown: Record<string, number> = {}
    ;(completedTasksRes.data ?? []).forEach((t: { context_tag: string | null }) => {
      const ctx = t.context_tag ?? 'untagged'
      breakdown[ctx] = (breakdown[ctx] ?? 0) + 1
    })
    setContextBreakdown(breakdown)

    setInboxProcessed(inboxProcessedRes.count ?? 0)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const heatmapColor = (pct: number) => {
    if (pct === 0) return '#2A2A2A'
    if (pct <= 40) return '#378ADD22'
    if (pct <= 70) return '#378ADD55'
    if (pct <= 89) return '#378ADD'
    return '#EF9F27'
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
    </div>
  )

  const totalTasksThisWeek = Object.values(contextBreakdown).reduce((s, n) => s + n, 0)

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>Reporting</h1>

      {/* GTD streaks */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <p style={{ fontSize: '22px', fontWeight: 500, color: '#F5F5F5' }}>{eveningStreak}</p>
          <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginTop: '2px' }}>Evening streak</p>
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <p style={{ fontSize: '22px', fontWeight: 500, color: '#F5F5F5' }}>{weeklyReviewStreak}</p>
          <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginTop: '2px' }}>Weekly review streak</p>
        </div>
      </div>

      {/* This week: tasks by context */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tasks done this week
          </p>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{totalTasksThisWeek}</p>
        </div>
        <div className="flex flex-col gap-2">
          {CONTEXTS.map(c => {
            const count = contextBreakdown[c] ?? 0
            const pct = totalTasksThisWeek > 0 ? (count / totalTasksThisWeek) * 100 : 0
            return (
              <div key={c}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: '12px', color: '#F5F5F5' }}>{CONTEXT_LABELS[c]}</span>
                  <span style={{ fontSize: '12px', color: '#888780' }}>{count}</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#2A2A2A', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, backgroundColor: CONTEXT_COLORS[c], borderRadius: '2px' }} />
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-between mt-1">
            <span style={{ fontSize: '12px', color: '#555550' }}>Inbox processed this week</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#F5F5F5' }}>{inboxProcessed}</span>
          </div>
        </div>
      </div>

      {/* 30-day heatmap */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <p className="font-medium uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#888780', letterSpacing: '0.06em' }}>30-Day Habit Heatmap</p>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {heatmap.map(({ date, pct }) => (
            <div key={date} className="rounded aspect-square" style={{ backgroundColor: heatmapColor(pct) }} title={`${date}: ${Math.round(pct)}%`} />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {[['0%', '#2A2A2A'], ['1–40%', '#378ADD22'], ['41–70%', '#378ADD55'], ['71–89%', '#378ADD'], ['90–100%', '#EF9F27']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span style={{ fontSize: '9px', color: '#888780' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <p className="font-medium uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#888780', letterSpacing: '0.06em' }}>This Week — Habits</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#555550', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#F5F5F5' }} formatter={(v: number) => [`${v}%`, 'Completion']} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {weekData.map((entry, i) => <Cell key={i} fill={entry.pct >= 90 ? '#EF9F27' : '#378ADD'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* All-time stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total check-ins', value: allTime.totalCheckins },
          { label: 'Longest streak', value: `${allTime.longestStreak}d` },
          { label: 'Best week', value: `${Math.round(allTime.bestWeek)}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
            <p className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>{value}</p>
            <p style={{ fontSize: '9px', color: '#888780', marginTop: '2px' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Per-habit streak cards */}
      {streaks.length > 0 && (
        <div className="flex flex-col gap-3">
          <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Habits (14-day)</p>
          {streaks.map(({ habit, currentStreak, bestStreak, last14 }) => (
            <div key={habit.id} className="rounded-xl p-4" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '16px' }}>{habit.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{habit.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="font-medium" style={{ fontSize: '14px', color: '#1D9E75' }}>{currentStreak}</p>
                    <p style={{ fontSize: '9px', color: '#888780' }}>current</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium" style={{ fontSize: '14px', color: '#EF9F27' }}>{bestStreak}</p>
                    <p style={{ fontSize: '9px', color: '#888780' }}>best</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {last14.map((done, i) => (
                  <div key={i} className="flex-1 rounded-full" style={{ height: '6px', backgroundColor: done ? '#378ADD' : '#2A2A2A' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
