import { NavLink } from 'react-router-dom'
import { Home, Sun, Flame, Moon, BarChart2, Wallet, FileText, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/today', icon: Sun, label: 'Today' },
  { to: '/streaks', icon: Flame, label: 'Streaks' },
  { to: '/nightly', icon: Moon, label: 'Nightly' },
  { to: '/weekly', icon: BarChart2, label: 'Weekly' },
  { to: '/budget', icon: Wallet, label: 'Budget' },
  { to: '/notes', icon: FileText, label: 'Notes' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { signOut } = useAuth()

  return (
    <div
      className="w-60 min-h-screen flex flex-col py-6 px-4"
      style={{ backgroundColor: '#0A1628', borderRight: '1px solid #1a2a40' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: '#1D9E75', color: '#0A1628' }}
        >
          E
        </div>
        <span className="font-bold text-white text-base">EshgeenOS</span>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200'
              }`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? '#0d1f35' : 'transparent',
              color: isActive ? '#1D9E75' : undefined,
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
                {isActive && (
                  <div
                    className="ml-auto w-1 h-1 rounded-full"
                    style={{ backgroundColor: '#1D9E75' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition-opacity hover:opacity-70 mt-4"
        style={{ color: '#6B7280' }}
      >
        Sign out
      </button>
    </div>
  )
}
