import { useState } from 'react'
import { AlertTriangle, Clock, TrendingUp, CheckCircle, Plus, Wrench, Users, ChevronRight } from 'lucide-react'
import HouseHealthGauge from '../components/HouseHealthGauge'
import { getAllTasks, daysFromToday, formatDate, PRIORITY_ORDER } from '../utils/tasks'
import { calculateNextDue } from '../utils/tasks'

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-400 text-black',
  MEDIUM: 'bg-amber-400 text-black',
  LOW: 'bg-slate-500 text-white',
}

const STATUS_COLORS = {
  Overdue: 'bg-red-500 text-white',
  'Due Soon': 'bg-orange-400 text-black',
  'Up to Date': 'bg-emerald-500 text-white',
  Pending: 'bg-slate-500 text-white',
  Complete: 'bg-slate-600 text-slate-300',
}

function Badge({ label, cls }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-4 border card-hover" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      <div className={`text-3xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-sm font-medium mt-1" style={{ color: 'var(--color-text)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard({ data, updateData, setView }) {
  const [fabOpen, setFabOpen] = useState(false)

  const tasks = getAllTasks(data)
  const today = new Date(); today.setHours(0,0,0,0)

  const overdue = tasks
    .filter(t => t.status === 'Overdue')
    .sort((a,b) => (PRIORITY_ORDER[a.priority]??9) - (PRIORITY_ORDER[b.priority]??9))

  const dueSoon = tasks
    .filter(t => t.status === 'Due Soon')
    .sort((a,b) => new Date(a.nextDue) - new Date(b.nextDue))

  const recentlyDone = tasks
    .filter(t => t.lastCompleted)
    .sort((a,b) => new Date(b.lastCompleted) - new Date(a.lastCompleted))
    .slice(0, 5)

  const critHigh = overdue.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH').length
  const inProgress = (data?.improvements ?? []).filter(i => i.status === 'In Progress').length
  const upToDate = tasks.filter(t => t.status === 'Up to Date' || t.status === 'Complete').length

  function markComplete(task) {
    const today = new Date().toISOString().split('T')[0]
    const nextDue = calculateNextDue(task.frequency, today)
    const newStatus = task.frequency === 'One-time' ? 'Complete'
      : (nextDue ? (new Date(nextDue) <= new Date(Date.now() + 30*86400000) ? 'Due Soon' : 'Up to Date') : 'Pending')

    const systems = (data?.systems ?? []).map(s => {
      if (s.id !== task.systemId) return s
      return {
        ...s,
        maintenanceTasks: s.maintenanceTasks.map(t =>
          t.id === task.id ? { ...t, lastCompleted: today, nextDue, status: newStatus } : t
        ),
      }
    })
    updateData({ systems })
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 relative">

      {/* Header row with gauge */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            11 Wilson Way
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Raritan Township, NJ 08551
          </p>
        </div>
        <div className="hidden md:block">
          <HouseHealthGauge data={data} />
        </div>
        <div className="md:hidden">
          <HouseHealthGauge data={data} compact />
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Critical/High Overdue" value={critHigh} color="text-red-400" sub="need attention now" />
        <StatCard label="Due in 30 Days" value={dueSoon.length} color="text-amber-400" sub="coming up" />
        <StatCard label="In Progress" value={inProgress} color="text-blue-400" sub="improvements" />
        <StatCard label="Up to Date" value={upToDate} color="text-emerald-400" sub="tasks complete" />
      </div>

      {/* Two-column content */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">

        {/* Overdue */}
        <div className="rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <AlertTriangle size={14} className="text-red-400" />
              Overdue
              <span className="text-xs font-mono text-red-400">{overdue.length}</span>
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {overdue.length === 0 && (
              <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
                Nothing overdue
              </div>
            )}
            {overdue.map(t => {
              const days = t.nextDue ? -daysFromToday(t.nextDue) : null
              return (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{t.task}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
                      <span>{t.systemName}</span>
                      {days !== null && <span className="font-mono text-red-400">{days}d overdue</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={t.priority} cls={PRIORITY_COLORS[t.priority] ?? 'bg-slate-500 text-white'} />
                    <button
                      onClick={() => markComplete(t)}
                      className="text-xs px-2 py-1 rounded font-mono transition-colors hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Due Soon */}
        <div className="rounded-2xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <Clock size={14} className="text-amber-400" />
              Due in 30 Days
              <span className="text-xs font-mono text-amber-400">{dueSoon.length}</span>
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {dueSoon.length === 0 && (
              <div className="px-4 py-6 text-sm text-center" style={{ color: 'var(--color-muted)' }}>
                Nothing coming up
              </div>
            )}
            {dueSoon.map(t => {
              const days = t.nextDue ? daysFromToday(t.nextDue) : null
              return (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{t.task}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2" style={{ color: 'var(--color-muted)' }}>
                      <span>{t.systemName}</span>
                      {days !== null && <span className="font-mono text-amber-400">in {days}d</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge label={t.priority} cls={PRIORITY_COLORS[t.priority] ?? 'bg-slate-500 text-white'} />
                    <button
                      onClick={() => markComplete(t)}
                      className="text-xs px-2 py-1 rounded font-mono transition-colors hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recently Completed */}
      {recentlyDone.length > 0 && (
        <div className="rounded-2xl border mb-6" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <CheckCircle size={14} className="text-emerald-400" />
              Recently Completed
            </h3>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {recentlyDone.map(t => (
              <div key={t.id} className="px-4 py-2.5 flex items-center gap-3">
                <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm" style={{ color: 'var(--color-text)' }}>{t.task}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-muted)' }}>{t.systemName}</span>
                </div>
                <span className="text-xs font-mono flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
                  {formatDate(t.lastCompleted)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 no-print">
        {fabOpen && (
          <div className="mb-3 flex flex-col gap-2 items-end">
            {[
              { label: 'Add Task', Icon: Wrench, action: () => { setView('systems'); setFabOpen(false) } },
              { label: 'Add Improvement', Icon: TrendingUp, action: () => { setView('improvements'); setFabOpen(false) } },
              { label: 'Add Contact', Icon: Users, action: () => { setView('contacts'); setFabOpen(false) } },
            ].map(({ label, Icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-lg transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setFabOpen(v => !v)}
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all"
          style={{ background: 'var(--color-accent)', color: '#000' }}
        >
          <Plus size={22} style={{ transform: fabOpen ? 'rotate(45deg)' : 'none', transition: '150ms' }} />
        </button>
      </div>
    </div>
  )
}
