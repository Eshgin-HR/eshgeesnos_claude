import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Check, X, Trash2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { supabase, CONTEXT_COLORS, AREA_COLORS, todayStr } from '../lib/supabase'
import type { Task, GTDContext, AreaTag, TaskStatus } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useFAB } from '../components/Layout'
import { useGoogleCalendar } from '../context/GoogleCalendarContext'
import { formatEventTime, eventDateStr } from '../lib/googleCalendar'
import type { GoogleCalendarEvent, NewEventPayload } from '../lib/googleCalendar'

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
  const startDow = firstDay.getDay()
  const startOffset = startDow === 0 ? 6 : startDow - 1

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

// ─── Event Form Modal ───────────────────────────────────────────────────────
interface EventFormModalProps {
  initialDate: string
  event?: GoogleCalendarEvent
  onClose: () => void
  onSave: (payload: NewEventPayload) => Promise<void>
  onDelete?: () => Promise<void>
}

function EventFormModal({ initialDate, event, onClose, onSave, onDelete }: EventFormModalProps) {
  const [title, setTitle] = useState(event?.summary ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(!event?.start.dateTime)
  const [date, setDate] = useState(event ? (event.start.date ?? event.start.dateTime?.slice(0, 10) ?? initialDate) : initialDate)
  const [startTime, setStartTime] = useState(event?.start.dateTime ? event.start.dateTime.slice(11, 16) : '09:00')
  const [endTime, setEndTime] = useState(event?.end.dateTime ? event.end.dateTime.slice(11, 16) : '10:00')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true)
    const payload: NewEventPayload = allDay
      ? {
          summary: title.trim(),
          description: description.trim() || undefined,
          start: { date },
          end: { date },
        }
      : {
          summary: title.trim(),
          description: description.trim() || undefined,
          start: { dateTime: `${date}T${startTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
          end: { dateTime: `${date}T${endTime}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        }
    await onSave(payload)
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!onDelete || !window.confirm('Delete this event from Google Calendar?')) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl px-5 pt-5 pb-6 flex flex-col gap-4"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8F0',
          boxShadow: '0 20px 60px -10px rgb(15 15 26 / 0.18)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon size={14} style={{ color: '#FFB800' }} />
            <span className="text-[15px] font-medium" style={{ color: '#0F0F1A' }}>
              {event ? 'Edit event' : 'New event'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {event && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#E5535315] transition-colors"
              >
                <Trash2 size={14} style={{ color: '#E55353' }} />
              </button>
            )}
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F5F5FA] transition-colors">
              <X size={16} style={{ color: '#6B6B7B' }} />
            </button>
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Event title"
          autoFocus
          className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none"
          style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
        />

        {/* All day toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setAllDay(v => !v)}
              className="relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0"
              style={{ backgroundColor: allDay ? '#4C4DDC' : '#E8E8F0' }}
            >
              <div
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{ transform: allDay ? 'translateX(16px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-[13px]" style={{ color: '#6B6B7B' }}>All day</span>
          </label>
        </div>

        {/* Date */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#6B6B7B' }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
          />
        </div>

        {/* Time (only if not all day) */}
        {!allDay && (
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#6B6B7B' }}>Start</div>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
              />
            </div>
            <div className="flex-1">
              <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#6B6B7B' }}>End</div>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#6B6B7B' }}>Description (optional)</div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add description…"
            rows={2}
            className="w-full rounded-lg px-3.5 py-2.5 text-[13px] focus:outline-none resize-none"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', lineHeight: '1.6' }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-2.5 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
        >
          {saving ? 'Saving…' : event ? 'Update event' : 'Create event'}
        </button>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Calendar ──────────────────────────────────────────────────────────
export default function Calendar() {
  const { session } = useAuth()
  const user = session?.user
  const { openAddTask } = useFAB()
  const gcal = useGoogleCalendar()

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr())
  const [newEventDate, setNewEventDate] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<GoogleCalendarEvent | null>(null)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    let from: string, to: string
    if (view === 'month') {
      from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate()
      to = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    } else {
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

  // Fetch Google Calendar events when month changes or when connected
  useEffect(() => {
    if (!gcal.connected || gcal.tokenExpired) return
    const from = new Date(viewYear, viewMonth, 1)
    const to = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59)
    gcal.fetchEventsForRange(from, to)
  }, [viewYear, viewMonth, gcal.connected, gcal.tokenExpired]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!t.due_date) return acc
    if (!acc[t.due_date]) acc[t.due_date] = []
    acc[t.due_date].push(t)
    return acc
  }, {})

  const eventsByDate = gcal.events.reduce<Record<string, GoogleCalendarEvent[]>>((acc, e) => {
    const ds = eventDateStr(e)
    if (!ds) return acc
    if (!acc[ds]) acc[ds] = []
    acc[ds].push(e)
    return acc
  }, {})

  const selectedTasks = tasksByDate[selectedDate] ?? []
  const selectedEvents = eventsByDate[selectedDate] ?? []
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

  const handleCreateEvent = async (payload: NewEventPayload) => {
    await gcal.createEvent(payload)
  }

  const handleUpdateEvent = async (payload: NewEventPayload) => {
    if (!editingEvent) return
    await gcal.updateEvent(editingEvent.id, payload)
  }

  const handleDeleteEvent = async () => {
    if (!editingEvent) return
    await gcal.deleteEvent(editingEvent.id)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weeks = getMonthGrid(viewYear, viewMonth)

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

  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6)

  return (
    <div className="flex flex-col gap-4">
      {/* Token expired banner */}
      {gcal.tokenExpired && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#FFF6D8', border: '1px solid #FFD33C' }}
        >
          <span className="text-[13px]" style={{ color: '#0F0F1A' }}>
            Google Calendar session expired.
          </span>
          <button
            onClick={gcal.login}
            className="text-[12px] font-medium px-3 py-1 rounded-lg"
            style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={view === 'month' ? prevMonth : undefined}
            className="p-1.5 rounded-lg hover:bg-[#FFFFFF] transition-colors"
            disabled={view === 'week'}
          >
            <ChevronLeft size={16} style={{ color: '#6B6B7B' }} />
          </button>
          <h2 className="text-[16px] font-medium" style={{ color: '#0F0F1A' }}>
            {view === 'month' ? monthLabel : 'This week'}
          </h2>
          <button
            onClick={view === 'month' ? nextMonth : undefined}
            className="p-1.5 rounded-lg hover:bg-[#FFFFFF] transition-colors"
            disabled={view === 'week'}
          >
            <ChevronRight size={16} style={{ color: '#6B6B7B' }} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Google Calendar connect indicator */}
          {!gcal.connected && !gcal.tokenExpired && (
            <button
              onClick={gcal.login}
              disabled={gcal.connecting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#6B6B7B' }}
            >
              <CalendarIcon size={12} />
              {gcal.connecting ? 'Connecting…' : 'Connect Google'}
            </button>
          )}
          {gcal.connected && !gcal.tokenExpired && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px]" style={{ backgroundColor: '#F2FFF8', border: '1px solid #C5EED8', color: '#1A7A45' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#50CD89]" />
              Google Calendar
            </div>
          )}

          {/* Month | Week toggle */}
          <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '1px solid #E8E8F0' }}>
            {(['month', 'week'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1.5 text-[12px] font-medium transition-colors capitalize"
                style={{
                  backgroundColor: view === v ? '#F5F5FA' : 'transparent',
                  color: view === v ? '#0F0F1A' : '#6B6B7B',
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Month grid */}
      {view === 'month' && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6B6B7B' }}>
                {d}
              </div>
            ))}
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7" style={{ borderTop: '1px solid #E8E8F0' }}>
              {week.map((day, di) => {
                if (!day) {
                  return <div key={di} className="min-h-[72px] p-1.5" style={{ borderLeft: di > 0 ? '0.5px solid #E8E8F0' : 'none' }} />
                }
                const ds = dateToStr(day)
                const dayTasks = tasksByDate[ds] ?? []
                const dayEvents = eventsByDate[ds] ?? []
                const totalItems = dayTasks.length + dayEvents.length
                const isToday = ds === todayStr2
                const isSelected = ds === selectedDate
                const isPast = ds < todayStr2
                const maxChips = 2
                const taskChips = dayTasks.slice(0, maxChips)
                const eventChips = dayEvents.slice(0, Math.max(0, maxChips - taskChips.length))
                const overflow = Math.max(0, totalItems - maxChips)

                return (
                  <button
                    key={di}
                    onClick={() => setSelectedDate(ds)}
                    className="min-h-[72px] p-1.5 text-left transition-colors hover:bg-[#F5F5FA] flex flex-col"
                    style={{
                      borderLeft: di > 0 ? '0.5px solid #E8E8F0' : 'none',
                      backgroundColor: isSelected ? '#F5F5FF' : isToday ? '#F5F5FF80' : 'transparent',
                    }}
                  >
                    <span
                      className="text-[13px] font-medium mb-1 self-start leading-none w-6 h-6 flex items-center justify-center rounded-full"
                      style={{
                        color: isToday ? '#4C4DDC' : isPast && !isSelected ? '#6B6B7B' : '#0F0F1A',
                        backgroundColor: isToday ? '#4C4DDC20' : 'transparent',
                      }}
                    >
                      {day.getDate()}
                    </span>
                    <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                      {taskChips.map(t => (
                        <div
                          key={t.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                          style={{
                            backgroundColor: t.area_tag ? AREA_COLORS[t.area_tag as AreaTag] + '25' : '#E8E8F0',
                            color: t.area_tag ? AREA_COLORS[t.area_tag as AreaTag] : '#6B6B7B',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                      {eventChips.map(e => (
                        <div
                          key={e.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate leading-tight"
                          style={{ backgroundColor: '#FFF6D8', color: '#A07000' }}
                        >
                          {e.summary}
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div className="text-[10px] px-1" style={{ color: '#6B6B7B' }}>
                          +{overflow} more
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
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
          <div className="grid" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
            <div />
            {weekDays.map((d, i) => {
              const ds = dateToStr(d)
              const isToday = ds === todayStr2
              return (
                <div key={i} className="text-center py-2 text-[11px]" style={{ color: isToday ? '#4C4DDC' : '#6B6B7B' }}>
                  <div className="font-medium">{DAYS[i]}</div>
                  <div style={{ fontWeight: isToday ? 600 : 400, color: isToday ? '#4C4DDC' : '#6B6B7B' }}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', borderTop: '1px solid #E8E8F0' }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="grid"
                style={{ gridTemplateColumns: '48px repeat(7, 1fr)', borderTop: '1px solid #E8E8F0', minHeight: '40px' }}
              >
                <div className="text-[10px] px-2 pt-1 flex-shrink-0" style={{ color: '#6B6B7B' }}>
                  {String(h).padStart(2, '0')}:00
                </div>
                {weekDays.map((day, di) => {
                  const ds = dateToStr(day)
                  const hourTasks = (tasksByDate[ds] ?? []).filter(t => {
                    const tb = t.time_block
                    const blockHour = tb ? TIME_BLOCK_HOURS[tb] : null
                    return blockHour === h
                  })
                  const hourEvents = (eventsByDate[ds] ?? []).filter(e => {
                    if (!e.start.dateTime) return false
                    return new Date(e.start.dateTime).getHours() === h
                  })
                  return (
                    <div key={di} className="p-0.5" style={{ borderLeft: '1px solid #E8E8F0' }}>
                      {hourTasks.map(t => (
                        <div
                          key={t.id}
                          className="text-[9px] px-1 py-0.5 rounded mb-0.5 truncate"
                          style={{
                            backgroundColor: AREA_COLORS[t.area_tag as AreaTag] + '25' || '#E8E8F0',
                            color: AREA_COLORS[t.area_tag as AreaTag] || '#6B6B7B',
                          }}
                        >
                          {t.title}
                        </div>
                      ))}
                      {hourEvents.map(e => (
                        <div
                          key={e.id}
                          className="text-[9px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer"
                          style={{ backgroundColor: '#FFF6D8', color: '#A07000' }}
                          onClick={() => setEditingEvent(e)}
                        >
                          {e.summary}
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
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid #E8E8F0' }}
        >
          <div>
            <span className="text-[14px] font-medium" style={{ color: '#0F0F1A' }}>
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            {(selectedTasks.length > 0 || selectedEvents.length > 0) && (
              <span className="ml-2 text-[12px]" style={{ color: '#6B6B7B' }}>
                {selectedTasks.length + selectedEvents.length} items
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {gcal.connected && !gcal.tokenExpired && (
              <button
                onClick={() => setNewEventDate(selectedDate)}
                className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all active:scale-[0.98] flex items-center gap-1"
                style={{ backgroundColor: '#FFF6D8', border: '1px solid #FFD33C', color: '#A07000' }}
              >
                <CalendarIcon size={11} />
                + Event
              </button>
            )}
            <button
              onClick={() => openAddTask(selectedDate)}
              className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
            >
              + Task
            </button>
          </div>
        </div>

        {/* Tasks section */}
        {selectedTasks.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6B6B7B' }}>Tasks</span>
            </div>
            {selectedTasks.map((task, i) => {
              const done = task.status === 'done' || task.status === 'deferred'
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ borderTop: i === 0 ? 'none' : '0.5px solid #E8E8F0' }}
                >
                  <button
                    onClick={() => toggleTask(task)}
                    className="flex-shrink-0 flex items-center justify-center rounded mt-0.5"
                    style={{
                      width: '18px', height: '18px',
                      border: done ? 'none' : '1.5px solid #D1D1E0',
                      backgroundColor: done ? '#50CD89' : 'transparent',
                      borderRadius: '4px',
                    }}
                  >
                    {done && <Check size={10} color="#fff" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] truncate"
                      style={{ color: done ? '#6B6B7B' : '#0F0F1A', textDecoration: done ? 'line-through' : 'none' }}
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
            })}
          </>
        )}

        {/* Google Calendar events section */}
        {selectedEvents.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1" style={{ borderTop: selectedTasks.length > 0 ? '1px solid #E8E8F0' : 'none' }}>
              <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: '#6B6B7B' }}>Calendar Events</span>
            </div>
            {selectedEvents.map((event, i) => (
              <div
                key={event.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #E8E8F0' }}
              >
                <div
                  className="flex-shrink-0 w-1 self-stretch rounded-full"
                  style={{ backgroundColor: '#FFD33C', minHeight: '32px' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px]" style={{ color: '#0F0F1A' }}>{event.summary}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6B6B7B' }}>{formatEventTime(event)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-[#F5F5FA] transition-colors">
                      <ExternalLink size={12} style={{ color: '#6B6B7B' }} />
                    </a>
                  )}
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-[#F5F5FA]"
                    style={{ color: '#6B6B7B' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Empty state */}
        {selectedTasks.length === 0 && selectedEvents.length === 0 && (
          <div className="flex items-center justify-center py-10">
            <p className="text-[13px]" style={{ color: '#6B6B7B' }}>No tasks or events this day</p>
          </div>
        )}
      </div>

      {/* New event modal */}
      {newEventDate && (
        <EventFormModal
          initialDate={newEventDate}
          onClose={() => setNewEventDate(null)}
          onSave={handleCreateEvent}
        />
      )}

      {/* Edit event modal */}
      {editingEvent && (
        <EventFormModal
          initialDate={eventDateStr(editingEvent)}
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  )
}
