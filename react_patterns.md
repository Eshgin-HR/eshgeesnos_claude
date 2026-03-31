# React Patterns — Advanced Reference

## Compound Components

Use when a component has multiple related sub-parts that share state.

```tsx
// Good for: tabs, accordion, select, modal with header/body/footer
const TabsContext = createContext<{ active: string; set: (v: string) => void } | null>(null)

function Tabs({ children, defaultValue }: { children: ReactNode; defaultValue: string }) {
  const [active, set] = useState(defaultValue)
  return <TabsContext.Provider value={{ active, set }}>{children}</TabsContext.Provider>
}

function Tab({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(TabsContext)!
  return (
    <button
      onClick={() => ctx.set(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-full border transition-colors duration-150',
        ctx.active === value
          ? 'bg-[#F5F5F5] text-[#0F0F0F] border-[#F5F5F5]'
          : 'bg-transparent text-[#888780] border-[#2A2A2A]'
      )}
    >
      {children}
    </button>
  )
}

Tabs.Tab = Tab
// Usage: <Tabs defaultValue="overview"><Tabs.Tab value="overview">Overview</Tabs.Tab></Tabs>
```

## Render Props / Function-as-Child

Use for sharing behavior without dictating UI.

```tsx
function WithInboxCount({ children }: { children: (count: number) => ReactNode }) {
  const { data } = useInbox()
  return <>{children(data.filter(i => !i.processed).length)}</>
}

// Usage:
<WithInboxCount>{(count) => count > 0 && <Badge>{count}</Badge>}</WithInboxCount>
```

## Context Architecture (EshgeenOS)

One context per domain. Never one giant app context.

```tsx
// contexts/UserContext.tsx
interface UserContextValue {
  user: User | null
  loading: boolean
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true })

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
```

## Controlled vs Uncontrolled

Prefer controlled components for forms. Use `react-hook-form` for complex forms.

```tsx
// Simple controlled input
function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-[#222222] border border-[#2A2A2A] rounded-lg px-3.5 py-2.5 text-sm text-[#F5F5F5] w-full focus:outline-none focus:border-[#378ADD]"
    />
  )
}
```

## Forwarded Refs

Use when a parent needs to access a child's DOM node.

```tsx
const Input = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('...base classes...', className)} {...props} />
))
Input.displayName = 'Input'
```

## Portal for Overlays

Bottom sheets and toasts should render at the document root.

```tsx
import { createPortal } from 'react-dom'

function BottomSheet({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">...</div>,
    document.body
  )
}
```

## Virtualization (long lists)

Use `@tanstack/react-virtual` for lists > 100 items.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function TransactionList({ items }: { items: Expense[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
  })

  return (
    <div ref={parentRef} className="overflow-auto h-full">
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map(vItem => (
          <div key={vItem.key} style={{ transform: `translateY(${vItem.start}px)` }}>
            <TransactionRow item={items[vItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

## Anti-Patterns to Avoid

```tsx
// BAD: derived state in useEffect
useEffect(() => {
  setFilteredTasks(tasks.filter(t => t.context === activeContext))
}, [tasks, activeContext])

// GOOD: derive inline
const filteredTasks = tasks.filter(t => t.context === activeContext)

// BAD: useEffect for event handler
useEffect(() => {
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [handleKeyDown]) // handleKeyDown recreated every render → infinite loop

// GOOD: stable handler with useCallback
const handleKeyDown = useCallback((e: KeyboardEvent) => {
  if (e.key === 'Escape') onClose()
}, [onClose])

// BAD: spreading props onto DOM elements
function Button({ isLoading, ...props }: ButtonProps) {
  return <button isLoading={isLoading} {...props} /> // isLoading is not a valid HTML attr
}

// GOOD: destructure non-DOM props
function Button({ isLoading, className, children, ...rest }: ButtonProps) {
  return <button className={cn('...', className)} disabled={isLoading} {...rest}>{children}</button>
}
```
