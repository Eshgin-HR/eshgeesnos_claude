import { NavLink } from 'react-router-dom'
import { Home, Sun, CheckSquare, Flame, Moon, BarChart2, Wallet, FileText, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/home',    icon: Home,        label: 'Home' },
  { to: '/today',   icon: Sun,         label: 'Today' },
  { to: '/tasks',   icon: CheckSquare, label: 'Tasks' },
  { to: '/streaks', icon: Flame,       label: 'Streaks' },
  { to: '/nightly', icon: Moon,        label: 'Nightly' },
  { to: '/weekly',  icon: BarChart2,   label: 'Weekly' },
  { to: '/budget',  icon: Wallet,      label: 'Budget' },
  { to: '/notes',   icon: FileText,    label: 'Notes' },
  { to: '/settings',icon: Settings,    label: 'Settings' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <div
      className="w-52 min-h-screen flex flex-col py-5 px-3"
      style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e3e3e0' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: '#1D9E75', color: '#fff' }}
        >
          E
        </div>
        <span className="font-semibold text-sm" style={{ color: '#37352f', letterSpacing: '-0.01em' }}>
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
              `flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all duration-100 ${
                isActive ? 'font-medium' : 'hover:bg-[#f1f1ef]'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#f1f1ef' : 'transparent',
              color: isActive ? '#37352f' : '#787774',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={15}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={{ color: isActive ? '#1D9E75' : '#acacac', flexShrink: 0 }}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-md transition-all hover:bg-[#f1f1ef] mt-2"
        style={{ color: '#acacac' }}
      >
        Sign out
      </button>
    </div>
  )
}
