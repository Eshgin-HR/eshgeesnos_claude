import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, Inbox, Flame, Wallet, ChevronRight, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GTDContext, CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS,
  getAutoContext, todayStr, getMondayOfWeek,
} from '../lib/supabase'

interface Task {
  id: string
  title: string
  category: string
  completed: boolean
  time_block: string | null
  context_tag: GTDContext | null
}

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [context, setContext] = useState<GTDContext>(getAutoContext())
  const [showContextPicker, setShowContextPicker] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [inboxCount, setInboxCount] = useState(0)
  const [openTaskCount, setOpenTaskCount] = useState(0)
  const [todaySpend, setTodaySpend] = useState(0)
  const [eveningStreak, setEveningStreak] = useState(0)
  const [energyToday, setEnergyToday] = useState<number>(0)
  const [tapworkTask, setTapworkTask] = useState<string | null>(null)
  const [weeklyReviewDone, setWeeklyReviewDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingEnergy, setSavingEnergy] = useState(false)

  const today = todayStr()
  const isSaturday = new Date().getDay() === 6
  const hour = new Date().getHours()

  const load = useCallback(async () => {
    if (!user) return

    const [
      inboxRes,
      taskCountRes,
      spendRes,
      tasksRes,
      streakRes,
      reflectionRes,
      tapworkRes,
      weeklyRes,
    ] = await Promise.all([
      supabase.from('inbox').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('processed', false),
      supabase.from('daily_tasks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('date', today).eq('completed', false),
      supabase.from('expenses').select('amount').eq('user_id', user.id).eq('date', today),
      supabase.from('daily_tasks').select('id, title, category, completed, time_block, context_tag')
        .eq('user_id', user.id).eq('date', today).eq('completed', false)
        .eq('context_tag', context).order('sort_order').limit(3),
      supabase.from('daily_rituals').select('date, completed').eq('user_id', user.id).eq('ritual_type', 'evening').eq('completed', true).order('date', { ascending: false }).limit(60),
      supabase.from('daily_rituals').select('tapwork_next_task').eq('user_id', user.id).eq('date', today).eq('ritual_type', 'evening').maybeSingle(),
      supabase.from('daily_rituals').select('tapwork_next_task').eq('user_id', user.id).neq('date', today).eq('ritual_type', 'evening').not('tapwork_next_task', 'is', null).order('date', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('weekly_reviews').select('completed_at').eq('user_id', user.id).eq('week_start', getMondayOfWeek()).maybeSingle(),
    ])

    setInboxCount(inboxRes.count ?? 0)
    setOpenTaskCount(taskCountRes.count ?? 0)
    setTodaySpend(spendRes.data?.reduce((s, e) => s + Number(e.amount), 0) ?? 0)
    setTasks((tasksRes.data as Task[]) ?? [])

    // Evening streak
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

    // TapWork task for tomorrow morning (from last evening reflection or tonight's)
    const tapwork = reflectionRes.data?.tapwork_next_task ?? tapworkRes.data?.tapwork_next_task ?? null
    setTapworkTask(tapwork)

    setWeeklyReviewDone(!!weeklyRes.data?.completed_at)
    setLoading(false)
  }, [user, today, context])

  const loadEnergy = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_rituals')
      .select('checklist_state')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('ritual_type', 'morning')
      .maybeSingle()
    const energy = (data?.checklist_state as Record<string, unknown>)?.energy_level
    if (typeof energy === 'number') setEnergyToday(energy)
  }, [user, today])

  useEffect(() => { load(); loadEnergy() }, [load, loadEnergy])

  const saveEnergy = async (level: number) => {
    if (!user || savingEnergy) return
    const newLevel = energyToday === level ? 0 : level
    setEnergyToday(newLevel)
    setSavingEnergy(true)
    const { data: existing } = await supabase
      .from('daily_rituals')
      .select('checklist_state')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('ritual_type', 'morning')
      .maybeSingle()
    const state = { ...(existing?.checklist_state as Record<string, unknown> ?? {}), energy_level: newLevel }
    await supabase.from('daily_rituals').upsert({
      user_id: user.id, date: today, ritual_type: 'morning',
      checklist_state: state,
    }, { onConflict: 'user_id,date,ritual_type' })
    setSavingEnergy(false)
  }

  const toggleTask = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    await supabase.from('daily_tasks').update({ completed: true }).eq('id', task.id)
    setOpenTaskCount(c => Math.max(0, c - 1))
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>{dateLabel}</p>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#F5F5F5' }}>{greeting()}, Eshgeen</h1>
      </div>

      {/* TapWork task for this morning */}
      {tapworkTask && (
        <div
          style={{ backgroundColor: '#0F6E5615', border: '0.5px solid #0F6E5630', borderRadius: '12px', padding: '14px 16px' }}
          className="flex items-start gap-3"
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0F6E56', flexShrink: 0, marginTop: '5px' }} />
          <div>
            <p style={{ fontSize: '11px', color: '#0F6E56', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
              TapWork 06:00
            </p>
            <p style={{ fontSize: '14px', color: '#F5F5F5' }}>{tapworkTask}</p>
          </div>
        </div>
      )}

      {/* Context switcher */}
      <div>
        <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Active Context</p>
        <div className="relative">
          <button
            onClick={() => setShowContextPicker(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full"
            style={{
              backgroundColor: CONTEXT_COLORS[context] + '20',
              border: `0.5px solid ${CONTEXT_COLORS[context] + '50'}`,
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 500, color: CONTEXT_COLORS[context] }}>{CONTEXT_LABELS[context]}</span>
            <ChevronDown size={12} color={CONTEXT_COLORS[context]} />
          </button>
          {showContextPicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowContextPicker(false)} />
              <div
                className="absolute top-full mt-2 left-0 z-20 flex flex-col"
                style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '6px', minWidth: '180px' }}
              >
                {CONTEXTS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setContext(c); setShowContextPicker(false) }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-left"
                    style={{ backgroundColor: context === c ? CONTEXT_COLORS[c] + '15' : 'transparent' }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: CONTEXT_COLORS[c] }} />
                    <span style={{ fontSize: '13px', color: context === c ? CONTEXT_COLORS[c] : '#F5F5F5' }}>{CONTEXT_LABELS[c]}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metric cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/inbox')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Inbox size={16} color="#E24B4A" />
            <p style={{ fontSize: '22px', fontWeight: 500, color: inboxCount > 0 ? '#E24B4A' : '#F5F5F5' }}>{inboxCount}</p>
            <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Inbox</p>
          </button>
          <button
            onClick={() => navigate('/tasks')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <CheckSquare size={16} color="#378ADD" />
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#F5F5F5' }}>{openTaskCount}</p>
            <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Open tasks</p>
          </button>
          <button
            onClick={() => navigate('/budget')}
            className="flex flex-col gap-1 p-3 rounded-xl text-left"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Wallet size={16} color="#1D9E75" />
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#F5F5F5' }}>
              {todaySpend === 0 ? '₼0' : `₼${todaySpend.toFixed(0)}`}
            </p>
            <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Spent today</p>
          </button>
          <div
            className="flex flex-col gap-1 p-3 rounded-xl"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <Flame size={16} color="#EF9F27" />
            <p style={{ fontSize: '22px', fontWeight: 500, color: '#F5F5F5' }}>{eveningStreak}</p>
            <p style={{ fontSize: '11px', color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Evening streak</p>
          </div>
        </div>
      )}

      {/* Energy check-in */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
        <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Energy today</p>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => saveEnergy(n)}
              style={{
                width: '36px', height: '36px',
                borderRadius: '50%',
                backgroundColor: energyToday === n
                  ? n <= 2 ? '#E24B4A' : n === 3 ? '#EF9F27' : '#1D9E75'
                  : '#222222',
                border: `1.5px solid ${energyToday === n ? '#fff' : '#2A2A2A'}`,
                color: energyToday > 0 && energyToday !== n ? '#3A3A3A' : '#F5F5F5',
                fontSize: '13px',
                fontWeight: 600,
                opacity: energyToday > 0 && energyToday !== n ? 0.35 : 1,
                transition: 'all 150ms ease',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 tasks for active context */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
        <button
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '0.5px solid #2A2A2A' }}
          onClick={() => navigate('/context')}
        >
          <div className="flex items-center gap-2">
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: CONTEXT_COLORS[context] }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>
              {CONTEXT_LABELS[context]} — Next Actions
            </span>
          </div>
          <ChevronRight size={14} color="#555550" />
        </button>
        {loading ? (
          <div className="px-4 py-4">
            <div className="h-4 rounded animate-pulse" style={{ backgroundColor: '#2A2A2A', width: '60%' }} />
          </div>
        ) : tasks.length === 0 ? (
          <p className="px-4 py-4" style={{ fontSize: '13px', color: '#555550' }}>
            No open tasks for this context
          </p>
        ) : (
          tasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
            >
              <button
                onClick={() => toggleTask(task)}
                className="flex-shrink-0"
                style={{
                  width: '18px', height: '18px',
                  border: '1.5px solid #3A3A3A',
                  backgroundColor: 'transparent',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Check size={10} color="#378ADD" strokeWidth={3} />
              </button>
              <p style={{ flex: 1, fontSize: '14px', color: '#F5F5F5' }}>{task.title}</p>
            </div>
          ))
        )}
      </div>

      {/* Saturday: weekly review reminder */}
      {isSaturday && hour >= 14 && !weeklyReviewDone && (
        <button
          onClick={() => navigate('/weekly')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#EF9F2715', border: '0.5px solid #EF9F2740' }}
        >
          <div className="flex items-center gap-3">
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#EF9F27' }} />
            <div className="text-left">
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>Weekly review pending</p>
              <p style={{ fontSize: '12px', color: '#888780' }}>Saturday afternoon — time to review</p>
            </div>
          </div>
          <ChevronRight size={14} color="#EF9F27" />
        </button>
      )}
    </div>
  )
}
