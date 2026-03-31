import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase, CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS, AREA_COLORS, todayStr } from '../lib/supabase'
import type { AreaTag, GTDContext } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function dateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMondayOfDate(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

const AREAS: AreaTag[] = ['PASHA', 'TapWork', 'himate.az', 'Personal']

export default function Progress() {
  const { session } = useAuth()
  const user = session?.user
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)

  // Task performance
  const [tasksByArea, setTasksByArea] = useState<{ area: string; completed: number; open: number }[]>([])
  const [totalCompletedWeek, setTotalCompletedWeek] = useState(0)
  const [inboxProcessedWeek, setInboxProcessedWeek] = useState(0)
  const [stalledCount, setStalledCount] = useState(0)

  // Streaks
  const [eveningStreak, setEveningStreak] = useState(0)
  const [weeklyReviewStreak, setWeeklyReviewStreak] = useState(0)
  const [ritualGrid, setRitualGrid] = useState<boolean[]>([])

  // Spending
  const [spentThisMonth, setSpentThisMonth] = useState(0)
  const [monthTarget, setMonthTarget] = useState(0)
  const [categorySpend, setCategorySpend] = useState<{ category: string; amount: number; color: string }[]>([])

  // Context breakdown
  const [contextBreakdown, setContextBreakdown] = useState<{ context: GTDContext; count: number }[]>([])

  // Week comparison
  const [lastWeekCount, setLastWeekCount] = useState(0)
  const [thisWeekCount, setThisWeekCount] = useState(0)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const thisMonday = getMondayOfDate(new Date())
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const monthStartStr = dateStr(monthStart)
    const todayS = todayStr()
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

    const [
      allTasksRes,
      ritualRes,
      weeklyReviewsRes,
      expensesRes,
      budgetTargetRes,
      inboxRes,
    ] = await Promise.all([
      supabase.from('daily_tasks').select('id, area_tag, context_tag, status, activated_at, created_at').eq('user_id', user.id),
      supabase.from('daily_rituals').select('date, completed').eq('user_id', user.id).eq('ritual_type', 'evening').order('date', { ascending: false }).limit(90),
      supabase.from('weekly_reviews').select('week_start, completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(52),
      supabase.from('expenses').select('amount, category, expense_date').eq('user_id', user.id).gte('expense_date', monthStartStr).lte('expense_date', todayS),
      supabase.from('budget_targets').select('total_target').eq('user_id', user.id).eq('month', monthStartStr).maybeSingle(),
      supabase.from('inbox').select('id, created_at').eq('user_id', user.id).eq('processed', true).gte('created_at', new Date(thisMonday).toISOString()),
    ])

    const allTasks = allTasksRes.data ?? []

    const thisCompleted = allTasks.filter((t: { status: string; created_at: string }) => t.status === 'done' && t.created_at >= new Date(thisMonday).toISOString()).length
    const lastCompleted = allTasks.filter((t: { status: string; created_at: string }) => t.status === 'done' && t.created_at >= new Date(lastMonday).toISOString() && t.created_at < new Date(thisMonday).toISOString()).length

    setTotalCompletedWeek(thisCompleted)
    setLastWeekCount(lastCompleted)
    setThisWeekCount(thisCompleted)

    // Task by area (this week)
    const areaData = AREAS.map(area => {
      const areaTasks = allTasks.filter((t: { area_tag: string | null; created_at: string }) => t.area_tag === area && t.created_at >= new Date(thisMonday).toISOString())
      return {
        area,
        completed: areaTasks.filter((t: { status: string }) => t.status === 'done').length,
        open: areaTasks.filter((t: { status: string }) => t.status === 'open' || t.status === 'in_progress').length,
      }
    })
    setTasksByArea(areaData)

    // Stalled
    setStalledCount(allTasks.filter((t: { activated_at: string | null; status: string }) =>
      t.activated_at && new Date(t.activated_at).getTime() < cutoff && (t.status === 'open' || t.status === 'in_progress')
    ).length)

    // Inbox processed this week
    setInboxProcessedWeek(inboxRes.data?.length ?? 0)

    // Evening streak + grid
    const ritualDates = new Set((ritualRes.data ?? []).filter((r: { completed: boolean }) => r.completed).map((r: { date: string }) => r.date))
    const last30: boolean[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      last30.push(ritualDates.has(dateStr(d)))
    }
    setRitualGrid(last30)

    const sortedDates = [...ritualDates].sort().reverse()
    let streak = 0
    let cursor = new Date(); cursor.setHours(0, 0, 0, 0)
    for (const day of sortedDates) {
      const d = new Date(day + 'T00:00:00')
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
      if (diff > 1) break
      streak++; cursor = d
    }
    setEveningStreak(streak)

    // Weekly review streak (consecutive weeks)
    const reviews = (weeklyReviewsRes.data ?? []) as { week_start: string; completed_at: string }[]
    let wStreak = 0
    let weekCursor = getMondayOfDate(new Date())
    weekCursor.setDate(weekCursor.getDate() - 7) // start from last completed week
    for (const review of reviews) {
      const rWeek = new Date(review.week_start + 'T00:00:00')
      const diff = Math.round((weekCursor.getTime() - rWeek.getTime()) / (7 * 86400000))
      if (diff > 1) break
      wStreak++; weekCursor = rWeek
    }
    setWeeklyReviewStreak(wStreak)

    // Expenses
    const expenses = expensesRes.data ?? []
    const totalSpent = expenses.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0)
    setSpentThisMonth(totalSpent)
    setMonthTarget(Number(budgetTargetRes.data?.total_target ?? 0))

    const catMap: Record<string, number> = {}
    expenses.forEach((e: { category: string; amount: number }) => {
      catMap[e.category] = (catMap[e.category] ?? 0) + Number(e.amount)
    })
    const catColors: Record<string, string> = {
      loan: '#E24B4A', lunch: '#EF9F27', coffee: '#8B5E3C', entertainment: '#534AB7',
      clothing: '#D4537E', family_support: '#1D9E75', transport: '#378ADD', subscriptions: '#888780', other: '#555550',
    }
    const cats = Object.entries(catMap).map(([c, a]) => ({ category: c, amount: Number(a), color: catColors[c] ?? '#888780' }))
      .sort((a, b) => b.amount - a.amount)
    setCategorySpend(cats)

    // Context breakdown (tasks done this week by context)
    const ctxData = CONTEXTS.map(c => ({
      context: c,
      count: allTasks.filter((t: { context_tag: string | null; status: string; created_at: string }) =>
        t.context_tag === c && t.status === 'done' && t.created_at >= new Date(thisMonday).toISOString()
      ).length,
    }))
    setContextBreakdown(ctxData)

    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const budgetPct = monthTarget > 0 ? Math.min((spentThisMonth / monthTarget) * 100, 100) : 0
  const budgetColor = budgetPct < 70 ? '#1D9E75' : budgetPct < 90 ? '#EF9F27' : '#E24B4A'
  const weekDelta = thisWeekCount - lastWeekCount

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-xl animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* This week — task performance */}
      <section style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p className="text-[13px] font-medium mb-4" style={{ color: '#F5F5F5' }}>This week — task performance</p>

        <div className="flex gap-4 mb-4 flex-wrap">
          <div>
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{totalCompletedWeek}</p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Completed</p>
          </div>
          <div>
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{inboxProcessedWeek}</p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Inbox processed</p>
          </div>
          {stalledCount > 0 && (
            <button onClick={() => navigate('/tasks')} className="flex items-center gap-1">
              <p className="text-[22px] font-medium" style={{ color: '#EF9F27' }}>{stalledCount}</p>
              <div className="ml-1">
                <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Stalled</p>
                <p className="text-[10px]" style={{ color: '#378ADD' }}>View →</p>
              </div>
            </button>
          )}
        </div>

        {/* Bar chart by area */}
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={tasksByArea} barSize={14} barGap={2}>
            <XAxis dataKey="area" tick={{ fontSize: 10, fill: '#888780' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '8px', fontSize: '11px' }}
              labelStyle={{ color: '#F5F5F5' }}
              itemStyle={{ color: '#888780' }}
            />
            <Bar dataKey="completed" name="Completed" radius={[3, 3, 0, 0]}>
              {tasksByArea.map((entry, i) => (
                <Cell key={i} fill={AREA_COLORS[entry.area as AreaTag] ?? '#378ADD'} />
              ))}
            </Bar>
            <Bar dataKey="open" name="Open" radius={[3, 3, 0, 0]} fill="#2A2A2A" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Streaks */}
      <section style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p className="text-[13px] font-medium mb-4" style={{ color: '#F5F5F5' }}>Streaks</p>
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Flame size={18} style={{ color: '#EF9F27' }} />
            <div>
              <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{eveningStreak}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Evening ritual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: '#378ADD' }} />
            <div>
              <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{weeklyReviewStreak}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Weekly reviews</p>
            </div>
          </div>
        </div>

        {/* 30-day contribution grid */}
        <div>
          <p className="text-[11px] uppercase tracking-wide mb-2" style={{ color: '#555550' }}>Last 30 days</p>
          <div className="flex gap-1 flex-wrap">
            {ritualGrid.map((done, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: done ? '#1D9E75' : '#2A2A2A',
                }}
                title={`Day ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Spending this month */}
      <section style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[13px] font-medium" style={{ color: '#F5F5F5' }}>Spending this month</p>
          <button onClick={() => navigate('/budget')} className="text-[12px]" style={{ color: '#378ADD' }}>Full detail →</button>
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>₼{spentThisMonth.toFixed(0)}</p>
          {monthTarget > 0 && (
            <p className="text-[13px]" style={{ color: '#888780' }}>of ₼{monthTarget.toFixed(0)}</p>
          )}
        </div>

        {monthTarget > 0 && (
          <div className="mb-3 h-1.5 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${budgetPct}%`, backgroundColor: budgetColor }}
            />
          </div>
        )}

        {/* Mini category breakdown */}
        <div className="flex flex-col gap-1.5">
          {categorySpend.slice(0, 5).map(cat => {
            const pct = spentThisMonth > 0 ? (cat.amount / spentThisMonth) * 100 : 0
            return (
              <div key={cat.category} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-[12px] flex-1 capitalize" style={{ color: '#888780' }}>{cat.category.replace('_', ' ')}</span>
                <span className="text-[12px] font-medium" style={{ color: '#F5F5F5' }}>₼{cat.amount.toFixed(0)}</span>
                <span className="text-[11px] w-8 text-right" style={{ color: '#555550' }}>{pct.toFixed(0)}%</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Context breakdown */}
      <section style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p className="text-[13px] font-medium mb-4" style={{ color: '#F5F5F5' }}>Tasks by context this week</p>
        <div className="flex flex-col gap-2">
          {contextBreakdown.map(({ context, count }) => {
            const maxCount = Math.max(...contextBreakdown.map(c => c.count), 1)
            const pct = (count / maxCount) * 100
            return (
              <div key={context}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px]" style={{ color: '#888780' }}>{CONTEXT_LABELS[context]}</span>
                  <span className="text-[12px] font-medium" style={{ color: '#F5F5F5' }}>{count}</span>
                </div>
                <div className="h-1 rounded-full" style={{ backgroundColor: '#2A2A2A' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: CONTEXT_COLORS[context] }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Week comparison */}
      <section style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p className="text-[13px] font-medium mb-4" style={{ color: '#F5F5F5' }}>Week-over-week</p>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-[22px] font-medium" style={{ color: '#888780' }}>{lastWeekCount}</p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#555550' }}>Last week</p>
          </div>
          <div className="flex items-center">
            {weekDelta > 0 ? (
              <TrendingUp size={20} style={{ color: '#1D9E75' }} />
            ) : weekDelta < 0 ? (
              <TrendingDown size={20} style={{ color: '#E24B4A' }} />
            ) : (
              <Minus size={20} style={{ color: '#888780' }} />
            )}
            <span
              className="text-[13px] font-medium ml-1"
              style={{ color: weekDelta > 0 ? '#1D9E75' : weekDelta < 0 ? '#E24B4A' : '#888780' }}
            >
              {weekDelta > 0 ? `+${weekDelta}` : weekDelta}
            </span>
          </div>
          <div>
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{thisWeekCount}</p>
            <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>This week</p>
          </div>
        </div>
      </section>
    </div>
  )
}
