import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0A1628' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-6 md:px-6">
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
