import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { supabase, CONTEXTS, AREAS, CONTEXT_LABELS, GTDContext, AreaTag, TaskPriority, todayStr } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface Props {
  prefillDate?: string
  onClose: () => void
  onCreated?: () => void
}

const PRIORITY_OPTS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'p1', label: 'P1', color: '#E55353' },
  { value: 'p2', label: 'P2', color: '#FFD33C' },
  { value: 'p3', label: 'P3', color: '#6B6B7B' },
]

export default function AddTaskSheet({ prefillDate, onClose, onCreated }: Props) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [area, setArea] = useState<AreaTag | ''>('')
  const [context, setContext] = useState<GTDContext | ''>('')
  const [dueDate, setDueDate] = useState(prefillDate ?? '')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 100)
  }, [])

  const handleSave = async () => {
    if (!title.trim() || !session?.user) return
    setSaving(true)
    await supabase.from('daily_tasks').insert({
      user_id: session.user.id,
      title: title.trim(),
      date: todayStr(),
      category: 'Personal',
      completed: false,
      sort_order: 0,
      area_tag: area || null,
      context_tag: context || null,
      due_date: dueDate || null,
      priority: priority || null,
      status: 'open',
      activated_at: new Date().toISOString(),
    })
    setSaving(false)
    onCreated?.()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl px-5 pt-5 pb-6"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', boxShadow: '0 20px 60px -10px rgb(15 15 26 / 0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >

        <div className="flex items-center justify-between mb-4">
          <span className="text-[16px] font-medium" style={{ color: '#0F0F1A' }}>New Task</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F5FA]">
            <X size={16} style={{ color: '#6B6B7B' }} />
          </button>
        </div>

        {/* Title */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Task title"
          className="w-full rounded-lg px-3.5 py-2.5 text-[14px] mb-4 focus:outline-none"
          style={{
            backgroundColor: '#F5F5FA',
            border: '1px solid #E8E8F0',
            color: '#0F0F1A',
          }}
        />

        {/* Area */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Area</div>
          <div className="flex flex-wrap gap-2">
            {AREAS.map(a => (
              <button
                key={a}
                onClick={() => setArea(area === a ? '' : a)}
                className={cn(
                  'px-3 py-1 rounded-md text-[12px] font-medium transition-colors',
                  area === a ? 'text-white' : ''
                )}
                style={{
                  backgroundColor: area === a ? '#4C4DDC' : '#F5F5FA',
                  border: `1px solid ${area === a ? '#4C4DDC' : '#E8E8F0'}`,
                  color: area === a ? '#fff' : '#6B6B7B',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Context</div>
          <div className="flex flex-wrap gap-2">
            {CONTEXTS.map(c => (
              <button
                key={c}
                onClick={() => setContext(context === c ? '' : c)}
                className="px-3 py-1 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: context === c ? '#4C4DDC' : '#F5F5FA',
                  border: `1px solid ${context === c ? '#4C4DDC' : '#E8E8F0'}`,
                  color: context === c ? '#fff' : '#6B6B7B',
                }}
              >
                {CONTEXT_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Due date</div>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
            style={{
              backgroundColor: '#F5F5FA',
              border: '1px solid #E8E8F0',
              color: dueDate ? '#0F0F1A' : '#6B6B7B',
            }}
          />
        </div>

        {/* Priority */}
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Priority</div>
          <div className="flex gap-2">
            {PRIORITY_OPTS.map(p => (
              <button
                key={p.value}
                onClick={() => setPriority(priority === p.value ? '' : p.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: priority === p.value ? p.color + '20' : '#F5F5FA',
                  border: `1px solid ${priority === p.value ? p.color : '#E8E8F0'}`,
                  color: priority === p.value ? p.color : '#6B6B7B',
                }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="w-full py-2.5 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
        >
          {saving ? 'Saving…' : 'Add Task'}
        </button>
      </div>
    </div>,
    document.body
  )
}
