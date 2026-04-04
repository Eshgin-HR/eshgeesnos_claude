import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface Props {
  onClose: () => void
  onCreated?: () => void
}

export default function AddNoteModal({ onClose, onCreated }: Props) {
  const { session } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80)
  }, [])

  const handleSave = async () => {
    if (!session?.user) return
    setSaving(true)
    const now = new Date().toISOString()
    await supabase.from('notes').insert({
      user_id: session.user.id,
      title: title.trim() || 'Untitled',
      body: body.trim(),
      tag: 'Personal',
      pinned: false,
      created_at: now,
      updated_at: now,
    })
    setSaving(false)
    onCreated?.()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E8F0',
          height: '60vh',
          maxHeight: '480px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid #E8E8F0' }}
        >
          <span className="text-[16px] font-medium" style={{ color: '#0F0F1A' }}>New Note</span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#F5F5FA] transition-colors"
          >
            <X size={16} style={{ color: '#6B6B7B' }} />
          </button>
        </div>

        {/* Editor */}
        <div className="flex flex-col flex-1 overflow-hidden px-5 py-4">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full bg-transparent border-none focus:outline-none text-[18px] font-medium mb-3 flex-shrink-0"
            style={{ color: '#0F0F1A' }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write something…"
            className="flex-1 w-full bg-transparent border-none focus:outline-none resize-none text-[14px]"
            style={{ color: '#0F0F1A', lineHeight: '1.75' }}
          />
        </div>

        {/* Save */}
        <div className="px-5 pb-5 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: '#4C4DDC', color: '#fff' }}
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
