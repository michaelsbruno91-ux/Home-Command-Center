import { useState } from 'react'
import { ChevronLeft, Plus, Edit2, Trash2, Check, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react'
import { calculateNextDue, calculateTaskStatus, sortTasks, formatDate } from '../utils/tasks'
import * as LucideIcons from 'lucide-react'

const CATEGORIES = ['Structural', 'Mechanical', 'Site', 'Safety', 'Interior']

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-400 text-black',
  MEDIUM: 'bg-amber-400 text-black',
  LOW: 'bg-slate-500 text-white',
}

const RATING_COLORS = {
  Satisfactory: 'bg-emerald-500 text-white',
  Fair: 'bg-amber-400 text-black',
  Poor: 'bg-red-500 text-white',
  'Not Inspected': 'bg-slate-500 text-white',
}

const STATUS_COLORS = {
  Overdue: 'bg-red-500 text-white',
  'Due Soon': 'bg-orange-400 text-black',
  'Up to Date': 'bg-emerald-500 text-white',
  Pending: 'bg-slate-500 text-white',
  Complete: 'bg-slate-600 text-slate-300',
}

const FREQUENCIES = ['Monthly', 'Quarterly', 'Semi-annual', 'Annual', 'Every 2 years', 'Every 3 years', 'As needed', 'One-time', 'Ongoing']
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const RATINGS = ['Satisfactory', 'Fair', 'Poor', 'Not Inspected']

function Badge({ label, cls }) {
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide ${cls}`}>{label}</span>
}

function SystemIcon({ name }) {
  const Icon = LucideIcons[name] ?? LucideIcons.Home
  return <Icon size={14} />
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors text-lg leading-none">&times;</button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-400/50'
const inputStyle = { background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }
const labelCls = 'block text-xs font-mono font-medium mb-1 text-muted'

function TaskForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial ?? {
    task: '', frequency: 'Annual', priority: 'MEDIUM', estimatedCost: '', notes: '',
    lastCompleted: '', nextDue: '', status: 'Pending',
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function save() {
    if (!form.task.trim()) return
    const nextDue = form.lastCompleted ? calculateNextDue(form.frequency, form.lastCompleted) : form.nextDue || null
    const status = calculateTaskStatus({ ...form, nextDue })
    onSave({ ...form, nextDue, status })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Task name *</label>
        <input className={inputCls} style={inputStyle} value={form.task} onChange={e => set('task', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Frequency</label>
          <select className={inputCls} style={inputStyle} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
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
          <label className={labelCls}>Last completed</label>
          <input type="date" className={inputCls} style={inputStyle} value={form.lastCompleted ?? ''} onChange={e => set('lastCompleted', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Next due (override)</label>
          <input type="date" className={inputCls} style={inputStyle} value={form.nextDue ?? ''} onChange={e => set('nextDue', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Estimated cost</label>
        <input className={inputCls} style={inputStyle} value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} />
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} className={inputCls} style={inputStyle} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>Cancel</button>
        <button onClick={save} className="flex-1 py-2 rounded-lg text-sm font-bold transition-colors"
          style={{ background: 'var(--color-accent)', color: '#000' }}>Save</button>
      </div>
    </div>
  )
}

function SystemDetail({ system, onUpdate, onBack }) {
  const [sortBy, setSortBy] = useState('priority')
  const [editTask, setEditTask] = useState(null)
  const [addingTask, setAddingTask] = useState(false)
  const [notesCollapsed, setNotesCollapsed] = useState(true)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(system.notes ?? '')

  function markComplete(task) {
    const today = new Date().toISOString().split('T')[0]
    const nextDue = calculateNextDue(task.frequency, today)
    const status = calculateTaskStatus({ ...task, lastCompleted: today, nextDue })
    updateTask({ ...task, lastCompleted: today, nextDue, status })
  }

  function updateTask(updated) {
    onUpdate({
      ...system,
      maintenanceTasks: system.maintenanceTasks.map(t => t.id === updated.id ? updated : t),
    })
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    onUpdate({ ...system, maintenanceTasks: system.maintenanceTasks.filter(t => t.id !== id) })
  }

  function addTask(form) {
    onUpdate({
      ...system,
      maintenanceTasks: [...system.maintenanceTasks, { ...form, id: crypto.randomUUID() }],
    })
    setAddingTask(false)
  }

  function saveEditTask(form) {
    updateTask(form)
    setEditTask(null)
  }

  function saveNotes() {
    onUpdate({ ...system, notes: notesValue })
    setEditingNotes(false)
  }

  const sorted = sortTasks(system.maintenanceTasks, sortBy)
  const inspNotes = system.inspectionNotes ?? ''
  const longNotes = inspNotes.length > 200

  return (
    <div className="flex flex-col h-full">
      {/* System header */}
      <div className="px-4 md:px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button onClick={onBack} className="md:hidden flex items-center gap-1 text-xs text-muted mb-3 hover:text-white transition-colors">
          <ChevronLeft size={14} /> Back
        </button>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <SystemIcon name={system.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>{system.name}</h2>
              <Badge label={system.inspectionRating} cls={RATING_COLORS[system.inspectionRating] ?? 'bg-slate-500 text-white'} />
            </div>
            <div className="text-xs font-mono mt-1" style={{ color: 'var(--color-muted)' }}>
              Inspected {formatDate(system.inspectionDate)}
            </div>
          </div>
        </div>

        {/* Inspection notes */}
        {inspNotes && (
          <div className="mt-3">
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {notesCollapsed && longNotes ? inspNotes.slice(0, 200) + '…' : inspNotes}
            </p>
            {longNotes && (
              <button onClick={() => setNotesCollapsed(v => !v)}
                className="text-xs font-mono mt-1 flex items-center gap-1 hover:text-white transition-colors"
                style={{ color: 'var(--color-accent)' }}>
                {notesCollapsed ? <><ChevronDown size={12} /> Show more</> : <><ChevronUp size={12} /> Show less</>}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
        {/* Sort + Add */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={12} style={{ color: 'var(--color-muted)' }} />
            <span className="text-xs text-muted">Sort:</span>
            {['priority', 'nextDue', 'status'].map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className="text-xs px-2 py-0.5 rounded font-mono capitalize transition-colors"
                style={sortBy === s
                  ? { background: 'rgba(251,191,36,0.15)', color: 'var(--color-accent)' }
                  : { color: 'var(--color-muted)' }}>
                {s === 'nextDue' ? 'Due Date' : s}
              </button>
            ))}
          </div>
          <button onClick={() => setAddingTask(true)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', color: 'var(--color-accent)' }}>
            <Plus size={12} /> Add Task
          </button>
        </div>

        {/* Task cards */}
        <div className="space-y-2">
          {sorted.map(task => (
            <div key={task.id} className="rounded-xl border p-3 card-hover"
              style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{task.task}</span>
                    <Badge label={task.priority} cls={PRIORITY_COLORS[task.priority] ?? 'bg-slate-500 text-white'} />
                    <Badge label={task.status} cls={STATUS_COLORS[task.status] ?? 'bg-slate-500 text-white'} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-mono flex-wrap"
                    style={{ color: 'var(--color-muted)' }}>
                    <span>{task.frequency}</span>
                    {task.lastCompleted && <span>Done: {formatDate(task.lastCompleted)}</span>}
                    {task.nextDue && <span>Due: {formatDate(task.nextDue)}</span>}
                    {task.estimatedCost && <span>{task.estimatedCost}</span>}
                  </div>
                  {task.notes && (
                    <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                      {task.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {task.status !== 'Complete' && (
                    <button onClick={() => markComplete(task)} title="Mark complete"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-emerald-500/20 text-emerald-400">
                      <Check size={13} />
                    </button>
                  )}
                  <button onClick={() => setEditTask(task)} title="Edit"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ color: 'var(--color-muted)' }}>
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteTask(task.id)} title="Delete"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20 text-red-400">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System notes */}
        <div className="mt-4 rounded-xl border p-3" style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--color-muted)' }}>SYSTEM NOTES</span>
            {!editingNotes
              ? <button onClick={() => setEditingNotes(true)} className="text-xs text-muted hover:text-white transition-colors"><Edit2 size={12} /></button>
              : <button onClick={saveNotes} className="text-xs font-mono px-2 py-0.5 rounded text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/10">Save</button>}
          </div>
          {editingNotes
            ? <textarea rows={3} value={notesValue} onChange={e => setNotesValue(e.target.value)}
                className="w-full text-xs rounded px-2 py-1.5 outline-none resize-none"
                style={{ background: '#0d1525', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            : <p className="text-xs leading-relaxed" style={{ color: notesValue ? 'var(--color-text)' : 'var(--color-muted)' }}>
                {notesValue || 'No notes — click edit to add.'}
              </p>}
        </div>
      </div>

      {editTask && (
        <Modal title="Edit Task" onClose={() => setEditTask(null)}>
          <TaskForm initial={editTask} onSave={saveEditTask} onClose={() => setEditTask(null)} />
        </Modal>
      )}
      {addingTask && (
        <Modal title="Add Task" onClose={() => setAddingTask(false)}>
          <TaskForm onSave={addTask} onClose={() => setAddingTask(false)} />
        </Modal>
      )}
    </div>
  )
}

export default function SystemsView({ data, updateData, highlightId }) {
  const [selectedId, setSelectedId] = useState(highlightId ?? null)
  const [mobileDrillIn, setMobileDrillIn] = useState(!!highlightId)

  const systems = data?.systems ?? []
  const selected = systems.find(s => s.id === selectedId)

  function handleSelect(id) {
    setSelectedId(id)
    setMobileDrillIn(true)
  }

  function handleUpdate(updated) {
    const updated_systems = systems.map(s => s.id === updated.id ? { ...updated, lastUpdated: new Date().toISOString() } : s)
    updateData({ systems: updated_systems })
  }

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = systems.filter(s => s.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="flex h-full">
      {/* Left pane — system list */}
      <div className={`${mobileDrillIn ? 'hidden md:flex' : 'flex'} md:flex flex-col w-full md:w-72 flex-shrink-0 border-r overflow-y-auto`}
        style={{ borderColor: 'var(--color-border)' }}>
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <div className="px-4 py-2 text-[10px] font-mono font-medium uppercase tracking-widest sticky top-0 z-10"
              style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
              {cat}
            </div>
            {items.map(s => {
              const taskCount = s.maintenanceTasks?.length ?? 0
              const overdue = s.maintenanceTasks?.filter(t => t.status === 'Overdue').length ?? 0
              const active = selectedId === s.id
              return (
                <button key={s.id} onClick={() => handleSelect(s.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-l-2"
                  style={active
                    ? { background: 'rgba(251,191,36,0.08)', borderLeftColor: 'var(--color-accent)' }
                    : { borderLeftColor: 'transparent' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: active ? 'var(--color-accent)' : 'var(--color-text)' }}>
                      {s.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge label={s.inspectionRating} cls={RATING_COLORS[s.inspectionRating] ?? 'bg-slate-500 text-white'} />
                      {overdue > 0 && <span className="text-[10px] font-mono text-red-400">{overdue} overdue</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Right pane — system detail */}
      <div className={`${mobileDrillIn ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 overflow-hidden`}>
        {selected ? (
          <SystemDetail
            key={selected.id}
            system={selected}
            onUpdate={handleUpdate}
            onBack={() => setMobileDrillIn(false)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--color-muted)' }}>
            <span className="text-sm">Select a system to view details</span>
          </div>
        )}
      </div>
    </div>
  )
}
