// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE — mock service records plus the pure logic that turns them into
// alerts. No React, no Three, no Vite globals: `npm test` runs this in Node.
//
// Intervals are typical figures for illustration. The Integra uses Honda's
// Maintenance Minder and the Cayenne has its own schedule — check the owner's
// manual before trusting any of these numbers.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

/** Due-soon window: within 10% of the mileage interval (min 500 mi) or 30 days. */
const SOON_MILES_FRACTION = 0.1
const SOON_MILES_MIN = 500
const SOON_DAYS = 30

// Local-date helpers. Dates are stored as 'YYYY-MM-DD' strings so they persist
// cleanly and never shift across time zones.
export function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Adds months, clamping to month end (Jan 31 + 1 month → Feb 28/29, not Mar 3). */
export function addMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * Mock records, built relative to `now` so the demo alerts always fire:
 * the Cayenne's oil change is overdue and the Integra's tire rotation is due.
 */
export function createMaintenanceSeed(now = new Date()) {
  const ago = (months) => toISODate(addMonths(startOfDay(now), -months))
  return {
    integra: {
      mileage: 8420,
      services: [
        { id: 'oil', label: 'Oil Change', intervalMiles: 7500, intervalMonths: 12, lastMiles: 3150, lastDate: ago(5) },
        { id: 'tire-rotation', label: 'Tire Rotation', intervalMiles: 7500, intervalMonths: null, lastMiles: 700, lastDate: ago(11) },
        { id: 'engine-air-filter', label: 'Engine Air Filter', intervalMiles: 15000, intervalMonths: null, lastMiles: 0, lastDate: ago(11) },
        { id: 'brake-fluid', label: 'Brake Fluid', intervalMiles: null, intervalMonths: 36, lastMiles: 0, lastDate: ago(11) },
      ],
    },
    cayenne: {
      mileage: 96300,
      services: [
        { id: 'oil', label: 'Oil Change', intervalMiles: 10000, intervalMonths: 12, lastMiles: 85800, lastDate: ago(10) },
        { id: 'def', label: 'DEF (AdBlue) Refill', intervalMiles: 10000, intervalMonths: null, lastMiles: 87100, lastDate: ago(8) },
        { id: 'tire-rotation', label: 'Tire Rotation', intervalMiles: 7500, intervalMonths: null, lastMiles: 91000, lastDate: ago(6) },
        { id: 'brake-fluid', label: 'Brake Fluid', intervalMiles: null, intervalMonths: 24, lastMiles: 80200, lastDate: ago(20) },
      ],
    },
  }
}

/**
 * @returns {{ status: 'overdue'|'due-soon'|'ok', milesLeft: number|null,
 *            daysLeft: number|null, dueDate: string|null }}
 */
export function serviceStatus(service, mileage, now = new Date()) {
  const milesLeft = service.intervalMiles
    ? service.lastMiles + service.intervalMiles - mileage
    : null

  let daysLeft = null
  let dueDate = null
  if (service.intervalMonths && service.lastDate) {
    const due = addMonths(parseISODate(service.lastDate), service.intervalMonths)
    dueDate = toISODate(due)
    daysLeft = Math.round((due - startOfDay(now)) / DAY_MS)
  }

  const overdue = (milesLeft !== null && milesLeft <= 0) || (daysLeft !== null && daysLeft <= 0)
  const soonMiles = Math.max(SOON_MILES_MIN, (service.intervalMiles ?? 0) * SOON_MILES_FRACTION)
  const dueSoon = !overdue && (
    (milesLeft !== null && milesLeft <= soonMiles) ||
    (daysLeft !== null && daysLeft <= SOON_DAYS)
  )

  return { status: overdue ? 'overdue' : dueSoon ? 'due-soon' : 'ok', milesLeft, daysLeft, dueDate }
}

/** Human summary of the most pressing limit, e.g. "620 mi overdue", "in 12 days". */
export function describeDue({ status, milesLeft, daysLeft }) {
  const mi = (n) => `${Math.abs(n).toLocaleString('en-US')} mi`
  const days = (n) => `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'}`
  if (status === 'overdue') {
    if (milesLeft !== null && milesLeft <= 0) return `${mi(milesLeft)} overdue`
    return `${days(daysLeft)} overdue`
  }
  const parts = []
  if (milesLeft !== null) parts.push(`in ${mi(milesLeft)}`)
  if (daysLeft !== null) parts.push(`${milesLeft !== null ? 'or ' : 'in '}${days(daysLeft)}`)
  return parts.join(' ')
}

/**
 * Turn records into alert objects. The id includes the status so dismissing a
 * "due soon" alert doesn't also silence the later "overdue" one.
 * @param vehicles  [{ id, shortName }]
 */
export function deriveAlerts(vehicles, maintenance, now = new Date()) {
  const alerts = []
  for (const v of vehicles) {
    const rec = maintenance[v.id]
    if (!rec) continue
    for (const svc of rec.services) {
      const s = serviceStatus(svc, rec.mileage, now)
      if (s.status === 'ok') continue
      alerts.push({
        id: `${v.id}:${svc.id}:${s.status}`,
        vehicleId: v.id,
        serviceId: svc.id,
        status: s.status,
        message: s.status === 'overdue'
          ? `${svc.label} Due for ${v.shortName}`
          : `${svc.label} due soon for ${v.shortName}`,
        detail: describeDue(s),
      })
    }
  }
  const rank = { overdue: 0, 'due-soon': 1 }
  return alerts.sort((a, b) => rank[a.status] - rank[b.status])
}

export function markServiceDone(record, serviceId, now = new Date()) {
  return {
    ...record,
    services: record.services.map((s) =>
      s.id === serviceId ? { ...s, lastMiles: record.mileage, lastDate: toISODate(now) } : s),
  }
}

/**
 * Merge persisted records onto the current seed: keeps saved mileage and
 * service history, picks up services added to the seed since, and drops
 * services the seed no longer has.
 */
export function mergeMaintenance(seed, saved) {
  if (!saved) return seed
  const out = {}
  for (const [vehicleId, seedRec] of Object.entries(seed)) {
    const savedRec = saved[vehicleId]
    if (!savedRec) { out[vehicleId] = seedRec; continue }
    out[vehicleId] = {
      mileage: typeof savedRec.mileage === 'number' ? savedRec.mileage : seedRec.mileage,
      services: seedRec.services.map((s) => {
        const prev = savedRec.services?.find((p) => p.id === s.id)
        return prev ? { ...s, lastMiles: prev.lastMiles, lastDate: prev.lastDate } : s
      }),
    }
  }
  return out
}
