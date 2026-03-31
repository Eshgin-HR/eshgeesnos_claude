import { ReactNode, useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Plus, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import AddTaskSheet from './AddTaskSheet'
import AddExpenseSheet from './AddExpenseSheet'
import AddNoteModal from './AddNoteModal'

// --- FAB Context (lets pages know when FAB fires) ---
interface FABContextValue {
  openAddTask: (prefillDate?: string) => void
  openAddExpense: () => void
  openAddNote: () => void
}
const FABContext = createContext<FABContextValue>({
  openAddTask: () => {},
  openAddExpense: () => {},
  openAddNote: () => {},
})
export const useFAB = () => useContext(FABContext)

// Page title mapping
const PAGE_TITLES: Record<string, string> = {
  '/home': 'Home',
  '/inbox': 'Inbox',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/rituals': 'Daily Rituals',
  '/nightly': 'Night Audit',
  '/notes': 'Notes',
  '/budget': 'Budget',
  '/weekly': 'Weekly Review',
  '/reflection': 'Sunday Reflection',
  '/progress': 'Progress',
  '/settings': 'Settings',
}

const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed'

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()

  // Sidebar state
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const w = window.innerWidth
    if (w < 768) return false
    if (w < 1024) return true
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return stored === 'true' ? true : false
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  // FAB modals
  const [fabOpen, setFabOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [addNoteOpen, setAddNoteOpen] = useState(false)
  const [prefillDate, setPrefillDate] = useState<string | undefined>()

  // Compute sidebar width CSS var
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const sidebarWidth = isMobile ? 0 : collapsed ? 56 : 220

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
  }, [sidebarWidth])

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }, [])

  // Close FAB when navigating
  useEffect(() => {
    setFabOpen(false)
    setMobileOpen(false)
  }, [location.pathname])

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'EshgeenOS'

  const openAddTask = useCallback((date?: string) => {
    setPrefillDate(date)
    setFabOpen(false)
    setAddTaskOpen(true)
  }, [])

  const openAddExpense = useCallback(() => {
    setFabOpen(false)
    setAddExpenseOpen(true)
  }, [])

  const openAddNote = useCallback(() => {
    setFabOpen(false)
    setAddNoteOpen(true)
  }, [])

  return (
    <FABContext.Provider value={{ openAddTask, openAddExpense, openAddNote }}>
      <div className="min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        {/* Sidebar */}
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={handleToggleCollapse}
          onCloseMobile={() => setMobileOpen(false)}
        />

        {/* Main area */}
        <div
          className="flex flex-col min-h-screen transition-all duration-200"
          style={{ marginLeft: 'var(--sidebar-width, 0px)' }}
        >
          {/* Page header */}
          <header
            className="flex items-center h-14 px-4 flex-shrink-0 sticky top-0 z-20"
            style={{ backgroundColor: '#0F0F0F', borderBottom: '0.5px solid #2A2A2A' }}
          >
            <button
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-[#1A1A1A] mr-3 flex-shrink-0"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setMobileOpen(v => !v)
                } else {
                  handleToggleCollapse()
                }
              }}
              aria-label="Toggle navigation"
            >
              <Menu size={18} style={{ color: '#888780' }} />
            </button>
            <h1 className="text-[16px] font-medium" style={{ color: '#F5F5F5' }}>
              {pageTitle}
            </h1>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-5 pb-24">
              {children}
            </div>
          </main>
        </div>

        {/* FAB button */}
        <button
          className="fixed rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 z-[100]"
          style={{
            bottom: '24px',
            right: '24px',
            width: '52px',
            height: '52px',
            backgroundColor: '#378ADD',
          }}
          onClick={() => setFabOpen(v => !v)}
          aria-label="Quick add"
        >
          <Plus
            size={22}
            color="#fff"
            strokeWidth={2.5}
            style={{ transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
          />
        </button>

        {/* FAB choice modal — centered */}
        {fabOpen && createPortal(
          <div
            className="fixed inset-0 z-[99] flex items-center justify-center px-6"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={() => setFabOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl px-4 py-5"
              style={{ backgroundColor: '#1A1A1A', border: '0.5px solid #2A2A2A' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-[13px] font-medium mb-3 uppercase tracking-wide" style={{ color: '#888780' }}>
                Quick Add
              </div>
              <div className="flex flex-col gap-2">
                {/* Add Task */}
                <button
                  className="flex items-center gap-3 p-4 rounded-xl transition-colors text-left active:scale-[0.98]"
                  style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A' }}
                  onClick={() => openAddTask()}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#1D9E7520', border: '0.5px solid #1D9E7540' }}>
                    <Plus size={18} color="#1D9E75" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Add Task</div>
                    <div className="text-[12px]" style={{ color: '#888780' }}>New action or next step</div>
                  </div>
                </button>

                {/* Add Expense */}
                <button
                  className="flex items-center gap-3 p-4 rounded-xl transition-colors text-left active:scale-[0.98]"
                  style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A' }}
                  onClick={() => openAddExpense()}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#378ADD20', border: '0.5px solid #378ADD40' }}>
                    <Plus size={18} color="#378ADD" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Add Expense</div>
                    <div className="text-[12px]" style={{ color: '#888780' }}>Log a payment or purchase</div>
                  </div>
                </button>

                {/* Add Note */}
                <button
                  className="flex items-center gap-3 p-4 rounded-xl transition-colors text-left active:scale-[0.98]"
                  style={{ backgroundColor: '#222222', border: '0.5px solid #2A2A2A' }}
                  onClick={() => openAddNote()}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#EF9F2720', border: '0.5px solid #EF9F2740' }}>
                    <Plus size={18} color="#EF9F27" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium" style={{ color: '#F5F5F5' }}>Add Note</div>
                    <div className="text-[12px]" style={{ color: '#888780' }}>Quick capture an idea or thought</div>
                  </div>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modals */}
        {addTaskOpen && (
          <AddTaskSheet
            prefillDate={prefillDate}
            onClose={() => { setAddTaskOpen(false); setPrefillDate(undefined) }}
          />
        )}
        {addExpenseOpen && (
          <AddExpenseSheet onClose={() => setAddExpenseOpen(false)} />
        )}
        {addNoteOpen && (
          <AddNoteModal onClose={() => setAddNoteOpen(false)} />
        )}
      </div>
    </FABContext.Provider>
  )
}
