// ─────────────────────────────────────────────────────────────────────────────
// GARAGE OVERLAY — the 2D HTML layer over the canvas.
//
// The wrapper is `pointer-events: none` so drags fall through to OrbitControls;
// each panel opts back in with `pointer-events-auto`. All state comes from the
// store — the overlay never touches Three.js.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { Crosshair, Home, Layers } from 'lucide-react'
import { useGarageStore } from '../state/useGarageStore'
import { deriveAlerts } from '../state/maintenance'
import { VEHICLES } from '../config/vehicles'
import VehiclePanel from './VehiclePanel'
import PartMenu from './PartMenu'
import CustomizePanel from './CustomizePanel'
import AlertStack from './AlertStack'
import { chip, panel } from './styles'

/** Alerts recomputed only when records change (and once per mount for date rollover). */
export function useAlerts() {
  const maintenance = useGarageStore((s) => s.maintenance)
  return useMemo(() => deriveAlerts(VEHICLES, maintenance, new Date()), [maintenance])
}

export default function GarageOverlay() {
  const alerts = useAlerts()
  const activeVehicleId = useGarageStore((s) => s.activeVehicleId)
  const focus = useGarageStore((s) => s.focus)
  const modelErrors = useGarageStore((s) => s.modelErrors)
  const { focusVehicle, focusOverview, clearSelection } = useGarageStore.getState()

  // Esc backs out one level: part menu → overview.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      const s = useGarageStore.getState()
      if (s.selectedPart) s.clearSelection()
      else s.focusOverview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      <HoverTip />
      <LoadingBar />

      {/* Left column: vehicle switcher, then maintenance alerts. */}
      <div className="absolute top-3 left-3 flex flex-col gap-2 w-[min(27rem,calc(100%-4.5rem))]">
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          <button className={chip(focus.kind === 'overview')} onClick={() => { clearSelection(); focusOverview() }} title="Overview (Esc)">
            <Home size={13} /> Garage
          </button>
          {VEHICLES.map((v) => {
            const count = alerts.filter((a) => a.vehicleId === v.id).length
            const active = activeVehicleId === v.id && focus.kind !== 'overview'
            return (
              <button key={v.id} className={chip(active)} onClick={() => focusVehicle(v.id)}>
                <span className="inline-block w-2.5 h-2.5 rounded-full border border-white/30" style={{ background: v.exterior.color }} />
                {v.make} {v.model}
                {count > 0 && (
                  <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] leading-4 text-center font-mono">{count}</span>
                )}
              </button>
            )
          })}
        </div>

        <AlertStack alerts={alerts} />

        {Object.entries(modelErrors).map(([id, msg]) => (
          <div key={id} className={`${panel} px-3 py-2 text-[11px] text-amber-300 pointer-events-auto`}>
            Couldn't load the {id} model — showing the placeholder. <span className="text-muted">{msg}</span>
          </div>
        ))}
      </div>

      <VehiclePanel />
      <PartMenu />
      <CustomizePanel />

      {/* Bottom-centre hint, hidden on narrow screens where panels take the space. */}
      <div className="hidden lg:flex absolute bottom-3 left-1/2 -translate-x-1/2 items-center gap-3 text-[11px] font-mono text-white/55">
        <span className="flex items-center gap-1"><Crosshair size={12} /> Click a part</span>
        <span>Drag: orbit</span>
        <span>Right-drag: pan</span>
        <span>Scroll: zoom</span>
        <span className="flex items-center gap-1"><Layers size={12} /> Esc: back</span>
      </div>
    </div>
  )
}

/** Label that trails the cursor. Positioned via ref, so moving never re-renders React. */
function HoverTip() {
  const hovered = useGarageStore((s) => s.hovered)
  const ref = useRef(null)
  useEffect(() => {
    const move = (e) => {
      if (ref.current) ref.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  const vehicle = VEHICLES.find((v) => v.id === hovered?.vehicleId)
  const def = vehicle?.parts[hovered?.partId]
  const hint = !def ? 'Click to focus' : def.type === 'articulated' ? 'Click to open / close' : 'Click to upgrade'
  return (
    <div ref={ref} className="fixed top-0 left-0 z-50 pointer-events-none" style={{ opacity: hovered ? 1 : 0, transition: 'opacity 120ms' }}>
      {hovered && (
        <div className={`${panel} px-2.5 py-1.5`}>
          <div className="text-xs font-semibold text-white">{hovered.label}</div>
          <div className="text-[10px] font-mono text-muted">{hint}</div>
        </div>
      )}
    </div>
  )
}

function LoadingBar() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10">
      <div className="h-full bg-amber-400 transition-[width]" style={{ width: `${progress}%` }} />
    </div>
  )
}
