import { useEffect, useState, useCallback } from 'react'
import { Check, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'
import { supabase, getMondayOfWeek, todayStr } from '../lib/supabase'
import type { WaitingForItem, SomedayItem } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface ReviewRecord {
  id: string
  step1_state: Record<string, boolean> | null
  step2_state: Record<string, boolean> | null
  step3_state: Record<string, boolean> | null
  pasha_outcome: string | null
  tapwork_outcome: string | null
  personal_outcome: string | null
  tapwork_monday_task: string | null
  at_risk: string | null
  completed_at: string | null
}

const STEP1_ITEMS = [
  { key: 'inbox_zero', label: 'Process all inboxes to zero' },
  { key: 'review_captures', label: 'Review all captures from the week (voice memos, notes, scraps)' },
  { key: 'head_empty', label: 'Add anything still in your head to inbox now' },
]

const STEP2_ITEMS = [
  { key: 'reviewed_tasks', label: 'Reviewed all active tasks — nothing falling through the cracks' },
  { key: 'reviewed_waiting', label: 'Reviewed all Waiting For items' },
  { key: 'reviewed_someday', label: 'Reviewed Someday/Maybe — anything to activate?' },
]

const STEPS = [
  { num: 1, title: 'Get Clear', subtitle: 'Empty every inbox, close every open loop' },
  { num: 2, title: 'Get Current', subtitle: 'Make sure all lists are up to date' },
  { num: 3, title: 'Get Creative', subtitle: 'Set direction for the coming week' },
]

export default function WeeklyReview() {
  const { session } = useAuth()
  const user = session?.user

  const weekStart = getMondayOfWeek()
  const [step, setStep] = useState(1)
  const [review, setReview] = useState<ReviewRecord | null>(null)
  const [step1State, setStep1State] = useState<Record<string, boolean>>({})
  const [step2State, setStep2State] = useState<Record<string, boolean>>({})
  const [pashaOutcome, setPashaOutcome] = useState('')
  const [tapworkOutcome, setTapworkOutcome] = useState('')
  const [personalOutcome, setPersonalOutcome] = useState('')
  const [tapworkMonday, setTapworkMonday] = useState('')
  const [atRisk, setAtRisk] = useState('')
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  // Live data for step 2
  const [inboxCount, setInboxCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [stalledCount, setStalledCount] = useState(0)
  const [waitingItems, setWaitingItems] = useState<WaitingForItem[]>([])
  const [somedayItems, setSomedayItems] = useState<SomedayItem[]>([])

  const [lastCompleted, setLastCompleted] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const [reviewRes, inboxRes, tasksRes, waitingRes, somedayRes, lastReviewRes] = await Promise.all([
      supabase.from('weekly_reviews').select('*').eq('user_id', user.id).eq('week_start', weekStart).maybeSingle(),
      supabase.from('inbox').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('processed', false),
      supabase.from('daily_tasks').select('id, due_date, activated_at, status').eq('user_id', user.id).in('status', ['open', 'in_progress']),
      supabase.from('waiting_for').select('*').eq('user_id', user.id).eq('resolved', false).order('created_at', { ascending: false }),
      supabase.from('someday_maybe').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('weekly_reviews').select('completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(2),
    ])

    if (reviewRes.data) {
      const r = reviewRes.data as ReviewRecord
      setReview(r)
      setStep1State(r.step1_state ?? {})
      setStep2State(r.step2_state ?? {})
      setPashaOutcome(r.pasha_outcome ?? '')
      setTapworkOutcome(r.tapwork_outcome ?? '')
      setPersonalOutcome(r.personal_outcome ?? '')
      setTapworkMonday(r.tapwork_monday_task ?? '')
      setAtRisk(r.at_risk ?? '')
    }

    setInboxCount(inboxRes.count ?? 0)

    const tasks = tasksRes.data ?? []
    const today = todayStr()
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    setActiveCount(tasks.length)
    setOverdueCount(tasks.filter((t: { due_date: string | null }) => t.due_date && t.due_date < today).length)
    setStalledCount(tasks.filter((t: { activated_at: string | null }) => t.activated_at && new Date(t.activated_at).getTime() < cutoff).length)

    setWaitingItems((waitingRes.data ?? []) as WaitingForItem[])
    setSomedayItems((somedayRes.data ?? []) as SomedayItem[])

    // Last completed review (not this week)
    const prevReviews = (lastReviewRes.data ?? []) as { completed_at: string }[]
    const prev = prevReviews.find(r => r.completed_at)
    setLastCompleted(prev?.completed_at ?? null)

    setLoading(false)
  }, [user, weekStart])

  useEffect(() => { load() }, [load])

  const upsertReview = async (patch: Record<string, unknown>) => {
    if (!user) return
    await supabase.from('weekly_reviews').upsert(
      { user_id: user.id, week_start: weekStart, ...patch },
      { onConflict: 'user_id,week_start' }
    )
  }

  const toggleStep1 = async (key: string) => {
    const next = { ...step1State, [key]: !step1State[key] }
    setStep1State(next)
    await upsertReview({ step1_state: next })
  }

  const toggleStep2 = async (key: string) => {
    const next = { ...step2State, [key]: !step2State[key] }
    setStep2State(next)
    await upsertReview({ step2_state: next })
  }

  const saveStep3 = useCallback(async () => {
    await upsertReview({
      pasha_outcome: pashaOutcome,
      tapwork_outcome: tapworkOutcome,
      personal_outcome: personalOutcome,
      tapwork_monday_task: tapworkMonday,
      at_risk: atRisk,
    })
  }, [pashaOutcome, tapworkOutcome, personalOutcome, tapworkMonday, atRisk])

  const resolveWaiting = async (id: string) => {
    await supabase.from('waiting_for').update({ resolved: true }).eq('id', id)
    setWaitingItems(prev => prev.filter(w => w.id !== id))
  }

  const activateSomeday = async (item: SomedayItem) => {
    if (!user) return
    await Promise.all([
      supabase.from('daily_tasks').insert({
        user_id: user.id,
        title: item.title,
        date: todayStr(),
        category: 'Personal',
        completed: false,
        sort_order: 0,
        status: 'open',
        activated_at: new Date().toISOString(),
      }),
      supabase.from('someday_maybe').delete().eq('id', item.id),
    ])
    setSomedayItems(prev => prev.filter(s => s.id !== item.id))
  }

  const completeReview = async () => {
    setCompleting(true)
    const now = new Date().toISOString()
    await upsertReview({
      step3_state: {},
      pasha_outcome: pashaOutcome,
      tapwork_outcome: tapworkOutcome,
      personal_outcome: personalOutcome,
      tapwork_monday_task: tapworkMonday,
      at_risk: atRisk,
      completed_at: now,
    })
    // Save tapwork monday task to daily_rituals for next Monday
    if (tapworkMonday && user) {
      const nextMonday = new Date()
      const d = nextMonday.getDay()
      nextMonday.setDate(nextMonday.getDate() + (d === 0 ? 1 : 8 - d))
      const nextMondayStr = nextMonday.toISOString().slice(0, 10)
      await supabase.from('daily_rituals').upsert({
        user_id: user.id,
        date: nextMondayStr,
        ritual_type: 'morning',
        tapwork_next_task: tapworkMonday,
        checklist_state: {},
        completed: false,
      }, { onConflict: 'user_id,date,ritual_type' })
    }
    setReview(prev => prev ? { ...prev, completed_at: now } : null)
    setLastCompleted(now)
    setCompleting(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: '#1A1A1A' }} />)}
      </div>
    )
  }

  const isCompleted = !!review?.completed_at

  return (
    <div className="flex flex-col gap-5">
      {/* Last review info */}
      {lastCompleted && (
        <p className="text-[12px]" style={{ color: '#888780' }}>
          Last review completed:{' '}
          {new Date(lastCompleted).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}

      {/* Completed banner */}
      {isCompleted && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#1D9E7515', border: '0.5px solid #1D9E7530' }}
        >
          <CheckCircle2 size={18} style={{ color: '#1D9E75', flexShrink: 0 }} />
          <div>
            <p className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Review complete</p>
            <p className="text-[12px]" style={{ color: '#888780' }}>
              Completed {new Date(review!.completed_at!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
      )}

      {/* Step indicator */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-medium" style={{ color: '#888780' }}>
            Step {step} of 3 — {STEPS[step - 1].title}
          </span>
          <span className="text-[12px]" style={{ color: '#555550' }}>{STEPS[step - 1].subtitle}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1 rounded-full flex-1 transition-all duration-300"
              style={{ backgroundColor: s <= step ? '#378ADD' : '#2A2A2A' }}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — Get Clear */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {/* Inbox count */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{
              backgroundColor: inboxCount > 0 ? '#E24B4A15' : '#1D9E7515',
              border: `0.5px solid ${inboxCount > 0 ? '#E24B4A30' : '#1D9E7530'}`,
            }}
          >
            <span className="text-[14px]" style={{ color: '#F5F5F5' }}>
              {inboxCount === 0 ? 'Inbox clear ✓' : `Inbox: ${inboxCount} item${inboxCount > 1 ? 's' : ''} remaining`}
            </span>
            <span
              className="text-[22px] font-medium"
              style={{ color: inboxCount > 0 ? '#E24B4A' : '#1D9E75' }}
            >
              {inboxCount}
            </span>
          </div>

          {/* Checklist */}
          <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
            {STEP1_ITEMS.map((item, i) => (
              <button
                key={item.key}
                onClick={() => toggleStep1(item.key)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#222222]"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: step1State[item.key] ? 'none' : '1.5px solid #3A3A3A',
                    backgroundColor: step1State[item.key] ? '#1D9E75' : 'transparent',
                    borderRadius: '4px',
                  }}
                >
                  {step1State[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  className="text-[14px] leading-snug"
                  style={{ color: step1State[item.key] ? '#555550' : '#F5F5F5', textDecoration: step1State[item.key] ? 'line-through' : 'none' }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Get Current */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Task stats */}
          <div className="flex gap-2 flex-wrap">
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}>
              <p className="text-[18px] font-medium" style={{ color: '#F5F5F5' }}>{activeCount}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Active</p>
            </div>
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1A1A', border: `0.5px solid ${overdueCount > 0 ? '#E24B4A40' : '#2A2A2A'}` }}>
              <p className="text-[18px] font-medium" style={{ color: overdueCount > 0 ? '#E24B4A' : '#F5F5F5' }}>{overdueCount}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Overdue</p>
            </div>
            <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: '#1A1A1A', border: `0.5px solid ${stalledCount > 0 ? '#EF9F2740' : '#2A2A2A'}` }}>
              <p className="text-[18px] font-medium" style={{ color: stalledCount > 0 ? '#EF9F27' : '#F5F5F5' }}>{stalledCount}</p>
              <p className="text-[11px] uppercase tracking-wide" style={{ color: '#888780' }}>Stalled</p>
            </div>
          </div>

          {/* Waiting For */}
          <div>
            <p className="text-[13px] font-medium mb-2" style={{ color: '#888780' }}>Waiting For ({waitingItems.length})</p>
            {waitingItems.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#555550' }}>No open waiting-for items</p>
            ) : (
              <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
                {waitingItems.map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px]" style={{ color: '#F5F5F5' }}>{w.title}</p>
                      {w.waiting_on && <p className="text-[11px] mt-0.5" style={{ color: '#888780' }}>Waiting on: {w.waiting_on}</p>}
                    </div>
                    <button
                      onClick={() => resolveWaiting(w.id)}
                      className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md transition-colors"
                      style={{ backgroundColor: '#1D9E7520', color: '#1D9E75', border: '0.5px solid #1D9E7540' }}
                    >
                      Resolved
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Someday/Maybe */}
          <div>
            <p className="text-[13px] font-medium mb-2" style={{ color: '#888780' }}>Someday / Maybe ({somedayItems.length})</p>
            {somedayItems.length === 0 ? (
              <p className="text-[13px]" style={{ color: '#555550' }}>No someday/maybe items</p>
            ) : (
              <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
                {somedayItems.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-3 px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
                  >
                    <p className="text-[13px] min-w-0" style={{ color: '#F5F5F5' }}>{s.title}</p>
                    <button
                      onClick={() => activateSomeday(s)}
                      className="flex-shrink-0 text-[11px] px-2 py-1 rounded-md transition-colors"
                      style={{ backgroundColor: '#378ADD20', color: '#378ADD', border: '0.5px solid #378ADD40' }}
                    >
                      Activate → Tasks
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2 checklist */}
          <div style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', borderRadius: '12px', overflow: 'hidden' }}>
            {STEP2_ITEMS.map((item, i) => (
              <button
                key={item.key}
                onClick={() => toggleStep2(item.key)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#222222]"
                style={{ borderTop: i === 0 ? 'none' : '0.5px solid #2A2A2A' }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded mt-0.5"
                  style={{
                    width: '18px', height: '18px',
                    border: step2State[item.key] ? 'none' : '1.5px solid #3A3A3A',
                    backgroundColor: step2State[item.key] ? '#1D9E75' : 'transparent',
                    borderRadius: '4px',
                  }}
                >
                  {step2State[item.key] && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span
                  className="text-[14px] leading-snug"
                  style={{ color: step2State[item.key] ? '#555550' : '#F5F5F5', textDecoration: step2State[item.key] ? 'line-through' : 'none' }}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Get Creative */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="text-[13px] font-medium mb-1" style={{ color: '#888780' }}>
            Top 3 outcomes for next week
          </div>

          {[
            { label: 'PASHA', value: pashaOutcome, onChange: setPashaOutcome },
            { label: 'TapWork', value: tapworkOutcome, onChange: setTapworkOutcome },
            { label: 'Personal', value: personalOutcome, onChange: setPersonalOutcome },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#555550' }}>{label}</div>
              <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={saveStep3}
                placeholder={`${label} outcome for next week…`}
                className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none"
                style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5' }}
              />
            </div>
          ))}

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#555550' }}>Monday 06:00 TapWork task</div>
            <input
              type="text"
              value={tapworkMonday}
              onChange={e => setTapworkMonday(e.target.value)}
              onBlur={saveStep3}
              placeholder="Pre-load Monday morning TapWork task…"
              className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none"
              style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5' }}
            />
          </div>

          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide mb-1.5" style={{ color: '#555550' }}>Any projects at risk this week?</div>
            <textarea
              value={atRisk}
              onChange={e => setAtRisk(e.target.value)}
              onBlur={saveStep3}
              placeholder="Anything at risk or needing extra attention…"
              rows={3}
              className="w-full rounded-lg px-3.5 py-2.5 text-[14px] focus:outline-none resize-none"
              style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A', color: '#F5F5F5', lineHeight: '1.6' }}
            />
          </div>

          {/* Complete review button */}
          {!isCompleted && (
            <button
              onClick={completeReview}
              disabled={completing}
              className="w-full py-3 rounded-lg text-[14px] font-medium transition-all active:scale-[0.98] disabled:opacity-40 mt-2"
              style={{ backgroundColor: '#1D9E75', color: '#fff' }}
            >
              {completing ? 'Completing…' : '✓ Complete review'}
            </button>
          )}
        </div>
      )}

      {/* Step navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-30"
          style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A', color: '#F5F5F5' }}
        >
          <ChevronLeft size={14} />
          Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep(s => Math.min(3, s + 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#378ADD', color: '#fff' }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
