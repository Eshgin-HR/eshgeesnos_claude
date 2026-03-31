# CLAUDE.md — EshgeenOS v2 (GTD Edition)

## What is EshgeenOS

EshgeenOS is Eshgeen's personal operating system — a React + Supabase web application deployed on Vercel. It is a private productivity dashboard that manages his dual-track life: Lead People Analytics at PASHA Holding and founder of TapWork (WhatsApp-first blue-collar hiring platform) and himate.az (AI-powered graduate hiring platform).

The app is his trusted GTD system — not a generic task manager. Every feature must serve his specific workflow.

Live URL: https://eshgeesnos-claude-2737.vercel.app

---

## Tech Stack

- **Frontend**: React (functional components, hooks)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Vercel
- **Styling**: Tailwind CSS (preserve existing setup)
- **State**: React hooks + Supabase real-time subscriptions where applicable

Do not introduce new major dependencies without flagging it first. Preserve all existing code not explicitly listed for change.

---

## Owner Profile

**Name**: Eshgeen
**Role**: Lead, People Analytics @ PASHA Holding (Baku, Azerbaijan)
**Ventures**: TapWork (primary), himate.az (secondary)
**Timezone**: Asia/Baku (UTC+4)
**Week starts**: Monday
**Clock format**: 24-hour

---

## GTD System — Core Structure

### The Five Contexts

| Context | Time block | Purpose |
|---|---|---|
| `@morning-ritual` | 05:30–06:00 daily | Gratitude + prayer — sacred start, no phone, mind reset |
| `@home-morning` | 06:00–07:00 daily | TapWork power hour — one pre-decided task only |
| `@office` | 09:00–17:30 weekdays | PASHA deep work, modeling, decks, meetings |
| `@home-evening` | 21:00–22:00 daily | PASHA home block, strategic work |
| `@transit` | Commute times | Podcast queue, reading list, AI debrief prompts |

Context is assigned manually by the user per task. There is no auto-detection logic in the UI.

### GTD Item Types (used in Inbox clarify modal)

- **Next Action** → assign context, appears in task list
- **Waiting For** → delegated, pending someone else
- **Someday/Maybe** → not now, don't lose it
- **Reference** → no action, just store
- **Trash** → delete

---

## Daily Schedule (reference only — not used for auto-logic)

```
05:30–06:00  @morning-ritual — gratitude + prayer (no phone)
06:00–07:00  @home-morning — TapWork power hour
07:00–07:30  Daily planning + breakfast
07:30–08:15  @transit — commute to office
08:15–08:30  Inbox sweep + lock today's list
08:30–09:00  Reading
09:00–12:00  @office — PASHA deep work block 1
12:00–14:00  Gym (Mon/Wed/Fri) or Swimming (Tue/Thu)
14:00–15:00  Lunch + midday replan
15:00–17:30  @office — PASHA deep work block 2
17:30–18:30  Daily close — mail + reflection + to-do check
18:30–20:00  @transit — commute home, AI debrief walk
20:00–21:00  Dinner + family + rest (hard boundary — no work)
21:00–22:00  @home-evening — PASHA home block
22:00–22:45  Evening ritual — night audit + journaling + reading
22:45        Sleep
```

Weekend:
- **Saturday**: swimming + TapWork deep work + PASHA 1–2h + 20k steps + weekly review
- **Sunday**: cycling + reading + family/friends + budget review + weekly reflection

---

## Navigation — Left Sidebar (replaces bottom tab bar)

### Structure

The app uses a **collapsible left sidebar** on all screen sizes — not a bottom tab bar.

**Behavior:**
- **Web (desktop/tablet)**: sidebar is open by default, showing icons + labels. Can be collapsed to icon-only mode via a toggle button (hamburger or arrow). Collapsed width: 56px. Expanded width: 220px. Transition: 200ms ease.
- **Mobile**: sidebar is hidden by default. Opens as an overlay drawer from the left via hamburger icon in the top-left header. Closes on nav item tap or outside tap. Full width overlay: 260px.
- Sidebar state (open/collapsed) persists in localStorage.

**Web layout:**
```
[Sidebar 220px fixed] [Main content — fills remaining width, max-width none]
```
Main content area must be properly offset by sidebar width. Use CSS: `margin-left: 220px` (or 56px when collapsed) on the main wrapper. Do not let content bleed under the sidebar.

**Sidebar nav items (top section):**
- Home
- Inbox (with unread count badge)
- Tasks
- Calendar (new)
- Rituals
- Notes (moved from More — now top-level)
- Budget
- Weekly Review
- Sunday Reflection
- Progress

**Sidebar nav items (bottom section, above footer):**
- Settings (minimal — just timezone, name, monthly budget target)

**Nav item anatomy:**
```
[16px icon] [label 13px] (expanded)
[16px icon] (collapsed — with tooltip on hover)
```
Active item: left border 2px #378ADD + background #1A2E45 + text #378ADD.
Inactive: text #888780, hover background #1A1A1A.

**Sidebar header (expanded):**
```
Logo / "EshgeenOS" wordmark 14px weight 500
Below: Eshgeen — small avatar initials circle "E"
```

**Hamburger toggle:** top-left of main header on all sizes. On desktop it collapses/expands the sidebar. On mobile it opens the drawer.

---

## Global UI Elements

### + FAB (Floating Action Button)

One floating + button, **bottom-right**, 80px from bottom, 20px from right.

```
size: 52px circle
background: #378ADD
icon: + white 22px
z-index: above content, below modals
```

Tapping it opens a choice sheet (small bottom sheet with two options):
- Add Task
- Add Expense

This replaces any separate add-task or add-expense entry points on individual pages (those can still exist but the FAB is the primary universal entry).

### Page Header

```
height: 56px
layout: [Hamburger 40px] [Page title 16px 500] [optional right action]
background: #0F0F0F
border-bottom: 0.5px solid #2A2A2A
```

On web with sidebar open, hamburger collapses/expands sidebar. On mobile, it opens/closes the drawer.

---

## Pages

### 1. Home / Dashboard

Fast, uncluttered. The command center.

**Top section — stat cards (2×2 grid):**
```
[Open tasks]        [Inbox count]
[Today's spend]     [Ritual streak]
```
Each card: number large (22px 500) + label small (11px uppercase muted). Tap navigates to the relevant page.

**Below stats — "Tomorrow's TapWork task" banner:**
Shown only if set in previous night's reflection. Full-width card, amber left border, task text inside. Hidden if not set.

**Below banner — Incomplete tasks list:**
- Title: "Open tasks" with count badge
- Shows all tasks with status = active, sorted by due date ascending (overdue first), then by created_at
- Each row: checkbox + task title + area pill + context pill + due date (if set, shown in muted text)
- Completing a task from here marks it done in Supabase and removes it from the list
- No filter — shows everything not completed across all contexts and areas
- "View all" link at bottom navigates to Tasks page
- Max 20 shown on dashboard, paginated or load-more

**No context switcher on home page.** Context logic removed entirely from this page.

---

### 2. Inbox

- Single list, reverse chronological
- Persistent quick-add input at top of page
- Each item: tap to open Clarify bottom sheet
- Clarify bottom sheet: Type selector + Context selector (manual) + due date optional
- Bulk: checkbox + bulk-assign type/context
- Inbox count badge in sidebar nav, always visible
- Clean empty state at zero

---

### 3. Tasks (full redesign)

#### Stats bar (above the list)

Horizontal row of 3 stat pills:
```
[X open]   [Y completed this week]   [Z overdue]
```
Tapping "overdue" filters to overdue only. Others are display only.

#### Filter / sort bar

Below stats:
- **Area filter** (pill tabs): All · PASHA · TapWork · himate.az · Personal
- **Context filter** (pill tabs, second row): All · @morning-ritual · @home-morning · @office · @home-evening · @transit
- **Sort**: Due date · Created · Priority (dropdown or toggle)
- **Status toggle**: Open / Completed / All

#### Task list

Each task row (Notion-inspired, clean):
```
[Checkbox 18px] [Task title 14px] 
                [Area pill] [Context pill] [Due date chip] [Priority dot]
```
Two-line layout — title on top, meta row below. Clean separator between rows.

Stall indicator: if task active > 7 days, small amber dot on far right.

Completed tasks: title strikethrough, muted color, checkbox teal.

Tapping anywhere on the row (except checkbox) opens the **Task Detail Panel** — right side panel on web, full bottom sheet on mobile.

#### Task Detail Panel / Sheet (Notion-inspired)

Fields — all editable inline:
- **Title** — large text input at top
- **Status** — pill selector: Open / In Progress / Done / Deferred
- **Priority** — selector: P1 / P2 / P3 (colored dots: red / amber / gray)
- **Area** — dropdown: PASHA / TapWork / himate.az / Personal
- **Context** — dropdown: 5 context options (manual selection only — no auto logic)
- **Time block** — manual selection only. Dropdown or segmented control:
  - Morning ritual (05:30–06:00)
  - Home morning (06:00–07:00)
  - Office AM (09:00–12:00)
  - Office PM (15:00–17:30)
  - Home evening (21:00–22:00)
  - Transit
  - Weekend
  - Unassigned
- **Due date** — date picker (calendar popover). Shows "No due date" when empty, tappable to set. Displays as "Mar 31" when set, red if overdue.
- **Notes** — multiline text area, grows with content
- **Created** — read-only, muted timestamp at bottom

Delete button: bottom of panel, danger style.

#### Add Task

Tapping the FAB → "Add Task" opens a minimal add sheet:
- Title (auto-focused)
- Area (pill select)
- Context (pill select)
- Due date (date picker)
- Priority (P1 / P2 / P3)
- Save

Time block and notes added after creation via the detail panel.

---

### 4. Calendar (new page)

A monthly calendar view that shows tasks by their due date.

#### Layout

- **Header**: month + year, left/right arrows to navigate months
- **Month grid**: 7 columns (Mon–Sun), 5–6 rows. Each day cell shows:
  - Day number
  - Up to 3 task title chips (truncated). If more, shows "+N more"
  - Dot indicator if tasks exist (when chips overflow)
  - Today: highlighted cell background (#1A2E45), today's date number in #378ADD
  - Past days: slightly muted
- **Below grid**: selected day panel — tap any day to see full task list for that day in a panel below the calendar. Shows all tasks due that day with the same row design as the Tasks page.

#### Adding tasks from Calendar

Tapping a day → selected day panel opens → "Add task for [date]" button pre-fills the due date in the Add Task sheet.

#### Week view toggle

Small toggle in header: Month | Week. Week view shows 7 columns with time-blocked rows (hourly, 06:00–23:00). Tasks appear as chips in their time block row. This is read-only scheduling visualization — drag to reschedule is not required in v1.

#### Supabase

No new tables needed — calendar pulls from the existing `next_actions` / tasks table filtered by `due_date`.

---

### 5. Daily Rituals

Two interactive checklists — morning and evening. State saves to Supabase per day.

**Morning ritual** (05:30–09:00):
- [ ] 05:30 — Gratitude + prayer (no phone, 30 min)
- [ ] 06:00 — TapWork power hour (pre-decided task)
- [ ] 07:00 — Daily planning — review tasks, confirm top 3
- [ ] Breakfast (no screens)
- [ ] Commute — podcast @transit
- [ ] 08:15 — Inbox sweep + lock today's list
- [ ] 08:30 — Reading 30 min

**Evening ritual** (22:00–22:45):
- [ ] Night audit
- [ ] Capture open loops to inbox
- [ ] Daily reflection: 3 wins · 1 lesson · 1 thing to do differently
- [ ] Pre-decide tomorrow's 06:00 TapWork task
- [ ] Reading 15 min
- [ ] Screens off at 22:30

Completing all evening items marks the day done → increments streak on dashboard.

---

### 6. Night Audit (preserve v1 exactly)

Keep exactly as v1. Do not touch structure, fields, or layout. Accessed from the evening ritual checklist. Only remove fields tied to features explicitly removed in v2.

---

### 7. Notes (standalone sidebar page — redesign cards)

Notes is now a **top-level sidebar page**, not buried in a "More" menu or 3-dots area. Remove it from wherever it lived in v1 and give it its own sidebar nav item.

#### Layout

Two-panel on web: left panel = notes list, right panel = open note editor.
Single panel on mobile: list view → tap to open full-screen editor.

#### Notes list (left panel)

- Search bar at top
- "New note" button
- Each note card in the list:

```
[Note title — 14px weight 500]
[First line of content — 12px muted, truncated to 1 line]
[Date — 11px muted, right-aligned]
```

Card design:
```
background: #1A1A1A
border: 0.5px solid #2A2A2A
border-radius: 10px
padding: 12px 14px
margin-bottom: 6px
```
No colored accents, no icons, no tags visible on the card — just title, preview, date. Clean. Hover: border #3A3A3A.

Active/selected note: border #378ADD, background #1A2E45.

#### Note editor (right panel)

- Title: large plain input, 20px, no border, placeholder "Untitled"
- Body: plain contenteditable or textarea, 14px, line-height 1.7, no border
- Auto-save on every keystroke (debounced 500ms)
- Timestamp shown at bottom: "Last edited Mar 31, 2026 at 22:14"
- Delete: top-right icon, requires confirm

No rich text formatting in v1. Plain text only. Do not add markdown rendering, bold/italic toolbar, or tags in this version.

---

### 8. Weekly Review (full GTD redesign — replaces previous version)

Accessed any time from sidebar (typically Saturday). Full GTD weekly review workflow — not just a checklist, but a guided multi-step process.

#### Structure: 3 steps

Step indicator at top: `Step 1 of 3 — Get Clear` with a progress bar.

**Step 1 — Get Clear**
Goal: empty every inbox, close every open loop.

Checklist:
- [ ] Process all inboxes to zero (check app inbox count — shown live)
- [ ] Review all captures from the week (voice memos, notes, scraps)
- [ ] Add anything still in your head to inbox now

Live inbox count shown inline: "Inbox: 3 items remaining." Updates in real time.

**Step 2 — Get Current**
Goal: make sure all lists are up to date.

Sub-sections:

*Review active tasks:*
- Shows live count of active tasks, count overdue, count stalled (7+ days)
- Tap "View stalled tasks" → opens task list filtered to stalled
- Checklist item: [ ] Reviewed all active tasks — nothing falling through the cracks

*Review Waiting For:*
- Shows live list of unresolved Waiting For items
- Each item: description + who it's waiting on + created date
- Tap to mark resolved or add a follow-up note
- Checklist item: [ ] Reviewed all Waiting For items

*Review Someday/Maybe:*
- Shows list of Someday/Maybe items
- Each item has an "Activate → move to tasks" button
- Checklist item: [ ] Reviewed Someday/Maybe — anything to activate?

**Step 3 — Get Creative**
Goal: set direction for the coming week.

Free-form fields:
- Top 3 outcomes for next week:
  - PASHA: [text input]
  - TapWork: [text input]
  - Personal: [text input]
- Pre-load Monday 06:00 TapWork task: [text input — saves to daily_rituals for Monday]
- Any projects at risk this week? [text input]

*Complete review* button at bottom — saves the completed state, records timestamp, increments weekly review streak.

Shows: "Last review completed: [date]" at the top of the page.
Dashboard inline reminder if Saturday 14:00 passes with no completed review.

---

### 9. Sunday Reflection

A structured weekly reflection form — separate from the Saturday Weekly Review.

Fields:
- Week of: (auto-filled with Monday date of current week)
- PASHA: what moved forward this week? (free text)
- TapWork: what moved forward this week? (free text)
- What did I not get to? (free text)
- Energy and focus — 1 to 5 rating + optional note
- What is the single most important thing to protect next week? (free text)

Saved to Supabase per week. Past entries viewable as a reverse-chronological log below the form.

---

### 10. Budget (standalone page — full build)

Daily expense tracking with category breakdown, monthly targets, and spending reports.

#### Categories (fixed)

| ID | Label | Color |
|---|---|---|
| `loan` | Loan payment | #E24B4A (red) |
| `lunch` | Lunch | #EF9F27 (amber) |
| `coffee` | Coffee | #8B5E3C (brown) |
| `entertainment` | Entertainment | #534AB7 (purple) |
| `clothing` | Clothing | #D4537E (pink) |
| `family_support` | Family support | #1D9E75 (teal) |
| `transport` | Transport | #378ADD (blue) |
| `subscriptions` | Subscriptions | #888780 (gray) |
| `other` | Other | #444441 (dark gray) |

#### Add Expense

Via FAB → "Add Expense" bottom sheet:
- Amount (large number input, auto-focused)
- Category (horizontal scroll pill selector)
- Note (optional text label)
- Date (defaults today, tappable date picker)
- Save

#### Two tabs: Overview + Transactions

**Overview tab:**

Date filter pills: Today · This week · This month · All time

1. Total spent card + progress bar vs monthly target (green < 70%, amber 70–90%, red > 90%). Target comparison shown only on "This month."
2. Donut or horizontal bar chart — spend by category for the period. Custom HTML legend below (not canvas legend).
3. Category summary list — each category with color dot, total spent, % of total, sorted by amount desc.

**Transactions tab:**

Category filter pills: All + 9 categories.

Transactions grouped by day, reverse chronological:
- Day header: date label + day total right-aligned
- Each row: [color dot] [note] [category label muted] [amount] [delete icon]
- Tap row → edit bottom sheet
- Delete: single tap + 3-second undo toast

#### Home dashboard addition

"Today's spend" metric card in the 2×2 stats grid. Taps → Budget → Transactions filtered to today.

---

### 11. Progress (user-friendly reporting page)

A single page that gives a clear, visual picture of how the week and month are going. Designed to feel like a personal dashboard — readable at a glance, no data overload.

#### Sections

**This week — task performance:**
- Horizontal bar chart: tasks completed vs open by area (PASHA / TapWork / himate.az / Personal)
- Number stat: total completed this week
- Number stat: inbox items processed this week
- Stalled tasks count with link to view them

**Streaks:**
- Evening ritual streak: [flame icon] N days
- Weekly review streak: N weeks
- Visual streak calendar (GitHub-style contribution grid, last 30 days) — green cell = evening ritual completed that day, empty = missed

**Spending this month:**
- Total spent vs target — large progress bar
- Mini category breakdown (same as Budget overview but smaller, read-only)
- Link to Budget page for full detail

**Context breakdown:**
- Simple horizontal bars: how many tasks completed per context this week
- @office · @home-morning · @home-evening · @transit · @morning-ritual

**Past week comparison:**
- Two numbers side by side: "Last week: X tasks" vs "This week: Y tasks" with a delta arrow (up = green, down = red, same = gray)

Keep this page simple and scannable. It is read-only — no editing happens here. Every number links to the relevant page for drill-down.

---

## Supabase Schema — New Tables (add only, non-destructive)

```sql
-- Inbox items
create table if not exists inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  content text not null,
  item_type text check (item_type in ('next_action','waiting_for','someday_maybe','reference','trash')),
  context text check (context in ('@morning-ritual','@home-morning','@office','@home-evening','@transit')),
  processed boolean default false,
  created_at timestamptz default now()
);

-- Waiting for items
create table if not exists waiting_for (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text not null,
  waiting_on text,
  created_at timestamptz default now(),
  resolved boolean default false
);

-- Someday/Maybe
create table if not exists someday_maybe (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  title text not null,
  created_at timestamptz default now()
);

-- Daily ritual completions
create table if not exists daily_rituals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  date date not null,
  ritual_type text check (ritual_type in ('morning','evening')),
  checklist_state jsonb,
  completed boolean default false,
  tapwork_next_task text,
  created_at timestamptz default now(),
  unique(user_id, date, ritual_type)
);

-- Weekly reviews (Saturday — GTD 3-step)
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  week_start date not null,
  step1_state jsonb,
  step2_state jsonb,
  step3_state jsonb,
  pasha_outcome text,
  tapwork_outcome text,
  personal_outcome text,
  tapwork_monday_task text,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- Sunday reflection
create table if not exists weekly_reflection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  week_start date not null,
  pasha_progress text,
  tapwork_progress text,
  not_completed text,
  energy_rating integer check (energy_rating between 1 and 5),
  energy_note text,
  protect_next_week text,
  created_at timestamptz default now(),
  unique(user_id, week_start)
);

-- Expenses
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  amount numeric(10,2) not null,
  category text check (category in (
    'loan','lunch','coffee','entertainment',
    'clothing','family_support','transport','subscriptions','other'
  )) not null,
  note text,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

-- Monthly budget targets
create table if not exists budget_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  month date not null,
  total_target numeric(10,2) not null,
  created_at timestamptz default now(),
  unique(user_id, month)
);

create index if not exists expenses_user_date on expenses(user_id, expense_date desc);

-- Daily reflections: check existing before altering
-- Add if not present: wins text[], lesson text, tomorrow_improvement text,
--   tapwork_next_task text, energy_level integer
```

---

## Design System

### Philosophy

Linear meets Notion. Tight typography, generous whitespace, flat surfaces, no decorative elements. Every screen must be immediately usable at 05:30.

### Color Palette

```
Background (page)     #0F0F0F
Background (card)     #1A1A1A
Background (input)    #222222
Background (sidebar)  #111111
Border (default)      #2A2A2A   — 0.5px only
Border (hover)        #3A3A3A
Border (focus/active) #378ADD

Text (primary)        #F5F5F5
Text (secondary)      #888780
Text (tertiary)       #555550
Text (disabled)       #3A3A3A

Accent blue           #378ADD
Accent blue hover     #185FA5
Active nav bg         #1A2E45

Success / complete    #1D9E75
Warning / stall       #EF9F27
Danger / overdue      #E24B4A

Context colors:
  @morning-ritual     #534AB7
  @home-morning       #1D9E75
  @office             #378ADD
  @home-evening       #EF9F27
  @transit            #888780

Area colors:
  PASHA               #378ADD
  TapWork             #1D9E75
  himate.az           #534AB7
  Personal            #888780
```

### Typography

```
Page heading          20px / 500
Section heading       16px / 500
Body / task title     14px / 400
Label / badge         11px / 500 / uppercase / letter-spacing 0.06em
Timestamp / meta      11px / 400 / color: text-tertiary
Note preview          12px / 400
```

### Spacing

Base unit 4px. Use multiples: 4, 8, 12, 16, 20, 24, 32.

```
Card padding          16px mobile, 20px desktop
List item padding     12px vertical, 16px horizontal
Section gap           24px
Inline gap            8px
Badge padding         2px / 8px
```

### Borders and Radius

```
Default border        0.5px solid #2A2A2A
Card radius           12px
Input radius          8px
Badge/pill radius     6px
Button radius         8px
Sidebar item radius   8px
```

No drop shadows. No gradients. Elevation via border color change only.

### Components

**Sidebar nav item:**
```
height: 40px
padding: 0 12px
border-radius: 8px
display: flex align-items center gap 10px
icon: 16px
label: 13px
active: background #1A2E45, left-border 2px #378ADD, text #378ADD
inactive: text #888780
hover: background #1A1A1A
```

**Cards:**
```
background: #1A1A1A
border: 0.5px solid #2A2A2A
border-radius: 12px
padding: 16px
hover border: #3A3A3A
```

**Task row:**
```
min-height: 52px
padding: 10px 16px
border-bottom: 0.5px solid #2A2A2A
line 1: [checkbox 18px] [title 14px 400]
line 2: [area pill] [context pill] [due date chip] — 12px muted
stall dot: 6px amber circle far right
```

**Badges / pills:**
```
font-size: 11px / 500
padding: 2px 8px
border-radius: 6px
background: color at 12% opacity
color: full opacity
```

**Buttons:**
```
Primary:   background #378ADD, text white, radius 8px, padding 10px 20px
Secondary: transparent, border 0.5px #3A3A3A, text #F5F5F5
Danger:    transparent, border 0.5px #E24B4A, text #E24B4A
Active state: scale(0.98)
```

**Input fields:**
```
background: #222222
border: 0.5px solid #2A2A2A
border-radius: 8px
padding: 10px 14px
font-size: 14px
color: #F5F5F5
placeholder: #555550
focus: border-color #378ADD
height: 40px single, auto multiline
```

**FAB:**
```
position: fixed bottom-right
bottom: 24px, right: 24px
size: 52px circle
background: #378ADD
icon: + white 22px
z-index: 100
```

**Bottom sheet:**
```
background: #1A1A1A
border-top: 0.5px solid #2A2A2A
border-radius: 16px 16px 0 0
padding: 20px 16px
drag handle: 32px × 3px, #3A3A3A, centered top
```

**Metric card (dashboard):**
```
background: #1A1A1A
border: 0.5px solid #2A2A2A
border-radius: 8px
padding: 12px
number: 22px / 500 / #F5F5F5
label: 11px / uppercase / 500 / #888780
```

**Note card (list view):**
```
background: #1A1A1A
border: 0.5px solid #2A2A2A
border-radius: 10px
padding: 12px 14px
margin-bottom: 6px
title: 14px / 500 / #F5F5F5
preview: 12px / 400 / #888780 — 1 line truncated
date: 11px / #555550 / right-aligned
active: border #378ADD, background #1A2E45
hover: border #3A3A3A
```

**Progress bar:**
```
height: 4px
background: #2A2A2A
fill: #378ADD (default), #1D9E75 (< 70% budget), #EF9F27 (70–90%), #E24B4A (> 90%)
border-radius: 2px
```

**Checklist item:**
```
padding: 10px 0
border-bottom: 0.5px solid #2A2A2A
layout: [checkbox 18px] [label 14px]
unchecked: border 0.5px #3A3A3A, bg #222222, radius 4px
checked: bg #1D9E75, white checkmark
done: strikethrough, color #555550
```

**Date picker chip:**
```
display: inline-flex align-items-center gap 4px
padding: 3px 10px
border-radius: 6px
border: 0.5px solid #2A2A2A
font-size: 12px color #888780
overdue: border #E24B4A, color #E24B4A
empty: "No due date" placeholder text
```

### Layout — Web Responsive

```
Mobile (< 768px):
  Sidebar: hidden, opens as overlay drawer
  Main: full width, padding 0 16px

Tablet (768px – 1024px):
  Sidebar: collapsed (56px icon-only) by default
  Main: margin-left 56px

Desktop (> 1024px):
  Sidebar: expanded (220px) by default
  Main: margin-left 220px, max-width none
```

Main content area is always properly offset. Content never hides behind the sidebar. Use CSS custom property `--sidebar-width` updated on toggle so the main margin-left reacts reactively.

Page content max-width: 720px centered within the main area on desktop for readability. Full width on mobile.

### Animation

- Sidebar expand/collapse: 200ms ease width transition
- Sidebar mobile drawer: 250ms ease translateX
- Bottom sheet open/close: 200ms ease
- Color/border hover: 150ms ease
- `@media (prefers-reduced-motion: reduce)`: disable all

### Dark Mode

Default dark (#0F0F0F). System preference respected. Build dark first.

### Do Not

- No gradients
- No drop shadows
- No rounded corners > 16px
- No font size < 11px
- No colors outside the palette
- No decorative illustrations
- No ALL CAPS except 11px badge labels

---

## What NOT to Build

- No Pomodoro timer
- No social or sharing features
- No AI chat inside the app
- No calendar sync (calendar is internal/manual only)
- No career roadmap page
- No projects list page
- No rich text editor in Notes (plain text only in v1)

---

## Priority Order

1. Sidebar navigation — build responsive collapsible sidebar first, replace any existing bottom tab bar. Web layout offsets must be correct before any other page work.
2. Supabase schema — run new migrations (non-destructive, check existing first)
3. FAB — unified add button with task/expense choice sheet
4. Home — remove context switcher, add incomplete tasks list below stat cards
5. Tasks page — redesign with stats bar, filter bar, Notion-inspired task rows, Task Detail panel, manual time block + due date
6. Calendar — new page, monthly grid + selected day panel
7. Notes — move to sidebar top-level, redesign cards and editor
8. Inbox — quick capture + clarify modal
9. Daily Rituals — morning + evening checklists
10. Night audit — verify v1 intact, patch only if needed
11. Weekly Review — full 3-step GTD rebuild
12. Sunday Reflection — fields form + history log
13. Budget — full build from spec
14. Progress — reporting page with charts, streaks, spending snapshot
15. Final pass — responsive QA on web and mobile, sidebar offset check, all navigation working

---

## Key Reminders for Claude Code

- **Read the sidebar spec carefully.** The web layout margin-left offset is critical — content must never hide behind the sidebar. Use `--sidebar-width` CSS variable.
- **Context logic is manual only.** No auto-detection anywhere in the UI. User picks context when creating or editing a task.
- **Home page has no context switcher.** It shows a flat list of all incomplete tasks.
- **Notes is a top-level sidebar page.** Remove it from wherever it lived (3-dots / More menu) and give it its own nav item.
- **Task time block is manual dropdown selection only** — not auto-detected from time of day.
- **Weekly Review is a 3-step guided process** — not a simple checklist.
- **Night audit**: preserve v1 exactly. Touch nothing.
- **Budget**: full new build. Check if old budget tables exist before migration.
- **Check existing schema** before any migration to avoid conflicts.
- After each major section, verify existing functionality still works before proceeding.
