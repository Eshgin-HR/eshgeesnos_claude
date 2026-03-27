import { X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { Expense, ExpenseCategory } from '../lib/supabase'

const CAT_ICONS: Record<ExpenseCategory, string> = {
  Food: '🍔', Transport: '🚌', Coffee: '☕', Shopping: '🛍️',
  Health: '💊', Learning: '📚', Social: '🎉', Home: '🏠', Other: '💳',
}

const CAT_COLORS: Record<string, string> = {
  Food: '#1D9E75',
  Transport: '#7F77DD',
  Coffee: '#EF9F27',
  Shopping: '#ef4444',
  Health: '#06b6d4',
  Learning: '#8b5cf6',
  Social: '#f97316',
  Home: '#10b981',
  Other: '#5a6a7e',
}

interface Props {
  expenses: Expense[]
  salary: number
  budget: number
  monthStart: string
  onClose: () => void
}

export default function BudgetReport({ expenses, salary, budget, onClose }: Props) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const remaining = budget > 0 ? budget - totalSpent : null
  const savings = salary > 0 ? salary - totalSpent : null
  const pct = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0

  // Category breakdown
  const catMap: Record<string, number> = {}
  expenses.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount
  })
  const catData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value: Math.round(value), pct: ((value / totalSpent) * 100).toFixed(1) }))
    .sort((a, b) => b.value - a.value)

  const top5 = catData.slice(0, 5)

  // Daily spending trend (all days in month with data)
  const dailyMap: Record<string, number> = {}
  expenses.forEach(e => {
    dailyMap[e.date] = (dailyMap[e.date] || 0) + e.amount
  })
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      day: new Date(date + 'T00:00:00').getDate(),
      amount: Math.round(amount),
    }))

  const now = new Date()
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div
      className="fixed inset-0 flex items-end md:items-center justify-center z-[60] px-0 md:px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full md:max-w-lg rounded-t-2xl md:rounded-2xl overflow-y-auto"
        style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', maxHeight: 'calc(100dvh - 72px)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ backgroundColor: '#0d1f35', borderBottom: '1px solid #1a2a40' }}
        >
          <div>
            <p className="font-bold" style={{ fontSize: '16px', color: '#e8edf3' }}>Budget Report</p>
            <p style={{ fontSize: '11px', color: '#7a8a9e' }}>{monthName}</p>
          </div>
          <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
            <X size={20} color="#ffffff" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
              <p style={{ fontSize: '10px', color: '#7a8a9e' }}>Total Spent</p>
              <p className="font-bold" style={{ fontSize: '20px', color: '#e8edf3' }}>{totalSpent.toFixed(0)}<span style={{ fontSize: '11px', color: '#7a8a9e' }}> AZN</span></p>
              {budget > 0 && <p style={{ fontSize: '10px', color: '#7a8a9e' }}>{pct.toFixed(0)}% of {budget.toLocaleString()} AZN limit</p>}
            </div>
            {savings !== null && (
              <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
                <p style={{ fontSize: '10px', color: '#7a8a9e' }}>Saved this month</p>
                <p className="font-bold" style={{ fontSize: '20px', color: savings >= 0 ? '#1D9E75' : '#ef4444' }}>
                  {savings >= 0 ? '+' : ''}{savings.toFixed(0)}<span style={{ fontSize: '11px', color: '#7a8a9e' }}> AZN</span>
                </p>
                <p style={{ fontSize: '10px', color: '#7a8a9e' }}>Salary: {salary.toLocaleString()} AZN</p>
              </div>
            )}
            {remaining !== null && (
              <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
                <p style={{ fontSize: '10px', color: '#7a8a9e' }}>Remaining Budget</p>
                <p className="font-bold" style={{ fontSize: '20px', color: remaining >= 0 ? '#EF9F27' : '#ef4444' }}>
                  {remaining.toFixed(0)}<span style={{ fontSize: '11px', color: '#7a8a9e' }}> AZN</span>
                </p>
              </div>
            )}
            <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
              <p style={{ fontSize: '10px', color: '#7a8a9e' }}>Transactions</p>
              <p className="font-bold" style={{ fontSize: '20px', color: '#e8edf3' }}>{expenses.length}</p>
              <p style={{ fontSize: '10px', color: '#7a8a9e' }}>
                avg {expenses.length > 0 ? (totalSpent / expenses.length).toFixed(0) : 0} AZN each
              </p>
            </div>
          </div>

          {/* Top 5 categories */}
          {top5.length > 0 && (
            <div>
              <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#7a8a9e' }}>
                Top Categories
              </p>
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
                {top5.map((cat, i) => (
                  <div
                    key={cat.name}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < top5.length - 1 ? '1px solid #1a2a40' : 'none' }}
                  >
                    <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>
                      {CAT_ICONS[cat.name as ExpenseCategory] ?? '💳'}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#e8edf3' }}>{cat.name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#e8edf3' }}>{cat.value} AZN</span>
                      </div>
                      <div className="rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: '#1a2a40' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.pct}%`,
                            backgroundColor: CAT_COLORS[cat.name] ?? '#5a6a7e',
                          }}
                        />
                      </div>
                      <p className="mt-0.5" style={{ fontSize: '9px', color: '#7a8a9e' }}>{cat.pct}% of total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar chart: spending by category */}
          {catData.length > 0 && (
            <div>
              <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#7a8a9e' }}>
                Spending by Category
              </p>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={catData} barCategoryGap="25%" layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fill: '#5a6a7e', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(v: number) => [`${v} AZN`, '']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {catData.map((entry) => (
                        <Cell key={entry.name} fill={CAT_COLORS[entry.name] ?? '#5a6a7e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Daily trend */}
          {dailyData.length > 1 && (
            <div>
              <p className="font-bold uppercase tracking-widest mb-3" style={{ fontSize: '10px', color: '#7a8a9e' }}>
                Daily Spending Trend
              </p>
              <div className="rounded-xl p-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={dailyData} barCategoryGap="20%">
                    <XAxis dataKey="day" tick={{ fill: '#5a6a7e', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', borderRadius: 8, fontSize: 11 }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(v: number) => [`${v} AZN`, '']}
                    />
                    <Bar dataKey="amount" radius={[3, 3, 0, 0]} fill="#7F77DD" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expenses.length === 0 && (
            <div className="text-center py-8" style={{ color: '#7a8a9e' }}>
              <p style={{ fontSize: '13px' }}>No expenses this month to report on.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
