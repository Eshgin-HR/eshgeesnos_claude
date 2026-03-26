import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
  const [form, setForm] = useState({ tapwork_hours: 0, top_win: '', next_focus: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const weekStart = getWeekStart(weekOffset)
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6)
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  const weekStartStr = weekStart.toISOString().split('T')[0]

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

    // Load saved review
    const { data: review } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .maybeSingle()

    if (review) {
      setForm({ tapwork_hours: review.tapwork_hours ?? 0, top_win: review.top_win ?? '', next_focus: review.next_focus ?? '' })
    } else {
      setForm({ tapwork_hours: 0, top_win: '', next_focus: '' })
    }
    setSaved(false)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekOffset])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('weekly_reviews').upsert(
      { ...form, user_id: user.id, week_start: weekStartStr },
      { onConflict: 'user_id,week_start' }
    )
    setSaving(false)
    setSaved(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header with week nav */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>Weekly Review</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg" style={{ backgroundColor: '#0d1f35', color: '#6B7280' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: '11px', color: '#6B7280', minWidth: '100px', textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset === 0} className="p-1.5 rounded-lg disabled:opacity-30" style={{ backgroundColor: '#0d1f35', color: '#6B7280' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Habit completion chart */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>Habit Completion</p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#fff' }} formatter={(v: number) => [`${v}%`, '']} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {weekData.map((e, i) => <Cell key={i} fill={e.pct >= 90 ? '#EF9F27' : '#1D9E75'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* TapWork hours */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>TapWork Hours</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min={0} max={100} step={0.5}
            value={form.tapwork_hours}
            onChange={e => setForm(p => ({ ...p, tapwork_hours: Number(e.target.value) }))}
            className="w-24 rounded-lg px-3 py-2 text-white outline-none"
            style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', fontSize: '13px' }}
          />
          <span style={{ fontSize: '12px', color: '#6B7280' }}>hours this week</span>
        </div>
      </div>

      {/* Top win & next focus */}
      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>Review</p>
        {(['top_win', 'next_focus'] as const).map(key => (
          <div key={key} className="flex flex-col gap-2">
            <label style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>
              {key === 'top_win' ? 'Top Win of the Week' : "Next Week's Focus"}
            </label>
            <textarea
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={key === 'top_win' ? 'The biggest win this week...' : 'One sentence to anchor next week...'}
              rows={2}
              className="w-full resize-none outline-none rounded-lg px-3 py-2.5 text-white placeholder-gray-600"
              style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', fontSize: '12px' }}
            />
          </div>
        ))}
      </div>

      {/* 4-week trend */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>4-Week Momentum</p>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={trend}>
            <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 10, fontFamily: 'Manrope' }} axisLine={false} tickLine={false} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip contentStyle={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderRadius: 8, fontSize: 11 }} itemStyle={{ color: '#fff' }} formatter={(v: number) => [`${v}%`, '']} />
            <Line type="monotone" dataKey="pct" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: saved ? '#0d1f35' : '#1D9E75', fontSize: '14px', border: saved ? '1px solid #1D9E75' : 'none' }}
      >
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Week Review'}
      </button>
    </div>
  )
}
