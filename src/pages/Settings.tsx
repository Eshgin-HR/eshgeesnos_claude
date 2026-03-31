import { useState, useEffect, useCallback } from 'react'
import { Download, LogOut, Trash2, User, Target, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase, todayStr } from '../lib/supabase'

export default function Settings() {
  const { session, signOut } = useAuth()
  const user = session?.user

  const [monthlyTarget, setMonthlyTarget] = useState('')
  const [savedTarget, setSavedTarget] = useState<number | null>(null)
  const [targetSaving, setTargetSaving] = useState(false)
  const [targetSaved, setTargetSaved] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Load current monthly budget target
  const loadTarget = useCallback(async () => {
    if (!user) return
    const monthStart = todayStr().slice(0, 7) + '-01'
    const { data } = await supabase
      .from('budget_targets')
      .select('total_target')
      .eq('user_id', user.id)
      .eq('month', monthStart)
      .maybeSingle()
    if (data) {
      setSavedTarget(Number(data.total_target))
      setMonthlyTarget(String(data.total_target))
    }
  }, [user])

  useEffect(() => { loadTarget() }, [loadTarget])

  const saveTarget = async () => {
    if (!user || !monthlyTarget || isNaN(parseFloat(monthlyTarget))) return
    setTargetSaving(true)
    const monthStart = todayStr().slice(0, 7) + '-01'
    await supabase.from('budget_targets').upsert({
      user_id: user.id,
      month: monthStart,
      total_target: parseFloat(monthlyTarget),
    }, { onConflict: 'user_id,month' })
    setSavedTarget(parseFloat(monthlyTarget))
    setTargetSaving(false)
    setTargetSaved(true)
    setTimeout(() => setTargetSaved(false), 2000)
  }

  const exportData = async () => {
    if (!user) return
    setExporting(true)
    const [tasksRes, expensesRes, notesRes, ritualsRes, reviewsRes, reflectionsRes] = await Promise.all([
      supabase.from('daily_tasks').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('daily_rituals').select('*').eq('user_id', user.id),
      supabase.from('weekly_reviews').select('*').eq('user_id', user.id),
      supabase.from('weekly_reflection').select('*').eq('user_id', user.id),
    ])
    const payload = {
      exported_at: new Date().toISOString(),
      tasks: tasksRes.data,
      expenses: expensesRes.data,
      notes: notesRes.data,
      rituals: ritualsRes.data,
      weekly_reviews: reviewsRes.data,
      reflections: reflectionsRes.data,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eshgeenos-export-${todayStr()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  const resetRituals = async () => {
    if (!user) return
    setResetting(true)
    await supabase.from('daily_rituals').delete().eq('user_id', user.id)
    setResetting(false)
    setShowResetConfirm(false)
  }

  return (
    <div className="flex flex-col gap-5 max-w-md">

      {/* Profile */}
      <div
        className="flex items-center gap-3 p-4 rounded-xl"
        style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
          style={{ backgroundColor: '#378ADD20', border: '0.5px solid #378ADD40', color: '#378ADD', fontSize: '16px' }}
        >
          E
        </div>
        <div>
          <p className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Eshgeen Jafarov</p>
          <p className="text-[12px]" style={{ color: '#888780' }}>Lead, People Analytics · TapWork Founder</p>
          <p className="text-[11px]" style={{ color: '#555550' }}>{user?.email}</p>
        </div>
      </div>

      {/* Budget target */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: '#888780' }}>
          <Target size={11} />
          Monthly Budget Target
        </p>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          {savedTarget !== null && (
            <p className="text-[12px] mb-3" style={{ color: '#555550' }}>
              Current: ₼{savedTarget.toFixed(0)} / month
            </p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A' }}>
              <span className="text-[14px]" style={{ color: '#555550' }}>₼</span>
              <input
                type="number"
                value={monthlyTarget}
                onChange={e => setMonthlyTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTarget()}
                placeholder="e.g. 800"
                className="flex-1 bg-transparent focus:outline-none text-[14px]"
                style={{ color: '#F5F5F5' }}
              />
            </div>
            <button
              onClick={saveTarget}
              disabled={!monthlyTarget || isNaN(parseFloat(monthlyTarget)) || targetSaving}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: targetSaved ? '#1D9E75' : '#378ADD', color: '#fff' }}
            >
              {targetSaving ? 'Saving…' : targetSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Timezone info */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: '#888780' }}>
          <Clock size={11} />
          System
        </p>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium" style={{ color: '#F5F5F5' }}>Timezone</p>
              <p className="text-[12px]" style={{ color: '#888780' }}>Asia/Baku (UTC+4)</p>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: '#222222', color: '#555550', border: '0.5px solid #2A2A2A' }}>
              Fixed
            </span>
          </div>
        </div>
      </div>

      {/* Data */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2 flex items-center gap-1.5" style={{ color: '#888780' }}>
          <User size={11} />
          Data
        </p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#222222] disabled:opacity-50"
            style={{ borderBottom: '0.5px solid #2A2A2A' }}
          >
            <Download size={15} style={{ color: '#1D9E75', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: '#F5F5F5' }}>
                {exporting ? 'Exporting…' : 'Export All Data'}
              </p>
              <p className="text-[11px]" style={{ color: '#888780' }}>Download as JSON</p>
            </div>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#222222]"
          >
            <Trash2 size={15} style={{ color: '#EF9F27', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: '#EF9F27' }}>Reset Ritual History</p>
              <p className="text-[11px]" style={{ color: '#888780' }}>Clears all daily ritual data</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors hover:bg-[#E24B4A15]"
        style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#E24B4A' }}
      >
        <LogOut size={14} />
        Sign Out
      </button>

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center z-[200] px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4 text-center"
            style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
          >
            <p className="text-[16px] font-medium" style={{ color: '#F5F5F5' }}>Reset ritual history?</p>
            <p className="text-[13px]" style={{ color: '#888780' }}>
              This will delete all daily ritual check-in data. Streaks will reset to zero. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium"
                style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#888780' }}
              >
                Cancel
              </button>
              <button
                onClick={resetRituals}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
                style={{ backgroundColor: '#E24B4A20', border: '0.5px solid #E24B4A40', color: '#E24B4A' }}
              >
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
