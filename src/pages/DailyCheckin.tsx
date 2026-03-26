import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Habit } from '../lib/supabase'

const DEFAULT_HABITS: Omit<Habit, 'id'>[] = [
  { name: 'TapWork session done', icon: '💻', category: 'Startup', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 0 },
  { name: 'Morning walk / move', icon: '🚶', category: 'Body', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 1 },
  { name: 'No phone first hour', icon: '📵', category: 'Morning', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 2 },
  { name: 'Read or learn 20 min', icon: '📖', category: 'Self-dev', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 3 },
  { name: 'Gym / swim', icon: '💪', category: 'Body', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 4 },
  { name: 'Healthy food', icon: '🥗', category: 'Body', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 5 },
  { name: 'Nightly audit done', icon: '🌙', category: 'Evening', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 6 },
  { name: 'Sleep by 22:00', icon: '😴', category: 'Evening', active: true, counts_toward_score: true, streak_tracking: true, sort_order: 7 },
]

interface CheckinState {
  [habitId: string]: boolean
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="112" height="112" viewBox="0 0 112 112">
      <circle cx="56" cy="56" r={r} fill="none" stroke="#e3e3e0" strokeWidth="8" />
      <circle
        cx="56" cy="56" r={r}
        fill="none"
        stroke={pct === 100 ? '#EF9F27' : '#1D9E75'}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 56 56)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x="56" y="52" textAnchor="middle" fill="#37352f" fontSize="22" fontWeight="700" fontFamily="Manrope">
        {Math.round(pct)}%
      </text>
      <text x="56" y="67" textAnchor="middle" fill="#8a8a8a" fontSize="10" fontFamily="Manrope">
        done
      </text>
    </svg>
  )
}

export default function DailyCheckin() {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<CheckinState>({})
  const [energy, setEnergy] = useState(5)
  const [focus, setFocus] = useState(5)
  const [mood, setMood] = useState(5)
  const [loading, setLoading] = useState(true)
  const insertingRef = useRef(false)

  const today = new Date().toISOString().split('T')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const loadHabits = useCallback(async () => {
    if (!user) return
    let { data: existingHabits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('sort_order')

    if (!existingHabits || existingHabits.length === 0) {
      if (insertingRef.current) return
      insertingRef.current = true
      const toInsert = DEFAULT_HABITS.map(h => ({ ...h, user_id: user.id }))
      await supabase.from('habits').upsert(toInsert, { onConflict: 'user_id,name', ignoreDuplicates: true })
      insertingRef.current = false
      const { data: reloaded } = await supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true).order('sort_order')
      existingHabits = reloaded ?? []
    }

    setHabits(existingHabits as Habit[])

    const { data: logs } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)

    const state: CheckinState = {}
    logs?.forEach((l: { habit_id: string; completed: boolean }) => {
      state[l.habit_id] = l.completed
    })
    setCheckins(state)

    const dailyLog = logs?.[0]
    if (dailyLog) {
      if (dailyLog.energy) setEnergy(dailyLog.energy)
      if (dailyLog.focus) setFocus(dailyLog.focus)
      if (dailyLog.mood) setMood(dailyLog.mood)
    }
    setLoading(false)
  }, [user, today])

  useEffect(() => { loadHabits() }, [loadHabits])

  const toggleHabit = async (habitId: string) => {
    if (!user) return
    const newVal = !checkins[habitId]
    setCheckins(prev => ({ ...prev, [habitId]: newVal }))
    await supabase.from('daily_checkins').upsert(
      { habit_id: habitId, user_id: user.id, date: today, completed: newVal },
      { onConflict: 'habit_id,user_id,date' }
    )
  }

  const saveSliders = async () => {
    if (!user || habits.length === 0) return
    await supabase.from('daily_checkins').upsert(
      { habit_id: habits[0].id, user_id: user.id, date: today, completed: checkins[habits[0].id] ?? false, energy, focus, mood },
      { onConflict: 'habit_id,user_id,date' }
    )
  }

  const scoringHabits = habits.filter(h => h.counts_toward_score)
  const doneCount = scoringHabits.filter(h => checkins[h.id]).length
  const pct = scoringHabits.length > 0 ? (doneCount / scoringHabits.length) * 100 : 0
  const showAlert = hour >= 20 && doneCount < 6

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="font-bold" style={{ fontSize: '18px', color: '#37352f' }}>{greeting}, Eshgeen</h1>
        <p style={{ fontSize: '12px', color: '#787774', marginTop: '2px' }}>{dateStr}</p>
      </div>

      {/* Streak at risk alert */}
      {showAlert && (
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: '#2a1f0a', border: '1px solid #EF9F27' }}
        >
          <span style={{ fontSize: '16px', color: '#37352f' }}>⚠️</span>
          <div>
            <p className="font-medium" style={{ fontSize: '12px', color: '#EF9F27' }}>Streak at risk!</p>
            <p style={{ fontSize: '11px', color: '#787774' }}>Complete at least {6 - doneCount} more habit{6 - doneCount !== 1 ? 's' : ''} before midnight</p>
          </div>
        </div>
      )}

      {/* Completion ring */}
      <div
        className="rounded-xl flex flex-col items-center py-6 gap-1"
        style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
      >
        <CompletionRing pct={pct} />
        <p style={{ fontSize: '11px', color: '#787774', marginTop: '4px' }}>
          {doneCount} of {scoringHabits.length} habits complete today
        </p>
      </div>

      {/* Sliders */}
      <div
        className="rounded-xl px-4 py-4 flex flex-col gap-4"
        style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
      >
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#787774', letterSpacing: '0.06em' }}>How are you feeling?</p>
        {([['Energy', energy, setEnergy], ['Focus', focus, setFocus], ['Mood', mood, setMood]] as [string, number, (v: number) => void][]).map(([label, val, setter]) => (
          <div key={label} className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span style={{ fontSize: '12px', color: '#37352f', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: '12px', color: '#EF9F27', fontWeight: 700 }}>{val}</span>
            </div>
            <input
              type="range" min={1} max={10} value={val}
              onChange={e => setter(Number(e.target.value))}
              onMouseUp={saveSliders}
              onTouchEnd={saveSliders}
            />
          </div>
        ))}
      </div>

      {/* Habit checklist */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #e3e3e0' }}>
          <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#787774', letterSpacing: '0.06em' }}>Daily Habits</p>
        </div>
        {habits.map((habit, i) => (
          <button
            key={habit.id}
            onClick={() => toggleHabit(habit.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:brightness-110"
            style={{
              borderBottom: i < habits.length - 1 ? '1px solid #e3e3e0' : 'none',
              backgroundColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '18px', width: '24px', textAlign: 'center' }}>{habit.icon}</span>
            <span
              className="flex-1"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: checkins[habit.id] ? '#8a8a8a' : '#ffffff',
                textDecoration: checkins[habit.id] ? 'line-through' : 'none',
              }}
            >
              {habit.name}
            </span>
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                backgroundColor: checkins[habit.id] ? '#1D9E75' : 'transparent',
                border: checkins[habit.id] ? 'none' : '2px solid #e3e3e0',
              }}
            >
              {checkins[habit.id] && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
