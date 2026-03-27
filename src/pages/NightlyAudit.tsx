import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { EmotionTag } from '../lib/supabase'

const EMOTIONS: EmotionTag[] = ['Good', 'Neutral', 'Hard', 'Energized', 'Tired']
const UNLOCK_HOUR = 19

export default function NightlyAudit() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    win1: '', win2: '', win3: '',
    improvement: '',
    tapwork_task: '',
    gratitude: '',
    emotion_tag: 'Good' as EmotionTag,
  })

  const now = new Date()
  const hour = now.getHours()
  const isUnlocked = hour >= UNLOCK_HOUR
  const today = now.toISOString().split('T')[0]

  const hoursUntil = UNLOCK_HOUR - hour
  const minutesUntil = 60 - now.getMinutes()

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('nightly_audits')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    if (data) {
      setForm({
        win1: data.win1 ?? '',
        win2: data.win2 ?? '',
        win3: data.win3 ?? '',
        improvement: data.improvement ?? '',
        tapwork_task: data.tapwork_task ?? '',
        gratitude: data.gratitude ?? '',
        emotion_tag: data.emotion_tag ?? 'Good',
      })
    }
    setLoading(false)
  }, [user, today])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('nightly_audits').upsert(
      { ...form, user_id: user.id, date: today },
      { onConflict: 'user_id,date' }
    )
    setSaving(false)
    setSaved(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-5xl">🌙</div>
        <div>
          <h2 className="text-xl font-bold">Good night.</h2>
          <p className="mt-2" style={{ fontSize: '14px', color: '#7a8a9e' }}>Tomorrow starts at 5 AM.</p>
        </div>
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <p style={{ fontSize: '12px', color: '#7a8a9e' }}>Tomorrow's TapWork task</p>
          <p className="font-medium mt-1" style={{ fontSize: '13px' }}>{form.tapwork_task || '—'}</p>
        </div>
        <button
          onClick={() => setSaved(false)}
          className="text-sm underline"
          style={{ color: '#7a8a9e' }}
        >
          Edit tonight's audit
        </button>
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="text-4xl">🔒</div>
        <h2 className="font-bold" style={{ fontSize: '18px', color: '#e8edf3' }}>Nightly Audit</h2>
        <p style={{ fontSize: '13px', color: '#7a8a9e' }}>Opens at 19:00</p>
        <div
          className="rounded-xl px-6 py-4 mt-2"
          style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}
        >
          <p className="font-bold" style={{ fontSize: '24px', color: '#EF9F27' }}>
            {hoursUntil}h {minutesUntil}m
          </p>
          <p style={{ fontSize: '11px', color: '#7a8a9e', marginTop: '4px' }}>until it unlocks</p>
        </div>
      </div>
    )
  }

  const field = (label: string, key: keyof typeof form, placeholder: string) => (
    <div className="flex flex-col gap-2">
      <label style={{ fontSize: '12px', fontWeight: 500, color: '#e8edf3' }}>{label}</label>
      <textarea
        value={form[key] as string}
        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none outline-none rounded-lg px-3 py-2.5 placeholder-gray-600"
        style={{
          backgroundColor: '#0d1f35',
          border: '1px solid #1a2a40',
          fontSize: '12px',
          lineHeight: '1.5',
        }}
      />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold" style={{ fontSize: '18px', color: '#e8edf3' }}>Nightly Audit</h1>

      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>3 Wins Today</p>
        {field('Win 1', 'win1', 'Something that went well today...')}
        {field('Win 2', 'win2', 'Something that went well today...')}
        {field('Win 3', 'win3', 'Something that went well today...')}
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-4" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>Reflection</p>
        {field('1 Thing to Improve', 'improvement', 'One honest thing to do better...')}
        {field('Gratitude', 'gratitude', 'One thing I\'m grateful for today...')}
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>Tomorrow's 6 AM Session</p>
        {field("Tomorrow's TapWork Task", 'tapwork_task', 'At 6:00 AM I will...')}
      </div>

      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>How was today?</p>
        <div className="flex flex-wrap gap-2">
          {EMOTIONS.map(e => (
            <button
              key={e}
              onClick={() => setForm(prev => ({ ...prev, emotion_tag: e }))}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                fontSize: '12px',
                borderRadius: '20px',
                backgroundColor: form.emotion_tag === e ? '#1D9E75' : '#ffffff',
                color: form.emotion_tag === e ? '#ffffff' : '#5a6a7e',
                border: `1px solid ${form.emotion_tag === e ? '#1D9E75' : '#1a2a40'}`,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
        style={{ backgroundColor: '#1D9E75', fontSize: '14px' }}
      >
        {saving ? 'Saving...' : 'Save Nightly Audit'}
      </button>
    </div>
  )
}
