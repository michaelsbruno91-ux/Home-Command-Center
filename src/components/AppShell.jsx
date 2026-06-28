import { LayoutDashboard, Wrench, TrendingUp, Package, Users, FileText, Settings, Search } from 'lucide-react'
import SyncIndicator from './SyncIndicator'

const NAV = [
  { id: 'dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { id: 'systems',      label: 'Systems',       Icon: Wrench          },
  { id: 'improvements', label: 'Improvements',  Icon: TrendingUp      },
  { id: 'products',     label: 'Products',      Icon: Package         },
  { id: 'contacts',     label: 'Contacts',      Icon: Users           },
  { id: 'documents',    label: 'Documents',     Icon: FileText        },
  { id: 'settings',     label: 'Settings',      Icon: Settings        },
]

const MOBILE_NAV = ['dashboard', 'systems', 'improvements', 'contacts', 'settings']

export default function AppShell({
  currentView, setView, children,
  syncStatus, lastSaved, syncError, forceSync,
  onSearchOpen,
}) {
  return (
    <div className="flex h-full" style={{ background: 'var(--color-bg)' }}>

      {/* Sidebar — desktop only */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0 w-60 h-full border-r no-print"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--color-accent)' }}>
            HOME COMMAND CENTER
          </div>
          <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
            11 Wilson Way
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => {
            const active = currentView === id
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors"
                style={active ? {
                  background: 'rgba(251,191,36,0.1)',
                  borderLeft: '4px solid var(--color-accent)',
                  color: 'var(--color-accent)',
                  paddingLeft: '12px',
                } : {
                  color: 'var(--color-muted)',
                  borderLeft: '4px solid transparent',
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Sync status in sidebar footer */}
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <SyncIndicator
            syncStatus={syncStatus}
            lastSaved={lastSaved}
            syncError={syncError}
            forceSync={forceSync}
          />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Top header bar */}
        <header
          className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 border-b no-print"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {/* Mobile: app name | Desktop: current view name */}
          <div>
            <h1 className="text-sm font-bold tracking-tight md:hidden" style={{ color: 'var(--color-accent)' }}>
              HCC
            </h1>
            <h1 className="hidden md:block text-base font-bold tracking-tight capitalize" style={{ color: 'var(--color-text)' }}>
              {NAV.find(n => n.id === currentView)?.label ?? ''}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Sync status — header (desktop hides sidebar one) */}
            <div className="hidden md:block">
              <SyncIndicator
                syncStatus={syncStatus}
                lastSaved={lastSaved}
                syncError={syncError}
                forceSync={forceSync}
              />
            </div>

            {/* Search button */}
            <button
              onClick={onSearchOpen}
              className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border)' }}
              title="Search (Ctrl+K)"
            >
              <Search size={13} />
              <span className="hidden sm:inline">⌘K</span>
            </button>
          </div>
        </header>

        {/* Mobile sync status */}
        <div
          className="md:hidden flex-shrink-0 flex items-center justify-end px-4 py-1 no-print"
          style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
          <SyncIndicator
            syncStatus={syncStatus}
            lastSaved={lastSaved}
            syncError={syncError}
            forceSync={forceSync}
          />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto view-enter">
          {children}
        </main>

        {/* Bottom tab bar — mobile only */}
        <nav
          className="md:hidden flex-shrink-0 flex justify-around border-t no-print"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          {NAV.filter(n => MOBILE_NAV.includes(n.id)).map(({ id, label, Icon }) => {
            const active = currentView === id
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className="flex flex-col items-center gap-0.5 py-2 px-3 flex-1 text-[10px] font-mono transition-colors"
                style={{ color: active ? 'var(--color-accent)' : 'var(--color-muted)' }}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
