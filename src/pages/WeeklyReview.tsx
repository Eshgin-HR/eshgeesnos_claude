import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getMondayOfWeek } from '../lib/supabase'

const GTD_CHECKLIST = [
  { key: 'inbox_zero', label: 'Process all inboxes to zero' },
  { key: 'review_completions', label: 'Review last week — completions and open loops' },
  { key: 'stalled_tasks', label: 'Review all active tasks — anything stalled 7+ days?' },
  { key: 'someday_maybe', label: 'Check Someday/Maybe — anything ready to activate?' },
  { key: 'waiting_for', label: 'Check Waiting For — any follow-ups needed?' },
  { key: 'next_week_outcomes', label: 'Set next week\'s top 3 outcomes: PASHA / TapWork / personal' },
  { key: 'monday_tapwork', label: 'Pre-load Monday 06:00 TapWork task' },
]

function getWeekStart(offset = 0) {
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + offset * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export default function WeeklyReview() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekData, setWeekData] = useState<{ day: string; pct: number }[]>([])
  const [trend, setTrend] = useState<{ week: string; pct: number }[]>([])
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})
  const [tapworkTask, setTapworkTask] = useState('')
  const [lastCompleted, setLastCompleted] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  const weekStartStr = weekStart.toISOString().split('T')[0]
  const doneCt = GTD_CHECKLIST.filter(i => checklist[i.key]).length
  const allDone = doneCt === GTD_CHECKLIST.length

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const days: string[] = []
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }

    const { data: habits } = await supabase.from('habits').select('id, counts_toward_score').eq('user_id', user.id).eq('active', true)
    const scoringIds = (habits ?? []).filter((h: { counts_toward_score: boolean }) => h.counts_toward_score).map((h: { id: string }) => h.id)

    const { data: logs } = await supabase
      .from('daily_checkins')
      .select('habit_id, date, completed')
      .eq('user_id', user.id)
      .in('date', days)

    const logMap: Record<string, Set<string>> = {}
    logs?.forEach((l: { habit_id: string; date: string; completed: boolean }) => {
      if (!logMap[l.date]) logMap[l.date] = new Set()
      if (l.completed) logMap[l.date].add(l.habit_id)
    })

    const weekBarData = days.map((date, i) => {
      const done = scoringIds.filter((id: string) => logMap[date]?.has(id)).length
      const pct = scoringIds.length > 0 ? Math.round((done / scoringIds.length) * 100) : 0
      return { day: dayLabels[i], pct }
    })
    setWeekData(weekBarData)

    // 4-week trend
    const trendData = []
    for (let w = -3; w <= 0; w++) {
      const ws = getWeekStart(weekOffset + w)
      const wDays: string[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(ws); d.setDate(ws.getDate() + i)
        wDays.push(d.toISOString().split('T')[0])
      }
      const { data: wLogs } = await supabase
        .from('daily_checkins')
        .select('habit_id, date, completed')
        .eq('user_id', user.id)
        .in('date', wDays)
      const total = wLogs?.filter((l: { completed: boolean }) => l.completed).length ?? 0
      const possible = scoringIds.length * 7
      trendData.push({ week: `W${w + 4}`, pct: possible > 0 ? Math.round((total / possible) * 100) : 0 })
    }
    setTrend(trendData)

    // Load GTD checklist for this week
    const { data: review } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (review?.checklist_state) {
      setChecklist(review.checklist_state as Record<string, boolean>)
      setTapworkTask(review.notes ?? '')
    } else {
      setChecklist({})
      setTapworkTask('')
    }

    // Last completed review date
    const { data: lastReview } = await supabase
      .from('weekly_reviews')
      .select('week_start, completed_at')
      .eq('user_id', user.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setLastCompleted(lastReview?.week_start ?? null)

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekOffset])

  useEffect(() => { load() }, [load])

  const toggleItem = async (key: string) => {
    const newState = { ...checklist, [key]: !checklist[key] }
    setChecklist(newState)
    const isDone = GTD_CHECKLIST.every(i => newState[i.key])
    await supabase.from('weekly_reviews').upsert({
      user_id: user!.id,
      week_start: weekStartStr,
      checklist_state: newState,
      notes: tapworkTask,
      completed_at: isDone ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,week_start' })
  }

  const saveTaskAndNotes = async () => {
    setSaving(true)
    await supabase.from('weekly_reviews').upsert({
      user_id: user!.id,
      week_start: weekStartStr,
      checklist_state: checklist,
      notes: tapworkTask,
      completed_at: allDone ? new Date().toISOString() : null,
    }, { onConflict: 'user_id,week_start' })
    // Also set Monday's TapWork task in daily_rituals for next Monday
    if (tapworkTask.trim() && user) {
      const nextMonday = getMondayOfWeek(new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000))
      await supabase.from('daily_rituals').upsert({
        user_id: user.id,
        date: nextMonday,
        ritual_type: 'evening',
        checklist_state: {},
        tapwork_next_task: tapworkTask.trim(),
      }, { onConflict: 'user_id,date,ritual_type' })
    }
    setSaving(false)
  }

  const resetChecklist = async () => {
    setChecklist({})
    setTapworkTask('')
    await supabase.from('weekly_reviews').upsert({
      user_id: user!.id,
      week_start: weekStartStr,
      checklist_state: {},
      notes: '',
      completed_at: null,
    }, { onConflict: 'user_id,week_start' })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>Weekly Review</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#888780' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '11px', color: '#888780', minWidth: '100px', textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset === 0} className="p-1.5 rounded-lg disabled:opacity-30" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#888780' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Last completed info */}
      {lastCompleted && (
        <p style={{ fontSize: '12px', color: '#555550' }}>
          Last completed: week of {new Date(lastCompleted + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}

      {/* GTD Checklist */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Checklist · {doneCt}/{GTD_CHECKLIST.length}
          </p>
          {doneCt > 0 && (
            <button
              onClick={resetChecklist}
              className="flex items-center gap-1.5"
              style={{ fontSize: '11px', color: '#888780' }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          {GTD_CHECKLIST.map((item, i) => (
            <div
              key={item.key}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
            >
              <button
                onClick={() => toggleItem(item.key)}
                className="flex-shrink-0"
                style={{
                  width: '18px', height: '18px',
                  border: `1.5px solid ${checklist[item.key] ? '#1D9E75' : '#3A3A3A'}`,
                  backgroundColor: checklist[item.key] ? '#1D9E75' : '#222222',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {checklist[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
              </button>
              <p style={{
                fontSize: '14px',
                color: checklist[item.key] ? '#555550' : '#F5F5F5',
                textDecoration: checklist[item.key] ? 'line-through' : 'none',
              }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
        {allDone && (
          <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl" style={{ backgroundColor: '#1D9E7515', border: '0.5px solid #1D9E7530' }}>
            <Check size={14} color="#1D9E75" />
            <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 500 }}>Weekly review complete!</p>
          </div>
        )}
      </div>

      {/* Monday TapWork task */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5', marginBottom: '10px' }}>Monday 06:00 TapWork task</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="What will you work on Monday morning?"
            value={tapworkTask}
            onChange={e => setTapworkTask(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2.5 outline-none"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
          <button
            onClick={saveTaskAndNotes}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg font-medium disabled:opacity-40"
            style={{ backgroundColor: '#378ADD', color: '#fff', fontSize: '13px', flexShrink: 0 }}
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Habit completion chart */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#888780', letterSpacing: '0.06em' }}>Habit Completion</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#555550', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#F5F5F5' }} formatter={(v: number) => [`${v}%`, '']} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {weekData.map((e, i) => <Cell key={i} fill={e.pct >= 90 ? '#EF9F27' : '#378ADD'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 4-week trend */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#888780', letterSpacing: '0.06em' }}>4-Week Momentum</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={trend}>
            <XAxis dataKey="week" tick={{ fill: '#555550', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#F5F5F5' }} formatter={(v: number) => [`${v}%`, '']} />
            <Line type="monotone" dataKey="pct" stroke="#378ADD" strokeWidth={2} dot={{ fill: '#378ADD', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
