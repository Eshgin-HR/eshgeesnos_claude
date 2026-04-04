import { useEffect, useState, useCallback } from 'react'
import { Check, Flame } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { todayStr } from '../lib/supabase'

type RitualType = 'morning' | 'evening'

const MORNING_ITEMS = [
  { key: 'gratitude', label: 'Gratitude + prayer', time: '05:30', note: 'No phone, 30 min' },
  { key: 'tapwork', label: 'TapWork power hour', time: '06:00', note: 'Pre-decided task only' },
  { key: 'planning', label: 'Daily planning', time: '07:00', note: 'Review next actions, confirm top 3' },
  { key: 'breakfast', label: 'Breakfast', time: '07:15', note: 'No screens' },
  { key: 'commute', label: 'Commute – podcast', time: '07:30', note: '@transit' },
  { key: 'inbox_sweep', label: 'Inbox sweep + lock today\'s list', time: '08:15', note: '' },
  { key: 'reading', label: 'Reading 30 min', time: '08:30', note: '' },
]

const EVENING_ITEMS = [
  { key: 'night_audit', label: 'Night audit', time: '22:00', note: 'Links to Night Audit page' },
  { key: 'capture', label: 'Capture open loops to inbox', time: '', note: '' },
  { key: 'reflection', label: 'Daily reflection', time: '', note: '3 wins · 1 lesson · 1 thing to do differently tomorrow' },
  { key: 'tapwork_task', label: 'Pre-decide tomorrow\'s 06:00 TapWork task', time: '', note: 'Write it now' },
  { key: 'reading', label: 'Reading 15 min', time: '', note: '' },
  { key: 'screens_off', label: 'Screens off', time: '22:30', note: '' },
]

export default function DailyRituals() {
  const { user } = useAuth()
  const [tab, setTab] = useState<RitualType>('morning')
  const [morningState, setMorningState] = useState<Record<string, boolean>>({})
  const [eveningState, setEveningState] = useState<Record<string, boolean>>({})
  const [eveningStreak, setEveningStreak] = useState(0)
  const [tapworkTask, setTapworkTask] = useState('')
  const [savingTask, setSavingTask] = useState(false)

  const today = todayStr()

  const loadRituals = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_rituals')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
    if (data) {
      const morning = data.find(r => r.ritual_type === 'morning')
      const evening = data.find(r => r.ritual_type === 'evening')
      setMorningState(morning?.checklist_state ?? {})
      setEveningState(evening?.checklist_state ?? {})
      setTapworkTask(evening?.tapwork_next_task ?? '')
    }
  }, [user, today])

  const loadStreak = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('daily_rituals')
      .select('date, completed')
      .eq('user_id', user.id)
      .eq('ritual_type', 'evening')
      .eq('completed', true)
      .order('date', { ascending: false })
      .limit(60)
    if (!data || data.length === 0) { setEveningStreak(0); return }
    const days = [...new Set(data.map(r => r.date))].sort().reverse()
    let streak = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    for (const day of days) {
      const d = new Date(day + 'T00:00:00')
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
      if (diff > 1) break
      streak++
      cursor = d
    }
    setEveningStreak(streak)
  }, [user])

  useEffect(() => { loadRituals(); loadStreak() }, [loadRituals, loadStreak])

  const toggle = async (type: RitualType, key: string) => {
    const items = type === 'morning' ? MORNING_ITEMS : EVENING_ITEMS
    const currentState = type === 'morning' ? morningState : eveningState
    const newState = { ...currentState, [key]: !currentState[key] }
    const allDone = items.every(i => newState[i.key])

    if (type === 'morning') setMorningState(newState)
    else setEveningState(newState)

    await supabase.from('daily_rituals').upsert({
      user_id: user!.id,
      date: today,
      ritual_type: type,
      checklist_state: newState,
      completed: allDone,
      tapwork_next_task: type === 'evening' ? tapworkTask : null,
    }, { onConflict: 'user_id,date,ritual_type' })

    if (allDone && type === 'evening') {
      loadStreak()
    }
  }

  const saveTapworkTask = async () => {
    if (!user) return
    setSavingTask(true)
    await supabase.from('daily_rituals').upsert({
      user_id: user.id,
      date: today,
      ritual_type: 'evening',
      checklist_state: eveningState,
      tapwork_next_task: tapworkTask,
      completed: EVENING_ITEMS.every(i => eveningState[i.key]),
    }, { onConflict: 'user_id,date,ritual_type' })
    setSavingTask(false)
  }

  const morningDone = MORNING_ITEMS.filter(i => morningState[i.key]).length
  const eveningDone = EVENING_ITEMS.filter(i => eveningState[i.key]).length
  const isMorningComplete = morningDone === MORNING_ITEMS.length
  const isEveningComplete = eveningDone === EVENING_ITEMS.length

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#0F0F1A' }}>Rituals</h1>
        {eveningStreak > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0' }}
          >
            <Flame size={14} color="#FFD33C" />
            <span style={{ fontSize: '16px', fontWeight: 500, color: '#0F0F1A' }}>{eveningStreak}</span>
            <span style={{ fontSize: '11px', color: '#6B6B7B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Evening streak</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '10px', padding: '3px' }}>
        {([['morning', 'Morning', morningDone, MORNING_ITEMS.length], ['evening', 'Evening', eveningDone, EVENING_ITEMS.length]] as const).map(([type, label, done, total]) => (
          <button
            key={type}
            onClick={() => setTab(type)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: tab === type ? '#F5F5FA' : 'transparent',
              border: tab === type ? '0.5px solid #E8E8F0' : 'none',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 500, color: tab === type ? '#0F0F1A' : '#6B6B7B' }}>
              {label}
            </span>
            {done > 0 && (
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: done === total ? '#50CD8925' : '#E8E8F0',
                color: done === total ? '#50CD89' : '#6B6B7B',
              }}>
                {done}/{total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Morning checklist */}
      {tab === 'morning' && (
        <div>
          {isMorningComplete && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
              style={{ backgroundColor: '#50CD8915', border: '1px solid #50CD8930' }}
            >
              <Check size={14} color="#50CD89" />
              <p style={{ fontSize: '13px', color: '#50CD89', fontWeight: 500 }}>Morning ritual complete — great start!</p>
            </div>
          )}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            {MORNING_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #E8E8F0' }}
              >
                <button
                  onClick={() => toggle('morning', item.key)}
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: `1.5px solid ${morningState[item.key] ? '#50CD89' : '#D1D1E0'}`,
                    backgroundColor: morningState[item.key] ? '#50CD89' : '#F5F5FA',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {morningState[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
                <div className="flex-1">
                  <p style={{
                    fontSize: '14px',
                    color: morningState[item.key] ? '#6B6B7B' : '#0F0F1A',
                    textDecoration: morningState[item.key] ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </p>
                  {(item.time || item.note) && (
                    <p style={{ fontSize: '11px', color: '#6B6B7B', marginTop: '2px' }}>
                      {[item.time, item.note].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evening checklist */}
      {tab === 'evening' && (
        <div className="flex flex-col gap-4">
          {isEveningComplete && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: '#50CD8915', border: '1px solid #50CD8930' }}
            >
              <Check size={14} color="#50CD89" />
              <p style={{ fontSize: '13px', color: '#50CD89', fontWeight: 500 }}>Evening ritual complete — streak updated!</p>
            </div>
          )}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}>
            {EVENING_ITEMS.map((item, i) => (
              <div
                key={item.key}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #E8E8F0' }}
              >
                <button
                  onClick={() => toggle('evening', item.key)}
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: `1.5px solid ${eveningState[item.key] ? '#50CD89' : '#D1D1E0'}`,
                    backgroundColor: eveningState[item.key] ? '#50CD89' : '#F5F5FA',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {eveningState[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
                <div className="flex-1">
                  <p style={{
                    fontSize: '14px',
                    color: eveningState[item.key] ? '#6B6B7B' : '#0F0F1A',
                    textDecoration: eveningState[item.key] ? 'line-through' : 'none',
                  }}>
                    {item.label}
                  </p>
                  {item.note && (
                    <p style={{ fontSize: '11px', color: '#6B6B7B', marginTop: '2px' }}>{item.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tomorrow's TapWork task */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F0F1A', marginBottom: '10px' }}>
              Tomorrow's 06:00 TapWork task
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="What will you work on tomorrow morning?"
                value={tapworkTask}
                onChange={e => setTapworkTask(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2.5 outline-none"
                style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
              />
              <button
                onClick={saveTapworkTask}
                disabled={savingTask || !tapworkTask.trim()}
                className="px-4 py-2.5 rounded-lg font-medium disabled:opacity-40"
                style={{ backgroundColor: '#4C4DDC', color: '#fff', fontSize: '13px', flexShrink: 0 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
