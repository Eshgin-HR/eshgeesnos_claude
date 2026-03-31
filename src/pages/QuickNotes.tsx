import { useEffect, useState, useCallback, useRef } from 'react'
import { Search, Plus, X, Trash2, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Note } from '../lib/supabase'
import { cn } from '../lib/utils'

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatNoteTime(dateStr: string): string {
  const d = new Date(dateStr)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${formatNoteDate(dateStr)} at ${h}:${m}`
}

export default function QuickNotes() {
  const { session } = useAuth()
  const user = session?.user

  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')

  // Editor state
  const [editorTitle, setEditorTitle] = useState('')
  const [editorBody, setEditorBody] = useState('')
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const selectedIdRef = useRef<string | null>(null)

  const fetchNotes = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotes((data ?? []) as Note[])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // Sync editor when selected note changes
  useEffect(() => {
    selectedIdRef.current = selectedId
    if (!selectedId) {
      setEditorTitle('')
      setEditorBody('')
      setLastSaved(null)
      return
    }
    const note = notes.find(n => n.id === selectedId)
    if (note) {
      setEditorTitle(note.title ?? '')
      setEditorBody(note.body ?? '')
      setLastSaved(note.updated_at ?? note.created_at)
    }
  }, [selectedId])

  const persistSave = useCallback(async (id: string, title: string, body: string) => {
    if (!user || id !== selectedIdRef.current) return
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('notes')
      .update({ title: title || 'Untitled', body, updated_at: now })
      .eq('id', id)
      .eq('user_id', user.id)
    if (!error) {
      setLastSaved(now)
      setNotes(prev => prev.map(n =>
        n.id === id ? { ...n, title: title || 'Untitled', body, updated_at: now } : n
      ))
    }
    setSaving(false)
  }, [user])

  const scheduleSave = useCallback((title: string, body: string) => {
    if (!selectedId) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      persistSave(selectedId, title, body)
    }, 500)
  }, [selectedId, persistSave])

  const handleTitleChange = (val: string) => {
    setEditorTitle(val)
    scheduleSave(val, editorBody)
  }

  const handleBodyChange = (val: string) => {
    setEditorBody(val)
    scheduleSave(editorTitle, val)
  }

  const createNote = async () => {
    if (!user) return
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title: 'Untitled', body: '', tag: 'Personal', pinned: false, created_at: now, updated_at: now })
      .select('*')
      .single()
    if (data) {
      const note = data as Note
      setNotes(prev => [note, ...prev])
      setSelectedId(note.id)
      setMobileView('editor')
    }
  }

  const deleteNote = async (id: string) => {
    if (!window.confirm('Delete this note?')) return
    await supabase.from('notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
      setMobileView('list')
    }
  }

  const filteredNotes = notes.filter(n => {
    if (!search) return true
    const q = search.toLowerCase()
    return (n.title ?? '').toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
  })

  const isWeb = typeof window !== 'undefined' && window.innerWidth >= 768

  // Note list panel
  const listPanel = (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden',
        isWeb ? 'w-[280px] flex-shrink-0 border-r' : 'w-full'
      )}
      style={{ borderColor: '#2A2A2A', backgroundColor: '#0F0F0F' }}
    >
      {/* Search + new */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
        <div className="flex items-center gap-2 flex-1 rounded-lg px-3 py-2" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
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
          className="flex items-center justify-center rounded-lg transition-all active:scale-95 flex-shrink-0"
          style={{ width: '32px', height: '32px', backgroundColor: '#378ADD' }}
          aria-label="New note"
        >
          <Plus size={15} color="#fff" strokeWidth={2.5} />
        </button>
      </div>

      {/* Note cards */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="flex flex-col gap-1.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 rounded-[10px] animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-[13px]" style={{ color: '#555550' }}>
              {search ? 'No notes found' : 'No notes yet — create one'}
            </p>
          </div>
        ) : (
          filteredNotes.map(note => {
            const isSelected = note.id === selectedId
            const preview = (note.body ?? '').split('\n').find(l => l.trim()) ?? ''
            return (
              <button
                key={note.id}
                onClick={() => { setSelectedId(note.id); setMobileView('editor') }}
                className="w-full text-left rounded-[10px] px-3.5 py-3 mb-1.5 transition-colors"
                style={{
                  backgroundColor: isSelected ? '#1A2E45' : '#1A1A1A',
                  border: `0.5px solid ${isSelected ? '#378ADD' : '#2A2A2A'}`,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-[14px] font-medium truncate" style={{ color: '#F5F5F5' }}>
                    {note.title || 'Untitled'}
                  </p>
                  <span className="text-[11px] flex-shrink-0" style={{ color: '#555550' }}>
                    {formatNoteDate(note.updated_at ?? note.created_at)}
                  </span>
                </div>
                <p className="text-[12px] truncate" style={{ color: '#888780' }}>
                  {preview || 'Empty note'}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  // Note editor panel
  const editorPanel = (
    <div className="flex flex-col flex-1 h-full overflow-hidden" style={{ backgroundColor: '#0F0F0F' }}>
      {!isWeb && (
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
          <button
            onClick={() => setMobileView('list')}
            className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[#1A1A1A]"
          >
            <ArrowLeft size={16} style={{ color: '#888780' }} />
            <span className="text-[13px]" style={{ color: '#888780' }}>Notes</span>
          </button>
          {selectedId && (
            <button
              onClick={() => deleteNote(selectedId)}
              className="ml-auto p-1.5 rounded-lg hover:bg-[#1A1A1A]"
            >
              <Trash2 size={15} style={{ color: '#E24B4A' }} />
            </button>
          )}
        </div>
      )}

      {!selectedId ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[14px]" style={{ color: '#555550' }}>Select a note or create a new one</p>
          <button
            onClick={createNote}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#378ADD', color: '#fff' }}
          >
            + New note
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden px-5 py-4">
          {isWeb && (
            <div className="flex items-center justify-end mb-2">
              <button onClick={() => deleteNote(selectedId)} className="p-1.5 rounded-lg hover:bg-[#1A1A1A]">
                <Trash2 size={15} style={{ color: '#555550' }} />
              </button>
            </div>
          )}

          {/* Title */}
          <input
            type="text"
            value={editorTitle}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            className="w-full bg-transparent border-none focus:outline-none text-[20px] font-medium mb-4"
            style={{ color: '#F5F5F5' }}
          />

          {/* Body */}
          <textarea
            value={editorBody}
            onChange={e => handleBodyChange(e.target.value)}
            placeholder="Start writing…"
            className="flex-1 w-full bg-transparent border-none focus:outline-none resize-none text-[14px]"
            style={{ color: '#F5F5F5', lineHeight: '1.7', minHeight: '200px' }}
          />

          {/* Timestamp */}
          {lastSaved && (
            <p className="text-[11px] mt-3 flex-shrink-0" style={{ color: '#555550' }}>
              {saving ? 'Saving…' : `Last edited ${formatNoteTime(lastSaved)}`}
            </p>
          )}
        </div>
      )}
    </div>
  )

  if (isWeb) {
    return (
      <div
        className="flex"
        style={{
          height: 'calc(100vh - 56px)',
          margin: '-20px -16px',
        }}
      >
        {listPanel}
        {editorPanel}
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 56px)', margin: '-20px -16px', overflow: 'hidden' }}>
      {mobileView === 'list' ? listPanel : editorPanel}
    </div>
  )
}
