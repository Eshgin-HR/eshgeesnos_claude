import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'

const STORAGE_KEY = 'eshgeen_budget'

export interface BudgetConfig {
  salary: number
  limit: number
}

export function loadBudgetConfig(): BudgetConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { salary: 0, limit: 1000 }
}

export function saveBudgetConfig(cfg: BudgetConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

export default function BudgetSettings() {
  const navigate = useNavigate()
  const [salary, setSalary] = useState('')
  const [limit, setLimit] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const cfg = loadBudgetConfig()
    setSalary(cfg.salary > 0 ? String(cfg.salary) : '')
    setLimit(cfg.limit > 0 ? String(cfg.limit) : '')
  }, [])

  const handleSave = () => {
    saveBudgetConfig({
      salary: Number(salary) || 0,
      limit: Number(limit) || 0,
    })
    setSaved(true)
    setTimeout(() => {
      navigate('/settings')
    }, 800)
  }

  const inputStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e3e3e0',
    borderRadius: '10px',
    color: '#37352f',
    fontSize: '14px',
    padding: '10px 12px',
    width: '100%',
    outline: 'none',
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={18} color="#ffffff" />
        </button>
        <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>Budget Settings</h1>
      </div>

      {/* Income card */}
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <p className="font-semibold text-white" style={{ fontSize: '13px' }}>Monthly Income</p>

        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '11px', color: '#787774' }}>Salary (AZN)</label>
          <div className="relative">
            <input
              type="number"
              placeholder="e.g. 3500"
              value={salary}
              onChange={e => setSalary(e.target.value)}
              style={inputStyle}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787774' }}>AZN/mo</span>
          </div>
          <p style={{ fontSize: '10px', color: '#787774' }}>Your net monthly salary or primary income source.</p>
        </div>
      </div>

      {/* Spending limit card */}
      <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <p className="font-semibold text-white" style={{ fontSize: '13px' }}>Monthly Budget Limit</p>

        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '11px', color: '#787774' }}>Spending limit (AZN)</label>
          <div className="relative">
            <input
              type="number"
              placeholder="e.g. 2000"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              style={inputStyle}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#787774' }}>AZN/mo</span>
          </div>
          <p style={{ fontSize: '10px', color: '#787774' }}>Maximum you want to spend this month.</p>
        </div>

        {/* Savings preview */}
        {Number(salary) > 0 && Number(limit) > 0 && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '11px', color: '#787774' }}>Target monthly savings</span>
            <span className="font-bold" style={{ fontSize: '13px', color: '#1D9E75' }}>
              {(Number(salary) - Number(limit)).toLocaleString()} AZN
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saved}
        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ backgroundColor: saved ? '#0d2b1f' : '#1D9E75', color: saved ? '#1D9E75' : '#ffffff', fontSize: '14px', border: saved ? '1px solid #1D9E75' : 'none' }}
      >
        <Save size={16} />
        {saved ? 'Saved! ✓' : 'Save Settings'}
      </button>
    </div>
  )
}
