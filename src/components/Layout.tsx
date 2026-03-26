import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#191919' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '72px' }}>
        <div className="max-w-2xl mx-auto px-5 py-8 md:px-8 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  )
}
