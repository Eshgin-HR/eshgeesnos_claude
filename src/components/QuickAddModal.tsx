import { useState } from 'react'
import { X, DollarSign, CheckSquare, FileText } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  GTDContext, AreaTag, ExpenseCategory,
  CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS,
  AREA_COLORS, EXPENSE_CATEGORIES, EXPENSE_LABELS, EXPENSE_COLORS,
  todayStr,
} from '../lib/supabase'

type View = 'menu' | 'expense' | 'task' | 'note'

const AREA_OPTIONS: AreaTag[] = ['PASHA', 'TapWork', 'himate.az', 'Personal']

export default function QuickAddModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [view, setView] = useState<View>('menu')
  const [saving, setSaving] = useState(false)

  // Expense state
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('other')
  const [expNote, setExpNote] = useState('')
  const [expDate, setExpDate] = useState(todayStr())

  // Task state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskContext, setTaskContext] = useState<GTDContext | ''>('')
  const [taskArea, setTaskArea] = useState<AreaTag | ''>('')
  const [taskDue, setTaskDue] = useState('')

  // Note state
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')

  const saveExpense = async () => {
    if (!user || !expAmount || isNaN(Number(expAmount))) return
    setSaving(true)
    await supabase.from('expenses').insert({
      user_id: user.id,
      amount: Number(expAmount),
      category: expCategory,
      note: expNote.trim() || '',
      date: expDate,
    })
    setSaving(false)
    onClose()
  }

  const saveTask = async () => {
    if (!user || !taskTitle.trim()) return
    setSaving(true)
    await supabase.from('daily_tasks').insert({
      user_id: user.id,
      date: taskDue || todayStr(),
      title: taskTitle.trim(),
      category: 'PASHA',
      completed: false,
      context_tag: taskContext || null,
      area_tag: taskArea || null,
      activated_at: new Date().toISOString(),
      sort_order: 999,
    })
    setSaving(false)
    onClose()
  }

  const saveNote = async () => {
    if (!user || !noteBody.trim()) return
    setSaving(true)
    await supabase.from('notes').insert({
      user_id: user.id,
      title: noteTitle.trim() || 'Untitled',
      body: noteBody.trim(),
      tag: 'Personal',
      pinned: false,
    })
    setSaving(false)
    onClose()
  }

  const goBack = () => setView('menu')

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100]"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8F0',
          borderRadius: '16px',
          padding: '24px 20px',
          width: '90%',
          maxWidth: '400px',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-medium" style={{ fontSize: '16px', color: '#0F0F1A' }}>
            {view === 'menu' ? 'Quick Add' : view === 'expense' ? 'Add Expense' : view === 'task' ? 'Add Task' : 'Add Note'}
          </p>
          <button onClick={view === 'menu' ? onClose : goBack} style={{ color: '#6B6B7B' }}>
            <X size={18} />
          </button>
        </div>

        {/* Menu view */}
        {view === 'menu' && (
          <div className="flex flex-col gap-2.5">
            {[
              { key: 'expense' as View, icon: DollarSign, label: 'Add expense', color: '#4C4DDC' },
              { key: 'task' as View, icon: CheckSquare, label: 'Add task', color: '#50CD89' },
              { key: 'note' as View, icon: FileText, label: 'Add note', color: '#534AB7' },
            ].map(({ key, icon: Icon, label, color }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className="flex items-center gap-3 px-4 py-4 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0' }}
              >
                <Icon size={20} color={color} />
                <span style={{ fontSize: '15px', fontWeight: 500, color: '#0F0F1A' }}>{label}</span>
              </button>
            ))}
            <button
              onClick={onClose}
              className="mt-1 w-full py-3 rounded-lg"
              style={{ color: '#6B6B7B', fontSize: '14px' }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Expense form */}
        {view === 'expense' && (
          <div className="flex flex-col gap-4">
            <input
              autoFocus
              type="number"
              placeholder="Amount (AZN)"
              value={expAmount}
              onChange={e => setExpAmount(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '22px', fontWeight: 500 }}
            />
            <div>
              <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</p>
              <div className="flex flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setExpCategory(c)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: expCategory === c ? EXPENSE_COLORS[c] + '30' : '#F5F5FA',
                      color: expCategory === c ? EXPENSE_COLORS[c] : '#6B6B7B',
                      border: `1px solid ${expCategory === c ? EXPENSE_COLORS[c] : '#E8E8F0'}`,
                    }}
                  >
                    {EXPENSE_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="Note (optional)"
              value={expNote}
              onChange={e => setExpNote(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 outline-none"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
            />
            <div>
              <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</p>
              <input
                type="date"
                value={expDate}
                onChange={e => setExpDate(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={saveExpense}
              disabled={saving || !expAmount}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '15px' }}
            >
              {saving ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        )}

        {/* Task form */}
        {view === 'task' && (
          <div className="flex flex-col gap-4">
            <input
              autoFocus
              type="text"
              placeholder="Task title"
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && taskTitle.trim()) saveTask() }}
              className="w-full rounded-lg px-4 py-3 outline-none"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
            />
            <div>
              <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Context</p>
              <div className="flex flex-wrap gap-2">
                {CONTEXTS.map(c => (
                  <button
                    key={c}
                    onClick={() => setTaskContext(taskContext === c ? '' : c)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: taskContext === c ? CONTEXT_COLORS[c] + '30' : '#F5F5FA',
                      color: taskContext === c ? CONTEXT_COLORS[c] : '#6B6B7B',
                      border: `1px solid ${taskContext === c ? CONTEXT_COLORS[c] : '#E8E8F0'}`,
                    }}
                  >
                    {CONTEXT_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Area</p>
              <div className="flex flex-wrap gap-2">
                {AREA_OPTIONS.map(a => (
                  <button
                    key={a}
                    onClick={() => setTaskArea(taskArea === a ? '' : a)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: taskArea === a ? AREA_COLORS[a] + '30' : '#F5F5FA',
                      color: taskArea === a ? AREA_COLORS[a] : '#6B6B7B',
                      border: `1px solid ${taskArea === a ? AREA_COLORS[a] : '#E8E8F0'}`,
                    }}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due date (optional)</p>
              <input
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
              />
            </div>
            <button
              onClick={saveTask}
              disabled={saving || !taskTitle.trim()}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '15px' }}
            >
              {saving ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        )}

        {/* Note form */}
        {view === 'note' && (
          <div className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Title (optional)"
              value={noteTitle}
              onChange={e => setNoteTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 outline-none"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
            />
            <textarea
              autoFocus
              placeholder="Note..."
              value={noteBody}
              onChange={e => setNoteBody(e.target.value)}
              rows={5}
              className="w-full rounded-lg px-4 py-3 outline-none resize-none"
              style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
            />
            <button
              onClick={saveNote}
              disabled={saving || !noteBody.trim()}
              className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
              style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '15px' }}
            >
              {saving ? 'Saving...' : 'Save Note'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
