import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home, Inbox, CheckSquare, Calendar, Sun, FileText,
  Wallet, ClipboardList, RefreshCw, TrendingUp, Settings, X, Menu
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useInbox } from '../hooks/useInbox'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

const TOP_NAV = [
  { to: '/home',       icon: Home,          label: 'Home' },
  { to: '/inbox',      icon: Inbox,         label: 'Inbox', badge: true },
  { to: '/tasks',      icon: CheckSquare,   label: 'Tasks' },
  { to: '/calendar',   icon: Calendar,      label: 'Calendar' },
  { to: '/rituals',    icon: Sun,           label: 'Rituals' },
  { to: '/notes',      icon: FileText,      label: 'Notes' },
  { to: '/budget',     icon: Wallet,        label: 'Budget' },
  { to: '/weekly',     icon: ClipboardList, label: 'Weekly Review' },
  { to: '/reflection', icon: RefreshCw,     label: 'Sunday Reflection' },
  { to: '/progress',   icon: TrendingUp,    label: 'Progress' },
]

export default function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onCloseMobile }: SidebarProps) {
  const { count: inboxCount } = useInbox()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close mobile drawer on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (mobileOpen && overlayRef.current && e.target === overlayRef.current) {
        onCloseMobile()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileOpen, onCloseMobile])

  const handleNavClick = () => {
    if (window.innerWidth < 768) onCloseMobile()
  }

  const sidebarContent = (isMobile: boolean) => (
    <div
      className={cn(
        'flex flex-col h-full overflow-hidden transition-all duration-200',
        isMobile ? 'w-[260px]' : collapsed ? 'w-14' : 'w-[220px]'
      )}
      style={{ backgroundColor: '#111111', borderRight: '0.5px solid #2A2A2A' }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-14 flex-shrink-0 px-3',
        collapsed && !isMobile ? 'justify-center' : 'justify-between'
      )} style={{ borderBottom: '0.5px solid #2A2A2A' }}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold flex-shrink-0"
              style={{ backgroundColor: '#378ADD', color: '#fff' }}
            >
              E
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ color: '#F5F5F5' }}>
                EshgeenOS
              </div>
              <div className="text-[11px] truncate" style={{ color: '#888780' }}>Eshgeen</div>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-semibold"
            style={{ backgroundColor: '#378ADD', color: '#fff' }}
          >
            E
          </div>
        )}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg transition-colors hover:bg-[#1A1A1A]"
            aria-label="Close menu"
          >
            <X size={16} style={{ color: '#888780' }} />
          </button>
        )}
      </div>

      {/* Nav top */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {TOP_NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            title={collapsed && !isMobile ? label : undefined}
            className={({ isActive }) =>
              cn(
                'relative flex items-center gap-2.5 rounded-lg transition-colors duration-150 mb-0.5',
                collapsed && !isMobile ? 'h-10 w-10 justify-center mx-auto' : 'h-10 px-3',
                isActive
                  ? 'bg-[#1A2E45] text-[#378ADD] border-l-2 border-[#378ADD]'
                  : 'text-[#888780] hover:bg-[#1A1A1A]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="flex-shrink-0"
                  style={{ color: isActive ? '#378ADD' : '#888780' }}
                />
                {(!collapsed || isMobile) && (
                  <span className="text-[13px] truncate">{label}</span>
                )}
                {badge && inboxCount > 0 && (
                  <span
                    className={cn(
                      'flex items-center justify-center rounded-full text-[10px] font-medium flex-shrink-0',
                      collapsed && !isMobile
                        ? 'absolute -top-1 -right-1 w-4 h-4'
                        : 'ml-auto w-5 h-5'
                    )}
                    style={{ backgroundColor: '#E24B4A', color: '#fff' }}
                  >
                    {inboxCount > 99 ? '99+' : inboxCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 px-2 py-2" style={{ borderTop: '0.5px solid #2A2A2A' }}>
        <NavLink
          to="/settings"
          onClick={handleNavClick}
          title={collapsed && !isMobile ? 'Settings' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg transition-colors duration-150',
              collapsed && !isMobile ? 'h-10 w-10 justify-center mx-auto' : 'h-10 px-3',
              isActive
                ? 'bg-[#1A2E45] text-[#378ADD]'
                : 'text-[#888780] hover:bg-[#1A1A1A]'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ color: isActive ? '#378ADD' : '#888780' }}
              />
              {(!collapsed || isMobile) && (
                <span className="text-[13px]">Settings</span>
              )}
            </>
          )}
        </NavLink>
        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="flex items-center gap-2.5 rounded-lg transition-colors duration-150 hover:bg-[#1A1A1A] mt-1"
            style={{
              height: '32px',
              width: collapsed ? '40px' : '100%',
              margin: collapsed ? '4px auto 0' : '4px 0 0',
              justifyContent: collapsed ? 'center' : 'flex-start',
              paddingLeft: collapsed ? '0' : '12px',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu size={14} style={{ color: '#555550', flexShrink: 0 }} />
            {!collapsed && <span className="text-[11px]" style={{ color: '#555550' }}>Collapse</span>}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className="hidden md:flex fixed top-0 left-0 h-full z-30 flex-col"
        style={{ width: collapsed ? '56px' : '220px', transition: 'width 200ms ease' }}
      >
        {sidebarContent(false)}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-40 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
          <div
            className="absolute top-0 left-0 h-full"
            style={{ animation: 'slideInLeft 250ms ease' }}
          >
            {sidebarContent(true)}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
