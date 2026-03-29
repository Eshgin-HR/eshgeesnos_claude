import { useEffect, useState, useCallback } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WeeklyReflection as WR, getMondayOfWeek } from '../lib/supabase'

export default function WeeklyReflection() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    pasha_progress: '',
    tapwork_progress: '',
    not_completed: '',
    energy_rating: 0,
    energy_note: '',
    protect_next_week: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [past, setPast] = useState<WR[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const weekStart = getMondayOfWeek()

  const load = useCallback(async () => {
    if (!user) return
    const { data: current } = await supabase
      .from('weekly_reflection')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (current) {
      setForm({
        pasha_progress: current.pasha_progress ?? '',
        tapwork_progress: current.tapwork_progress ?? '',
        not_completed: current.not_completed ?? '',
        energy_rating: current.energy_rating ?? 0,
        energy_note: current.energy_note ?? '',
        protect_next_week: current.protect_next_week ?? '',
      })
      setSaved(true)
    }

    const { data: history } = await supabase
      .from('weekly_reflection')
      .select('*')
      .eq('user_id', user.id)
      .neq('week_start', weekStart)
      .order('week_start', { ascending: false })
      .limit(10)
    setPast((history as WR[]) ?? [])
  }, [user, weekStart])

  useEffect(() => { load() }, [load])

  const save = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('weekly_reflection').upsert({
      user_id: user.id,
      week_start: weekStart,
      ...form,
      energy_rating: form.energy_rating || null,
    }, { onConflict: 'user_id,week_start' })
    setSaving(false)
    setSaved(true)
  }

  const weekLabel = new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>Sunday Reflection</h1>
        <p style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>Week of {weekLabel}</p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        {/* PASHA */}
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#185FA5', marginBottom: '10px' }}>
            PASHA — What moved forward this week?
          </p>
          <textarea
            placeholder="What progressed at PASHA this week?"
            value={form.pasha_progress}
            onChange={e => { setForm(p => ({ ...p, pasha_progress: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
        </div>

        {/* TapWork */}
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F6E56', marginBottom: '10px' }}>
            TapWork — What moved forward this week?
          </p>
          <textarea
            placeholder="What progressed at TapWork this week?"
            value={form.tapwork_progress}
            onChange={e => { setForm(p => ({ ...p, tapwork_progress: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
        </div>

        {/* Not completed */}
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5', marginBottom: '10px' }}>
            What didn't I complete that I planned?
          </p>
          <textarea
            placeholder="Tasks or goals that didn't happen..."
            value={form.not_completed}
            onChange={e => { setForm(p => ({ ...p, not_completed: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
        </div>

        {/* Energy */}
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5', marginBottom: '10px' }}>
            Energy and focus this week
          </p>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => { setForm(p => ({ ...p, energy_rating: p.energy_rating === n ? 0 : n })); setSaved(false) }}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '50%',
                  backgroundColor: form.energy_rating === n
                    ? n <= 2 ? '#E24B4A' : n === 3 ? '#EF9F27' : '#1D9E75'
                    : '#222222',
                  border: `1.5px solid ${form.energy_rating === n ? 'white' : '#2A2A2A'}`,
                  color: form.energy_rating >= n ? '#fff' : '#555550',
                  fontSize: '13px',
                  fontWeight: 600,
                  opacity: form.energy_rating > 0 && form.energy_rating !== n ? 0.4 : 1,
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Optional note on energy..."
            value={form.energy_note}
            onChange={e => { setForm(p => ({ ...p, energy_note: e.target.value })); setSaved(false) }}
            className="w-full rounded-lg px-3 py-2.5 outline-none"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
        </div>

        {/* Protect */}
        <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5', marginBottom: '10px' }}>
            What is the single most important thing to protect next week?
          </p>
          <textarea
            placeholder="One focus for next week..."
            value={form.protect_next_week}
            onChange={e => { setForm(p => ({ ...p, protect_next_week: e.target.value })); setSaved(false) }}
            rows={2}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', fontSize: '14px' }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
          style={{
            backgroundColor: saved ? 'transparent' : '#378ADD',
            color: saved ? '#1D9E75' : '#fff',
            border: saved ? '0.5px solid #1D9E75' : 'none',
            fontSize: '15px',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Reflection'}
        </button>
      </div>

      {/* Past reflections */}
      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Past reflections
          </p>
          {past.map(r => (
            <div
              key={r.id}
              style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <span style={{ fontSize: '13px', color: '#F5F5F5' }}>
                  Week of {new Date(r.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex items-center gap-2">
                  {r.energy_rating && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      padding: '2px 6px', borderRadius: '4px',
                      backgroundColor: r.energy_rating <= 2 ? '#E24B4A20' : r.energy_rating === 3 ? '#EF9F2720' : '#1D9E7520',
                      color: r.energy_rating <= 2 ? '#E24B4A' : r.energy_rating === 3 ? '#EF9F27' : '#1D9E75',
                    }}>
                      E:{r.energy_rating}
                    </span>
                  )}
                  {expandedId === r.id ? <ChevronUp size={14} color="#555550" /> : <ChevronDown size={14} color="#555550" />}
                </div>
              </button>
              {expandedId === r.id && (
                <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '0.5px solid #2A2A2A' }}>
                  {r.pasha_progress && (
                    <div className="pt-3">
                      <p style={{ fontSize: '11px', color: '#185FA5', fontWeight: 500, marginBottom: '4px' }}>PASHA</p>
                      <p style={{ fontSize: '13px', color: '#F5F5F5' }}>{r.pasha_progress}</p>
                    </div>
                  )}
                  {r.tapwork_progress && (
                    <div>
                      <p style={{ fontSize: '11px', color: '#0F6E56', fontWeight: 500, marginBottom: '4px' }}>TapWork</p>
                      <p style={{ fontSize: '13px', color: '#F5F5F5' }}>{r.tapwork_progress}</p>
                    </div>
                  )}
                  {r.protect_next_week && (
                    <div>
                      <p style={{ fontSize: '11px', color: '#888780', fontWeight: 500, marginBottom: '4px' }}>Protected</p>
                      <p style={{ fontSize: '13px', color: '#F5F5F5' }}>{r.protect_next_week}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
