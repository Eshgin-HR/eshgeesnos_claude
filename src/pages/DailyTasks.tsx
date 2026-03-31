import { useState, useEffect, useCallback } from 'react'
import { X, Check } from 'lucide-react'
import { createPortal } from 'react-dom'
import {
  supabase, CONTEXTS, AREAS, CONTEXT_LABELS, CONTEXT_COLORS, AREA_COLORS,
  TIME_BLOCK_LABELS, TIME_BLOCKS, isStalled, isOverdue, formatDate,
} from '../lib/supabase'
import type { Task, GTDContext, AreaTag, TaskStatus, TaskPriority, TimeBlock } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
type SortKey = 'due_date' | 'created' | 'priority'
type StatusFilter = 'open' | 'completed' | 'all'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  p1: '#E24B4A',
  p2: '#EF9F27',
  p3: '#888780',
}

const STATUS_OPTS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'deferred', label: 'Deferred' },
]

function TaskDetailPanel({ task, onClose, onUpdated, onDeleted }: {
  task: Task
  onClose: () => void
  onUpdated: (updated: Task) => void
  onDeleted: (id: string) => void
}) {
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<TaskStatus>(task.status ?? 'open')
  const [priority, setPriority] = useState<TaskPriority | null>(task.priority)
  const [area, setArea] = useState<AreaTag | null>(task.area_tag)
  const [context, setContext] = useState<GTDContext | null>(task.context_tag)
  const [timeBlock, setTimeBlock] = useState<TimeBlock | null>(task.time_block)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [deleting, setDeleting] = useState(false)

  const saveField = useCallback(async (patch: Partial<Task>) => {
    const { data } = await supabase
      .from('daily_tasks')
      .update(patch)
      .eq('id', task.id)
      .select('*')
      .single()
    if (data) onUpdated(data as Task)
  }, [task.id, onUpdated])

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return
    setDeleting(true)
    await supabase.from('daily_tasks').delete().eq('id', task.id)
    onDeleted(task.id)
  }

  const isWeb = typeof window !== 'undefined' && window.innerWidth >= 768

  const panelContent = (
    <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#1A1A1A' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
        <span className="text-[13px] font-medium" style={{ color: '#888780' }}>Task detail</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#222222]">
          <X size={15} style={{ color: '#888780' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => title !== task.title && saveField({ title })}
          className="w-full text-[16px] font-medium bg-transparent border-none focus:outline-none"
          style={{ color: '#F5F5F5' }}
          placeholder="Task title"
        />

        {/* Status */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setStatus(opt.value); saveField({ status: opt.value }) }}
                className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: status === opt.value ? '#378ADD20' : '#222222',
                  border: `0.5px solid ${status === opt.value ? '#378ADD' : '#2A2A2A'}`,
                  color: status === opt.value ? '#378ADD' : '#888780',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Priority</div>
          <div className="flex gap-1.5">
            {(['p1', 'p2', 'p3'] as TaskPriority[]).map(p => (
              <button
                key={p}
                onClick={() => { const next = priority === p ? null : p; setPriority(next); saveField({ priority: next }) }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: priority === p ? PRIORITY_COLORS[p] + '20' : '#222222',
                  border: `0.5px solid ${priority === p ? PRIORITY_COLORS[p] : '#2A2A2A'}`,
                  color: priority === p ? PRIORITY_COLORS[p] : '#888780',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] }} />
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Area */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Area</div>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map(a => (
              <button
                key={a}
                onClick={() => { const next = area === a ? null : a; setArea(next); saveField({ area_tag: next }) }}
                className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: area === a ? AREA_COLORS[a] + '20' : '#222222',
                  border: `0.5px solid ${area === a ? AREA_COLORS[a] : '#2A2A2A'}`,
                  color: area === a ? AREA_COLORS[a] : '#888780',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Context</div>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXTS.map(c => (
              <button
                key={c}
                onClick={() => { const next = context === c ? null : c; setContext(next); saveField({ context_tag: next }) }}
                className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: context === c ? CONTEXT_COLORS[c] + '20' : '#222222',
                  border: `0.5px solid ${context === c ? CONTEXT_COLORS[c] : '#2A2A2A'}`,
                  color: context === c ? CONTEXT_COLORS[c] : '#888780',
                }}
              >
                {CONTEXT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Time block */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Time block</div>
          <select
            value={timeBlock ?? ''}
            onChange={e => { const val = (e.target.value as TimeBlock) || null; setTimeBlock(val); saveField({ time_block: val }) }}
            className="rounded-lg px-3 py-2 text-[13px] w-full focus:outline-none"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: timeBlock ? '#F5F5F5' : '#555550' }}
          >
            <option value="">Unassigned</option>
            {TIME_BLOCKS.filter(b => b !== 'unassigned').map(b => (
              <option key={b} value={b}>{TIME_BLOCK_LABELS[b]}</option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Due date</div>
          <input
            type="date"
            value={dueDate}
            onChange={e => { setDueDate(e.target.value); saveField({ due_date: e.target.value || null }) }}
            className="rounded-lg px-3 py-2 text-[13px] focus:outline-none"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: dueDate ? '#F5F5F5' : '#555550' }}
          />
        </div>

        {/* Notes */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={() => notes !== (task.notes ?? '') && saveField({ notes })}
            placeholder="Add notes…"
            rows={4}
            className="w-full rounded-lg px-3 py-2.5 text-[13px] focus:outline-none resize-none"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', lineHeight: '1.6' }}
          />
        </div>

        <p className="text-[11px]" style={{ color: '#555550' }}>
          Created {new Date(task.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>

      {/* Delete */}
      <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '0.5px solid #2A2A2A' }}>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full py-2.5 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ border: '0.5px solid #E24B4A', color: '#E24B4A', backgroundColor: 'transparent' }}
        >
          {deleting ? 'Deleting…' : 'Delete task'}
        </button>
      </div>
    </div>
  )

  if (isWeb) {
    return (
      <div
        className="fixed top-0 right-0 h-full z-50 shadow-xl"
        style={{ width: '360px', borderLeft: '0.5px solid #2A2A2A' }}
      >
        {panelContent}
      </div>
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="rounded-t-2xl overflow-hidden"
        style={{ height: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1" style={{ backgroundColor: '#1A1A1A' }}>
          <div className="h-[3px] w-8 rounded-full" style={{ backgroundColor: '#3A3A3A' }} />
        </div>
        {panelContent}
      </div>
    </div>,
    document.body
  )
}

export default function DailyTasks() {
  const { session } = useAuth()
  const user = session?.user

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [areaFilter, setAreaFilter] = useState<AreaTag | 'all'>('all')
  const [contextFilter, setContextFilter] = useState<GTDContext | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [sortKey, setSortKey] = useState<SortKey>('due_date')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [completedThisWeek, setCompletedThisWeek] = useState(0)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let query = supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', user.id)

    if (statusFilter === 'open') {
      query = query.in('status', ['open', 'in_progress'])
    } else if (statusFilter === 'completed') {
      query = query.in('status', ['done', 'deferred'])
    }

    if (areaFilter !== 'all') query = query.eq('area_tag', areaFilter)
    if (contextFilter !== 'all') query = query.eq('context_tag', contextFilter)

    const { data } = await query.order('created_at', { ascending: false })
    let result = (data ?? []) as Task[]

    if (sortKey === 'due_date') {
      result = result.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      })
    } else if (sortKey === 'priority') {
      const PRI: Record<string, number> = { p1: 0, p2: 1, p3: 2 }
      result = result.sort((a, b) => (PRI[a.priority ?? 'p3'] ?? 3) - (PRI[b.priority ?? 'p3'] ?? 3))
    }

    if (overdueOnly) result = result.filter(t => isOverdue(t.due_date))
    setTasks(result)
    setLoading(false)
  }, [user, areaFilter, contextFilter, statusFilter, sortKey, overdueOnly])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!user) return
    const monday = new Date()
    const d = monday.getDay()
    monday.setDate(monday.getDate() - (d === 0 ? 6 : d - 1))
    monday.setHours(0, 0, 0, 0)
    supabase
      .from('daily_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'done')
      .gte('created_at', monday.toISOString())
      .then(({ count }) => setCompletedThisWeek(count ?? 0))
  }, [user])

  const openCount = tasks.filter(t => t.status === 'open' || t.status === 'in_progress').length
  const overdueCount = tasks.filter(t => isOverdue(t.due_date) && (t.status === 'open' || t.status === 'in_progress')).length

  const toggleComplete = async (task: Task) => {
    const newStatus: TaskStatus = (task.status === 'done') ? 'open' : 'done'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus, completed: newStatus === 'done' } : t))
    await supabase.from('daily_tasks').update({ status: newStatus, completed: newStatus === 'done' }).eq('id', task.id)
  }

  const handleUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
  }

  const handleDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    setSelectedTask(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setStatusFilter('open'); setOverdueOnly(false) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{
            backgroundColor: statusFilter === 'open' && !overdueOnly ? '#378ADD20' : '#1A1A1A',
            border: '0.5px solid #2A2A2A',
            color: statusFilter === 'open' && !overdueOnly ? '#378ADD' : '#888780',
          }}
        >
          {openCount} open
        </button>
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#888780' }}
        >
          {completedThisWeek} completed this week
        </span>
        <button
          onClick={() => { setOverdueOnly(v => !v); setStatusFilter('open') }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{
            backgroundColor: overdueOnly ? '#E24B4A20' : '#1A1A1A',
            border: `0.5px solid ${overdueOnly ? '#E24B4A' : '#2A2A2A'}`,
            color: overdueCount > 0 || overdueOnly ? '#E24B4A' : '#888780',
          }}
        >
          {overdueCount} overdue
        </button>
      </div>

      {/* Area filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {(['all', ...AREAS] as (AreaTag | 'all')[]).map(a => (
          <button
            key={a}
            onClick={() => setAreaFilter(a)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
            style={{
              backgroundColor: areaFilter === a ? '#378ADD' : '#1A1A1A',
              border: '0.5px solid #2A2A2A',
              color: areaFilter === a ? '#fff' : '#888780',
            }}
          >
            {a === 'all' ? 'All areas' : a}
          </button>
        ))}
      </div>

      {/* Context filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
        {(['all', ...CONTEXTS] as (GTDContext | 'all')[]).map(c => (
          <button
            key={c}
            onClick={() => setContextFilter(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors"
            style={{
              backgroundColor: contextFilter === c ? (c === 'all' ? '#378ADD' : CONTEXT_COLORS[c]) : '#1A1A1A',
              border: '0.5px solid #2A2A2A',
              color: contextFilter === c ? '#fff' : '#888780',
            }}
          >
            {c === 'all' ? 'All contexts' : CONTEXT_LABELS[c]}
          </button>
        ))}
      </div>

      {/* Sort + status toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: '0.5px solid #2A2A2A' }}>
          {(['open', 'completed', 'all'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 text-[12px] font-medium transition-colors capitalize"
              style={{
                backgroundColor: statusFilter === s ? '#222222' : 'transparent',
                color: statusFilter === s ? '#F5F5F5' : '#888780',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="px-3 py-1.5 rounded-lg text-[12px] focus:outline-none"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#888780' }}
        >
          <option value="due_date">Due date</option>
          <option value="created">Created</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Task list */}
      <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: '#2A2A2A' }} />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[13px]" style={{ color: '#555550' }}>No tasks match this filter</p>
          </div>
        ) : (
          tasks.map((task, i) => {
            const done = task.status === 'done' || task.status === 'deferred'
            const overdue = isOverdue(task.due_date) && !done
            const stalled = isStalled(task.activated_at) && !done

            return (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[#222222] transition-colors"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
                onClick={() => setSelectedTask(task)}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleComplete(task) }}
                  className="flex-shrink-0 flex items-center justify-center rounded transition-all mt-0.5"
                  style={{
                    width: '18px',
                    height: '18px',
                    border: done ? 'none' : '1.5px solid #3A3A3A',
                    backgroundColor: done ? '#1D9E75' : 'transparent',
                    borderRadius: '4px',
                  }}
                >
                  {done && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-[14px] leading-snug mb-1 truncate"
                    style={{ color: done ? '#555550' : '#F5F5F5', textDecoration: done ? 'line-through' : 'none' }}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.area_tag && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wide"
                        style={{ backgroundColor: AREA_COLORS[task.area_tag as AreaTag] + '20', color: AREA_COLORS[task.area_tag as AreaTag] }}
                      >
                        {task.area_tag}
                      </span>
                    )}
                    {task.context_tag && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: CONTEXT_COLORS[task.context_tag as GTDContext] + '20', color: CONTEXT_COLORS[task.context_tag as GTDContext] }}
                      >
                        {task.context_tag}
                      </span>
                    )}
                    {task.due_date && (
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-md"
                        style={{ border: `0.5px solid ${overdue ? '#E24B4A' : '#2A2A2A'}`, color: overdue ? '#E24B4A' : '#888780' }}
                      >
                        {formatDate(task.due_date)}
                      </span>
                    )}
                    {task.priority && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
                        <span className="text-[11px]" style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority.toUpperCase()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {stalled && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: '#EF9F27' }} title="Stalled 7+ days" />
                )}
              </div>
            )
          })
        )}
      </div>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
