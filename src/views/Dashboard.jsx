import { useState } from 'react'
import { AlertTriangle, Clock, TrendingUp, CheckCircle, Plus, Wrench, Users } from 'lucide-react'
import HouseHealthGauge from '../components/HouseHealthGauge'
import { getAllTasks, daysFromToday, formatDate, PRIORITY_ORDER } from '../utils/tasks'
import { calculateNextDue } from '../utils/tasks'

const PRIORITY_COLORS = {
  CRITICAL: 'bg-red-500 text-white',
  HIGH: 'bg-orange-400 text-black',
  MEDIUM: 'bg-amber-400 text-black',
  LOW: 'bg-slate-500 text-white',
}

function Badge({ label, cls }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function StatTile({ Icon, iconCls, label, count, items, emptyText, onViewAll, renderItem }) {
  const shown = items.slice(0, 5)
  return (
    <div className="rounded-2xl border flex flex-col"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <Icon size={14} className={iconCls} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            {label}
          </span>
        </div>
        <span className={`text-2xl font-mono font-bold ${iconCls}`}>{count}</span>
      </div>

      {/* Item list */}
      <div className="flex-1 divide-y overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
        {shown.length === 0 ? (
          <div className="px-4 py-5 text-xs text-center" style={{ color: 'var(--color-muted)' }}>
            {emptyText}
          </div>
        ) : (
          shown.map((item, i) => renderItem(item, i))
        )}
      </div>

      {/* View all footer */}
      {count > 5 && onViewAll && (
        <button
          onClick={onViewAll}
          className="flex-shrink-0 px-4 py-2.5 text-left text-xs font-mono border-t transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-accent)' }}
        >
          View all {count} →
        </button>
      )}
    </div>
  )
}

export default function Dashboard({ data, updateData, setView, navigateTo }) {
  const [fabOpen, setFabOpen] = useState(false)

  const tasks = getAllTasks(data)

  const overdue = tasks
    .filter(t => t.status === 'Overdue')
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))

  const dueSoon = tasks
    .filter(t => t.status === 'Due Soon')
    .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))

  const inProgressItems = (data?.improvements ?? [])
    .filter(i => i.status === 'In Progress')
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))

  const upToDateCount = tasks.filter(t => t.status === 'Up to Date' || t.status === 'Complete').length

  const recentlyDone = tasks
    .filter(t => t.lastCompleted)
    .sort((a, b) => new Date(b.lastCompleted) - new Date(a.lastCompleted))
    .slice(0, 5)

  function markComplete(task, e) {
    e.stopPropagation()
    const today = new Date().toISOString().split('T')[0]
    const nextDue = calculateNextDue(task.frequency, today)
    const newStatus = task.frequency === 'One-time' ? 'Complete'
      : (nextDue ? (new Date(nextDue) <= new Date(Date.now() + 30 * 86400000) ? 'Due Soon' : 'Up to Date') : 'Pending')
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

  /* ── Row renderers ── */

  function renderOverdueRow(t) {
    const days = t.nextDue ? -daysFromToday(t.nextDue) : null
    return (
      <div key={t.id} className="flex items-center gap-2 group">
        <button
          onClick={() => navigateTo('systems', t.systemId)}
          className="flex-1 min-w-0 px-3 py-2 text-left hover:bg-white/5 transition-colors"
        >
          <div className="text-xs font-medium truncate group-hover:text-accent transition-colors"
            style={{ color: 'var(--color-text)' }}>
            {t.task}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono truncate" style={{ color: 'var(--color-muted)' }}>{t.systemName}</span>
            {days !== null && (
              <span className="text-[11px] font-mono text-red-400 flex-shrink-0">{days}d overdue</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
          <Badge label={t.priority} cls={PRIORITY_COLORS[t.priority] ?? 'bg-slate-500 text-white'} />
          <button
            onClick={e => markComplete(t, e)}
            className="text-[11px] px-1.5 py-0.5 rounded font-mono transition-colors hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  function renderDueSoonRow(t) {
    const days = t.nextDue ? daysFromToday(t.nextDue) : null
    return (
      <div key={t.id} className="flex items-center gap-2 group">
        <button
          onClick={() => navigateTo('systems', t.systemId)}
          className="flex-1 min-w-0 px-3 py-2 text-left hover:bg-white/5 transition-colors"
        >
          <div className="text-xs font-medium truncate group-hover:text-accent transition-colors"
            style={{ color: 'var(--color-text)' }}>
            {t.task}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-mono truncate" style={{ color: 'var(--color-muted)' }}>{t.systemName}</span>
            {days !== null && (
              <span className="text-[11px] font-mono text-amber-400 flex-shrink-0">in {days}d</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
          <Badge label={t.priority} cls={PRIORITY_COLORS[t.priority] ?? 'bg-slate-500 text-white'} />
          <button
            onClick={e => markComplete(t, e)}
            className="text-[11px] px-1.5 py-0.5 rounded font-mono transition-colors hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  function renderImprovementRow(imp) {
    return (
      <button
        key={imp.id}
        onClick={() => navigateTo('improvements', imp.id)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors group"
      >
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate group-hover:text-accent transition-colors"
            style={{ color: 'var(--color-text)' }}>
            {imp.name}
          </div>
          {imp.estimatedTimeline && (
            <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>
              {imp.estimatedTimeline}
            </div>
          )}
        </div>
        <Badge label={imp.priority} cls={PRIORITY_COLORS[imp.priority] ?? 'bg-slate-500 text-white'} />
      </button>
    )
  }

  function renderRecentRow(t) {
    return (
      <button
        key={t.id}
        onClick={() => navigateTo('systems', t.systemId)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors group"
      >
        <CheckCircle size={11} className="text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate group-hover:text-accent transition-colors"
            style={{ color: 'var(--color-text)' }}>
            {t.task}
          </div>
          <div className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--color-muted)' }}>{t.systemName}</div>
        </div>
        <span className="text-[11px] font-mono flex-shrink-0" style={{ color: 'var(--color-muted)' }}>
          {formatDate(t.lastCompleted)}
        </span>
      </button>
    )
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 relative">

      {/* Property header + gauge */}
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

      {/* Four stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

        <StatTile
          Icon={AlertTriangle}
          iconCls="text-red-400"
          label="Overdue"
          count={overdue.length}
          items={overdue}
          emptyText="Nothing overdue"
          onViewAll={() => setView('systems')}
          renderItem={renderOverdueRow}
        />

        <StatTile
          Icon={Clock}
          iconCls="text-amber-400"
          label="Due in 30 Days"
          count={dueSoon.length}
          items={dueSoon}
          emptyText="Nothing coming up"
          onViewAll={() => setView('systems')}
          renderItem={renderDueSoonRow}
        />

        <StatTile
          Icon={TrendingUp}
          iconCls="text-blue-400"
          label="In Progress"
          count={inProgressItems.length}
          items={inProgressItems}
          emptyText="No active improvements"
          onViewAll={() => setView('improvements')}
          renderItem={renderImprovementRow}
        />

        <StatTile
          Icon={CheckCircle}
          iconCls="text-emerald-400"
          label="Up to Date"
          count={upToDateCount}
          items={recentlyDone}
          emptyText="No completed tasks yet"
          renderItem={renderRecentRow}
        />

      </div>

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
