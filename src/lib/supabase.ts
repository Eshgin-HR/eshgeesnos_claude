import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://eknemkhhidbxfcdhcale.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbmVta2hoaWRieGZjZGhjYWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTU2NzUsImV4cCI6MjA5MDAzMTY3NX0.ZV0iyqoVp_3FrCBoxqqtrl7hGMQGfZw78YUL6iB4syI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Legacy types (preserved for NightlyAudit) ---
export type EmotionTag = 'Good' | 'Neutral' | 'Hard' | 'Energized' | 'Tired'
export type NoteTag = 'TapWork' | 'PASHA' | 'Personal' | 'Family' | 'Health' | 'Finance' | 'Learning' | 'Startup' | 'Other'
export type HabitCategory = 'Morning' | 'Startup' | 'Body' | 'Self-dev' | 'Evening'

// --- v3 GTD types ---
export type GTDContext = '@morning-ritual' | '@home-morning' | '@office' | '@home-evening' | '@transit'
export type GTDItemType = 'next_action' | 'waiting_for' | 'someday_maybe' | 'reference' | 'trash'
export type AreaTag = 'PASHA' | 'TapWork' | 'himate.az' | 'Personal'
export type ExpenseCategory = 'loan' | 'lunch' | 'coffee' | 'entertainment' | 'clothing' | 'family_support' | 'transport' | 'subscriptions' | 'other'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'deferred'
export type TaskPriority = 'p1' | 'p2' | 'p3'
export type TimeBlock =
  | 'morning_ritual'
  | 'home_morning'
  | 'office_am'
  | 'office_pm'
  | 'home_evening'
  | 'transit'
  | 'weekend'
  | 'unassigned'

export const CONTEXTS: GTDContext[] = [
  '@morning-ritual', '@home-morning', '@office', '@home-evening', '@transit',
]

export const CONTEXT_LABELS: Record<GTDContext, string> = {
  '@morning-ritual': 'Morning Ritual',
  '@home-morning': 'Home Morning',
  '@office': 'Office',
  '@home-evening': 'Home Evening',
  '@transit': 'Transit',
}

// Design system colors (iris palette)
export const CONTEXT_COLORS: Record<GTDContext, string> = {
  '@morning-ritual': '#534AB7',
  '@home-morning': '#50CD89',
  '@office': '#4C4DDC',
  '@home-evening': '#FFD33C',
  '@transit': '#6B6B7B',
}

export const AREA_COLORS: Record<AreaTag, string> = {
  'PASHA': '#4C4DDC',
  'TapWork': '#50CD89',
  'himate.az': '#534AB7',
  'Personal': '#6B6B7B',
}

export const AREAS: AreaTag[] = ['PASHA', 'TapWork', 'himate.az', 'Personal']

export const TIME_BLOCK_LABELS: Record<TimeBlock, string> = {
  morning_ritual: 'Morning ritual (05:30–06:00)',
  home_morning: 'Home morning (06:00–07:00)',
  office_am: 'Office AM (09:00–12:00)',
  office_pm: 'Office PM (15:00–17:30)',
  home_evening: 'Home evening (21:00–22:00)',
  transit: 'Transit',
  weekend: 'Weekend',
  unassigned: 'Unassigned',
}

export const TIME_BLOCKS: TimeBlock[] = [
  'morning_ritual', 'home_morning', 'office_am', 'office_pm',
  'home_evening', 'transit', 'weekend', 'unassigned',
]

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'loan', 'lunch', 'coffee', 'entertainment', 'clothing', 'family_support', 'transport', 'subscriptions', 'other',
]

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  loan: 'Loan',
  lunch: 'Lunch',
  coffee: 'Coffee',
  entertainment: 'Entertainment',
  clothing: 'Clothing',
  family_support: 'Family support',
  transport: 'Transport',
  subscriptions: 'Subscriptions',
  other: 'Other',
}

export const EXPENSE_COLORS: Record<ExpenseCategory, string> = {
  loan: '#E24B4A',
  lunch: '#EF9F27',
  coffee: '#8B5E3C',
  entertainment: '#534AB7',
  clothing: '#D4537E',
  family_support: '#1D9E75',
  transport: '#378ADD',
  subscriptions: '#888780',
  other: '#555550',
}

// --- Interfaces ---
export interface Habit {
  id: string
  name: string
  icon: string
  category: HabitCategory
  active: boolean
  counts_toward_score: boolean
  streak_tracking: boolean
  sort_order: number
}

export interface DailyCheckin {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean
  energy?: number
  focus?: number
  mood?: number
}

export interface NightlyAudit {
  id: string
  user_id: string
  date: string
  win1: string
  win2: string
  win3: string
  improvement: string
  tapwork_task: string
  gratitude: string
  emotion_tag: EmotionTag
}

export interface WeeklyReview {
  id: string
  user_id: string
  week_start: string
  step1_state: Record<string, boolean> | null
  step2_state: Record<string, boolean> | null
  step3_state: Record<string, boolean> | null
  pasha_outcome: string | null
  tapwork_outcome: string | null
  personal_outcome: string | null
  tapwork_monday_task: string | null
  at_risk: string | null
  completed_at: string | null
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: ExpenseCategory
  note: string
  expense_date: string
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  body: string
  tag: NoteTag
  pinned: boolean
  created_at: string
  updated_at?: string
}

// v3 Task interface — full GTD task with status, priority, due_date, time_block
export interface Task {
  id: string
  user_id: string
  date: string
  title: string
  category: 'PASHA' | 'Personal' | 'Startup' | 'Other'
  completed: boolean
  sort_order: number
  context_tag: GTDContext | null
  area_tag: AreaTag | null
  activated_at: string | null
  created_at: string
  // v3 fields
  status: TaskStatus
  priority: TaskPriority | null
  time_block: TimeBlock | null
  notes: string | null
  due_date: string | null
}

export interface InboxItem {
  id: string
  user_id: string
  content: string
  item_type: GTDItemType | null
  context: GTDContext | null
  processed: boolean
  created_at: string
}

export interface WaitingForItem {
  id: string
  user_id: string
  title: string
  waiting_on: string | null
  created_at: string
  resolved: boolean
}

export interface SomedayItem {
  id: string
  user_id: string
  title: string
  created_at: string
}

export interface DailyRitual {
  id: string
  user_id: string
  date: string
  ritual_type: 'morning' | 'evening'
  checklist_state: Record<string, boolean>
  completed: boolean
  tapwork_next_task: string | null
  created_at: string
}

export interface BudgetTarget {
  id: string
  user_id: string
  month: string
  total_target: number
}

export interface WeeklyReflection {
  id: string
  user_id: string
  week_start: string
  pasha_progress: string
  tapwork_progress: string
  not_completed: string
  energy_rating: number | null
  energy_note: string
  protect_next_week: string
  created_at: string
}

// --- Utility functions ---
export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function getMondayOfWeek(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function isStalled(activatedAt: string | null): boolean {
  if (!activatedAt) return false
  const diff = Date.now() - new Date(activatedAt).getTime()
  return diff > 7 * 24 * 60 * 60 * 1000
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return dueDate < todayStr()
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
