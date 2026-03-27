import { NavLink } from 'react-router-dom'
import { Home, Sun, CheckSquare, Flame, Moon, BarChart2, Wallet, FileText, Settings } from 'lucide-react'

const TABS = [
  { to: '/home',    icon: Home,        label: 'Home' },
  { to: '/today',   icon: Sun,         label: 'Today' },
  { to: '/tasks',   icon: CheckSquare, label: 'Tasks' },
  { to: '/budget',  icon: Wallet,      label: 'Budget' },
  { to: '/notes',   icon: FileText,    label: 'Notes' },
  { to: '/streaks', icon: Flame,       label: 'Streaks' },
  { to: '/nightly', icon: Moon,        label: 'Nightly' },
  { to: '/weekly',  icon: BarChart2,   label: 'Weekly' },
  { to: '/settings',icon: Settings,    label: 'More' },
]

export default function BottomTabBar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-around z-50"
      style={{
        backgroundColor: '#0d1f35',
        borderTop: '1px solid #1a2a40',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: '68px',
      }}
    >
      {TABS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1"
        >
          {({ isActive }) => (
            <>
              <div
                style={{
                  width: '36px', height: '28px',
                  backgroundColor: isActive ? '#1D9E7520' : 'transparent',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ color: isActive ? '#1D9E75' : '#4a5568' }}
                />
              </div>
              <span style={{
                fontSize: '9px',
                color: isActive ? '#1D9E75' : '#4a5568',
                fontWeight: isActive ? 600 : 400,
                lineHeight: 1,
              }}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}
