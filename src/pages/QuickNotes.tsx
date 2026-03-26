import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Pin, Search, Mic, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Note, NoteTag } from '../lib/supabase'

const TAGS: NoteTag[] = ['TapWork', 'PASHA', 'Personal']
const TAG_COLORS: Record<NoteTag, string> = {
  TapWork: '#7F77DD',
  PASHA: '#1D9E75',
  Personal: '#EF9F27',
}

export default function QuickNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<NoteTag | 'All'>('All')
  const [showEditor, setShowEditor] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [form, setForm] = useState({ title: '', body: '', tag: 'TapWork' as NoteTag })
  const [loading, setLoading] = useState(true)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    let query = supabase.from('notes').select('*').eq('user_id', user.id).order('pinned', { ascending: false }).order('created_at', { ascending: false })
    if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)
    if (tagFilter !== 'All') query = query.eq('tag', tagFilter)
    const { data } = await query
    setNotes(data as Note[] ?? [])
    setLoading(false)
  }, [user, search, tagFilter])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditNote(null)
    setForm({ title: '', body: '', tag: 'TapWork' })
    setShowEditor(true)
  }

  const openEdit = (note: Note) => {
    setEditNote(note)
    setForm({ title: note.title, body: note.body, tag: note.tag })
    setShowEditor(true)
  }

  const saveNote = async () => {
    if (!user || !form.title.trim()) return
    if (editNote) {
      await supabase.from('notes').update({ title: form.title, body: form.body, tag: form.tag }).eq('id', editNote.id)
    } else {
      await supabase.from('notes').insert({ user_id: user.id, title: form.title, body: form.body, tag: form.tag, pinned: false })
    }
    setShowEditor(false)
    load()
  }

  const togglePin = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', note.id)
    load()
  }

  const deleteNote = async () => {
    if (!editNote) return
    await supabase.from('notes').delete().eq('id', editNote.id)
    setShowEditor(false)
    load()
  }

  const toggleVoice = () => {
    type AnySpeechRecognition = { new(): { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { results: { length: number; [n: number]: { [n: number]: { transcript: string } } } }) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } }
    const win = window as unknown as { webkitSpeechRecognition?: AnySpeechRecognition; SpeechRecognition?: AnySpeechRecognition }
    const SR = win.webkitSpeechRecognition ?? win.SpeechRecognition
    if (!SR) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const r = new SR()
    r.continuous = true
    r.interimResults = false
    r.lang = 'en-US'
    r.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript
      setForm(p => ({ ...p, body: p.body + (p.body ? ' ' : '') + transcript }))
    }
    r.onend = () => setListening(false)
    r.start()
    recognitionRef.current = r
    setListening(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#f7f7f5', border: '1px solid #e3e3e0' }}>
          <Search size={14} style={{ color: '#787774', flexShrink: 0 }} />
          <input
            type="text" placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none placeholder-gray-600"
            style={{ fontSize: '13px' }}
          />
          {search && <button onClick={() => setSearch('')}><X size={12} style={{ color: '#787774' }} /></button>}
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium"
          style={{ backgroundColor: '#1D9E75', color: '#ffffff', fontSize: '12px', whiteSpace: 'nowrap' }}
        >
          <Plus size={14} /> New
        </button>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['All', ...TAGS] as const).map(tag => (
          <button
            key={tag}
            onClick={() => setTagFilter(tag)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full font-medium"
            style={{
              fontSize: '11px',
              borderRadius: '20px',
              backgroundColor: tagFilter === tag ? (tag === 'All' ? '#1D9E75' : TAG_COLORS[tag as NoteTag]) : '#f7f7f5',
              color: tagFilter === tag ? '#ffffff' : '#8a8a8a',
              border: `1px solid ${tagFilter === tag ? 'transparent' : '#e3e3e0'}`,
            }}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div className="text-center py-12" style={{ color: '#787774' }}>
          <p style={{ fontSize: '13px' }}>{search || tagFilter !== 'All' ? 'No notes found' : 'No notes yet — tap New to start'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notes.map(note => (
            <div
              key={note.id}
              onClick={() => openEdit(note)}
              className="rounded-xl p-4 text-left flex flex-col gap-2 hover:brightness-110 transition-all relative overflow-hidden cursor-pointer"
              style={{
                backgroundColor: '#f7f7f5',
                border: '1px solid #e3e3e0',
                borderLeft: `3px solid ${TAG_COLORS[note.tag]}`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium line-clamp-1" style={{ fontSize: '13px' }}>{note.title}</p>
                <button
                  onClick={e => togglePin(note, e)}
                  className="flex-shrink-0 transition-opacity"
                  style={{ opacity: note.pinned ? 1 : 0.3 }}
                >
                  <Pin size={12} style={{ color: note.pinned ? '#EF9F27' : '#8a8a8a' }} />
                </button>
              </div>
              {note.body && (
                <p style={{ fontSize: '11px', color: '#787774', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {note.body.slice(0, 80)}{note.body.length > 80 ? '...' : ''}
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{ fontSize: '9px', fontWeight: 500, color: TAG_COLORS[note.tag], backgroundColor: TAG_COLORS[note.tag] + '22', borderRadius: '20px' }}
                >
                  {note.tag}
                </span>
                <span style={{ fontSize: '9px', color: '#787774' }}>
                  {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note editor modal */}
      {showEditor && (
        <div
          className="fixed inset-0 flex items-end md:items-center justify-center z-[60] px-0 md:px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditor(false) }}
        >
          <div
            className="w-full md:max-w-lg rounded-t-2xl md:rounded-xl flex flex-col"
            style={{
              backgroundColor: '#f7f7f5',
              border: '1px solid #e3e3e0',
              maxHeight: 'calc(100dvh - 72px)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: '#e3e3e0' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #e3e3e0' }}>
              <p className="font-bold" style={{ fontSize: '15px' }}>{editNote ? 'Edit Note' : 'New Note'}</p>
              <button onClick={() => setShowEditor(false)} className="p-1">
                <X size={18} color="#8a8a8a" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 outline-none placeholder-gray-600 font-medium"
                style={{ backgroundColor: '#ffffff', border: '1px solid #e3e3e0', fontSize: '15px' }}
              />

              <div className="relative">
                <textarea
                  placeholder="Start writing..."
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  rows={5}
                  className="w-full resize-none rounded-xl px-4 py-3 outline-none placeholder-gray-600"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e3e3e0',
                    fontSize: '13px',
                    lineHeight: 1.7,
                    paddingRight: '44px',
                  }}
                />
                <button
                  onClick={toggleVoice}
                  className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
                  style={{ backgroundColor: listening ? '#1D9E75' : '#e3e3e0', color: '#37352f' }}
                  title="Voice to text"
                >
                  <Mic size={13} />
                </button>
              </div>

              {/* Tag selector */}
              <div className="flex gap-2">
                {TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setForm(p => ({ ...p, tag }))}
                    className="flex-1 py-2 rounded-full font-medium transition-all"
                    style={{
                      fontSize: '12px',
                      backgroundColor: form.tag === tag ? TAG_COLORS[tag] : '#ffffff',
                      color: form.tag === tag ? '#ffffff' : '#8a8a8a',
                      border: `1px solid ${form.tag === tag ? TAG_COLORS[tag] : '#e3e3e0'}`,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer actions - always visible */}
            <div
              className="flex gap-3 px-5 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid #e3e3e0' }}
            >
              {editNote && (
                <button
                  onClick={deleteNote}
                  className="px-4 py-3 rounded-xl font-medium"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #ef4444', color: '#ef4444', fontSize: '13px' }}
                >
                  Delete
                </button>
              )}
              <button
                onClick={saveNote}
                className="flex-1 py-3 rounded-xl font-semibold"
                style={{ backgroundColor: '#1D9E75', fontSize: '14px' }}
              >
                {editNote ? 'Save Changes' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
