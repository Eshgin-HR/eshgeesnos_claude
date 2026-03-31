import { useState, useEffect, useCallback } from 'react'
import { Download, LogOut, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase, todayStr } from '../lib/supabase'
import type { Habit, HabitCategory } from '../lib/supabase'

const HABIT_CATEGORIES: HabitCategory[] = ['Morning', 'Startup', 'Body', 'Self-dev', 'Evening']

export default function Settings() {
  const { session, signOut } = useAuth()
  const user = session?.user

  // Monthly budget target
  const [monthlyTarget, setMonthlyTarget] = useState('')
  const [savedTarget, setSavedTarget] = useState<number | null>(null)
  const [targetSaving, setTargetSaving] = useState(false)
  const [targetSaved, setTargetSaved] = useState(false)

  // Habits
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitsOpen, setHabitsOpen] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitCategory, setNewHabitCategory] = useState<HabitCategory>('Morning')
  const [newHabitIcon, setNewHabitIcon] = useState('')
  const [addingHabit, setAddingHabit] = useState(false)
  const [showAddHabit, setShowAddHabit] = useState(false)

  // Data
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [exporting, setExporting] = useState(false)

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

  const loadHabits = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
    setHabits((data ?? []) as Habit[])
  }, [user])

  useEffect(() => { loadTarget(); loadHabits() }, [loadTarget, loadHabits])

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

  const toggleHabitActive = async (habit: Habit) => {
    const updated = !habit.active
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, active: updated } : h))
    await supabase.from('habits').update({ active: updated }).eq('id', habit.id)
  }

  const deleteHabit = async (id: string) => {
    if (!window.confirm('Delete this habit?')) return
    setHabits(prev => prev.filter(h => h.id !== id))
    await supabase.from('habits').delete().eq('id', id)
  }

  const addHabit = async () => {
    if (!user || !newHabitName.trim()) return
    setAddingHabit(true)
    const { data } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        name: newHabitName.trim(),
        icon: newHabitIcon.trim() || '✓',
        category: newHabitCategory,
        active: true,
        counts_toward_score: true,
        streak_tracking: true,
        sort_order: habits.length,
      })
      .select('*')
      .single()
    if (data) setHabits(prev => [...prev, data as Habit])
    setNewHabitName('')
    setNewHabitIcon('')
    setNewHabitCategory('Morning')
    setShowAddHabit(false)
    setAddingHabit(false)
  }

  const exportData = async () => {
    if (!user) return
    setExporting(true)
    const [tasksRes, expensesRes, notesRes, ritualsRes, reviewsRes, reflectionsRes, habitsRes] = await Promise.all([
      supabase.from('daily_tasks').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
      supabase.from('daily_rituals').select('*').eq('user_id', user.id),
      supabase.from('weekly_reviews').select('*').eq('user_id', user.id),
      supabase.from('weekly_reflection').select('*').eq('user_id', user.id),
      supabase.from('habits').select('*').eq('user_id', user.id),
    ])
    const blob = new Blob([JSON.stringify({
      exported_at: new Date().toISOString(),
      tasks: tasksRes.data,
      expenses: expensesRes.data,
      notes: notesRes.data,
      rituals: ritualsRes.data,
      weekly_reviews: reviewsRes.data,
      reflections: reflectionsRes.data,
      habits: habitsRes.data,
    }, null, 2)], { type: 'application/json' })
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

  const activeHabits = habits.filter(h => h.active)
  const inactiveHabits = habits.filter(h => !h.active)

  return (
    <div className="flex flex-col gap-5 max-w-md">

      {/* Profile */}
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-[16px]"
          style={{ backgroundColor: '#378ADD20', border: '0.5px solid #378ADD40', color: '#378ADD' }}
        >
          E
        </div>
        <div>
          <p className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Eshgeen Jafarov</p>
          <p className="text-[12px]" style={{ color: '#888780' }}>Lead, People Analytics · TapWork Founder</p>
          <p className="text-[11px]" style={{ color: '#555550' }}>{user?.email}</p>
        </div>
      </div>

      {/* ── Habits Manager ── */}
      <div>
        <button
          onClick={() => setHabitsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-[#222222]"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          <div className="text-left">
            <p className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Manage Habits</p>
            <p className="text-[12px]" style={{ color: '#888780' }}>{activeHabits.length} active · {inactiveHabits.length} inactive</p>
          </div>
          {habitsOpen
            ? <ChevronUp size={16} style={{ color: '#888780' }} />
            : <ChevronDown size={16} style={{ color: '#888780' }} />
          }
        </button>

        {habitsOpen && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
            {habits.length === 0 ? (
              <p className="px-4 py-4 text-[13px]" style={{ color: '#555550' }}>No habits yet. Add one below.</p>
            ) : (
              habits.map((habit, i) => (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < habits.length - 1 ? '0.5px solid #2A2A2A' : 'none' }}
                >
                  <span className="text-[18px] flex-shrink-0 w-7 text-center">{habit.icon || '✓'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: habit.active ? '#F5F5F5' : '#555550' }}>
                      {habit.name}
                    </p>
                    <p className="text-[11px]" style={{ color: '#555550' }}>{habit.category}</p>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleHabitActive(habit)}
                    className="flex-shrink-0 w-9 h-5 rounded-full transition-colors relative"
                    style={{ backgroundColor: habit.active ? '#378ADD' : '#2A2A2A' }}
                    title={habit.active ? 'Deactivate' : 'Activate'}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: habit.active ? '18px' : '2px' }}
                    />
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#E24B4A15] transition-colors"
                  >
                    <Trash2 size={13} style={{ color: '#555550' }} />
                  </button>
                </div>
              ))
            )}

            {/* Add habit form */}
            {showAddHabit ? (
              <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '0.5px solid #2A2A2A' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newHabitIcon}
                    onChange={e => setNewHabitIcon(e.target.value)}
                    placeholder="🔥"
                    className="w-12 text-center rounded-lg px-2 py-2 text-[16px] focus:outline-none flex-shrink-0"
                    style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5' }}
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={e => setNewHabitName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addHabit()}
                    placeholder="Habit name"
                    autoFocus
                    className="flex-1 rounded-lg px-3 py-2 text-[13px] focus:outline-none"
                    style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5' }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewHabitCategory(cat)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: newHabitCategory === cat ? '#378ADD20' : '#222222',
                        border: `0.5px solid ${newHabitCategory === cat ? '#378ADD' : '#2A2A2A'}`,
                        color: newHabitCategory === cat ? '#378ADD' : '#888780',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddHabit(false); setNewHabitName(''); setNewHabitIcon('') }}
                    className="flex-1 py-2 rounded-lg text-[13px] font-medium"
                    style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#888780' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addHabit}
                    disabled={!newHabitName.trim() || addingHabit}
                    className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
                    style={{ backgroundColor: '#378ADD', color: '#fff' }}
                  >
                    {addingHabit ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddHabit(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[#222222]"
                style={{ borderTop: habits.length > 0 ? '0.5px solid #2A2A2A' : 'none' }}
              >
                <Plus size={14} style={{ color: '#378ADD' }} />
                <span className="text-[13px]" style={{ color: '#378ADD' }}>Add habit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Monthly Budget Target ── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Monthly Budget Target</p>
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          {savedTarget !== null && (
            <p className="text-[12px] mb-3" style={{ color: '#555550' }}>Current: ₼{savedTarget.toFixed(0)} / month</p>
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

      {/* ── Data ── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#888780' }}>Data</p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#222222] disabled:opacity-50"
            style={{ borderBottom: '0.5px solid #2A2A2A' }}
          >
            <Download size={15} style={{ color: '#1D9E75', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: '#F5F5F5' }}>{exporting ? 'Exporting…' : 'Export All Data'}</p>
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
              This will delete all daily ritual check-in data. Streaks reset to zero. Cannot be undone.
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
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
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
