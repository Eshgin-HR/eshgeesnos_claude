import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Inbox, Flame, Wallet, ChevronRight, Check } from 'lucide-react'
import { supabase, CONTEXT_COLORS, AREA_COLORS, todayStr, getMondayOfWeek, formatDate, isOverdue } from '../lib/supabase'
import type { Task, GTDContext, AreaTag } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { session } = useAuth()
  const user = session?.user
  const navigate = useNavigate()

  const [tasks, setTasks] = useState<Task[]>([])
  const [inboxCount, setInboxCount] = useState(0)
  const [openTaskCount, setOpenTaskCount] = useState(0)
  const [todaySpend, setTodaySpend] = useState(0)
  const [eveningStreak, setEveningStreak] = useState(0)
  const [tapworkTask, setTapworkTask] = useState<string | null>(null)
  const [weeklyReviewDone, setWeeklyReviewDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<string | null>(null)

  const today = todayStr()
  const isSaturday = new Date().getDay() === 6
  const hour = new Date().getHours()

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [
      inboxRes,
      taskCountRes,
      spendRes,
      tasksRes,
      streakRes,
      tapworkRes,
      weeklyRes,
    ] = await Promise.all([
      supabase.from('inbox').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('processed', false),
      supabase.from('daily_tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['open', 'in_progress']),
      supabase.from('expenses').select('amount').eq('user_id', user.id).eq('expense_date', today),
      supabase.from('daily_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['open', 'in_progress'])
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('daily_rituals').select('date, completed').eq('user_id', user.id).eq('ritual_type', 'evening').eq('completed', true).order('date', { ascending: false }).limit(60),
      supabase.from('daily_rituals').select('tapwork_next_task').eq('user_id', user.id).eq('ritual_type', 'evening').not('tapwork_next_task', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('weekly_reviews').select('completed_at').eq('user_id', user.id).eq('week_start', getMondayOfWeek()).maybeSingle(),
    ])

    setInboxCount(inboxRes.count ?? 0)
    setOpenTaskCount(taskCountRes.count ?? 0)
    setTodaySpend(spendRes.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0)
    setTasks((tasksRes.data as Task[]) ?? [])

    // Evening streak calculation
    const days = [...new Set((streakRes.data ?? []).map((r: { date: string }) => r.date))].sort().reverse()
    let streak = 0
    let cursor = new Date(); cursor.setHours(0, 0, 0, 0)
    for (const day of days) {
      const d = new Date(day + 'T00:00:00')
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
      if (diff > 1) break
      streak++; cursor = d
    }
    setEveningStreak(streak)

    setTapworkTask(tapworkRes.data?.tapwork_next_task ?? null)
    setWeeklyReviewDone(!!weeklyRes.data?.completed_at)
    setLoading(false)
  }, [user, today])

  useEffect(() => { load() }, [load])

  const toggleTask = async (task: Task) => {
    if (completingId) return
    setCompletingId(task.id)
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== task.id))
    setOpenTaskCount(c => Math.max(0, c - 1))
    await supabase.from('daily_tasks').update({ status: 'done', completed: true }).eq('id', task.id)
    setCompletingId(null)
  }

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col gap-5">
      {/* Date + greeting */}
      <div>
        <p className="text-[12px] mb-1" style={{ color: '#888780' }}>{dateLabel}</p>
        <h1 className="text-[20px] font-medium" style={{ color: '#F5F5F5' }}>
          {hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'}, Eshgeen
        </h1>
      </div>

      {/* TapWork tomorrow banner */}
      {tapworkTask && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#1D9E7515', border: '0.5px solid #1D9E7530' }}
        >
          <div
            className="w-1 rounded-full flex-shrink-0 self-stretch"
            style={{ backgroundColor: '#1D9E75', minHeight: '20px' }}
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: '#1D9E75' }}>
              TapWork 06:00 — Tomorrow
            </p>
            <p className="text-[14px]" style={{ color: '#F5F5F5' }}>{tapworkTask}</p>
          </div>
        </div>
      )}

      {/* 2×2 stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/tasks')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left transition-colors hover:border-[#3A3A3A]"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <CheckSquare size={16} style={{ color: '#378ADD' }} />
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{openTaskCount}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#888780' }}>Open tasks</p>
          </button>
          <button
            onClick={() => navigate('/inbox')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left transition-colors hover:border-[#3A3A3A]"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Inbox size={16} style={{ color: inboxCount > 0 ? '#E24B4A' : '#888780' }} />
            <p className="text-[22px] font-medium" style={{ color: inboxCount > 0 ? '#E24B4A' : '#F5F5F5' }}>{inboxCount}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#888780' }}>Inbox</p>
          </button>
          <button
            onClick={() => navigate('/budget')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left transition-colors hover:border-[#3A3A3A]"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Wallet size={16} style={{ color: '#1D9E75' }} />
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>
              {todaySpend === 0 ? '₼0' : `₼${todaySpend.toFixed(0)}`}
            </p>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#888780' }}>Spent today</p>
          </button>
          <button
            onClick={() => navigate('/progress')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left transition-colors hover:border-[#3A3A3A]"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Flame size={16} style={{ color: '#EF9F27' }} />
            <p className="text-[22px] font-medium" style={{ color: '#F5F5F5' }}>{eveningStreak}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#888780' }}>Evening streak</p>
          </button>
        </div>
      )}

      {/* Saturday weekly review reminder */}
      {isSaturday && hour >= 14 && !weeklyReviewDone && (
        <button
          onClick={() => navigate('/weekly')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
          style={{ backgroundColor: '#EF9F2715', border: '0.5px solid #EF9F2740' }}
        >
          <div>
            <p className="text-[13px] font-medium" style={{ color: '#F5F5F5' }}>Weekly review pending</p>
            <p className="text-[12px]" style={{ color: '#888780' }}>Saturday afternoon — time to review</p>
          </div>
          <ChevronRight size={14} style={{ color: '#EF9F27', flexShrink: 0 }} />
        </button>
      )}

      {/* Open tasks list */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '0.5px solid #2A2A2A' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Open tasks</span>
            {openTaskCount > 0 && (
              <span
                className="flex items-center justify-center rounded-full text-[10px] font-medium"
                style={{ backgroundColor: '#378ADD20', color: '#378ADD', width: '20px', height: '20px' }}
              >
                {openTaskCount}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/tasks')}
            className="text-[12px] transition-colors"
            style={{ color: '#378ADD' }}
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: '#2A2A2A' }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[13px]" style={{ color: '#555550' }}>All clear — nothing open</p>
          </div>
        ) : (
          tasks.map((task, i) => {
            const overdue = isOverdue(task.due_date)
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTask(task)}
                  className="flex-shrink-0 flex items-center justify-center rounded transition-colors"
                  style={{
                    width: '18px',
                    height: '18px',
                    marginTop: '2px',
                    border: '1.5px solid #3A3A3A',
                    backgroundColor: 'transparent',
                    borderRadius: '4px',
                  }}
                  aria-label="Complete task"
                >
                  <Check size={10} style={{ color: '#378ADD' }} strokeWidth={3} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] leading-snug mb-1 truncate" style={{ color: '#F5F5F5' }}>{task.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.area_tag && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wide"
                        style={{
                          backgroundColor: AREA_COLORS[task.area_tag as AreaTag] + '20',
                          color: AREA_COLORS[task.area_tag as AreaTag],
                        }}
                      >
                        {task.area_tag}
                      </span>
                    )}
                    {task.context_tag && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wide"
                        style={{
                          backgroundColor: CONTEXT_COLORS[task.context_tag as GTDContext] + '20',
                          color: CONTEXT_COLORS[task.context_tag as GTDContext],
                        }}
                      >
                        {task.context_tag}
                      </span>
                    )}
                    {task.due_date && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-md"
                        style={{
                          border: `0.5px solid ${overdue ? '#E24B4A' : '#2A2A2A'}`,
                          color: overdue ? '#E24B4A' : '#888780',
                        }}
                      >
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
