import { useEffect, useState, useCallback } from 'react'
import { Plus, Check, Trash2, Clock } from 'lucide-react'
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
  Other: '#8a8a8a',
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
  // Per-category add form state
  const [adding, setAdding] = useState<Category | null>(null)
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

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
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

  const openAdd = (cat: Category) => {
    setAdding(cat)
    setNewTitle('')
    setNewTime('')
  }

  const cancelAdd = () => {
    setAdding(null)
    setNewTitle('')
    setNewTime('')
  }

  const saveTask = async (cat: Category) => {
    if (!user || !newTitle.trim()) return
    setSaving(true)
    const catTasks = tasks.filter(t => t.category === cat)
    const { data, error: err } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: user.id,
        date: today,
        title: newTitle.trim(),
        category: cat,
        completed: false,
        time_block: newTime || null,
        sort_order: catTasks.length,
      })
      .select()
      .single()

    setSaving(false)
    if (err) { setError(err.message); return }
    setTasks(prev => [...prev, data as Task])
    setAdding(null)
    setNewTitle('')
    setNewTime('')
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
      <p className="text-xs" style={{ color: '#787774' }}>{error}</p>
      <p className="text-xs" style={{ color: '#787774' }}>Make sure the <code>daily_tasks</code> table exists in Supabase.</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs mb-0.5" style={{ color: '#787774' }}>{dateLabel}</p>
          <h1 className="font-bold" style={{ fontSize: '20px', color: '#37352f' }}>Daily Tasks</h1>
        </div>
        {totalTasks > 0 && (
          <div className="text-right">
            <p className="font-bold" style={{ fontSize: '22px', color: totalDone === totalTasks ? '#1D9E75' : '#ffffff' }}>
              {totalDone}<span style={{ color: '#787774', fontWeight: 400, fontSize: '16px' }}>/{totalTasks}</span>
            </p>
            <p style={{ fontSize: '10px', color: '#787774' }}>completed</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="rounded-full overflow-hidden" style={{ height: '3px', backgroundColor: '#e3e3e0' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(totalDone / totalTasks) * 100}%`, backgroundColor: '#1D9E75' }}
          />
        </div>
      )}

      {/* Category sections */}
      {CATEGORIES.map(cat => {
        const catTasks = tasks.filter(t => t.category === cat)
        const catDone = catTasks.filter(t => t.completed).length
        const color = CAT_COLORS[cat]
        const isAdding = adding === cat

        return (
          <div key={cat} className="flex flex-col gap-0">
            {/* Category header — HBR style */}
            <div
              className="flex items-center justify-between py-2 mb-1"
              style={{ borderBottom: `2px solid ${color}` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-widest uppercase" style={{ fontSize: '11px', color, letterSpacing: '0.1em' }}>
                  {cat}
                </span>
                {catTasks.length > 0 && (
                  <span style={{ fontSize: '10px', color: '#787774' }}>
                    {catDone}/{catTasks.length}
                  </span>
                )}
              </div>
              <button
                onClick={() => isAdding ? cancelAdd() : openAdd(cat)}
                className="flex items-center gap-1 rounded-lg px-2 py-1 transition-all"
                style={{ backgroundColor: isAdding ? '#e3e3e0' : 'transparent', color: isAdding ? '#8a8a8a' : color, fontSize: '11px' }}
              >
                <Plus size={12} />
                <span>{isAdding ? 'Cancel' : 'Add'}</span>
              </button>
            </div>

            {/* Tasks */}
            <div className="flex flex-col">
              {catTasks.length === 0 && !isAdding && (
                <p className="py-3 text-xs" style={{ color: '#787774' }}>
                  No tasks — tap Add to plan your {cat} work
                </p>
              )}

              {catTasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 py-2.5 group"
                  style={{ borderBottom: '1px solid #e3e3e033' }}
                >
                  {/* Time block */}
                  <div className="flex-shrink-0 w-12 pt-0.5">
                    {task.time_block ? (
                      <span
                        className="font-mono"
                        style={{ fontSize: '10px', color: task.completed ? '#8a8a8a' : '#8a8a8a', letterSpacing: '0.02em' }}
                      >
                        {task.time_block}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: '#e3e3e0' }}>——</span>
                    )}
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task)}
                    className="flex-shrink-0 mt-0.5 rounded transition-all"
                    style={{
                      width: '18px',
                      height: '18px',
                      border: `2px solid ${task.completed ? color : '#e3e3e0'}`,
                      backgroundColor: task.completed ? color : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {task.completed && <Check size={11} color="#ffffff" strokeWidth={3} />}
                  </button>

                  {/* Title */}
                  <p
                    className="flex-1 leading-snug"
                    style={{
                      fontSize: '13px',
                      color: task.completed ? '#8a8a8a' : '#ffffff',
                      textDecoration: task.completed ? 'line-through' : 'none',
                      fontWeight: task.completed ? 400 : 500,
                    }}
                  >
                    {task.title}
                  </p>

                  {/* Delete */}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="flex-shrink-0 opacity-30 hover:opacity-100 active:opacity-100 transition-opacity"
                    style={{ color: '#787774' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Inline add form */}
              {isAdding && (
                <div
                  className="flex items-center gap-2 py-2.5 mt-1"
                  style={{ borderBottom: `1px solid ${color}33` }}
                >
                  {/* Time picker */}
                  <div className="flex-shrink-0 flex items-center gap-1" style={{ width: '72px' }}>
                    <Clock size={10} color="#8a8a8a" />
                    <select
                      value={newTime}
                      onChange={e => setNewTime(e.target.value)}
                      className="bg-transparent outline-none font-mono"
                      style={{ fontSize: '10px', color: newTime ? '#ffffff' : '#8a8a8a', width: '52px' }}
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t} style={{ backgroundColor: '#f7f7f5' }}>
                          {t || '——'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unchecked box placeholder */}
                  <div
                    className="flex-shrink-0"
                    style={{
                      width: '18px', height: '18px',
                      border: `2px solid ${color}55`,
                      borderRadius: '3px',
                    }}
                  />

                  {/* Task input */}
                  <input
                    autoFocus
                    type="text"
                    placeholder="Task description..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTask(cat)
                      if (e.key === 'Escape') cancelAdd()
                    }}
                    className="flex-1 bg-transparent outline-none placeholder-gray-600"
                    style={{ fontSize: '13px' }}
                  />

                  {/* Save */}
                  <button
                    onClick={() => saveTask(cat)}
                    disabled={saving || !newTitle.trim()}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg font-medium disabled:opacity-40 transition-all"
                    style={{ backgroundColor: color, color: '#37352f', fontSize: '11px' }}
                  >
                    {saving ? '...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
