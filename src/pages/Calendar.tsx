import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { supabase, CONTEXT_COLORS, AREA_COLORS, todayStr } from '../lib/supabase'
import type { Task, GTDContext, AreaTag, TaskStatus } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFAB } from '../components/Layout'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TIME_BLOCK_HOURS: Record<string, number> = {
  morning_ritual: 5,
  home_morning: 6,
  office_am: 9,
  office_pm: 15,
  home_evening: 21,
  transit: 18,
  weekend: 10,
  unassigned: 8,
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const startOffset = startDow === 0 ? 6 : startDow - 1 // Mon-based

  const cells: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))

  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7)
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}

function dateToStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function Calendar() {
  const { session } = useAuth()
  const user = session?.user
  const { openAddTask } = useFAB()

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())

  const fetchTasks = useCallback(async () => {
    if (!user) return

    let from: string, to: string
    if (view === 'month') {
      from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
      to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else {
      // Current week Mon-Sun
      const d = new Date()
      const dow = d.getDay()
      const mon = new Date(d)
      mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      from = dateToStr(mon)
      to = dateToStr(sun)
    }

    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .gte('due_date', from)
      .lte('due_date', to)
      .order('due_date', { ascending: true })

    setTasks((data ?? []) as Task[])
  }, [user, viewYear, viewMonth, view])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.due_date) return acc
    if (!acc[t.due_date]) acc[t.due_date] = []
    acc[t.due_date].push(t)
    return acc
  }, {})

  const selectedTasks = tasksByDate[selectedDate] ?? []
  const todayStr2 = todayStr()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const toggleTask = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'open' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    await supabase.from('daily_tasks').update({ status: newStatus, completed: newStatus === 'done' }).eq('id', task.id)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weeks = getMonthGrid(viewYear, viewMonth)

  // Week view: get Mon-Sun of current week
  const weekDays: Date[] = []
  if (view === 'week') {
    const d = new Date()
    const dow = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    for (let i = 0; i < 7; i++) {
      const day = new Date(mon)
      day.setDate(mon.getDate() + i)
      weekDays.push(day)
    }
  }

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 06–23

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={view === 'month' ? prevMonth : undefined}
            className="p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
            disabled={view === 'week'}
          >
            <ChevronLeft size={16} style={{ color: '#888780' }} />
          </button>
          <h2 className="text-[16px] font-medium" style={{ color: '#F5F5F5' }}>
            {view === 'month' ? monthLabel : 'This week'}
          </h2>
          <button
            onClick={view === 'month' ? nextMonth : undefined}
            className="p-1.5 rounded-lg hover:bg-[#1A1A1A] transition-colors"
            disabled={view === 'week'}
          >
            <ChevronRight size={16} style={{ color: '#888780' }} />
          </button>
        </div>

        {/* Month | Week toggle */}
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '0.5px solid #2A2A2A' }}>
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 text-[12px] font-medium transition-colors capitalize"
              style={{
                backgroundColor: view === v ? '#222222' : 'transparent',
                color: view === v ? '#F5F5F5' : '#888780',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Month grid */}
      {view === 'month' && (
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Day headers */}
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#555550' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7" style={{ borderTop: '0.5px solid #2A2A2A' }}>
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="min-h-[72px] p-1.5" style={{ borderLeft: di > 0 ? '0.5px solid #2A2A2A' : 'none' }} />
                }
                const ds = dateToStr(day)
                const dayTasks = tasksByDate[ds] ?? []
                const isToday = ds === todayStr2
                const isSelected = ds === selectedDate
                const isPast = ds < todayStr2

                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDate(ds)}
                    className="min-h-[72px] p-1.5 text-left transition-colors hover:bg-[#222222] flex flex-col"
                    style={{
                      borderLeft: di > 0 ? '0.5px solid #2A2A2A' : 'none',
                      backgroundColor: isSelected ? '#1A2E45' : isToday ? '#1A2E4580' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[13px] font-medium mb-1 self-start leading-none w-6 h-6 flex items-center justify-center rounded-full"
                      style={{
                        color: isToday ? '#378ADD' : isPast && !isSelected ? '#555550' : '#F5F5F5',
                        backgroundColor: isToday ? '#378ADD20' : 'transparent',
                      }}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {dayTasks.slice(0, 3).map(t => (
                        <div
                          key={t.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                          style={{
                            backgroundColor: t.area_tag ? AREA_COLORS[t.area_tag as AreaTag] + '25' : '#2A2A2A',
                            color: t.area_tag ? AREA_COLORS[t.area_tag as AreaTag] : '#888780',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-[10px] px-1" style={{ color: '#555550' }}>
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Day headers */}
          <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div />
            {weekDays.map((d, i) => {
              const ds = dateToStr(d)
              const isToday = ds === todayStr2
              return (
                <div key={i} className="text-center py-2 text-[11px]" style={{ color: isToday ? '#378ADD' : '#555550' }}>
                  <div className="font-medium">{DAYS[i]}</div>
                  <div style={{ fontWeight: isToday ? 600 : 400, color: isToday ? '#378ADD' : '#888780' }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* Hour rows */}
          <div style={{ maxHeight: '400px', overflowY: 'auto', borderTop: '0.5px solid #2A2A2A' }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="grid"
                style={{ gridTemplateColumns: '48px repeat(7, 1fr)', borderTop: '0.5px solid #2A2A2A', minHeight: '40px' }}
              >
                <div className="text-[10px] px-2 pt-1 flex-shrink-0" style={{ color: '#555550' }}>
                  {String(h).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, di) => {
                  const ds = dateToStr(day)
                  const hourTasks = (tasksByDate[ds] ?? []).filter(t => {
                    const tb = t.time_block
                    const blockHour = tb ? TIME_BLOCK_HOURS[tb] : null
                    return blockHour === h
                  })
                  return (
                    <div key={di} className="p-0.5" style={{ borderLeft: '0.5px solid #2A2A2A' }}>
                      {hourTasks.map(t => (
                        <div
                          key={t.id}
                          className="text-[9px] px-1 py-0.5 rounded mb-0.5 truncate"
                          style={{
                            backgroundColor: AREA_COLORS[t.area_tag as AreaTag] + '25' || '#2A2A2A',
                            color: AREA_COLORS[t.area_tag as AreaTag] || '#888780',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected day panel */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: selectedTasks.length > 0 ? '0.5px solid #2A2A2A' : 'none' }}
        >
          <div>
            <span className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {selectedTasks.length > 0 && (
              <span className="ml-2 text-[12px]" style={{ color: '#888780' }}>{selectedTasks.length} tasks</span>
            )}
          </div>
          <button
            onClick={() => openAddTask(selectedDate)}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#378ADD', color: '#fff' }}
          >
            + Add task
          </button>
        </div>

        {selectedTasks.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-[13px]" style={{ color: '#555550' }}>No tasks due this day</p>
          </div>
        ) : (
          selectedTasks.map((task, i) => {
            const done = task.status === 'done' || task.status === 'deferred'
            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
              >
                <button
                  onClick={() => toggleTask(task)}
                  className="flex-shrink-0 flex items-center justify-center rounded mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: done ? 'none' : '1.5px solid #3A3A3A',
                    backgroundColor: done ? '#1D9E75' : 'transparent',
                    borderRadius: '4px',
                  }}
                >
                  {done && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] truncate"
                    style={{ color: done ? '#555550' : '#F5F5F5', textDecoration: done ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {task.area_tag && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-md uppercase tracking-wide font-medium"
                        style={{ backgroundColor: AREA_COLORS[task.area_tag as AreaTag] + '20', color: AREA_COLORS[task.area_tag as AreaTag] }}
                      >
                        {task.area_tag}
                      </span>
                    )}
                    {task.context_tag && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: CONTEXT_COLORS[task.context_tag as GTDContext] + '20', color: CONTEXT_COLORS[task.context_tag as GTDContext] }}
                      >
                        {task.context_tag}
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
