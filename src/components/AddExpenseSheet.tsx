import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { supabase, EXPENSE_CATEGORIES, EXPENSE_LABELS, EXPENSE_COLORS, ExpenseCategory, todayStr } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
  onCreated?: () => void
}

export default function AddExpenseSheet({ onClose, onCreated }: Props) {
  const { session } = useAuth()
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('lunch')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100)
  }, [])

  const handleSave = async () => {
    if (!amount || isNaN(parseFloat(amount)) || !session?.user) return
    setSaving(true)
    await supabase.from('expenses').insert({
      user_id: session.user.id,
      amount: parseFloat(amount),
      category,
      note: note.trim(),
      expense_date: date,
    })
    setSaving(false)
    onCreated?.()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={onClose}>
      <div
        className="relative rounded-t-2xl px-4 pt-4 pb-8"
        style={{ backgroundColor: '#1A1A1A', borderTop: '0.5px solid #2A2A2A', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-[3px] w-8 rounded-full" style={{ backgroundColor: '#3A3A3A' }} />

        <div className="flex items-center justify-between mb-4">
          <span className="text-[16px] font-medium" style={{ color: '#F5F5F5' }}>Add Expense</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#222222]">
            <X size={16} style={{ color: '#888780' }} />
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Amount (AZN)</div>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg px-3.5 py-2.5 text-[20px] font-medium focus:outline-none"
            style={{
              backgroundColor: '#222222',
              border: '0.5px solid #2A2A2A',
              color: '#F5F5F5',
            }}
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Category</div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: category === c ? EXPENSE_COLORS[c] + '20' : '#222222',
                  border: `0.5px solid ${category === c ? EXPENSE_COLORS[c] : '#2A2A2A'}`,
                  color: category === c ? EXPENSE_COLORS[c] : '#888780',
                }}
              >
                {EXPENSE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Note (optional)</div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. lunch at office"
            className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none"
            style={{
              backgroundColor: '#222222',
              border: '0.5px solid #2A2A2A',
              color: '#F5F5F5',
            }}
          />
        </div>

        {/* Date */}
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
            style={{
              backgroundColor: '#222222',
              border: '0.5px solid #2A2A2A',
              color: '#F5F5F5',
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || isNaN(parseFloat(amount)) || saving}
          className="w-full py-2.5 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#378ADD', color: '#fff' }}
        >
          {saving ? 'Saving…' : 'Add Expense'}
        </button>
      </div>
    </div>,
    document.body
  )
}
