import { useState, useEffect, useCallback } from 'react'
import { Download, LogOut, Trash2, ChevronDown, ChevronUp, Plus, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase, todayStr } from '../lib/supabase'
import type { Habit, HabitCategory } from '../lib/supabase'
import { useGoogleCalendar } from '../context/GoogleCalendarContext'

const HABIT_CATEGORIES: HabitCategory[] = ['Morning', 'Startup', 'Body', 'Self-dev', 'Evening']

export default function Settings() {
  const { session, signOut } = useAuth()
  const user = session?.user
  const gcal = useGoogleCalendar()

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
      <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-[16px]"
          style={{ backgroundColor: '#4C4DDC20', border: '1px solid #4C4DDC40', color: '#4C4DDC' }}
        >
          E
        </div>
        <div>
          <p className="text-[14px] font-medium" style={{ color: '#0F0F1A' }}>Eshgeen Jafarov</p>
          <p className="text-[12px]" style={{ color: '#6B6B7B' }}>Lead, People Analytics · TapWork Founder</p>
          <p className="text-[11px]" style={{ color: '#6B6B7B' }}>{user?.email}</p>
        </div>
      </div>

      {/* ── Google Calendar ── */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFF6D8' }}>
              <Calendar size={15} style={{ color: '#A07000' }} />
            </div>
            <div>
              <p className="text-[14px] font-medium" style={{ color: '#0F0F1A' }}>Google Calendar</p>
              <p className="text-[12px]" style={{ color: '#6B6B7B' }}>
                {gcal.connected && !gcal.tokenExpired
                  ? 'Connected — primary calendar'
                  : gcal.tokenExpired
                    ? 'Session expired — reconnect to sync'
                    : 'Not connected'}
              </p>
            </div>
          </div>
          {gcal.connected && !gcal.tokenExpired ? (
            <button
              onClick={gcal.logout}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: '#FFF0F0', border: '1px solid #FCCFCF', color: '#B23333' }}
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={gcal.login}
              disabled={gcal.connecting}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
            >
              {gcal.connecting ? 'Connecting…' : gcal.tokenExpired ? 'Reconnect' : 'Connect'}
            </button>
          )}
        </div>
      </div>

      {/* ── Habits Manager ── */}
      <div>
        <button
          onClick={() => setHabitsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors hover:bg-[#F5F5FA]"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}
        >
          <div className="text-left">
            <p className="text-[14px] font-medium" style={{ color: '#0F0F1A' }}>Manage Habits</p>
            <p className="text-[12px]" style={{ color: '#6B6B7B' }}>{activeHabits.length} active · {inactiveHabits.length} inactive</p>
          </div>
          {habitsOpen
            ? <ChevronUp size={16} style={{ color: '#6B6B7B' }} />
            : <ChevronDown size={16} style={{ color: '#6B6B7B' }} />
          }
        </button>

        {habitsOpen && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}>
            {habits.length === 0 ? (
              <p className="px-4 py-4 text-[13px]" style={{ color: '#6B6B7B' }}>No habits yet. Add one below.</p>
            ) : (
              habits.map((habit, i) => (
                <div
                  key={habit.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < habits.length - 1 ? '0.5px solid #E8E8F0' : 'none' }}
                >
                  <span className="text-[18px] flex-shrink-0 w-7 text-center">{habit.icon || '✓'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: habit.active ? '#0F0F1A' : '#6B6B7B' }}>
                      {habit.name}
                    </p>
                    <p className="text-[11px]" style={{ color: '#6B6B7B' }}>{habit.category}</p>
                  </div>
                  {/* Active toggle */}
                  <button
                    onClick={() => toggleHabitActive(habit)}
                    className="flex-shrink-0 w-9 h-5 rounded-full transition-colors relative"
                    style={{ backgroundColor: habit.active ? '#4C4DDC' : '#E8E8F0' }}
                    title={habit.active ? 'Deactivate' : 'Activate'}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: habit.active ? '18px' : '2px' }}
                    />
                  </button>
                  <button
                    onClick={() => deleteHabit(habit.id)}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-[#E5535315] transition-colors"
                  >
                    <Trash2 size={13} style={{ color: '#6B6B7B' }} />
                  </button>
                </div>
              ))
            )}

            {/* Add habit form */}
            {showAddHabit ? (
              <div className="px-4 py-3 flex flex-col gap-3" style={{ borderTop: '1px solid #E8E8F0' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newHabitIcon}
                    onChange={e => setNewHabitIcon(e.target.value)}
                    placeholder="🔥"
                    className="w-12 text-center rounded-lg px-2 py-2 text-[16px] focus:outline-none flex-shrink-0"
                    style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
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
                    style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A' }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {HABIT_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setNewHabitCategory(cat)}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                      style={{
                        backgroundColor: newHabitCategory === cat ? '#4C4DDC20' : '#F5F5FA',
                        border: `1px solid ${newHabitCategory === cat ? '#4C4DDC' : '#E8E8F0'}`,
                        color: newHabitCategory === cat ? '#4C4DDC' : '#6B6B7B',
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
                    style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#6B6B7B' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addHabit}
                    disabled={!newHabitName.trim() || addingHabit}
                    className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-40"
                    style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
                  >
                    {addingHabit ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddHabit(true)}
                className="w-full flex items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-[#F5F5FA]"
                style={{ borderTop: habits.length > 0 ? '0.5px solid #E8E8F0' : 'none' }}
              >
                <Plus size={14} style={{ color: '#4C4DDC' }} />
                <span className="text-[13px]" style={{ color: '#4C4DDC' }}>Add habit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Monthly Budget Target ── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Monthly Budget Target</p>
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}>
          {savedTarget !== null && (
            <p className="text-[12px] mb-3" style={{ color: '#6B6B7B' }}>Current: ₼{savedTarget.toFixed(0)} / month</p>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0' }}>
              <span className="text-[14px]" style={{ color: '#6B6B7B' }}>₼</span>
              <input
                type="number"
                value={monthlyTarget}
                onChange={e => setMonthlyTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTarget()}
                placeholder="e.g. 800"
                className="flex-1 bg-transparent focus:outline-none text-[14px]"
                style={{ color: '#0F0F1A' }}
              />
            </div>
            <button
              onClick={saveTarget}
              disabled={!monthlyTarget || isNaN(parseFloat(monthlyTarget)) || targetSaving}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ backgroundColor: targetSaved ? '#50CD89' : '#4C4DDC', color: '#fff' }}
            >
              {targetSaving ? 'Saving…' : targetSaved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Data ── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: '#6B6B7B' }}>Data</p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}>
          <button
            onClick={exportData}
            disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F5F5FA] disabled:opacity-50"
            style={{ borderBottom: '1px solid #E8E8F0' }}
          >
            <Download size={15} style={{ color: '#50CD89', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: '#0F0F1A' }}>{exporting ? 'Exporting…' : 'Export All Data'}</p>
              <p className="text-[11px]" style={{ color: '#6B6B7B' }}>Download as JSON</p>
            </div>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F5F5FA]"
          >
            <Trash2 size={15} style={{ color: '#FFD33C', flexShrink: 0 }} />
            <div className="flex-1">
              <p className="text-[13px] font-medium" style={{ color: '#FFD33C' }}>Reset Ritual History</p>
              <p className="text-[11px]" style={{ color: '#6B6B7B' }}>Clears all daily ritual data</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-colors hover:bg-[#E5535315]"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', color: '#E55353' }}
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
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}
          >
            <p className="text-[16px] font-medium" style={{ color: '#0F0F1A' }}>Reset ritual history?</p>
            <p className="text-[13px]" style={{ color: '#6B6B7B' }}>
              This will delete all daily ritual check-in data. Streaks reset to zero. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#6B6B7B' }}
              >
                Cancel
              </button>
              <button
                onClick={resetRituals}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-medium disabled:opacity-50"
                style={{ backgroundColor: '#E5535320', border: '1px solid #E5535340', color: '#E55353' }}
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
