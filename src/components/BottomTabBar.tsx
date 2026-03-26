import { NavLink } from 'react-router-dom'
import { Home, Sun, Flame, Moon, BarChart2, Wallet, FileText, Settings } from 'lucide-react'

const TABS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/streaks', icon: Flame, label: 'Streaks' },
  { to: '/nightly', icon: Moon, label: 'Nightly' },
  { to: '/weekly', icon: BarChart2, label: 'Weekly' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function BottomTabBar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-1 py-2 z-50"
      style={{ backgroundColor: '#0A1628', borderTop: '1px solid #1a2a40' }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-col items-center gap-0.5 flex-1 min-w-0"
          style={{ minHeight: '44px', justifyContent: 'center' }}
        >
          {({ isActive }) => (
            <div className="flex flex-col items-center gap-0.5" style={{ opacity: isActive ? 1 : 0.4 }}>
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                style={{ color: isActive ? '#1D9E75' : '#ffffff' }}
              />
              <span
                className="text-center"
                style={{
                  fontSize: '9px',
                  fontWeight: 500,
                  color: isActive ? '#1D9E75' : '#ffffff',
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
              {isActive && (
                <div
                  className="rounded-full"
                  style={{ width: '4px', height: '4px', backgroundColor: '#1D9E75' }}
                />
              )}
            </div>
          )}
        </NavLink>
      ))}
    </div>
  )
}
