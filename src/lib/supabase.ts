import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type EmotionTag = 'Good' | 'Neutral' | 'Hard' | 'Energized' | 'Tired'
export type NoteTag = 'TapWork' | 'PASHA' | 'Personal'
export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Coffee'
  | 'Shopping'
  | 'Health'
  | 'Learning'
  | 'Social'
  | 'Home'
  | 'Other'
export type HabitCategory = 'Morning' | 'Startup' | 'Body' | 'Self-dev' | 'Evening'

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
}

export interface Expense {
  id: string
  user_id: string
  amount: number
  category: ExpenseCategory
  note: string
  date: string
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
