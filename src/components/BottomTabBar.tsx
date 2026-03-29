import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Inbox, CheckSquare, Sun, MoreHorizontal, X, Wallet, FileText, BarChart2, Moon, CalendarDays, BookOpen, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MAIN_TABS = [
  { to: '/home', icon: Home, label: 'Home' },
  { to: '/inbox', icon: Inbox, label: 'Inbox' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/rituals', icon: Sun, label: 'Rituals' },
  { to: '#more', icon: MoreHorizontal, label: 'More' },
]

const MORE_ITEMS = [
  { to: '/context', icon: CheckSquare, label: 'Context Views', color: '#185FA5' },
  { to: '/budget', icon: Wallet, label: 'Budget', color: '#1D9E75' },
  { to: '/notes', icon: FileText, label: 'Notes', color: '#534AB7' },
  { to: '/weekly', icon: CalendarDays, label: 'Weekly Review', color: '#EF9F27' },
  { to: '/reflection', icon: BookOpen, label: 'Sunday Reflection', color: '#534AB7' },
  { to: '/streaks', icon: BarChart2, label: 'Reporting', color: '#378ADD' },
  { to: '/nightly', icon: Moon, label: 'Nightly Audit', color: '#7F77DD' },
  { to: '/settings', icon: Settings, label: 'Settings', color: '#555550' },
]

export default function BottomTabBar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMore, setShowMore] = useState(false)
  const [inboxCount, setInboxCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('inbox')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('processed', false)
      .then(({ count }) => setInboxCount(count ?? 0))
  }, [user, location.pathname])

  const isMoreActive = MORE_ITEMS.some(i => location.pathname.startsWith(i.to))

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 flex items-stretch z-50"
        style={{
          backgroundColor: '#111111',
          borderTop: '0.5px solid #2A2A2A',
          paddingBottom: 'env(safe-area-inset-bottom)',
          height: '60px',
        }}
      >
        {MAIN_TABS.map(({ to, icon: Icon, label }) => {
          if (to === '#more') {
            return (
              <button
                key="more"
                onClick={() => setShowMore(v => !v)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1"
              >
                <div
                  style={{
                    width: '32px', height: '24px',
                    backgroundColor: isMoreActive || showMore ? '#378ADD20' : 'transparent',
                    borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isMoreActive || showMore ? 2.5 : 1.5}
                    style={{ color: isMoreActive || showMore ? '#378ADD' : '#555550' }}
                  />
                </div>
                <span style={{
                  fontSize: '10px',
                  color: isMoreActive || showMore ? '#378ADD' : '#555550',
                  fontWeight: isMoreActive || showMore ? 600 : 400,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {label}
                </span>
              </button>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative"
              onClick={() => setShowMore(false)}
            >
              {({ isActive }) => (
                <>
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: '32px', height: '24px',
                        backgroundColor: isActive ? '#378ADD20' : 'transparent',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Icon
                        size={22}
                        strokeWidth={isActive ? 2.5 : 1.5}
                        style={{ color: isActive ? '#378ADD' : '#555550' }}
                      />
                    </div>
                    {/* Inbox badge */}
                    {to === '/inbox' && inboxCount > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '-4px',
                          width: '16px',
                          height: '16px',
                          backgroundColor: '#E24B4A',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        {inboxCount > 9 ? '9+' : inboxCount}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    color: isActive ? '#378ADD' : '#555550',
                    fontWeight: isActive ? 600 : 400,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* More drawer */}
      {showMore && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMore(false)}
          />
          <div
            className="fixed bottom-16 left-0 right-0 z-50 mx-4"
            style={{
              backgroundColor: '#1A1A1A',
              border: '0.5px solid #2A2A2A',
              borderRadius: '16px',
              padding: '8px',
              marginBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#888780', textTransform: 'uppercase', letterSpacing: '0.06em' }}>More</span>
              <button onClick={() => setShowMore(false)} style={{ color: '#555550' }}>
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {MORE_ITEMS.map(({ to, icon: Icon, label, color }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setShowMore(false) }}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: location.pathname.startsWith(to) ? color + '15' : 'transparent',
                  }}
                >
                  <Icon size={16} color={color} />
                  <span style={{ fontSize: '13px', color: '#F5F5F5', fontWeight: 400 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
