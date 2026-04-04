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
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-2xl px-5 pt-5 pb-6"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', boxShadow: '0 20px 60px -10px rgb(15 15 26 / 0.18)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >

        <div className="flex items-center justify-between mb-4">
          <span className="text-[16px] font-medium" style={{ color: '#0F0F1A' }}>Add Expense</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F5FA]">
            <X size={16} style={{ color: '#6B6B7B' }} />
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Amount (AZN)</div>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg px-3.5 py-2.5 text-[20px] font-medium focus:outline-none"
            style={{
              backgroundColor: '#F5F5FA',
              border: '1px solid #E8E8F0',
              color: '#0F0F1A',
            }}
          />
        </div>

        {/* Category */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Category</div>
          <div className="flex flex-wrap gap-2">
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors"
                style={{
                  backgroundColor: category === c ? EXPENSE_COLORS[c] + '20' : '#F5F5FA',
                  border: `1px solid ${category === c ? EXPENSE_COLORS[c] : '#E8E8F0'}`,
                  color: category === c ? EXPENSE_COLORS[c] : '#6B6B7B',
                }}
              >
                {EXPENSE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Note (optional)</div>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. lunch at office"
            className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none"
            style={{
              backgroundColor: '#F5F5FA',
              border: '1px solid #E8E8F0',
              color: '#0F0F1A',
            }}
          />
        </div>

        {/* Date */}
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg px-3.5 py-2 text-[13px] focus:outline-none"
            style={{
              backgroundColor: '#F5F5FA',
              border: '1px solid #E8E8F0',
              color: '#0F0F1A',
            }}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!amount || isNaN(parseFloat(amount)) || saving}
          className="w-full py-2.5 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
        >
          {saving ? 'Saving…' : 'Add Expense'}
        </button>
      </div>
    </div>,
    document.body
  )
}
