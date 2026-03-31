import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Plus, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Note } from '../lib/supabase'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${formatDate(dateStr)} at ${h}:${m}`
}

// ─── Note Editor Modal ──────────────────────────────────────────────
interface EditorModalProps {
  note: Note
  onClose: () => void
  onSave: (id: string, title: string, body: string) => void
  onDelete: (id: string) => void
}

function NoteEditorModal({ note, onClose, onSave, onDelete }: EditorModalProps) {
  const [title, setTitle] = useState(note.title ?? '')
  const [body, setBody] = useState(note.body ?? '')
  const [lastSaved, setLastSaved] = useState<string | null>(note.updated_at ?? note.created_at)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 80)
  }, [])

  const scheduleSave = useCallback((t: string, b: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      const now = new Date().toISOString()
      await onSave(note.id, t, b)
      setLastSaved(now)
      setSaving(false)
    }, 500)
  }, [note.id, onSave])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    scheduleSave(val, body)
  }

  const handleBodyChange = (val: string) => {
    setBody(val)
    scheduleSave(title, val)
  }

  const handleDelete = () => {
    if (!window.confirm('Delete this note?')) return
    onDelete(note.id)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl flex flex-col"
        style={{
          backgroundColor: '#1A1A1A',
          border: '0.5px solid #2A2A2A',
          height: '75vh',
          maxHeight: '640px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '0.5px solid #2A2A2A' }}
        >
          <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: '#555550' }}>
            {saving ? 'Saving…' : lastSaved ? `Saved ${formatDateTime(lastSaved)}` : 'New note'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#E24B4A15] transition-colors"
              title="Delete note"
            >
              <Trash2 size={14} style={{ color: '#E24B4A' }} />
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#222222] transition-colors"
            >
              <X size={16} style={{ color: '#888780' }} />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex flex-col flex-1 overflow-hidden px-5 py-4">
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent border-none focus:outline-none text-[20px] font-medium mb-3 flex-shrink-0"
            style={{ color: '#F5F5F5' }}
          />
          <textarea
            value={body}
            onChange={e => handleBodyChange(e.target.value)}
            placeholder="Start writing…"
            className="flex-1 w-full bg-transparent border-none focus:outline-none resize-none text-[14px]"
            style={{ color: '#F5F5F5', lineHeight: '1.75' }}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── Main Notes Page ─────────────────────────────────────────────────
export default function QuickNotes() {
  const { session } = useAuth()
  const user = session?.user

  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
    setNotes((data ?? []) as Note[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const createNote = async () => {
    if (!user) return
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: '', body: '', tag: 'Personal', pinned: false, created_at: now, updated_at: now })
      .select('*')
      .single()
    if (data) {
      const note = data as Note
      setNotes(prev => [note, ...prev])
      setEditingNote(note)
    }
  }

  const handleSave = useCallback(async (id: string, title: string, body: string) => {
    if (!user) return
    const now = new Date().toISOString()
    const savedTitle = title.trim() || 'Untitled'
    await supabase
      .from('notes')
      .update({ title: savedTitle, body, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
    setNotes(prev => prev.map(n =>
      n.id === id ? { ...n, title: savedTitle, body, updated_at: now } : n
    ))
    // Also update editingNote if still open
    setEditingNote(prev => prev?.id === id ? { ...prev, title: savedTitle, body, updated_at: now } : prev)
  }, [user])

  const handleDelete = useCallback(async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    setEditingNote(null)
  }, [])

  const filteredNotes = notes.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return (n.title ?? '').toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
        >
          <Search size={13} style={{ color: '#555550', flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="flex-1 bg-transparent text-[13px] focus:outline-none"
            style={{ color: '#F5F5F5' }}
          />
          {search && (
            <button onClick={() => setSearch('')}>
              <X size={12} style={{ color: '#555550' }} />
            </button>
          )}
        </div>
        <button
          onClick={createNote}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98] flex-shrink-0"
          style={{ backgroundColor: '#378ADD', color: '#fff' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          New note
        </button>
      </div>

      {/* Notes count */}
      {!loading && notes.length > 0 && (
        <p className="text-[12px]" style={{ color: '#555550' }}>
          {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
          {search ? ` matching "${search}"` : ''}
        </p>
      )}

      {/* Note cards grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-[14px]" style={{ color: '#555550' }}>
            {search ? 'No notes match your search' : 'No notes yet'}
          </p>
          {!search && (
            <button
              onClick={createNote}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98]"
              style={{ backgroundColor: '#378ADD', color: '#fff' }}
            >
              <Plus size={14} strokeWidth={2.5} />
              Create first note
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {filteredNotes.map(note => {
            const preview = (note.body ?? '').trim().split('\n').find(l => l.trim()) ?? ''
            return (
              <button
                key={note.id}
                onClick={() => setEditingNote(note)}
                className="text-left rounded-xl p-3.5 transition-colors hover:border-[#3A3A3A] active:scale-[0.98] flex flex-col"
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '0.5px solid #2A2A2A',
                  minHeight: '110px',
                }}
              >
                <p className="text-[13px] font-medium mb-1.5 line-clamp-2 leading-snug" style={{ color: '#F5F5F5' }}>
                  {note.title?.trim() || 'Untitled'}
                </p>
                <p className="text-[11px] leading-relaxed flex-1 overflow-hidden" style={{ color: '#888780', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {preview || 'Empty note'}
                </p>
                <p className="text-[10px] mt-2 flex-shrink-0" style={{ color: '#555550' }}>
                  {formatDate(note.updated_at ?? note.created_at)}
                </p>
              </button>
            )
          })}
        </div>
      )}

      {/* Editor modal */}
      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          onClose={() => setEditingNote(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
