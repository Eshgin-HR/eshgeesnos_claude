import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Plus, Trash2, X, BarChart2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Expense, ExpenseCategory } from '../lib/supabase'
import { loadBudgetConfig } from './BudgetSettings'
import BudgetReport from './BudgetReport'

const CATEGORIES: ExpenseCategory[] = ['Food', 'Transport', 'Coffee', 'Shopping', 'Health', 'Learning', 'Social', 'Home', 'Other']
const CAT_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍔', Transport: '🚌', Coffee: '☕', Shopping: '🛍️',
  Health: '💊', Learning: '📚', Social: '🎉', Home: '🏠', Other: '💳',
}

export default function BudgetTracker() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [weekData, setWeekData] = useState<{ day: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'Food' as ExpenseCategory,
    note: '',
    date: new Date().toISOString().split('T')[0],
  })

  const cfg = loadBudgetConfig()
  const salary = cfg.salary
  const budget = cfg.limit

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false })

    const list = (data as Expense[]) ?? []
    setExpenses(list)

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1
    const wData = dayLabels.map((day, i) => {
      const d = new Date(now)
      d.setDate(now.getDate() - dayOfWeek + i)
      const dateStr = d.toISOString().split('T')[0]
      const amount = list.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0)
      return { day, amount: Math.round(amount) }
    })
    setWeekData(wData)
    setLoading(false)
  }, [user, monthStart, monthEnd]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const remaining = budget > 0 ? budget - totalSpent : salary - totalSpent
  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0
  const savings = salary > 0 ? salary - totalSpent : null
  const isWarning = budget > 0 && remaining / budget < 0.2

  const addExpense = async () => {
    if (!user || !newExpense.amount) return
    await supabase.from('expenses').insert({
      user_id: user.id,
      amount: Number(newExpense.amount),
      category: newExpense.category,
      note: newExpense.note,
      date: newExpense.date,
    })
    setShowModal(false)
    setNewExpense({ amount: '', category: 'Food', note: '', date: new Date().toISOString().split('T')[0] })
    load()
  }

  const deleteExpense = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const grouped: Record<string, Expense[]> = {}
  expenses.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = []
    grouped[e.date].push(e)
  })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>Budget</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium"
            style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', color: '#7F77DD', fontSize: '12px' }}
          >
            <BarChart2 size={13} /> Report
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium"
            style={{ backgroundColor: '#1D9E75', color: '#ffffff', fontSize: '12px' }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* No budget configured notice */}
      {salary === 0 && budget === 0 && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#1a1000', border: '1px solid #EF9F27' }}>
          <Wallet size={18} color="#EF9F27" />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#EF9F27' }}>Budget not configured</p>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Go to Settings → Budget Settings to set your salary & limit.</p>
          </div>
        </div>
      )}

      {/* Overview stats row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Spent */}
        <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <TrendingDown size={14} color="#EF9F27" />
          <p className="font-bold text-white" style={{ fontSize: '16px' }}>{totalSpent.toFixed(0)}</p>
          <p style={{ fontSize: '9px', color: '#6B7280' }}>Spent AZN</p>
        </div>
        {/* Remaining / Budget */}
        <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <Wallet size={14} color={isWarning ? '#EF9F27' : '#1D9E75'} />
          <p className="font-bold" style={{ fontSize: '16px', color: isWarning ? '#EF9F27' : '#ffffff' }}>
            {budget > 0 ? remaining.toFixed(0) : '—'}
          </p>
          <p style={{ fontSize: '9px', color: '#6B7280' }}>Remaining</p>
        </div>
        {/* Savings */}
        <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <TrendingUp size={14} color="#7F77DD" />
          <p className="font-bold" style={{ fontSize: '16px', color: savings !== null && savings >= 0 ? '#7F77DD' : '#ef4444' }}>
            {savings !== null ? savings.toFixed(0) : '—'}
          </p>
          <p style={{ fontSize: '9px', color: '#6B7280' }}>Saved AZN</p>
        </div>
      </div>

      {/* Monthly overview card */}
      {(salary > 0 || budget > 0) && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontSize: '10px', color: '#6B7280' }}>Spent this month</p>
              <p className="font-bold text-white" style={{ fontSize: '22px' }}>
                {totalSpent.toFixed(0)} <span style={{ fontSize: '12px', color: '#6B7280' }}>AZN</span>
              </p>
            </div>
            {salary > 0 && (
              <div className="text-right">
                <p style={{ fontSize: '10px', color: '#6B7280' }}>Salary</p>
                <p className="font-bold" style={{ fontSize: '16px', color: '#1D9E75' }}>{salary.toLocaleString()} AZN</p>
              </div>
            )}
          </div>

          {budget > 0 && (
            <div>
              <div className="flex justify-between mb-1.5">
                <span style={{ fontSize: '10px', color: '#6B7280' }}>Budget limit: {budget.toLocaleString()} AZN</span>
                <span style={{ fontSize: '10px', color: isWarning ? '#EF9F27' : '#6B7280' }}>{Math.round(pct)}% used</span>
              </div>
              <div className="rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: '#1a2a40' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: isWarning ? '#EF9F27' : '#1D9E75' }}
                />
              </div>
              {isWarning && (
                <p className="mt-1.5" style={{ fontSize: '10px', color: '#EF9F27' }}>
                  ⚠️ Less than 20% of budget remaining
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Weekly chart */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#6B7280' }}>This Week</p>
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={weekData} barCategoryGap="30%">
            <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: '#fff' }}
              formatter={(v: number) => [`${v} AZN`, '']}
            />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {weekData.map((_, i) => <Cell key={i} fill="#1D9E75" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expense list */}
      {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
        <div key={date} className="flex flex-col gap-2">
          <p style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>
            {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
            {grouped[date].map((e, i) => (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: i < grouped[date].length - 1 ? '1px solid #1a2a40' : 'none' }}
              >
                <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{CAT_ICONS[e.category]}</span>
                <div className="flex-1">
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#ffffff' }}>{e.category}</p>
                  {e.note && <p style={{ fontSize: '10px', color: '#6B7280' }}>{e.note}</p>}
                </div>
                <p className="font-bold" style={{ fontSize: '13px', color: '#ffffff' }}>{e.amount} AZN</p>
                <button onClick={() => deleteExpense(e.id)} className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                  <Trash2 size={12} color="#6B7280" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {expenses.length === 0 && (
        <div className="text-center py-12" style={{ color: '#6B7280' }}>
          <p style={{ fontSize: '13px' }}>No expenses this month</p>
          <p style={{ fontSize: '11px', marginTop: '4px' }}>Tap "Add" to log your first expense</p>
        </div>
      )}

      {/* Add expense modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-end md:items-center justify-center z-50 px-4 pb-4 md:pb-0" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-white" style={{ fontSize: '15px' }}>Add Expense</p>
              <button onClick={() => setShowModal(false)}><X size={16} color="#6B7280" /></button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>Amount (AZN)</label>
                  <input
                    type="number" placeholder="0"
                    value={newExpense.amount}
                    onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-white outline-none"
                    style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', fontSize: '13px' }}
                  />
                </div>
                <div className="flex-1">
                  <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>Date</label>
                  <input
                    type="date"
                    value={newExpense.date}
                    onChange={e => setNewExpense(p => ({ ...p, date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-white outline-none"
                    style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', fontSize: '13px', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px', display: 'block' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewExpense(p => ({ ...p, category: cat }))}
                      className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        backgroundColor: newExpense.category === cat ? '#1D9E75' : '#0A1628',
                        color: newExpense.category === cat ? '#fff' : '#6B7280',
                        border: `1px solid ${newExpense.category === cat ? '#1D9E75' : '#1a2a40'}`,
                        fontSize: '11px',
                      }}
                    >
                      {CAT_ICONS[cat]} {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>Note (optional)</label>
                <input
                  type="text" placeholder="What was it?"
                  value={newExpense.note}
                  onChange={e => setNewExpense(p => ({ ...p, note: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-white outline-none placeholder-gray-600"
                  style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', fontSize: '12px' }}
                />
              </div>
            </div>

            <button
              onClick={addExpense}
              className="w-full py-2.5 rounded-lg font-medium text-white"
              style={{ backgroundColor: '#1D9E75', fontSize: '13px' }}
            >
              Add Expense
            </button>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <BudgetReport
          expenses={expenses}
          salary={salary}
          budget={budget}
          monthStart={monthStart}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  )
}
