import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function DailyTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalCat, setModalCat] = useState<Category>('PASHA')
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')
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
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error) return (
    <div className="flex flex-col gap-3 py-10 text-center px-4">
      <p className="font-semibold" style={{ color: '#ef4444' }}>Could not load tasks</p>
      <p className="text-xs" style={{ color: '#7a8a9e' }}>{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p style={{ fontSize: '12px', color: '#7a8a9e', marginBottom: '4px' }}>{dateLabel}</p>
        <div className="flex items-end justify-between">
          <h1 className="font-bold" style={{ fontSize: '22px', color: '#e8edf3' }}>Daily Tasks</h1>
          {totalTasks > 0 && (
            <div className="text-right">
              <p className="font-bold" style={{ fontSize: '18px', color: totalDone === totalTasks ? '#1D9E75' : '#e8edf3' }}>
                {totalDone}
                <span style={{ color: '#7a8a9e', fontWeight: 400, fontSize: '14px' }}>/{totalTasks}</span>
              </p>
              <p style={{ fontSize: '10px', color: '#7a8a9e' }}>completed</p>
            </div>
          )}
        </div>
        {totalTasks > 0 && (
          <div className="mt-3 rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#1a2a40' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(totalDone / totalTasks) * 100}%`, backgroundColor: '#1D9E75' }}
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
            className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderLeft: `3px solid ${color}` }}
          >
            {/* Category header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid #1a2a4060' }}
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
                      backgroundColor: catDone === catTasks.length && catTasks.length > 0 ? color + '30' : '#1a2a40',
                      color: catDone === catTasks.length && catTasks.length > 0 ? color : '#7a8a9e',
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
                <p className="px-4 py-4" style={{ fontSize: '12px', color: '#4a5568' }}>
                  No {cat.toLowerCase()} tasks — tap Add to plan your day
                </p>
              ) : (
                catTasks.map((task, i) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3 group"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid #1a2a4040' }}
                  >
                    <span className="flex-shrink-0 font-mono" style={{ fontSize: '10px', color: '#4a5568', width: '36px' }}>
                      {task.time_block ?? '——'}
                    </span>
                    <button
                      onClick={() => toggleTask(task)}
                      className="flex-shrink-0 transition-all"
                      style={{
                        width: '20px', height: '20px',
                        border: `2px solid ${task.completed ? color : '#1a2a40'}`,
                        backgroundColor: task.completed ? color : 'transparent',
                        borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {task.completed && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </button>
                    <p
                      className="flex-1 leading-snug"
                      style={{
                        fontSize: '14px',
                        color: task.completed ? '#4a5568' : '#e8edf3',
                        textDecoration: task.completed ? 'line-through' : 'none',
                        fontWeight: task.completed ? 400 : 500,
                      }}
                    >
                      {task.title}
                    </p>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                      style={{ color: '#5a6a7e' }}
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
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl flex flex-col"
            style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderBottom: 'none', maxHeight: '85dvh' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#1a2a40' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #1a2a40' }}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[modalCat] }} />
                <p className="font-bold" style={{ fontSize: '15px', color: '#e8edf3' }}>New {modalCat} Task</p>
              </div>
              <button onClick={() => setShowModal(false)}><X size={18} color="#5a6a7e" /></button>
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
                className="w-full rounded-xl px-4 py-3 outline-none"
                style={{ backgroundColor: '#112240', border: '1px solid #1a2a40', color: '#e8edf3', fontSize: '15px' }}
              />
              <div>
                <p style={{ fontSize: '11px', color: '#7a8a9e', marginBottom: '10px', fontWeight: 500 }}>Time block (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map(t => (
                    <button
                      key={t}
                      onClick={() => setNewTime(t)}
                      className="px-2.5 py-1.5 rounded-lg font-mono transition-all"
                      style={{
                        fontSize: '11px',
                        backgroundColor: newTime === t ? CAT_COLORS[modalCat] : '#112240',
                        color: newTime === t ? '#ffffff' : '#7a8a9e',
                        border: `1px solid ${newTime === t ? CAT_COLORS[modalCat] : '#1a2a40'}`,
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
                className="w-full py-4 rounded-xl font-semibold disabled:opacity-40 transition-all"
                style={{ backgroundColor: CAT_COLORS[modalCat], color: '#ffffff', fontSize: '15px' }}
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
