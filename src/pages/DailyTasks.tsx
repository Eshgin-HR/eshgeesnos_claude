import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GTDContext, AreaTag, CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS, AREA_COLORS,
  isStalled, todayStr,
} from '../lib/supabase'

type Category = 'PASHA' | 'Personal' | 'Startup' | 'Other'

interface Task {
  id: string
  user_id: string
  date: string
  title: string
  category: Category
  completed: boolean
  time_block: string | null
  sort_order: number
  context_tag: GTDContext | null
  area_tag: AreaTag | null
  activated_at: string | null
  created_at: string
}

const CATEGORIES: Category[] = ['PASHA', 'Personal', 'Startup', 'Other']

const CAT_COLORS: Record<Category, string> = {
  PASHA: '#1D9E75',
  Personal: '#EF9F27',
  Startup: '#7F77DD',
  Other: '#5a6a7e',
}

const CAT_EMOJI: Record<Category, string> = {
  PASHA: '🏢',
  Personal: '🌱',
  Startup: '🚀',
  Other: '📋',
}

const TIME_OPTIONS = [
  '', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00', '22:00',
]

const AREA_OPTIONS: AreaTag[] = ['PASHA', 'TapWork', 'himate.az', 'Personal']

export default function DailyTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalCat, setModalCat] = useState<Category>('PASHA')
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newContext, setNewContext] = useState<GTDContext | ''>('')
  const [newArea, setNewArea] = useState<AreaTag | ''>('')
  const [saving, setSaving] = useState(false)

  const today = todayStr()
  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const load = useCallback(async () => {
    if (!user) return
    const { data, error: err } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (err) { setError(err.message); setLoading(false); return }
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }, [user, today])

  useEffect(() => { load() }, [load])

  const toggleTask = async (task: Task) => {
    const updated = !task.completed
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated } : t))
    await supabase.from('daily_tasks').update({ completed: updated }).eq('id', task.id)
  }

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('daily_tasks').delete().eq('id', id)
  }

  const openAddModal = (cat: Category) => {
    setModalCat(cat)
    setNewTitle('')
    setNewTime('')
    setNewContext('')
    setNewArea('')
    setShowModal(true)
  }

  const saveTask = async () => {
    if (!user || !newTitle.trim()) return
    setSaving(true)
    const catTasks = tasks.filter(t => t.category === modalCat)
    const { data, error: err } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: user.id,
        date: today,
        title: newTitle.trim(),
        category: modalCat,
        completed: false,
        time_block: newTime || null,
        sort_order: catTasks.length,
        context_tag: newContext || null,
        area_tag: newArea || null,
        activated_at: new Date().toISOString(),
      })
      .select()
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }
    setTasks(prev => [...prev, data as Task])
    setShowModal(false)
  }

  const totalDone = tasks.filter(t => t.completed).length
  const totalTasks = tasks.length

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col gap-3 py-10 text-center px-4">
      <p className="font-semibold" style={{ color: '#E24B4A' }}>Could not load tasks</p>
      <p className="text-xs" style={{ color: '#555550' }}>{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p style={{ fontSize: '12px', color: '#888780', marginBottom: '4px' }}>{dateLabel}</p>
        <div className="flex items-end justify-between">
          <h1 className="font-bold" style={{ fontSize: '20px', color: '#F5F5F5' }}>Tasks</h1>
          {totalTasks > 0 && (
            <div className="text-right">
              <p className="font-bold" style={{ fontSize: '18px', color: totalDone === totalTasks ? '#1D9E75' : '#F5F5F5' }}>
                {totalDone}
                <span style={{ color: '#555550', fontWeight: 400, fontSize: '14px' }}>/{totalTasks}</span>
              </p>
              <p style={{ fontSize: '10px', color: '#888780' }}>completed</p>
            </div>
          )}
        </div>
        {totalTasks > 0 && (
          <div className="mt-3 rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: '#2A2A2A' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(totalDone / totalTasks) * 100}%`, backgroundColor: '#378ADD' }}
            />
          </div>
        )}
      </div>

      {/* Category cards */}
      {CATEGORIES.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat)
        const catDone = catTasks.filter(t => t.completed).length
        const color = CAT_COLORS[cat]

        return (
          <div
            key={cat}
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderLeft: `3px solid ${color}` }}
          >
            {/* Category header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '0.5px solid #2A2A2A' }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '15px' }}>{CAT_EMOJI[cat]}</span>
                <span className="font-bold uppercase tracking-wide" style={{ fontSize: '11px', color, letterSpacing: '0.08em' }}>
                  {cat}
                </span>
                {catTasks.length > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full font-medium"
                    style={{
                      fontSize: '10px',
                      backgroundColor: catDone === catTasks.length && catTasks.length > 0 ? color + '30' : '#222222',
                      color: catDone === catTasks.length && catTasks.length > 0 ? color : '#888780',
                    }}
                  >
                    {catDone}/{catTasks.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => openAddModal(cat)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-all"
                style={{ backgroundColor: color + '20', color, fontSize: '11px' }}
              >
                <Plus size={11} />
                Add
              </button>
            </div>

            {/* Task list */}
            <div className="flex flex-col">
              {catTasks.length === 0 ? (
                <p className="px-4 py-4" style={{ fontSize: '12px', color: '#555550' }}>
                  No {cat.toLowerCase()} tasks — tap Add to plan your day
                </p>
              ) : (
                catTasks.map((task, i) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 group"
                    style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
                  >
                    <span className="flex-shrink-0 font-mono" style={{ fontSize: '10px', color: '#555550', width: '36px' }}>
                      {task.time_block ?? '——'}
                    </span>
                    <button
                      onClick={() => toggleTask(task)}
                      className="flex-shrink-0 transition-all"
                      style={{
                        width: '20px', height: '20px',
                        border: `1.5px solid ${task.completed ? '#1D9E75' : '#3A3A3A'}`,
                        backgroundColor: task.completed ? '#1D9E75' : 'transparent',
                        borderRadius: '4px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {task.completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </button>
                    <p
                      className="flex-1 leading-snug"
                      style={{
                        fontSize: '14px',
                        color: task.completed ? '#555550' : '#F5F5F5',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        fontWeight: task.completed ? 400 : 400,
                      }}
                    >
                      {task.title}
                    </p>
                    {/* Context pill */}
                    {task.context_tag && (
                      <span
                        className="flex-shrink-0"
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: CONTEXT_COLORS[task.context_tag] + '25',
                          color: CONTEXT_COLORS[task.context_tag],
                        }}
                      >
                        {CONTEXT_LABELS[task.context_tag].split(' ')[0]}
                      </span>
                    )}
                    {/* Area pill */}
                    {task.area_tag && (
                      <span
                        className="flex-shrink-0"
                        style={{
                          fontSize: '10px',
                          fontWeight: 500,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: AREA_COLORS[task.area_tag] + '25',
                          color: AREA_COLORS[task.area_tag],
                        }}
                      >
                        {task.area_tag}
                      </span>
                    )}
                    {/* Stall dot */}
                    {!task.completed && isStalled(task.activated_at) && (
                      <div
                        className="flex-shrink-0 rounded-full"
                        style={{ width: '6px', height: '6px', backgroundColor: '#EF9F27' }}
                        title="Stalled 7+ days"
                      />
                    )}
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                      style={{ color: '#555550' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}

      {/* Add Task Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-end justify-center z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-lg flex flex-col"
            style={{
              backgroundColor: '#1A1A1A',
              border: '0.5px solid #2A2A2A',
              borderBottom: 'none',
              borderRadius: '16px 16px 0 0',
              maxHeight: '90dvh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: '#3A3A3A' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_COLORS[modalCat] }} />
                <p className="font-medium" style={{ fontSize: '15px', color: '#F5F5F5' }}>New {modalCat} Task</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={18} color="#555550" /></button>
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 overflow-y-auto">
              <input
                autoFocus
                type="text"
                placeholder="What needs to get done?"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newTitle.trim()) saveTask()
                  if (e.key === 'Escape') setShowModal(false)
                }}
                className="w-full rounded-lg px-4 py-3 outline-none"
                style={{
                  backgroundColor: '#222222',
                  border: '0.5px solid #2A2A2A',
                  color: '#F5F5F5',
                  fontSize: '14px',
                }}
              />

              {/* Context selector */}
              <div>
                <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Context</p>
                <div className="flex flex-wrap gap-2">
                  {CONTEXTS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewContext(newContext === c ? '' : c)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: newContext === c ? CONTEXT_COLORS[c] + '30' : '#222222',
                        color: newContext === c ? CONTEXT_COLORS[c] : '#888780',
                        border: `0.5px solid ${newContext === c ? CONTEXT_COLORS[c] : '#2A2A2A'}`,
                      }}
                    >
                      {CONTEXT_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area selector */}
              <div>
                <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Area</p>
                <div className="flex flex-wrap gap-2">
                  {AREA_OPTIONS.map(a => (
                    <button
                      key={a}
                      onClick={() => setNewArea(newArea === a ? '' : a)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: newArea === a ? AREA_COLORS[a] + '30' : '#222222',
                        color: newArea === a ? AREA_COLORS[a] : '#888780',
                        border: `0.5px solid ${newArea === a ? AREA_COLORS[a] : '#2A2A2A'}`,
                      }}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time block */}
              <div>
                <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Time block</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setNewTime(t)}
                      className="px-2.5 py-1.5 rounded-lg font-mono transition-all"
                      style={{
                        fontSize: '11px',
                        backgroundColor: newTime === t ? CAT_COLORS[modalCat] + '30' : '#222222',
                        color: newTime === t ? CAT_COLORS[modalCat] : '#888780',
                        border: `0.5px solid ${newTime === t ? CAT_COLORS[modalCat] : '#2A2A2A'}`,
                      }}
                    >
                      {t || 'No time'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-8 pt-2">
              <button
                onClick={saveTask}
                disabled={saving || !newTitle.trim()}
                className="w-full py-3 rounded-lg font-medium disabled:opacity-40 transition-all"
                style={{ backgroundColor: '#378ADD', color: '#ffffff', fontSize: '15px' }}
              >
                {saving ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
