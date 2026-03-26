import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Habit, HabitCategory } from '../lib/supabase'

const EMOJI_OPTIONS = ['💻', '🚶', '📵', '📖', '💪', '🥗', '🌙', '😴', '🧘', '🏃', '🎯', '✍️', '🧠', '💡', '🎵', '📝']
const CATEGORIES: HabitCategory[] = ['Morning', 'Startup', 'Body', 'Self-dev', 'Evening']

const EMPTY: Omit<Habit, 'id'> = {
  name: '', icon: '💡', category: 'Morning',
  active: true, counts_toward_score: true, streak_tracking: true, sort_order: 0,
}

export default function EditHabit() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = id === 'new'
  const [form, setForm] = useState<Omit<Habit, 'id'>>(EMPTY)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isNew || !user || !id) return
    supabase.from('habits').select('*').eq('id', id).eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ name: data.name, icon: data.icon, category: data.category, active: data.active, counts_toward_score: data.counts_toward_score, streak_tracking: data.streak_tracking, sort_order: data.sort_order })
      setLoading(false)
    })
  }, [id, isNew, user])

  const handleSave = async () => {
    if (!user || !form.name.trim()) return
    setSaving(true)
    if (isNew) {
      const { data: existing } = await supabase.from('habits').select('sort_order').eq('user_id', user.id).order('sort_order', { ascending: false }).limit(1)
      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
      await supabase.from('habits').insert({ ...form, user_id: user.id, sort_order: nextOrder })
    } else {
      await supabase.from('habits').update(form).eq('id', id!).eq('user_id', user.id)
    }
    setSaving(false)
    navigate('/settings/habits')
  }

  const handleDelete = async () => {
    if (!user || isNew) return
    await supabase.from('habits').delete().eq('id', id!).eq('user_id', user.id)
    navigate('/settings/habits')
  }

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid #e3e3e0' }}>
      <span style={{ fontSize: '12px', color: '#37352f', fontWeight: 500 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-10 h-6 rounded-full transition-colors flex items-center px-0.5"
        style={{ backgroundColor: value ? '#1D9E75' : '#e3e3e0' }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white transition-transform"
          style={{ transform: value ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings/habits')} className="p-1.5 rounded-lg" style={{ backgroundColor: '#f7f7f5', color: '#787774' }}>
          <ArrowLeft size={14} />
        </button>
        <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>{isNew ? 'New Habit' : 'Edit Habit'}</h1>
      </div>

      {/* Name */}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <label style={{ fontSize: '10px', color: '#787774', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Habit Name</label>
        <input
          type="text" placeholder="e.g. TapWork session done"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="w-full rounded-lg px-3 py-2.5 text-white outline-none placeholder-gray-600"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e3e3e0', fontSize: '13px' }}
        />
      </div>

      {/* Icon */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <label style={{ fontSize: '10px', color: '#787774', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Icon</label>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
          {EMOJI_OPTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => setForm(p => ({ ...p, icon: emoji }))}
              className="aspect-square rounded-lg flex items-center justify-center text-xl transition-all"
              style={{
                backgroundColor: form.icon === emoji ? '#1D9E75' : '#ffffff',
                border: `1px solid ${form.icon === emoji ? '#1D9E75' : '#e3e3e0'}`,
                fontSize: '18px',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <label style={{ fontSize: '10px', color: '#787774', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setForm(p => ({ ...p, category: cat }))}
              className="px-3 py-1.5 font-medium transition-all"
              style={{
                borderRadius: '20px',
                fontSize: '11px',
                backgroundColor: form.category === cat ? '#1D9E75' : '#ffffff',
                color: form.category === cat ? '#ffffff' : '#8a8a8a',
                border: `1px solid ${form.category === cat ? '#1D9E75' : '#e3e3e0'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="rounded-xl px-4 pb-2 pt-4" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
        <label style={{ fontSize: '10px', color: '#787774', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Options</label>
        <Toggle label="Active" value={form.active} onChange={v => setForm(p => ({ ...p, active: v }))} />
        <Toggle label="Counts toward daily score" value={form.counts_toward_score} onChange={v => setForm(p => ({ ...p, counts_toward_score: v }))} />
        <div className="flex items-center justify-between py-2.5">
          <span style={{ fontSize: '12px', color: '#37352f', fontWeight: 500 }}>Track streak</span>
          <button
            onClick={() => setForm(p => ({ ...p, streak_tracking: !p.streak_tracking }))}
            className="w-10 h-6 rounded-full transition-colors flex items-center px-0.5"
            style={{ backgroundColor: form.streak_tracking ? '#1D9E75' : '#e3e3e0' }}
          >
            <div
              className="w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: form.streak_tracking ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.name.trim()}
        className="w-full py-3 rounded-lg font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: '#1D9E75', fontSize: '14px' }}
      >
        {saving ? 'Saving...' : 'Save Habit'}
      </button>

      {!isNew && (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#f7f7f5', border: '1px solid #ef444433', color: '#ef4444', fontSize: '13px' }}
        >
          Delete Habit
        </button>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-4 text-center" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
            <p className="font-bold text-white" style={{ fontSize: '16px' }}>Delete this habit?</p>
            <p style={{ fontSize: '12px', color: '#787774' }}>This will delete all history for this habit. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 rounded-lg font-medium" style={{ backgroundColor: '#ffffff', border: '1px solid #e3e3e0', color: '#787774', fontSize: '13px' }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg font-medium text-white" style={{ backgroundColor: '#ef4444', fontSize: '13px' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
