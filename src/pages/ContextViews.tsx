import { useEffect, useState, useCallback } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GTDContext, Task, CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS,
  todayStr,
} from '../lib/supabase'

const MORNING_RITUAL_ITEMS = [
  { key: 'gratitude', label: 'Gratitude + prayer', time: '05:30', note: 'No phone, 30 min' },
  { key: 'tapwork', label: 'TapWork power hour', time: '06:00', note: 'Pre-decided task only' },
  { key: 'planning', label: 'Daily planning', time: '07:00', note: 'Review next actions, confirm top 3' },
  { key: 'breakfast', label: 'Breakfast', time: '07:15', note: 'No screens' },
  { key: 'commute', label: 'Commute', time: '07:30', note: 'Podcast @transit' },
  { key: 'inbox_sweep', label: 'Inbox sweep', time: '08:15', note: 'Lock today\'s list' },
  { key: 'reading', label: 'Reading', time: '08:30', note: '30 min' },
]

export default function ContextViews() {
  const { user } = useAuth()
  const [activeContext, setActiveContext] = useState<GTDContext>('@office')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [ritualState, setRitualState] = useState<Record<string, boolean>>({})

  const today = todayStr()

  const loadTasks = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('context_tag', activeContext)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }, [user, activeContext])

  const loadRitualState = useCallback(async () => {
    if (!user || activeContext !== '@morning-ritual') return
    const { data } = await supabase
      .from('daily_rituals')
      .select('checklist_state')
      .eq('user_id', user.id)
      .eq('date', today)
      .eq('ritual_type', 'morning')
      .maybeSingle()
    setRitualState((data?.checklist_state as Record<string, boolean>) ?? {})
  }, [user, today, activeContext])

  useEffect(() => {
    if (activeContext === '@morning-ritual') {
      loadRitualState()
    } else {
      loadTasks()
    }
  }, [activeContext, loadTasks, loadRitualState])

  const toggleTask = async (task: Task) => {
    const updated = !task.completed
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated } : t))
    await supabase.from('daily_tasks').update({ completed: updated }).eq('id', task.id)
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('daily_tasks').delete().eq('id', id)
  }

  const toggleRitualItem = async (key: string) => {
    const newState = { ...ritualState, [key]: !ritualState[key] }
    setRitualState(newState)
    await supabase.from('daily_rituals').upsert({
      user_id: user!.id,
      date: today,
      ritual_type: 'morning',
      checklist_state: newState,
      completed: MORNING_RITUAL_ITEMS.every(i => newState[i.key]),
    }, { onConflict: 'user_id,date,ritual_type' })
  }

  const color = CONTEXT_COLORS[activeContext]

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <h1 className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>Contexts</h1>

      {/* Context selector */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CONTEXTS.map(c => (
          <button
            key={c}
            onClick={() => setActiveContext(c)}
            style={{
              flexShrink: 0,
              fontSize: '12px',
              fontWeight: 500,
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: activeContext === c ? CONTEXT_COLORS[c] + '25' : '#1A1A1A',
              color: activeContext === c ? CONTEXT_COLORS[c] : '#888780',
              border: `0.5px solid ${activeContext === c ? CONTEXT_COLORS[c] + '60' : '#2A2A2A'}`,
              transition: 'all 150ms ease',
            }}
          >
            {CONTEXT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Morning ritual checklist */}
      {activeContext === '@morning-ritual' ? (
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A2A', backgroundColor: CONTEXT_COLORS['@morning-ritual'] + '15' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: CONTEXT_COLORS['@morning-ritual'] }}>Morning Ritual Checklist</p>
            <p style={{ fontSize: '11px', color: '#888780', marginTop: '2px' }}>05:30 – 09:00 · No phone during gratitude</p>
          </div>
          {MORNING_RITUAL_ITEMS.map((item, i) => (
            <div
              key={item.key}
              className="flex items-start gap-3 px-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
            >
              <button
                onClick={() => toggleRitualItem(item.key)}
                className="flex-shrink-0 mt-0.5"
                style={{
                  width: '18px', height: '18px',
                  border: `1.5px solid ${ritualState[item.key] ? '#1D9E75' : '#3A3A3A'}`,
                  backgroundColor: ritualState[item.key] ? '#1D9E75' : '#222222',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {ritualState[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
              </button>
              <div className="flex-1">
                <p style={{
                  fontSize: '14px',
                  color: ritualState[item.key] ? '#555550' : '#F5F5F5',
                  textDecoration: ritualState[item.key] ? 'line-through' : 'none',
                }}>
                  {item.label}
                </p>
                <p style={{ fontSize: '11px', color: '#555550', marginTop: '2px' }}>
                  {item.time} · {item.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <p style={{ fontSize: '15px', color: '#888780', fontWeight: 500 }}>No tasks for {CONTEXT_LABELS[activeContext]}</p>
          <p style={{ fontSize: '13px', color: '#555550' }}>Add tasks from the Tasks page and tag them with this context</p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: color }}>{CONTEXT_LABELS[activeContext]}</p>
            <p style={{ fontSize: '11px', color: '#888780', marginTop: '2px' }}>
              {tasks.filter(t => t.completed).length}/{tasks.length} completed
            </p>
          </div>
          {tasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 group"
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
            >
              <button
                onClick={() => toggleTask(task)}
                className="flex-shrink-0"
                style={{
                  width: '20px', height: '20px',
                  border: `1.5px solid ${task.completed ? '#1D9E75' : '#3A3A3A'}`,
                  backgroundColor: task.completed ? '#1D9E75' : 'transparent',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {task.completed && <Check size={12} color="#fff" strokeWidth={3} />}
              </button>
              <div className="flex-1">
                <p style={{
                  fontSize: '14px',
                  color: task.completed ? '#555550' : '#F5F5F5',
                  textDecoration: task.completed ? 'line-through' : 'none',
                }}>
                  {task.title}
                </p>
                {task.date !== today && (
                  <p style={{ fontSize: '11px', color: '#555550', marginTop: '2px' }}>Due {task.date}</p>
                )}
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: '#555550' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
