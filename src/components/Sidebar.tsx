import { NavLink } from 'react-router-dom'
import { Home, Sun, CheckSquare, Flame, Moon, BarChart2, Wallet, FileText, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/home',    icon: Home,       label: 'Home' },
  { to: '/today',   icon: Sun,        label: 'Today' },
  { to: '/tasks',   icon: CheckSquare,label: 'Tasks' },
  { to: '/streaks', icon: Flame,      label: 'Streaks' },
  { to: '/nightly', icon: Moon,       label: 'Nightly' },
  { to: '/weekly',  icon: BarChart2,  label: 'Weekly' },
  { to: '/budget',  icon: Wallet,     label: 'Budget' },
  { to: '/notes',   icon: FileText,   label: 'Notes' },
  { to: '/settings',icon: Settings,   label: 'Settings' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <div
      className="w-56 min-h-screen flex flex-col py-5 px-3"
      style={{ backgroundColor: '#191919', borderRight: '1px solid #2a2a2a' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: '#1D9E75', color: '#fff' }}
        >
          E
        </div>
        <span className="font-semibold text-sm" style={{ color: '#e8e8e8', letterSpacing: '-0.01em' }}>
          EshgeenOS
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-100 ${
                isActive ? 'font-medium' : 'font-normal hover:bg-[#2a2a2a]'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#2a2a2a' : 'transparent',
              color: isActive ? '#e8e8e8' : '#8a8a8a',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ color: isActive ? '#1D9E75' : '#8a8a8a', flexShrink: 0 }}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all hover:bg-[#2a2a2a] mt-2"
        style={{ color: '#555' }}
      >
        Sign out
      </button>
    </div>
  )
}
