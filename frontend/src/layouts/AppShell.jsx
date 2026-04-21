import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'

function IconBase({ className, children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}
function SalesIcon({ className }) {
  return <IconBase className={className}><path d="M4 19h16" /><path d="M7 15l3-3 3 2 4-5" /><path d="M17 9h3v3" /></IconBase>
}
function ExpensesIcon({ className }) {
  return <IconBase className={className}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" /><path d="M8 15h3" /></IconBase>
}
function RawProductsIcon({ className }) {
  return <IconBase className={className}><path d="M12 3l7 4-7 4-7-4 7-4Z" /><path d="M5 7v6l7 4 7-4V7" /></IconBase>
}
function ProductsIcon({ className }) {
  return <IconBase className={className}><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></IconBase>
}
function CustomersIcon({ className }) {
  return <IconBase className={className}><path d="M16 19a4 4 0 0 0-8 0" /><circle cx="12" cy="11" r="3" /><path d="M19 19a3 3 0 0 0-2.4-2.93" /><path d="M7.4 16.07A3 3 0 0 0 5 19" /></IconBase>
}
function ReportsIcon({ className }) {
  return <IconBase className={className}><path d="M6 20V10" /><path d="M12 20V4" /><path d="M18 20v-7" /></IconBase>
}
function DashboardIcon({ className }) {
  return <IconBase className={className}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></IconBase>
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true, icon: DashboardIcon },
  { to: '/sales', label: 'Sales', disabled: true, icon: SalesIcon },
  { to: '/expenses', label: 'Expenses', disabled: true, icon: ExpensesIcon },
  { to: '/raw-products', label: 'Raw Products', icon: RawProductsIcon },
  { to: '/products', label: 'Products', icon: ProductsIcon },
  { to: '/customers', label: 'Customers', disabled: true, icon: CustomersIcon },
  { to: '/reports', label: 'Reports', disabled: true, icon: ReportsIcon },
]

function navClass({ isActive }) {
  return [
    'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]/60',
    isActive
      ? 'bg-[#8B6F47] text-white shadow-sm'
      : 'text-slate-700 hover:bg-white hover:text-[#8B6F47]',
  ].join(' ')
}

function SidebarNav({ onNavigate }) {
  return (
    <nav className="flex-1 space-y-1" aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return item.disabled ? (
          <span
            key={item.to}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 opacity-50 cursor-not-allowed select-none"
            title="Coming soon"
          >
            <Icon className="h-5 w-5 shrink-0 opacity-50" />
            <span className="truncate">{item.label}</span>
          </span>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={navClass}
          >
            <Icon className="h-5 w-5 shrink-0 text-current" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarContent({ onNavigate, onLogout, loggingOut, onClose }) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-white/70 bg-white/70 px-3 py-3 shadow-sm">
        <img src="/nuttiness-logo.png" alt="Nuttiness" className="h-10 w-10 shrink-0 rounded-xl object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-[#8B6F47]">Nuttiness</div>
          <div className="truncate text-xs text-[#8B6F47]/70">Sabor que Enloquece</div>
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} />

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:text-[#8B6F47]"
        >
          Close
        </button>
      )}

      <button
        type="button"
        onClick={onLogout}
        disabled={loggingOut}
        className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:text-[#8B6F47] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loggingOut ? 'Signing out...' : 'Logout'}
      </button>
    </div>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      navigate('/login')
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <div className="flex min-h-screen">
        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-stone-200 bg-[#f6efe1] px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white text-[#8B6F47] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6F47]/60"
            aria-label="Open navigation"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <img src="/nuttiness-logo.png" alt="Nuttiness" className="h-7 w-7 rounded-lg object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <span className="text-sm font-semibold text-[#8B6F47]">Nuttiness</span>
          {/* spacer to balance the hamburger */}
          <div className="h-10 w-10" aria-hidden />
        </header>

        {/* Mobile overlay backdrop */}
        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            aria-label="Close navigation"
          />
        )}

        {/* Mobile drawer sidebar */}
        <aside
          className={[
            'fixed inset-y-0 left-0 z-50 w-72 border-r border-stone-200 bg-[#f6efe1]',
            'transition-transform duration-200 lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <SidebarContent
            onNavigate={() => setMobileOpen(false)}
            onLogout={handleLogout}
            loggingOut={loggingOut}
            onClose={() => setMobileOpen(false)}
          />
        </aside>

        {/* Desktop persistent sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-stone-200 bg-[#f6efe1] lg:block">
          <SidebarContent
            onLogout={handleLogout}
            loggingOut={loggingOut}
          />
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pt-16 lg:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
