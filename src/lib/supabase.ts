import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://eknemkhhidbxfcdhcale.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbmVta2hoaWRieGZjZGhjYWxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTU2NzUsImV4cCI6MjA5MDAzMTY3NX0.ZV0iyqoVp_3FrCBoxqqtrl7hGMQGfZw78YUL6iB4syI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Legacy types (preserved for existing pages) ---
export type EmotionTag = 'Good' | 'Neutral' | 'Hard' | 'Energized' | 'Tired'
export type NoteTag = 'TapWork' | 'PASHA' | 'Personal' | 'Family' | 'Health' | 'Finance' | 'Learning' | 'Startup' | 'Other'
export type HabitCategory = 'Morning' | 'Startup' | 'Body' | 'Self-dev' | 'Evening'

// --- v2 GTD types ---
export type GTDContext = '@morning-ritual' | '@home-morning' | '@office' | '@home-evening' | '@transit'
export type GTDItemType = 'next_action' | 'waiting_for' | 'someday_maybe' | 'reference' | 'trash'
export type AreaTag = 'PASHA' | 'TapWork' | 'himate.az' | 'Personal'
export type ExpenseCategory = 'loan' | 'lunch' | 'coffee' | 'entertainment' | 'clothing' | 'family_support' | 'transport' | 'subscriptions' | 'other'

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

export const CONTEXT_COLORS: Record<GTDContext, string> = {
  '@morning-ritual': '#534AB7',
  '@home-morning': '#0F6E56',
  '@office': '#185FA5',
  '@home-evening': '#854F0B',
  '@transit': '#5F5E5A',
}

export const AREA_COLORS: Record<AreaTag, string> = {
  'PASHA': '#185FA5',
  'TapWork': '#0F6E56',
  'himate.az': '#534AB7',
  'Personal': '#5F5E5A',
}

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
  clothing: '#D46FAB',
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
  tapwork_hours: number
  top_win: string
  next_focus: string
  checklist_state?: Record<string, boolean>
  notes?: string
  completed_at?: string
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: ExpenseCategory
  note: string
  date: string
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
}

export interface Task {
  id: string
  user_id: string
  date: string
  title: string
  category: 'PASHA' | 'Personal' | 'Startup' | 'Other'
  completed: boolean
  time_block: string | null
  sort_order: number
  context_tag: GTDContext | null
  area_tag: AreaTag | null
  activated_at: string | null
  created_at: string
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

// --- Auto-context by time ---
export function getAutoContext(): GTDContext {
  const h = new Date().getHours()
  const m = new Date().getMinutes()
  const t = h * 60 + m
  if (t >= 5 * 60 + 30 && t < 6 * 60) return '@morning-ritual'
  if (t >= 6 * 60 && t < 7 * 60) return '@home-morning'
  if (t >= 7 * 60 + 30 && t < 8 * 60 + 30) return '@transit'
  if (t >= 8 * 60 + 30 && t < 17 * 60 + 30) return '@office'
  if (t >= 18 * 60 + 30 && t < 20 * 60) return '@transit'
  if (t >= 21 * 60 && t < 22 * 60) return '@home-evening'
  return '@office'
}

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
