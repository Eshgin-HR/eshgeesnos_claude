import { useEffect, useState, useCallback } from 'react'
import { Plus, X, Check, Trash2, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  InboxItem, GTDContext, GTDItemType,
  CONTEXTS, CONTEXT_LABELS, CONTEXT_COLORS,
} from '../lib/supabase'

const ITEM_TYPE_OPTIONS: { value: GTDItemType; label: string; color: string }[] = [
  { value: 'next_action', label: 'Next Action', color: '#378ADD' },
  { value: 'waiting_for', label: 'Waiting For', color: '#EF9F27' },
  { value: 'someday_maybe', label: 'Someday / Maybe', color: '#534AB7' },
  { value: 'reference', label: 'Reference', color: '#888780' },
  { value: 'trash', label: 'Trash', color: '#E24B4A' },
]

export default function Inbox() {
  const { user } = useAuth()
  const [items, setItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [clarifyItem, setClarifyItem] = useState<InboxItem | null>(null)
  const [selectedType, setSelectedType] = useState<GTDItemType | ''>('')
  const [selectedContext, setSelectedContext] = useState<GTDContext | ''>('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('inbox')
      .select('*')
      .eq('user_id', user.id)
      .eq('processed', false)
      .order('created_at', { ascending: false })
    setItems((data as InboxItem[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const addItem = async () => {
    if (!user || !newContent.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('inbox')
      .insert({ user_id: user.id, content: newContent.trim(), processed: false })
      .select()
      .single()
    setSaving(false)
    if (error) return
    setItems(prev => [data as InboxItem, ...prev])
    setNewContent('')
  }

  const openClarify = (item: InboxItem) => {
    setClarifyItem(item)
    setSelectedType(item.item_type ?? '')
    setSelectedContext(item.context ?? '')
  }

  const saveClarify = async () => {
    if (!clarifyItem) return
    const isTrash = selectedType === 'trash'
    const updates: Partial<InboxItem> = {
      item_type: selectedType || null,
      context: selectedContext || null,
      processed: !!selectedType,
    }
    await supabase.from('inbox').update(updates).eq('id', clarifyItem.id)
    if (isTrash || selectedType) {
      setItems(prev => prev.filter(i => i.id !== clarifyItem.id))
    }
    // If it's a next_action, also create a task
    if (selectedType === 'next_action' && user) {
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        date: new Date().toISOString().slice(0, 10),
        title: clarifyItem.content,
        category: 'PASHA',
        completed: false,
        context_tag: selectedContext || null,
        activated_at: new Date().toISOString(),
        sort_order: 999,
      })
    }
    // If waiting_for, create waiting_for record
    if (selectedType === 'waiting_for' && user) {
      await supabase.from('waiting_for').insert({
        user_id: user.id,
        title: clarifyItem.content,
        resolved: false,
      })
    }
    // If someday_maybe, create someday_maybe record
    if (selectedType === 'someday_maybe' && user) {
      await supabase.from('someday_maybe').insert({
        user_id: user.id,
        title: clarifyItem.content,
      })
    }
    setClarifyItem(null)
  }

  const deleteItem = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('inbox').delete().eq('id', id)
  }

  const bulkProcess = async (type: GTDItemType) => {
    if (selectedIds.size === 0) return
    const ids = [...selectedIds]
    await supabase
      .from('inbox')
      .update({ item_type: type, processed: true })
      .in('id', ids)
    setItems(prev => prev.filter(i => !selectedIds.has(i.id)))
    setSelectedIds(new Set())
    setBulkMode(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-medium" style={{ fontSize: '20px', color: '#F5F5F5' }}>Inbox</h1>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => { setBulkMode(v => !v); setSelectedIds(new Set()) }}
              style={{
                fontSize: '12px',
                color: bulkMode ? '#378ADD' : '#888780',
                fontWeight: 500,
              }}
            >
              {bulkMode ? 'Done' : 'Select'}
            </button>
          )}
          {items.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backgroundColor: '#E24B4A20',
                color: '#E24B4A',
              }}
            >
              {items.length}
            </span>
          )}
        </div>
      </div>

      {/* Quick capture */}
      <div
        className="flex items-center gap-3"
        style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '12px 16px' }}
      >
        <Plus size={16} color="#378ADD" />
        <input
          type="text"
          placeholder="Capture anything..."
          value={newContent}
          onChange={e => setNewContent(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newContent.trim()) addItem() }}
          className="flex-1 outline-none bg-transparent"
          style={{ fontSize: '14px', color: '#F5F5F5' }}
        />
        {newContent.trim() && (
          <button
            onClick={addItem}
            disabled={saving}
            className="flex-shrink-0"
            style={{
              backgroundColor: '#378ADD',
              color: '#fff',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            Add
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', padding: '12px 16px' }}
        >
          <span style={{ fontSize: '12px', color: '#888780', marginRight: '4px' }}>{selectedIds.size} selected →</span>
          {ITEM_TYPE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => bulkProcess(o.value)}
              style={{
                fontSize: '11px',
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: o.color + '25',
                color: o.color,
                border: `0.5px solid ${o.color}40`,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#378ADD', borderTopColor: 'transparent' }} />
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-16"
          style={{ color: '#555550' }}
        >
          <Check size={32} strokeWidth={1.5} color="#1D9E75" />
          <p style={{ fontSize: '15px', color: '#888780', fontWeight: 500 }}>Inbox zero</p>
          <p style={{ fontSize: '13px', color: '#555550' }}>Everything is processed</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-start gap-3 px-4 py-4 group"
              style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
            >
              {bulkMode && (
                <button
                  onClick={() => toggleSelect(item.id)}
                  className="flex-shrink-0 mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: `1.5px solid ${selectedIds.has(item.id) ? '#378ADD' : '#3A3A3A'}`,
                    backgroundColor: selectedIds.has(item.id) ? '#378ADD' : 'transparent',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {selectedIds.has(item.id) && <Check size={10} color="#fff" strokeWidth={3} />}
                </button>
              )}
              <button
                className="flex-1 text-left"
                onClick={() => !bulkMode && openClarify(item)}
              >
                <p style={{ fontSize: '14px', color: '#F5F5F5', lineHeight: 1.4 }}>{item.content}</p>
                <p style={{ fontSize: '11px', color: '#555550', marginTop: '4px' }}>{timeAgo(item.created_at)}</p>
              </button>
              {!bulkMode && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openClarify(item)}
                    style={{
                      fontSize: '11px',
                      color: '#378ADD',
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#378ADD15',
                    }}
                  >
                    Clarify <ChevronDown size={10} style={{ display: 'inline', marginBottom: '1px' }} />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: '#555550' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Clarify bottom sheet */}
      {clarifyItem && (
        <div
          className="fixed inset-0 flex items-end justify-center z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) setClarifyItem(null) }}
        >
          <div
            className="w-full max-w-lg flex flex-col"
            style={{
              backgroundColor: '#1A1A1A',
              border: '0.5px solid #2A2A2A',
              borderBottom: 'none',
              borderRadius: '16px 16px 0 0',
              maxHeight: '80dvh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: '#3A3A3A' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #2A2A2A' }}>
              <p className="font-medium" style={{ fontSize: '15px', color: '#F5F5F5' }}>Clarify</p>
              <button onClick={() => setClarifyItem(null)}><X size={18} color="#555550" /></button>
            </div>
            <div className="flex flex-col gap-5 px-5 py-5 overflow-y-auto">
              {/* Item preview */}
              <div style={{ backgroundColor: '#222222', borderRadius: '8px', padding: '12px 14px' }}>
                <p style={{ fontSize: '14px', color: '#F5F5F5' }}>{clarifyItem.content}</p>
              </div>

              {/* Type */}
              <div>
                <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>What is this?</p>
                <div className="flex flex-col gap-2">
                  {ITEM_TYPE_OPTIONS.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setSelectedType(selectedType === o.value ? '' : o.value)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                      style={{
                        backgroundColor: selectedType === o.value ? o.color + '20' : '#222222',
                        border: `0.5px solid ${selectedType === o.value ? o.color : '#2A2A2A'}`,
                      }}
                    >
                      <div
                        style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          backgroundColor: o.color, flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#F5F5F5' }}>{o.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Context (only for next_action) */}
              {selectedType === 'next_action' && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888780', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Context</p>
                  <div className="flex flex-wrap gap-2">
                    {CONTEXTS.map(c => (
                      <button
                        key={c}
                        onClick={() => setSelectedContext(selectedContext === c ? '' : c)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: selectedContext === c ? CONTEXT_COLORS[c] + '30' : '#222222',
                          color: selectedContext === c ? CONTEXT_COLORS[c] : '#888780',
                          border: `0.5px solid ${selectedContext === c ? CONTEXT_COLORS[c] : '#2A2A2A'}`,
                        }}
                      >
                        {CONTEXT_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-8 pt-2">
              <button
                onClick={saveClarify}
                disabled={!selectedType}
                className="w-full py-3 rounded-lg font-medium disabled:opacity-30"
                style={{ backgroundColor: '#378ADD', color: '#fff', fontSize: '15px' }}
              >
                Process Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
