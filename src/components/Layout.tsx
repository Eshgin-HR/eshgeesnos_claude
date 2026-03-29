import { ReactNode, useState } from 'react'
import { Plus } from 'lucide-react'
import BottomTabBar from './BottomTabBar'
import QuickAddModal from './QuickAddModal'

export default function Layout({ children }: { children: ReactNode }) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0F0F0F' }}>
      {/* Top bar with + button */}
      <header
        className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 z-40"
        style={{ backgroundColor: '#0F0F0F', borderBottom: '0.5px solid #2A2A2A' }}
      >
        <span className="font-semibold" style={{ fontSize: '16px', color: '#F5F5F5', letterSpacing: '-0.02em' }}>
          EshgeenOS
        </span>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex items-center justify-center rounded-lg transition-all active:scale-95"
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#378ADD',
            borderRadius: '8px',
          }}
          aria-label="Quick add"
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '80px' }}>
        <div className="max-w-lg mx-auto px-5 py-5">
          {children}
        </div>
      </main>

      <BottomTabBar />

      {showQuickAdd && <QuickAddModal onClose={() => setShowQuickAdd(false)} />}
    </div>
  )
}
