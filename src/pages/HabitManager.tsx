import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { GripVertical, Edit2, Plus, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Habit } from '../lib/supabase'

export default function HabitManager() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('habits').select('*').eq('user_id', user.id).order('sort_order')
    setHabits(data as Habit[] ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...habits]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    const updated = reordered.map((h, i) => ({ ...h, sort_order: i }))
    setHabits(updated)
    await Promise.all(updated.map(h => supabase.from('habits').update({ sort_order: h.sort_order }).eq('id', h.id)))
  }

  const toggleActive = async (habit: Habit) => {
    const updated = { ...habit, active: !habit.active }
    setHabits(prev => prev.map(h => h.id === habit.id ? updated : h))
    await supabase.from('habits').update({ active: updated.active }).eq('id', habit.id)
  }

  const activeHabits = habits.filter(h => h.active)
  const pausedHabits = habits.filter(h => !h.active)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: '#1D9E75', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/settings')} className="p-1.5 rounded-lg" style={{ backgroundColor: '#0d1f35', color: '#7a8a9e' }}>
          <ArrowLeft size={14} />
        </button>
        <h1 className="font-bold" style={{ fontSize: '18px', color: '#e8edf3' }}>Manage Habits</h1>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="active">
          {(provided) => (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #1a2a40' }}>
                <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>Active ({activeHabits.length})</p>
              </div>
              {activeHabits.map((habit, index) => (
                <Draggable key={habit.id} draggableId={habit.id} index={index}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{
                        ...prov.draggableProps.style,
                        borderBottom: '1px solid #1a2a40',
                        backgroundColor: snap.isDragging ? '#1a2a40' : 'transparent',
                      }}
                    >
                      <div {...prov.dragHandleProps} style={{ color: '#7a8a9e', cursor: 'grab' }}>
                        <GripVertical size={14} />
                      </div>
                      <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{habit.icon}</span>
                      <span className="flex-1 font-medium" style={{ fontSize: '12px' }}>{habit.name}</span>
                      <button
                        onClick={() => navigate(`/settings/habits/${habit.id}`)}
                        className="p-1.5 rounded-lg mr-1"
                        style={{ backgroundColor: '#0d1f35', color: '#7a8a9e' }}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => toggleActive(habit)}
                        className="w-8 h-5 rounded-full transition-colors flex items-center"
                        style={{ backgroundColor: '#1D9E75', padding: '2px' }}
                      >
                        <div className="w-4 h-4 rounded-full bg-white ml-auto" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {pausedHabits.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}>
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #1a2a40' }}>
            <p className="font-bold uppercase tracking-widest" style={{ fontSize: '10px', color: '#7a8a9e', letterSpacing: '0.06em' }}>Paused ({pausedHabits.length})</p>
          </div>
          {pausedHabits.map((habit, i) => (
            <div
              key={habit.id}
              className="flex items-center gap-3 px-4 py-3 opacity-40"
              style={{ borderBottom: i < pausedHabits.length - 1 ? '1px solid #1a2a40' : 'none' }}
            >
              <div style={{ width: '14px' }} />
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{habit.icon}</span>
              <span className="flex-1 font-medium" style={{ fontSize: '12px' }}>{habit.name}</span>
              <button
                onClick={() => navigate(`/settings/habits/${habit.id}`)}
                className="p-1.5 rounded-lg mr-1"
                style={{ backgroundColor: '#0d1f35', color: '#7a8a9e' }}
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={() => toggleActive(habit)}
                className="w-8 h-5 rounded-full transition-colors flex items-center"
                style={{ backgroundColor: '#1a2a40', padding: '2px' }}
              >
                <div className="w-4 h-4 rounded-full bg-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/settings/habits/new')}
        className="w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
        style={{ border: '2px dashed #1a2a40', color: '#7a8a9e', fontSize: '13px', backgroundColor: 'transparent' }}
      >
        <Plus size={14} /> Add new habit
      </button>
    </div>
  )
}
