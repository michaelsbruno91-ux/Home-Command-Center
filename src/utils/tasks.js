export const FREQ_DAYS = {
  'Monthly': 30,
  'Quarterly': 91,
  'Semi-annual': 182,
  'Annual': 365,
  'Every 2 years': 730,
  'Every 3 years': 1095,
}

export const PRIORITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export const STATUS_ORDER = { Overdue: 0, 'Due Soon': 1, Pending: 2, 'Up to Date': 3, Complete: 4 }

export function calculateNextDue(frequency, lastCompleted) {
  if (!lastCompleted || !frequency) return null
  const days = FREQ_DAYS[frequency]
  if (!days) return null
  const d = new Date(lastCompleted)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function calculateTaskStatus(task) {
  const { lastCompleted, nextDue, frequency } = task

  if (frequency === 'One-time') return lastCompleted ? 'Complete' : 'Pending'
  if (frequency === 'As needed' || frequency === 'Ongoing') return 'Pending'
  if (!lastCompleted) return 'Pending'
  if (!nextDue) return 'Pending'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(nextDue)
  const soon = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (due < today) return 'Overdue'
  if (due <= soon) return 'Due Soon'
  return 'Up to Date'
}

export function recalculateStatuses(systems) {
  return systems.map(sys => ({
    ...sys,
    maintenanceTasks: sys.maintenanceTasks.map(t => ({
      ...t,
      status: calculateTaskStatus(t),
    })),
  }))
}

export function sortTasks(tasks, by) {
  const arr = [...tasks]
  if (by === 'priority') arr.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9))
  else if (by === 'nextDue') arr.sort((a, b) => {
    if (!a.nextDue && !b.nextDue) return 0
    if (!a.nextDue) return 1
    if (!b.nextDue) return -1
    return new Date(a.nextDue) - new Date(b.nextDue)
  })
  else if (by === 'status') arr.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9))
  return arr
}

export function getAllTasks(data) {
  return (data?.systems ?? []).flatMap(s =>
    (s.maintenanceTasks ?? []).map(t => ({ ...t, systemName: s.name, systemId: s.id }))
  )
}

export function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function daysFromToday(iso) {
  if (!iso) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  return Math.round((d - today) / (24 * 60 * 60 * 1000))
}

export function healthPercentage(data) {
  const tasks = getAllTasks(data)
  if (!tasks.length) return 0
  const done = tasks.filter(t => t.status === 'Up to Date' || t.status === 'Complete').length
  return Math.round((done / tasks.length) * 100)
}
