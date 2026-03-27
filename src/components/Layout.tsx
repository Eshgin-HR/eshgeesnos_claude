import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import BottomTabBar from './BottomTabBar'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0A1628' }}>
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: '72px' }}>
        <div className="max-w-2xl mx-auto px-5 py-8 md:px-10 md:pb-8">
          {children}
        </div>
      </main>
      <div className="md:hidden">
        <BottomTabBar />
      </div>
    </div>
  )
}
