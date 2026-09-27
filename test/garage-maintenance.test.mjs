// Node test of the garage maintenance logic (pure functions, no DOM/WebGL).
const m = await import('../src/garage/state/maintenance.js')

let failures = 0
function check(name, cond, extra) {
  if (cond) console.log(`  ok   ${name}`)
  else { failures++; console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ''}`) }
}

const NOW = new Date(2026, 8, 27) // 27 Sep 2026, local
const VEHICLES = [{ id: 'integra', shortName: 'Acura' }, { id: 'cayenne', shortName: 'Porsche' }]

console.log('dates')
check('addMonths clamps Jan 31 → Feb 28', m.toISODate(m.addMonths(new Date(2026, 0, 31), 1)) === '2026-02-28')
check('addMonths leap year Jan 31 → Feb 29', m.toISODate(m.addMonths(new Date(2028, 0, 31), 1)) === '2028-02-29')
check('addMonths negative crosses year', m.toISODate(m.addMonths(new Date(2026, 1, 15), -3)) === '2025-11-15')
check('ISO round-trip', m.toISODate(m.parseISODate('2026-03-09')) === '2026-03-09')

console.log('serviceStatus')
const oil = { intervalMiles: 10000, intervalMonths: 12, lastMiles: 50000, lastDate: '2026-01-01' }
check('ok when far from both limits', m.serviceStatus(oil, 52000, NOW).status === 'ok')
check('overdue on miles', m.serviceStatus(oil, 60000, NOW).status === 'overdue')
check('overdue on time alone', m.serviceStatus({ ...oil, lastDate: '2025-09-01' }, 51000, NOW).status === 'overdue')
check('due soon within 10% miles', m.serviceStatus(oil, 59100, NOW).status === 'due-soon')
check('due soon within 30 days', m.serviceStatus({ ...oil, lastDate: '2025-10-20' }, 51000, NOW).status === 'due-soon')
check('500 mi floor on small intervals', m.serviceStatus({ intervalMiles: 3000, lastMiles: 0 }, 2550, NOW).status === 'due-soon')
check('miles-only service ignores dates', m.serviceStatus({ intervalMiles: 7500, intervalMonths: null, lastMiles: 0, lastDate: '2000-01-01' }, 100, NOW).status === 'ok')
check('exactly at limit is overdue', m.serviceStatus(oil, 60000, NOW).milesLeft === 0)

console.log('describeDue')
check('overdue miles text', m.describeDue({ status: 'overdue', milesLeft: -1250, daysLeft: 40 }) === '1,250 mi overdue')
check('overdue days text', m.describeDue({ status: 'overdue', milesLeft: 300, daysLeft: -1 }) === '1 day overdue')
check('upcoming text', m.describeDue({ status: 'ok', milesLeft: 800, daysLeft: 12 }) === 'in 800 mi or 12 days')

console.log('seed alerts (the two the brief asks for)')
const seed = m.createMaintenanceSeed(NOW)
const alerts = m.deriveAlerts(VEHICLES, seed, NOW)
const msgs = alerts.map((a) => a.message)
check('Oil Change Due for Porsche', msgs.includes('Oil Change Due for Porsche'), msgs.join(' | '))
check('Tire Rotation Due for Acura', msgs.includes('Tire Rotation Due for Acura'), msgs.join(' | '))
check('overdue sorted before due-soon', alerts.findIndex((a) => a.status === 'due-soon') > alerts.findLastIndex((a) => a.status === 'overdue'))
check('alert id carries status', alerts.every((a) => a.id.endsWith(a.status)))

console.log('markServiceDone')
const done = m.markServiceDone(seed.cayenne, 'oil', NOW)
check('resets lastMiles to odometer', done.services.find((s) => s.id === 'oil').lastMiles === seed.cayenne.mileage)
check('stamps today', done.services.find((s) => s.id === 'oil').lastDate === '2026-09-27')
check('clears the Porsche oil alert', !m.deriveAlerts(VEHICLES, { ...seed, cayenne: done }, NOW).some((a) => a.message === 'Oil Change Due for Porsche'))
check('does not mutate input', seed.cayenne.services.find((s) => s.id === 'oil').lastMiles !== seed.cayenne.mileage)

console.log('mergeMaintenance')
const saved = { integra: { mileage: 9999, services: [{ id: 'oil', lastMiles: 9000, lastDate: '2026-09-01' }, { id: 'gone', lastMiles: 1, lastDate: '2020-01-01' }] } }
const merged = m.mergeMaintenance(seed, saved)
check('keeps saved mileage', merged.integra.mileage === 9999)
check('keeps saved history', merged.integra.services.find((s) => s.id === 'oil').lastMiles === 9000)
check('keeps seed labels/intervals', merged.integra.services.find((s) => s.id === 'oil').intervalMiles === 7500)
check('adds services new in seed', merged.integra.services.length === seed.integra.services.length)
check('drops services removed from seed', !merged.integra.services.some((s) => s.id === 'gone'))
check('vehicle missing from save uses seed', merged.cayenne === seed.cayenne)
check('null save returns seed', m.mergeMaintenance(seed, undefined) === seed)

if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1) }
console.log('\nall garage maintenance tests passed')
