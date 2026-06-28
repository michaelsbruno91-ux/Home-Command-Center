import { useState, useEffect, useRef } from 'react'
import { Search, X, Wrench, TrendingUp, Users, Home } from 'lucide-react'

export default function GlobalSearch({ data, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const q = query.toLowerCase().trim()

  const results = q.length < 2 ? [] : [
    ...(data?.systems ?? [])
      .filter(s => s.name.toLowerCase().includes(q))
      .map(s => ({ type: 'system', label: s.name, sub: s.category, view: 'systems', id: s.id, Icon: Home })),
    ...(data?.systems ?? []).flatMap(s =>
      (s.maintenanceTasks ?? [])
        .filter(t => t.task.toLowerCase().includes(q))
        .map(t => ({ type: 'task', label: t.task, sub: s.name, view: 'systems', id: s.id, Icon: Wrench }))
    ),
    ...(data?.improvements ?? [])
      .filter(i => i.name.toLowerCase().includes(q))
      .map(i => ({ type: 'improvement', label: i.name, sub: i.category, view: 'improvements', id: i.id, Icon: TrendingUp })),
    ...(data?.contacts ?? [])
      .filter(c => c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q))
      .map(c => ({ type: 'contact', label: c.name, sub: c.company, view: 'contacts', id: c.id, Icon: Users })),
  ].slice(0, 20)

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const TYPE_LABELS = { system: 'Systems', task: 'Tasks', improvement: 'Improvements', contact: 'Contacts' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <Search size={18} className="text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search systems, tasks, improvements, contacts…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
            style={{ color: 'var(--color-text)' }}
          />
          <button onClick={onClose} className="text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {q.length < 2 && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Type at least 2 characters to search
            </div>
          )}
          {q.length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type}>
              <div className="px-4 py-2 text-xs font-mono font-medium text-muted uppercase tracking-wider"
                style={{ background: 'rgba(0,0,0,0.2)' }}>
                {TYPE_LABELS[type]}
              </div>
              {items.map((item, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                  onClick={() => onNavigate(item.view, item.id)}
                >
                  <item.Icon size={14} className="text-accent flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--color-text)' }}>{item.label}</div>
                    {item.sub && <div className="text-xs text-muted truncate">{item.sub}</div>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 py-2 border-t text-xs text-muted font-mono flex gap-4"
          style={{ borderColor: 'var(--color-border)' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
