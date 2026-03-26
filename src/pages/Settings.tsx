import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Download, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  const exportData = async () => {
    if (!user) return
    const [habits, checkins, audits, reviews, expenses, notes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id),
      supabase.from('daily_checkins').select('*').eq('user_id', user.id),
      supabase.from('nightly_audits').select('*').eq('user_id', user.id),
      supabase.from('weekly_reviews').select('*').eq('user_id', user.id),
      supabase.from('expenses').select('*').eq('user_id', user.id),
      supabase.from('notes').select('*').eq('user_id', user.id),
    ])
    const blob = new Blob([JSON.stringify({ habits: habits.data, checkins: checkins.data, audits: audits.data, reviews: reviews.data, expenses: expenses.data, notes: notes.data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eshgeen-os-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetStreaks = async () => {
    if (!user) return
    setResetting(true)
    await supabase.from('daily_checkins').delete().eq('user_id', user.id)
    setResetting(false)
    setShowResetConfirm(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-bold text-white" style={{ fontSize: '18px' }}>Settings</h1>

      {/* Profile card */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: '#1D9E75', color: '#0A1628', fontSize: '16px' }}>
          E
        </div>
        <div>
          <p className="font-bold text-white" style={{ fontSize: '14px' }}>Eshgeen Jafarov</p>
          <p style={{ fontSize: '11px', color: '#6B7280' }}>Senior People Analyst · Founder</p>
          <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>{user?.email}</p>
        </div>
      </div>

      {/* Manage section */}
      <div>
        <p className="font-bold uppercase tracking-widest mb-2 px-1" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>Manage</p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          {[
            { label: 'Manage Habits', desc: 'Add, edit, reorder habits', action: () => navigate('/settings/habits') },
            { label: 'Budget Settings', desc: 'Set salary & spending limit', action: () => navigate('/settings/budget') },
          ].map(({ label, desc, action }, i, arr) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid #1a2a40' : 'none' }}
            >
              <div className="flex-1">
                <p className="font-medium text-white" style={{ fontSize: '13px' }}>{label}</p>
                <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>{desc}</p>
              </div>
              <ChevronRight size={14} style={{ color: '#6B7280' }} />
            </button>
          ))}
        </div>
      </div>

      {/* Data section */}
      <div>
        <p className="font-bold uppercase tracking-widest mb-2 px-1" style={{ fontSize: '10px', color: '#6B7280', letterSpacing: '0.06em' }}>Data</p>
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <button
            onClick={exportData}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
            style={{ borderBottom: '1px solid #1a2a40' }}
          >
            <Download size={16} style={{ color: '#1D9E75' }} />
            <div className="flex-1">
              <p className="font-medium text-white" style={{ fontSize: '13px' }}>Export All Data</p>
              <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>Download as JSON</p>
            </div>
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
          >
            <RefreshCw size={16} style={{ color: '#EF9F27' }} />
            <div className="flex-1">
              <p className="font-medium" style={{ fontSize: '13px', color: '#EF9F27' }}>Reset Streaks</p>
              <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px' }}>Clears all check-in history</p>
            </div>
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full py-3 rounded-xl font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40', color: '#6B7280', fontSize: '13px' }}
      >
        Sign Out
      </button>

      {/* Reset confirm dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-xl p-6 flex flex-col gap-4 text-center" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
            <p className="font-bold text-white" style={{ fontSize: '16px' }}>Reset all streaks?</p>
            <p style={{ fontSize: '12px', color: '#6B7280' }}>This will delete all historical check-in data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2.5 rounded-lg font-medium" style={{ backgroundColor: '#0A1628', border: '1px solid #1a2a40', color: '#6B7280', fontSize: '13px' }}>
                Cancel
              </button>
              <button onClick={resetStreaks} disabled={resetting} className="flex-1 py-2.5 rounded-lg font-medium text-white disabled:opacity-50" style={{ backgroundColor: '#ef4444', fontSize: '13px' }}>
                {resetting ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
