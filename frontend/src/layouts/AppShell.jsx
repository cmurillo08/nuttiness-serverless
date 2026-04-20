import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/products', label: 'Products' },
  { to: '/raw-products', label: 'Raw Products' },
  { to: '/expenses', label: 'Expenses', disabled: true },
  { to: '/sales', label: 'Sales', disabled: true },
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
      {NAV_ITEMS.map((item) =>
        item.disabled ? (
          <span
            key={item.to}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-400 opacity-50 cursor-not-allowed select-none"
            title="Coming soon"
          >
            {item.label}
          </span>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={navClass}
          >
            {item.label}
          </NavLink>
        )
      )}
    </nav>
  )
}

function SidebarContent({ onNavigate, onLogout, loggingOut, onClose }) {
  return (
    <div className="flex h-full flex-col px-3 py-4">
      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-white/70 bg-white/70 px-3 py-3 shadow-sm">
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
