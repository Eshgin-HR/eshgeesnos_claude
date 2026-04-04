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
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#0F0F1A' }}>Sunday Reflection</h1>
        <p style={{ fontSize: '12px', color: '#6B6B7B', marginTop: '4px' }}>Week of {weekLabel}</p>
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        {/* PASHA */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#3334CC', marginBottom: '10px' }}>
            PASHA — What moved forward this week?
          </p>
          <textarea
            placeholder="What progressed at PASHA this week?"
            value={form.pasha_progress}
            onChange={e => { setForm(p => ({ ...p, pasha_progress: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
          />
        </div>

        {/* TapWork */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F6E56', marginBottom: '10px' }}>
            TapWork — What moved forward this week?
          </p>
          <textarea
            placeholder="What progressed at TapWork this week?"
            value={form.tapwork_progress}
            onChange={e => { setForm(p => ({ ...p, tapwork_progress: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
          />
        </div>

        {/* Not completed */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F0F1A', marginBottom: '10px' }}>
            What didn't I complete that I planned?
          </p>
          <textarea
            placeholder="Tasks or goals that didn't happen..."
            value={form.not_completed}
            onChange={e => { setForm(p => ({ ...p, not_completed: e.target.value })); setSaved(false) }}
            rows={3}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
          />
        </div>

        {/* Energy */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F0F1A', marginBottom: '10px' }}>
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
                    ? n <= 2 ? '#E55353' : n === 3 ? '#FFD33C' : '#50CD89'
                    : '#F5F5FA',
                  border: `1.5px solid ${form.energy_rating === n ? 'white' : '#E8E8F0'}`,
                  color: form.energy_rating >= n ? '#fff' : '#6B6B7B',
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
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
          />
        </div>

        {/* Protect */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F0F1A', marginBottom: '10px' }}>
            What is the single most important thing to protect next week?
          </p>
          <textarea
            placeholder="One focus for next week..."
            value={form.protect_next_week}
            onChange={e => { setForm(p => ({ ...p, protect_next_week: e.target.value })); setSaved(false) }}
            rows={2}
            className="w-full resize-none outline-none rounded-lg px-3 py-2.5"
            style={{ backgroundColor: '#F5F5FA', border: '1px solid #E8E8F0', color: '#0F0F1A', fontSize: '14px' }}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-lg font-medium disabled:opacity-40"
          style={{
            backgroundColor: saved ? 'transparent' : '#4C4DDC',
            color: saved ? '#50CD89' : '#fff',
            border: saved ? '0.5px solid #50CD89' : 'none',
            fontSize: '15px',
          }}
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Reflection'}
        </button>
      </div>

      {/* Past reflections */}
      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <p style={{ fontSize: '11px', color: '#6B6B7B', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Past reflections
          </p>
          {past.map(r => (
            <div
              key={r.id}
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8F0', borderRadius: '12px', overflow: 'hidden' }}
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                <span style={{ fontSize: '13px', color: '#0F0F1A' }}>
                  Week of {new Date(r.week_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex items-center gap-2">
                  {r.energy_rating && (
                    <span style={{
                      fontSize: '11px', fontWeight: 600,
                      padding: '2px 6px', borderRadius: '4px',
                      backgroundColor: r.energy_rating <= 2 ? '#E5535320' : r.energy_rating === 3 ? '#FFD33C20' : '#50CD8920',
                      color: r.energy_rating <= 2 ? '#E55353' : r.energy_rating === 3 ? '#FFD33C' : '#50CD89',
                    }}>
                      E:{r.energy_rating}
                    </span>
                  )}
                  {expandedId === r.id ? <ChevronUp size={14} color="#6B6B7B" /> : <ChevronDown size={14} color="#6B6B7B" />}
                </div>
              </button>
              {expandedId === r.id && (
                <div className="px-4 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid #E8E8F0' }}>
                  {r.pasha_progress && (
                    <div className="pt-3">
                      <p style={{ fontSize: '11px', color: '#3334CC', fontWeight: 500, marginBottom: '4px' }}>PASHA</p>
                      <p style={{ fontSize: '13px', color: '#0F0F1A' }}>{r.pasha_progress}</p>
                    </div>
                  )}
                  {r.tapwork_progress && (
                    <div>
                      <p style={{ fontSize: '11px', color: '#0F6E56', fontWeight: 500, marginBottom: '4px' }}>TapWork</p>
                      <p style={{ fontSize: '13px', color: '#0F0F1A' }}>{r.tapwork_progress}</p>
                    </div>
                  )}
                  {r.protect_next_week && (
                    <div>
                      <p style={{ fontSize: '11px', color: '#6B6B7B', fontWeight: 500, marginBottom: '4px' }}>Protected</p>
                      <p style={{ fontSize: '13px', color: '#0F0F1A' }}>{r.protect_next_week}</p>
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
