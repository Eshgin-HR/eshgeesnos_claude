import { useEffect, useState, useCallback } from 'react'
import { Trash2, X, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Expense, ExpenseCategory, BudgetTarget,
  EXPENSE_CATEGORIES, EXPENSE_LABELS, EXPENSE_COLORS,
  todayStr,
} from '../lib/supabase'

type DateFilter = 'today' | 'week' | 'month' | 'all'

function getWeekStart() {
  const d = new Date()
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  const monday = new Date(d)
  monday.setDate(d.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function getMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'TODAY'
  if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY'
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase()
}

function groupByDay(expenses: Expense[]) {
  const groups: Record<string, Expense[]> = {}
  expenses.forEach(e => {
    if (!groups[e.expense_date]) groups[e.expense_date] = []
    groups[e.expense_date].push(e)
  })
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

export default function Budget() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'overview' | 'transactions'>('overview')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [catFilter, setCatFilter] = useState<ExpenseCategory | 'all'>('all')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [target, setTarget] = useState<BudgetTarget | null>(null)
  const [loading, setLoading] = useState(true)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [newTarget, setNewTarget] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)

  // Edit modal
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editCategory, setEditCategory] = useState<ExpenseCategory>('other')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Undo delete
  const [undoExpense, setUndoExpense] = useState<Expense | null>(null)
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const today = todayStr()
  const monthStart = getMonthStart()

  const loadExpenses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    const { data } = await query
    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }, [user])

  const loadTarget = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('budget_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', monthStart)
      .maybeSingle()
    setTarget(data as BudgetTarget ?? null)
    setNewTarget(data?.total_target?.toString() ?? '')
  }, [user, monthStart])

  useEffect(() => { loadExpenses(); loadTarget() }, [loadExpenses, loadTarget])

  // Filter expenses by date
  const filteredByDate = expenses.filter(e => {
    if (dateFilter === 'today') return e.expense_date === today
    if (dateFilter === 'week') return e.expense_date >= getWeekStart()
    if (dateFilter === 'month') return e.expense_date >= monthStart
    return true
  })

  const filteredByCat = filteredByDate.filter(e =>
    catFilter === 'all' ? true : e.category === catFilter
  )

  const totalSpent = filteredByDate.reduce((s, e) => s + Number(e.amount), 0)
  const monthTarget = target?.total_target ?? 0

  // Category breakdown
  const catTotals = EXPENSE_CATEGORIES.map(c => ({
    category: c,
    amount: filteredByDate.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount), 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)

  const saveTarget = async () => {
    if (!user || !newTarget) return
    setSavingTarget(true)
    await supabase.from('budget_targets').upsert({
      user_id: user.id,
      month: monthStart,
      total_target: Number(newTarget),
    }, { onConflict: 'user_id,month' })
    await loadTarget()
    setSavingTarget(false)
    setShowSettings(false)
  }

  const deleteExpense = async (expense: Expense) => {
    setExpenses(prev => prev.filter(e => e.id !== expense.id))
    setUndoExpense(expense)
    if (undoTimer) clearTimeout(undoTimer)
    const t = setTimeout(async () => {
      await supabase.from('expenses').delete().eq('id', expense.id)
      setUndoExpense(null)
    }, 3000)
    setUndoTimer(t)
  }

  const undoDelete = () => {
    if (undoTimer) clearTimeout(undoTimer)
    if (undoExpense) {
      setExpenses(prev => [undoExpense, ...prev].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)))
    }
    setUndoExpense(null)
  }

  const openEdit = (e: Expense) => {
    setEditExpense(e)
    setEditAmount(e.amount.toString())
    setEditCategory(e.category)
    setEditNote(e.note ?? '')
    setEditDate(e.expense_date)
  }

  const saveEdit = async () => {
    if (!editExpense) return
    setEditSaving(true)
    const updates = { amount: Number(editAmount), category: editCategory, note: editNote, expense_date: editDate }
    await supabase.from('expenses').update(updates).eq('id', editExpense.id)
    setExpenses(prev => prev.map(e => e.id === editExpense.id ? { ...e, ...updates } : e))
    setEditSaving(false)
    setEditExpense(null)
  }

  const budgetPct = monthTarget > 0 ? (totalSpent / monthTarget) * 100 : 0
  const barColor = budgetPct >= 90 ? '#E55353' : budgetPct >= 70 ? '#FFD33C' : '#50CD89'

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#4C4DDC', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#0F0F1A' }}>Budget</h1>
        <button onClick={() => setShowSettings(true)} style={{ color: '#6B6B7B' }}>
          <Settings size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '10px', padding: '3px' }}>
        {(['overview', 'transactions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: tab === t ? '#F5F5FA' : 'transparent',
              border: tab === t ? '0.5px solid #E8E8F0' : 'none',
              fontSize: '13px',
              fontWeight: 500,
              color: tab === t ? '#0F0F1A' : '#6B6B7B',
            }}
          >
            {t === 'overview' ? 'Overview' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <>
          {/* Date filter */}
          <div className="flex gap-2">
            {([['today', 'Today'], ['week', 'This week'], ['month', 'This month'], ['all', 'All time']] as const).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setDateFilter(v)}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  backgroundColor: dateFilter === v ? '#4C4DDC20' : '#FFFFFF',
                  color: dateFilter === v ? '#4C4DDC' : '#6B6B7B',
                  border: `1px solid ${dateFilter === v ? '#4C4DDC40' : '#E8E8F0'}`,
                  flexShrink: 0,
                  transition: 'all 150ms ease',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Total spent card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '20px' }}>
            <p style={{ fontSize: '11px', color: '#6B6B7B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>Total Spent</p>
            <p style={{ fontSize: '32px', fontWeight: 500, color: '#0F0F1A', marginTop: '4px' }}>
              ₼{totalSpent.toFixed(2)}
            </p>
            {dateFilter === 'month' && monthTarget > 0 && (
              <div className="mt-3">
                <div className="flex justify-between mb-1.5">
                  <span style={{ fontSize: '12px', color: '#6B6B7B' }}>₼{totalSpent.toFixed(0)} / ₼{monthTarget.toFixed(0)}</span>
                  <span style={{ fontSize: '12px', color: barColor, fontWeight: 500 }}>{budgetPct.toFixed(0)}% of budget</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#E8E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(budgetPct, 100)}%`, backgroundColor: barColor, borderRadius: '2px', transition: 'all 300ms ease' }} />
                </div>
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {catTotals.length > 0 && (
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
              <p style={{ fontSize: '11px', color: '#6B6B7B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, marginBottom: '14px' }}>By Category</p>

              {/* Simple bar chart */}
              <div className="flex flex-col gap-3 mb-4">
                {catTotals.map(c => {
                  const pct = totalSpent > 0 ? (c.amount / totalSpent) * 100 : 0
                  return (
                    <div key={c.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: EXPENSE_COLORS[c.category], flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: '#0F0F1A' }}>{EXPENSE_LABELS[c.category]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: '12px', color: '#6B6B7B' }}>{pct.toFixed(0)}%</span>
                          <span style={{ fontSize: '13px', color: '#0F0F1A', fontWeight: 500 }}>₼{c.amount.toFixed(2)}</span>
                        </div>
                      </div>
                      <div style={{ height: '4px', backgroundColor: '#E8E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: EXPENSE_COLORS[c.category], borderRadius: '2px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {catTotals.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <p style={{ fontSize: '14px', color: '#6B6B7B' }}>No expenses for this period</p>
            </div>
          )}
        </>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setCatFilter('all')}
              style={{
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 500,
                padding: '5px 12px',
                borderRadius: '20px',
                backgroundColor: catFilter === 'all' ? '#4C4DDC20' : '#FFFFFF',
                color: catFilter === 'all' ? '#4C4DDC' : '#6B6B7B',
                border: `1px solid ${catFilter === 'all' ? '#4C4DDC40' : '#E8E8F0'}`,
              }}
            >
              All
            </button>
            {EXPENSE_CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
                style={{
                  flexShrink: 0,
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  backgroundColor: catFilter === c ? EXPENSE_COLORS[c] + '25' : '#FFFFFF',
                  color: catFilter === c ? EXPENSE_COLORS[c] : '#6B6B7B',
                  border: `1px solid ${catFilter === c ? EXPENSE_COLORS[c] + '50' : '#E8E8F0'}`,
                }}
              >
                {EXPENSE_LABELS[c]}
              </button>
            ))}
          </div>

          {/* Transactions grouped by day */}
          {filteredByCat.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <p style={{ fontSize: '14px', color: '#6B6B7B' }}>No transactions</p>
            </div>
          ) : (
            groupByDay(filteredByCat).map(([date, dayExpenses]) => {
              const dayTotal = dayExpenses.reduce((s, e) => s + Number(e.amount), 0)
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#6B6B7B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {formatDate(date)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6B6B7B' }}>₼{dayTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
                    {dayExpenses.map((expense, i) => (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 px-4 py-3 group"
                        style={{ borderTop: i === 0 ? 'none' : '0.5px solid #E8E8F0' }}
                      >
                        <div
                          style={{
                            width: '8px', height: '8px',
                            borderRadius: '50%',
                            backgroundColor: EXPENSE_COLORS[expense.category],
                            flexShrink: 0,
                          }}
                        />
                        <button className="flex-1 text-left" onClick={() => openEdit(expense)}>
                          <p style={{ fontSize: '14px', color: '#0F0F1A' }}>
                            {expense.note || EXPENSE_LABELS[expense.category]}
                          </p>
                          <p style={{ fontSize: '11px', color: '#6B6B7B', marginTop: '1px' }}>
                            {EXPENSE_LABELS[expense.category]}
                          </p>
                        </button>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F0F1A', flexShrink: 0 }}>
                          ₼{Number(expense.amount).toFixed(2)}
                        </span>
                        <button
                          onClick={() => deleteExpense(expense)}
                          className="opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex-shrink-0"
                          style={{ color: '#6B6B7B' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </>
      )}

      {/* Undo toast */}
      {undoExpense && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-xl z-50"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', minWidth: '200px' }}
        >
          <p style={{ fontSize: '13px', color: '#0F0F1A' }}>Expense deleted</p>
          <button onClick={undoDelete} style={{ fontSize: '13px', color: '#4C4DDC', fontWeight: 500 }}>Undo</button>
        </div>
      )}

      {/* Budget settings modal */}
      {showSettings && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[100]"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowSettings(false) }}
        >
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '16px', padding: '24px 20px', width: '90%', maxWidth: '400px' }}>
            <div className="flex items-center justify-between mb-5">
              <p className="font-medium" style={{ fontSize: '16px', color: '#0F0F1A' }}>Budget Settings</p>
              <button onClick={() => setShowSettings(false)} style={{ color: '#6B6B7B' }}><X size={18} /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Monthly target (AZN)
                </p>
                <input
                  autoFocus
                  type="number"
                  placeholder="e.g. 1500"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  className="w-full rounded-lg px-4 py-3 outline-none"
                  style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '18px', fontWeight: 500 }}
                />
              </div>
              <button
                onClick={saveTarget}
                disabled={savingTarget || !newTarget}
                className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
                style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '15px' }}
              >
                {savingTarget ? 'Saving...' : 'Save Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit expense bottom sheet */}
      {editExpense && (
        <div
          className="fixed inset-0 flex items-end justify-center z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditExpense(null) }}
        >
          <div className="w-full max-w-lg flex flex-col" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderBottom: 'none', borderRadius: '16px 16px 0 0', maxHeight: '85dvh' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: '#D1D1E0' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #E8E8F0' }}>
              <p className="font-medium" style={{ fontSize: '15px', color: '#0F0F1A' }}>Edit Expense</p>
              <button onClick={() => setEditExpense(null)}><X size={18} color="#6B6B7B" /></button>
            </div>
            <div className="flex flex-col gap-4 px-5 py-5 overflow-y-auto">
              <input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '22px', fontWeight: 500 }}
              />
              <div>
                <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</p>
                <div className="flex flex-wrap gap-2">
                  {EXPENSE_CATEGORIES.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditCategory(c)}
                      style={{
                        fontSize: '11px', fontWeight: 500, padding: '4px 10px', borderRadius: '6px',
                        backgroundColor: editCategory === c ? EXPENSE_COLORS[c] + '30' : '#F5F5FA',
                        color: editCategory === c ? EXPENSE_COLORS[c] : '#6B6B7B',
                        border: `1px solid ${editCategory === c ? EXPENSE_COLORS[c] : '#E8E8F0'}`,
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
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
                className="w-full rounded-lg px-4 py-2.5 outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
              />
              <div>
                <p style={{ fontSize: '11px', color: '#6B6B7B', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date</p>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full rounded-lg px-4 py-2.5 outline-none"
                  style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
                />
              </div>
            </div>
            <div className="px-5 pb-8 pt-2">
              <button
                onClick={saveEdit}
                disabled={editSaving || !editAmount}
                className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
                style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '15px' }}
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
