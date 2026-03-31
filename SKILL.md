---
name: senior-frontend
description: Senior-level frontend engineering for React + Next.js + Supabase + Tailwind CSS applications. Use this skill whenever the user asks to build a component, page, feature, or UI — especially for EshgeenOS (the personal productivity app). Triggers on: "build a component", "create a page", "add a feature", "fix the UI", "make it look like", "add a modal", "build a form", "hook up Supabase", "add real-time", "optimize performance", "refactor this component", or any frontend coding task. Always use this skill before writing any React, TypeScript, or Tailwind code — it contains critical patterns, conventions, and the EshgeenOS design system that must be followed.
---

# Senior Frontend Skill

Production-grade React + Supabase + Tailwind engineering. Read this before writing any code.

---

## Stack

```
React 18           Functional components + hooks only. No class components.
TypeScript         Strict mode. No `any`. Infer types where possible.
Tailwind CSS       Utility-first. No custom CSS unless absolutely necessary.
Supabase           Auth + PostgreSQL + Realtime. Use the JS client.
Next.js (if used)  App router. Server components where no interactivity needed.
Vercel             Deployment target. Edge-compatible where possible.
```

---

## EshgeenOS Design System (mandatory — read before writing any UI)

All UI must follow these exact values. Do not deviate.

### Colors (hardcoded — not CSS variables)

```
Background page:     #0F0F0F
Background card:     #1A1A1A
Background input:    #222222
Border default:      #2A2A2A   (0.5px)
Border hover:        #3A3A3A
Border focus:        #378ADD

Text primary:        #F5F5F5
Text secondary:      #888780
Text tertiary:       #555550

Accent blue:         #378ADD
Accent blue hover:   #185FA5
Success teal:        #1D9E75
Warning amber:       #EF9F27
Danger red:          #E24B4A
```

Context pill colors:
```
@morning-ritual:    #534AB7  (purple)
@home-morning:      #0F6E56  (teal)
@office:            #185FA5  (blue)
@home-evening:      #854F0B  (amber)
@transit:           #5F5E5A  (gray)
```

Area pill colors:
```
PASHA:              #185FA5
TapWork:            #0F6E56
himate.az:          #534AB7
Personal:           #5F5E5A
```

### Typography

```
Font:               Inter or system-ui
Page heading:       text-xl font-medium        (20px/500)
Section heading:    text-base font-medium      (16px/500)
Body:               text-sm font-normal        (14px/400)
Label/badge:        text-[11px] font-medium uppercase tracking-wide
Timestamp:          text-[11px] font-normal text-[#555550]
```

### Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48px

### Component patterns (Tailwind classes)

**Card:**
```
bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4
hover:border-[#3A3A3A] transition-colors duration-150
```

**Input:**
```
bg-[#222222] border border-[#2A2A2A] rounded-lg px-3.5 py-2.5
text-sm text-[#F5F5F5] placeholder:text-[#555550]
focus:outline-none focus:border-[#378ADD]
h-10 w-full
```

**Button primary:**
```
bg-[#378ADD] text-white text-sm font-medium rounded-lg px-5 py-2.5
hover:bg-[#185FA5] active:scale-[0.98] transition-all duration-150
```

**Button secondary:**
```
bg-transparent border border-[#3A3A3A] text-[#F5F5F5] text-sm font-medium rounded-lg px-5 py-2.5
hover:bg-[#1A1A1A] active:scale-[0.98] transition-all duration-150
```

**Badge/pill:**
```
text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-md
```
Background: color at 15% opacity. Text: full color. Example for @office:
```
bg-[#185FA5]/15 text-[#378ADD]
```

**Bottom sheet:**
```
bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl p-5
```
Drag handle: `mx-auto mb-4 h-[3px] w-8 rounded-full bg-[#3A3A3A]`

**Checklist item:**
```
flex items-start gap-2.5 py-2.5 border-b border-[#2A2A2A]
```
Checkbox: `w-[18px] h-[18px] rounded-[4px] border border-[#3A3A3A] bg-[#222222] flex-shrink-0`
Checked: `bg-[#1D9E75] border-[#1D9E75]`

**Progress bar:**
```
h-1 w-full bg-[#2A2A2A] rounded-full overflow-hidden
```
Fill: `h-full bg-[#378ADD] rounded-full transition-all duration-300`

**Rules:**
- No gradients anywhere
- No box-shadow or drop-shadow
- Border radius max: rounded-2xl (16px). Never higher.
- No font size below text-[11px]
- No color outside the palette above

---

## React Patterns

### Component structure (always this order)

```tsx
// 1. Imports
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// 2. Types
interface Props {
  id: string
  onComplete?: () => void
}

// 3. Component
export function TaskItem({ id, onComplete }: Props) {
  // 3a. State
  const [loading, setLoading] = useState(false)

  // 3b. Derived values
  const isOverdue = ...

  // 3c. Effects
  useEffect(() => { ... }, [id])

  // 3d. Handlers (useCallback for passed-down handlers)
  const handleComplete = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.from('next_actions').update({ status: 'done' }).eq('id', id)
      onComplete?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id, onComplete])

  // 3e. Early returns (loading, error, empty)
  if (loading) return <Spinner />

  // 3f. Render
  return ( ... )
}
```

### Custom hooks — extract all data fetching

```tsx
// hooks/useNextActions.ts
export function useNextActions(context: Context) {
  const [data, setData] = useState<NextAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('next_actions')
        .select('*')
        .eq('context', context)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) setError(new Error(error.message))
      else setData(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [context])

  return { data, loading, error }
}
```

Never fetch inside a component body. Always use a hook.

### Real-time subscriptions (Supabase)

```tsx
useEffect(() => {
  const channel = supabase
    .channel('next_actions_changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'next_actions',
      filter: `user_id=eq.${userId}`
    }, () => refetch())
    .subscribe()

  return () => { supabase.removeChannel(channel) }
}, [userId])
```

Always clean up subscriptions in the effect return.

### Error handling pattern

```tsx
// Never let errors be silent
const { data, error } = await supabase.from('table').select()
if (error) throw new Error(`[table] fetch failed: ${error.message}`)
```

---

## Supabase Patterns

### Client setup (lib/supabase.ts)

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Always use generated types (`Database`). Run `supabase gen types typescript` when schema changes.

### Auth pattern

```tsx
// hooks/useUser.ts
export function useUser() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  return user
}
```

### Row Level Security — always assume RLS is on

Every query is scoped to `user_id`. Never query without a user in context. Never disable RLS.

### Optimistic updates pattern

```tsx
const handleComplete = async (id: string) => {
  // 1. Update local state immediately
  setTasks(prev => prev.filter(t => t.id !== id))

  // 2. Persist in background
  const { error } = await supabase
    .from('next_actions')
    .update({ status: 'done', completed_at: new Date().toISOString() })
    .eq('id', id)

  // 3. Revert on error
  if (error) {
    setTasks(prev => [...prev, originalTask])
    toast.error('Could not complete task')
  }
}
```

---

## Bottom Sheet Pattern (mobile-first modals)

Never use `position: fixed` modals. Use bottom sheets.

```tsx
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="relative bg-[#1A1A1A] border-t border-[#2A2A2A] rounded-t-2xl p-5 pb-safe">
        <div className="mx-auto mb-4 h-[3px] w-8 rounded-full bg-[#3A3A3A]" />
        {children}
      </div>
    </div>
  )
}
```

---

## Performance Rules

- **No useEffect for derived state** — compute it inline or with useMemo
- **useMemo threshold**: only for expensive computations (>1ms), never for simple filters
- **useCallback**: only for handlers passed as props to child components
- **Keys**: always stable unique IDs, never array index
- **Images**: always specify width/height to avoid layout shift
- **Suspense boundaries**: wrap any async component that might be slow
- **Bundle**: dynamic import heavy components (`const Chart = dynamic(() => import('./Chart'))`)

---

## File & Folder Conventions

```
src/
  app/                  Next.js app router pages
  components/
    ui/                 Generic: Button, Input, BottomSheet, Badge, Spinner
    features/           Feature-specific: TaskItem, InboxRow, RitualChecklist
  hooks/                useInbox, useNextActions, useUser, useDailyRitual
  lib/
    supabase.ts         Client
    database.types.ts   Generated types
    gtd.ts              GTD business logic (clarify, organize, context detection)
    utils.ts            cn(), formatDate(), etc.
  types/
    index.ts            Shared TypeScript types
```

**Naming:**
- Components: PascalCase (`TaskItem.tsx`)
- Hooks: camelCase with `use` prefix (`useNextActions.ts`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase for types/interfaces, camelCase for variables

**`cn()` utility (always use for conditional classes):**
```ts
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## Auto-Context Detection (EshgeenOS-specific)

```ts
// lib/gtd.ts
export type Context =
  | '@morning-ritual'
  | '@home-morning'
  | '@office'
  | '@home-evening'
  | '@transit'

export function detectCurrentContext(): Context {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const time = h * 60 + m

  const t = (h: number, min = 0) => h * 60 + min

  if (time >= t(5, 30) && time < t(6))    return '@morning-ritual'
  if (time >= t(6)     && time < t(7))    return '@home-morning'
  if (time >= t(7, 30) && time < t(8, 30)) return '@transit'
  if (time >= t(8, 30) && time < t(17, 30)) return '@office'
  if (time >= t(18, 30) && time < t(20))  return '@transit'
  if (time >= t(21)    && time < t(22))   return '@home-evening'
  return '@office' // default fallback
}
```

---

## Common Patterns Quick Reference

**Toast notifications:** Use `sonner` — `toast.success()`, `toast.error()`, `toast.info()`

**Date formatting:**
```ts
import { format, isToday, isYesterday } from 'date-fns'

export function formatExpenseDate(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'd MMM')
}
```

**Currency (AZN):**
```ts
export function formatAZN(amount: number): string {
  return `${amount.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`
}
```

**Loading state skeleton:**
```tsx
<div className="animate-pulse bg-[#2A2A2A] rounded-lg h-12 w-full" />
```

**Empty state:**
```tsx
<div className="flex flex-col items-center justify-center py-16 gap-2">
  <p className="text-sm text-[#555550]">No items yet</p>
</div>
```

---

## What NOT to Do

- No class components
- No `any` type — use `unknown` and narrow, or fix the type properly
- No inline styles (use Tailwind)
- No custom CSS files (unless adding a Tailwind base layer)
- No `console.log` in committed code — use `console.error` for real errors only
- No hardcoded user IDs — always from `useUser()` hook
- No `useEffect` to sync state that can be derived
- No fetching data inside render — always in a hook or server component
- No `!important` in any style
- No colors outside the EshgeenOS palette

---

## Reference Files

For deeper reference, read these when needed:

- `references/react_patterns.md` — Advanced patterns: compound components, portals, context architecture
- `references/supabase_patterns.md` — RLS policies, edge functions, storage
- `references/nextjs_optimization.md` — App router, streaming, ISR, edge runtime
