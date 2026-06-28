import { useState } from 'react'
import { Plus, Edit2, Trash2, LayoutGrid, Table, Link2, X } from 'lucide-react'

const STATUSES = ['Planned', 'In Progress', 'On Hold', 'Complete']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const FUNDING = ['Cash', 'HELOC', 'Financing', 'Closing Credit', 'Cash / NJ SREC-II Revenue', 'TBD']
const CATEGORIES = ['Safety', 'Structural', 'Site', 'Energy', 'Interior', 'Mechanical', 'Exterior']

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-400 text-black',
  MEDIUM: 'bg-amber-400 text-black',
  LOW: 'bg-slate-500 text-white',
}

const STATUS_COLORS = {
  Planned: 'bg-slate-600 text-slate-200',
  'In Progress': 'bg-blue-500 text-white',
  'On Hold': 'bg-slate-500 text-white',
  Complete: 'bg-emerald-500 text-white',
}

const FUNDING_COLORS = {
  Cash: 'bg-emerald-900/60 text-emerald-300',
  HELOC: 'bg-blue-900/60 text-blue-300',
  Financing: 'bg-purple-900/60 text-purple-300',
  TBD: 'bg-slate-700 text-slate-300',
}

function Badge({ label, cls }) {
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide ${cls}`}>{label}</span>
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400/50'
const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
const labelCls = 'block text-xs font-mono font-medium mb-1 text-muted'

function ImprovementForm({ initial, improvements, onSave, onClose, onDelete }) {
  const [form, setForm] = useState(initial ?? {
    name: '', description: '', category: 'Safety', priority: 'MEDIUM',
    status: 'Planned', estimatedCost: '', estimatedTimeline: '',
    fundingSource: 'Cash', prerequisiteIds: [], notes: '',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Name *</label>
        <input className={inputCls} style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Description</label>
        <textarea rows={2} className={inputCls} style={inputStyle} value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} style={inputStyle} value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Priority</label>
          <select className={inputCls} style={inputStyle} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} style={inputStyle} value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Funding Source</label>
          <select className={inputCls} style={inputStyle} value={form.fundingSource} onChange={e => set('fundingSource', e.target.value)}>
            {FUNDING.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Estimated Cost</label>
          <input className={inputCls} style={inputStyle} value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Timeline</label>
          <input className={inputCls} style={inputStyle} value={form.estimatedTimeline} onChange={e => set('estimatedTimeline', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} className={inputCls} style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        {onDelete && (
          <button onClick={onDelete}
            className="px-3 py-2 rounded-lg text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors">
            Delete
          </button>
        )}
        <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
        <button onClick={() => form.name.trim() && onSave(form)}
          className="flex-1 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'var(--color-accent)', color: '#000' }}>Save</button>
      </div>
    </div>
  )
}

function SlideOver({ improvement, improvements, onSave, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md h-full overflow-y-auto shadow-2xl"
        style={{ background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {improvement ? 'Edit Improvement' : 'Add Improvement'}
          </h3>
          <button onClick={onClose}><X size={16} className="text-muted hover:text-white transition-colors" /></button>
        </div>
        <div className="p-5">
          <ImprovementForm
            initial={improvement}
            improvements={improvements}
            onSave={onSave}
            onClose={onClose}
            onDelete={improvement ? onDelete : undefined}
          />
        </div>
      </div>
    </div>
  )
}

function KanbanCard({ imp, improvements, onClick }) {
  const prereqs = improvements.filter(i => imp.prerequisiteIds?.includes(i.id))
  return (
    <div onClick={onClick}
      className="rounded-xl border p-3 cursor-pointer card-hover"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium leading-tight" style={{ color: 'var(--color-text)' }}>{imp.name}</span>
        {prereqs.length > 0 && (
          <span title={`Requires: ${prereqs.map(p => p.name).join(', ')}`} className="flex-shrink-0">
            <Link2 size={12} className="text-muted" />
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge label={imp.priority} cls={PRIORITY_COLORS[imp.priority] ?? 'bg-slate-500 text-white'} />
        {imp.fundingSource && (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono ${FUNDING_COLORS[imp.fundingSource] ?? 'bg-slate-700 text-slate-300'}`}>
            {imp.fundingSource}
          </span>
        )}
      </div>
      {imp.estimatedCost && (
        <div className="text-xs font-mono mt-1.5" style={{ color: 'var(--color-muted)' }}>{imp.estimatedCost}</div>
      )}
      {imp.estimatedTimeline && (
        <div className="text-xs font-mono" style={{ color: 'var(--color-muted)' }}>{imp.estimatedTimeline}</div>
      )}
    </div>
  )
}

export default function ImprovementsView({ data, updateData, highlightId }) {
  const [viewMode, setViewMode] = useState('board')
  const [slideOver, setSlideOver] = useState(null) // null | 'add' | improvement object

  const improvements = data?.improvements ?? []

  function handleSave(form) {
    if (slideOver === 'add') {
      updateData({ improvements: [...improvements, { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() }] })
    } else {
      updateData({ improvements: improvements.map(i => i.id === slideOver.id ? { ...slideOver, ...form } : i) })
    }
    setSlideOver(null)
  }

  function handleDelete() {
    if (!confirm('Delete this improvement?')) return
    updateData({ improvements: improvements.filter(i => i.id !== slideOver.id) })
    setSlideOver(null)
  }

  const SORT_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${viewMode === 'board' ? 'text-accent bg-accent/10' : 'text-muted hover:bg-white/5'}`}>
            <LayoutGrid size={13} /> Board
          </button>
          <button onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${viewMode === 'table' ? 'text-accent bg-accent/10' : 'text-muted hover:bg-white/5'}`}>
            <Table size={13} /> Table
          </button>
        </div>
        <button onClick={() => setSlideOver('add')}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
          <Plus size={12} /> Add Improvement
        </button>
      </div>

      {/* Board view */}
      {viewMode === 'board' && (
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
          <div className="flex gap-4 min-w-max">
            {STATUSES.map(status => {
              const items = improvements
                .filter(i => i.status === status)
                .sort((a,b) => (SORT_ORDER[a.priority]??9) - (SORT_ORDER[b.priority]??9))
              return (
                <div key={status} className="w-64 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
                      {status}
                    </span>
                    <span className="text-xs font-mono px-1.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-muted)' }}>
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map(imp => (
                      <KanbanCard key={imp.id} imp={imp} improvements={improvements} onClick={() => setSlideOver(imp)} />
                    ))}
                    {items.length === 0 && (
                      <div className="rounded-xl border-2 border-dashed p-4 text-xs text-center"
                        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
                        None
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--color-border)' }}>
                {['Name', 'Priority', 'Status', 'Cost', 'Timeline', 'Funding'].map(h => (
                  <th key={h} className="pb-2 pr-4 text-xs font-mono font-medium" style={{ color: 'var(--color-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {improvements.map(imp => (
                <tr key={imp.id} onClick={() => setSlideOver(imp)}
                  className="cursor-pointer hover:bg-white/3 transition-colors">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>{imp.name}</div>
                    {imp.description && <div className="text-xs text-muted mt-0.5 truncate max-w-xs">{imp.description}</div>}
                  </td>
                  <td className="py-2.5 pr-4"><Badge label={imp.priority} cls={PRIORITY_COLORS[imp.priority] ?? 'bg-slate-500 text-white'} /></td>
                  <td className="py-2.5 pr-4"><Badge label={imp.status} cls={STATUS_COLORS[imp.status] ?? 'bg-slate-500 text-white'} /></td>
                  <td className="py-2.5 pr-4 text-xs font-mono text-muted">{imp.estimatedCost || '—'}</td>
                  <td className="py-2.5 pr-4 text-xs font-mono text-muted">{imp.estimatedTimeline || '—'}</td>
                  <td className="py-2.5 pr-4 text-xs font-mono text-muted">{imp.fundingSource || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {improvements.length === 0 && (
            <div className="text-center py-12 text-sm text-muted">No improvements yet — add one above.</div>
          )}
        </div>
      )}

      {slideOver && (
        <SlideOver
          improvement={slideOver === 'add' ? null : slideOver}
          improvements={improvements}
          onSave={handleSave}
          onClose={() => setSlideOver(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
