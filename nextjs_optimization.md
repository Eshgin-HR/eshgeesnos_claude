# Next.js Optimization — Reference

## App Router Structure (EshgeenOS)

```
app/
  layout.tsx          Root layout — providers, fonts, bottom nav
  page.tsx            Home / Dashboard (server component, fetch initial data)
  inbox/
    page.tsx
  tasks/
    page.tsx
  contexts/
    [context]/
      page.tsx
  rituals/
    page.tsx
  weekly-review/
    page.tsx
  sunday/
    page.tsx
  budget/
    page.tsx
  notes/
    page.tsx
  reporting/
    page.tsx
```

## Server vs Client Components

```tsx
// Server component (default) — no hooks, no interactivity
// Good for: initial data fetch, layout, static UI
export default async function BudgetPage() {
  const { data: { user } } = await createServerClient().auth.getUser()
  const expenses = await fetchExpenses(user.id) // runs on server

  return <BudgetClient initialExpenses={expenses} />
}

// Client component — add 'use client' directive
'use client'
export function BudgetClient({ initialExpenses }: { initialExpenses: Expense[] }) {
  const [filter, setFilter] = useState<DateFilter>('this_month')
  // ...interactive UI
}
```

Rule: push interactivity as low in the tree as possible. Keep parent components as server components.

## Loading UI

```tsx
// app/budget/loading.tsx — automatic Suspense boundary
export default function BudgetLoading() {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse bg-[#2A2A2A] rounded-xl h-16 w-full" />
      ))}
    </div>
  )
}
```

## Dynamic Imports (reduce initial bundle)

```tsx
// Heavy chart — only load when needed
const DonutChart = dynamic(() => import('@/components/features/DonutChart'), {
  loading: () => <div className="animate-pulse bg-[#2A2A2A] rounded-full w-48 h-48 mx-auto" />,
  ssr: false // charts are client-only
})
```

## Font Loading

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans bg-[#0F0F0F] text-[#F5F5F5]">{children}</body>
    </html>
  )
}
```

## Metadata

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  title: 'EshgeenOS',
  description: 'Personal operating system',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover', // safe-area support
  themeColor: '#0F0F0F',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent'
  }
}
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Never expose service role key to client
SUPABASE_SERVICE_ROLE_KEY=eyJ... # server-only
```

Access in code:
```ts
process.env.NEXT_PUBLIC_SUPABASE_URL  // client-safe
process.env.SUPABASE_SERVICE_ROLE_KEY  // server-only, never import in 'use client' files
```

## Performance Checklist

Before shipping any page:
- [ ] No layout shift (images have width/height, skeletons match final size)
- [ ] No waterfall fetches (fetch in parallel with Promise.all where possible)
- [ ] Heavy components are dynamically imported
- [ ] Real-time subscriptions are cleaned up on unmount
- [ ] No memory leaks (setInterval/setTimeout cleared)
- [ ] Mobile viewport tested at 375px
- [ ] Dark mode verified (default)
- [ ] Safe area padding applied (`pb-safe`, `pt-safe`) for bottom nav and notch
