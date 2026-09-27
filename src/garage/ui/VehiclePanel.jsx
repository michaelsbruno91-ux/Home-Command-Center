// Right-hand dashboard for the active vehicle: specs, odometer, applied
// upgrades and the maintenance schedule.
import { useState } from 'react'
import { Check, ChevronRight, DoorOpen, Gauge, PanelRightClose, PanelRightOpen, Wrench } from 'lucide-react'
import { useGarageStore } from '../state/useGarageStore'
import { describeDue, serviceStatus } from '../state/maintenance'
import { vehicleById } from '../config/vehicles'
import { findVariant, REMOVED, STOCK } from '../config/partsCatalog'
import { btn, panel, STATUS_LABEL, STATUS_STYLE } from './styles'

export default function VehiclePanel() {
  const open = useGarageStore((s) => s.ui.panelOpen)
  const vehicle = vehicleById(useGarageStore((s) => s.activeVehicleId))
  const setUi = useGarageStore((s) => s.setUi)

  if (!open) {
    return (
      <button onClick={() => setUi({ panelOpen: true })}
        className={`${panel} absolute right-3 top-3 p-2 pointer-events-auto hover:bg-white/10`} aria-label="Open dashboard">
        <PanelRightOpen size={16} />
      </button>
    )
  }

  return (
    <aside className={`${panel} absolute right-3 top-3 bottom-3 w-[min(21rem,calc(100%-1.5rem))] flex flex-col pointer-events-auto overflow-hidden`}>
      <header className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-white/10">
        <div>
          <div className="text-[11px] font-mono text-muted">{vehicle.year} {vehicle.make}</div>
          <h2 className="text-base font-bold tracking-tight leading-tight">{vehicle.model} {vehicle.trim}</h2>
          <div className="flex gap-3 mt-1.5 text-[11px] text-slate-300">
            <Swatch color={vehicle.exterior.color} label={`${vehicle.exterior.name} exterior`} />
            <Swatch color={vehicle.interior.color} label={`${vehicle.interior.name} interior`} />
          </div>
        </div>
        <button onClick={() => setUi({ panelOpen: false })} className="p-1 rounded hover:bg-white/10 text-muted" aria-label="Close dashboard">
          <PanelRightClose size={16} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        <Specs vehicle={vehicle} />
        <Doors vehicle={vehicle} />
        <Mods vehicle={vehicle} />
        <Maintenance vehicle={vehicle} />
      </div>
    </aside>
  )
}

function Swatch({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: color }} />
      {label}
    </span>
  )
}

function Section({ icon: Icon, title, children, action }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-muted"><Icon size={12} />{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Sum the illustrative deltas of every non-stock part on this vehicle. */
function useModDeltas(vehicle) {
  const variants = useGarageStore((s) => s.partVariants[vehicle.id])
  let hp = 0, kg = 0
  for (const [partId, variantId] of Object.entries(variants ?? {})) {
    const v = findVariant(vehicle.parts[partId]?.slot, variantId)
    if (v) { hp += v.estHp ?? 0; kg += v.estKg ?? 0 }
  }
  return { hp, kg }
}

function Specs({ vehicle }) {
  const mileage = useGarageStore((s) => s.maintenance[vehicle.id]?.mileage ?? 0)
  const setMileage = useGarageStore((s) => s.setMileage)
  const { hp, kg } = useModDeltas(vehicle)
  const [draft, setDraft] = useState(null)
  const st = vehicle.stats
  const commit = () => {
    const n = Number(String(draft).replace(/[^\d]/g, ''))
    if (draft !== null && Number.isFinite(n) && n >= 0) setMileage(vehicle.id, n)
    setDraft(null)
  }
  const rows = [
    ['Engine', st.engine],
    ['Power', `${st.horsepower + hp} hp`, hp ? `+${hp} est.` : null],
    ['Torque', `${st.torqueLbFt} lb-ft`],
    ['Gearbox', st.transmission],
    ['Drive', st.drivetrain],
  ]
  if (kg) rows.push(['Weight Δ', `${kg} kg`, 'est.'])
  return (
    <Section icon={Gauge} title="Specs">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        {rows.map(([k, v, note]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-medium">{v}{note && <span className="ml-1 text-[10px] text-amber-300 font-mono">{note}</span>}</dd>
          </div>
        ))}
        <dt className="text-muted self-center">Odometer</dt>
        <dd className="text-right">
          <input
            inputMode="numeric"
            className="w-24 text-right bg-black/30 border border-white/10 rounded px-1.5 py-0.5 font-mono text-xs focus:outline-none focus:border-amber-400/60"
            value={draft ?? mileage.toLocaleString('en-US')}
            onFocus={() => setDraft(String(mileage))}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            aria-label="Odometer miles"
          /> <span className="text-muted">mi</span>
        </dd>
      </dl>
    </Section>
  )
}

function Doors({ vehicle }) {
  const openParts = useGarageStore((s) => s.openParts[vehicle.id])
  const setPartsOpen = useGarageStore((s) => s.setPartsOpen)
  const ids = Object.entries(vehicle.parts).filter(([, d]) => d.type === 'articulated').map(([id]) => id)
  const anyOpen = ids.some((id) => openParts?.[id])
  return (
    <Section icon={DoorOpen} title="Doors & panels"
      action={<button className={btn()} onClick={() => setPartsOpen(vehicle.id, ids, !anyOpen)}>{anyOpen ? 'Close all' : 'Open all'}</button>}>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <button key={id} onClick={() => { const s = useGarageStore.getState(); s.togglePart(vehicle.id, id); s.focusPart(vehicle.id, id) }}
            className={`px-2 py-1 rounded-md text-[11px] border transition-colors ${openParts?.[id] ? 'bg-amber-400/15 border-amber-400/50 text-amber-200' : 'border-white/10 text-slate-300 hover:bg-white/10'}`}>
            {vehicle.parts[id].label}
          </button>
        ))}
      </div>
    </Section>
  )
}

function Mods({ vehicle }) {
  const variants = useGarageStore((s) => s.partVariants[vehicle.id])
  const swappable = Object.entries(vehicle.parts).filter(([, d]) => d.type === 'swappable')
  return (
    <Section icon={Wrench} title="Modifications">
      <ul className="space-y-1">
        {swappable.map(([id, def]) => {
          const vid = variants?.[id] ?? STOCK
          const label = vid === STOCK ? 'Stock' : vid === REMOVED ? 'Removed' : findVariant(def.slot, vid)?.label ?? vid
          return (
            <li key={id}>
              <button className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 text-xs"
                onClick={() => { const s = useGarageStore.getState(); s.selectPart(vehicle.id, id); s.focusPart(vehicle.id, id) }}>
                <span className="text-muted">{def.label}</span>
                <span className={`flex items-center gap-1 ${vid === STOCK ? 'text-slate-300' : vid === REMOVED ? 'text-red-300' : 'text-amber-300'}`}>
                  {label}<ChevronRight size={12} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}

function Maintenance({ vehicle }) {
  const record = useGarageStore((s) => s.maintenance[vehicle.id])
  const completeService = useGarageStore((s) => s.completeService)
  if (!record) return null
  const now = new Date()
  const rows = record.services
    .map((svc) => ({ svc, st: serviceStatus(svc, record.mileage, now) }))
    .sort((a, b) => ['overdue', 'due-soon', 'ok'].indexOf(a.st.status) - ['overdue', 'due-soon', 'ok'].indexOf(b.st.status))
  return (
    <Section icon={Wrench} title="Maintenance">
      <ul className="space-y-1.5">
        {rows.map(({ svc, st }) => (
          <li key={svc.id} className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium truncate">{svc.label}</span>
                <span className={`px-1.5 py-px rounded text-[9px] font-mono uppercase ${STATUS_STYLE[st.status]}`}>{STATUS_LABEL[st.status]}</span>
              </div>
              <div className="text-[10px] font-mono text-muted mt-0.5">
                {describeDue(st)}
                {svc.intervalMiles ? ` · every ${svc.intervalMiles.toLocaleString('en-US')} mi` : ''}
                {svc.intervalMonths ? ` · ${svc.intervalMonths} mo` : ''}
              </div>
            </div>
            <button className="p-1.5 rounded-md border border-white/10 hover:bg-emerald-500/20 hover:border-emerald-400/40 text-muted hover:text-emerald-300"
              title={`Mark done at ${record.mileage.toLocaleString('en-US')} mi today`} onClick={() => completeService(vehicle.id, svc.id)}>
              <Check size={13} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10px] text-muted leading-snug">Mock schedule for illustration — confirm intervals in the owner's manual.</p>
    </Section>
  )
}
