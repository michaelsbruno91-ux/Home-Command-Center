// Remove / Upgrade menu for the selected swappable part. Picking an option
// writes partVariants in the store; scene/Vehicle.jsx swaps the mesh.
import { RotateCcw, Trash2, X } from 'lucide-react'
import { useGarageStore } from '../state/useGarageStore'
import { vehicleById } from '../config/vehicles'
import { PARTS_CATALOG, REMOVED, STOCK } from '../config/partsCatalog'
import { btn, panel } from './styles'

export default function PartMenu() {
  const selected = useGarageStore((s) => s.selectedPart)
  const current = useGarageStore((s) => (selected ? s.partVariants[selected.vehicleId]?.[selected.partId] ?? STOCK : null))
  const { setVariant, clearSelection } = useGarageStore.getState()
  if (!selected) return null

  const vehicle = vehicleById(selected.vehicleId)
  const def = vehicle?.parts[selected.partId]
  if (!def) return null
  const options = [
    { id: STOCK, label: 'Factory stock', description: `${vehicle.make} original equipment.` },
    ...(PARTS_CATALOG[def.slot] ?? []),
  ]
  const set = (id) => setVariant(vehicle.id, selected.partId, id)

  return (
    <div className={`${panel} absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 lg:right-[22.75rem] sm:w-80 p-3 pointer-events-auto`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[10px] font-mono text-muted">{vehicle.make} {vehicle.model}</div>
          <h3 className="text-sm font-bold">{def.label}</h3>
        </div>
        <button onClick={clearSelection} className="p-1 rounded hover:bg-white/10 text-muted" aria-label="Close part menu"><X size={14} /></button>
      </div>

      <div role="radiogroup" aria-label={`${def.label} options`} className="space-y-1.5">
        {options.map((o) => {
          const active = current === o.id
          return (
            <button key={o.id} role="radio" aria-checked={active} onClick={() => set(o.id)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${active ? 'border-amber-400/70 bg-amber-400/10' : 'border-white/10 hover:bg-white/5'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${active ? 'text-amber-200' : ''}`}>{o.label}</span>
                {(o.estHp || o.estKg) ? (
                  <span className="text-[10px] font-mono text-muted">
                    {o.estHp ? `+${o.estHp} hp ` : ''}{o.estKg ? `${o.estKg} kg` : ''}
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-muted leading-snug">{o.description}</div>
            </button>
          )
        })}
      </div>

      <div className="flex justify-between items-center mt-3">
        {current === REMOVED ? (
          <button className={btn('primary')} onClick={() => set(STOCK)}><RotateCcw size={12} className="inline mr-1" />Reinstall stock</button>
        ) : (
          <button className={btn('danger')} onClick={() => set(REMOVED)}><Trash2 size={12} className="inline mr-1" />Remove part</button>
        )}
        <span className="text-[10px] text-muted">Gains are illustrative estimates</span>
      </div>
    </div>
  )
}
