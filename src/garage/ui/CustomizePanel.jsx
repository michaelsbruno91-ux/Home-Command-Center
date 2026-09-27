// Garage customiser: floor finish, wall colour, lighting rigs, render quality.
import { Paintbrush, X } from 'lucide-react'
import { useGarageStore } from '../state/useGarageStore'
import { FLOORS, LIGHT_RIGS, NEON_COLORS, WALL_COLORS } from '../config/garagePresets'
import { panel } from './styles'

export default function CustomizePanel() {
  const open = useGarageStore((s) => s.ui.customizeOpen)
  const garage = useGarageStore((s) => s.garage)
  const { updateGarage, toggleLightRig, setUi } = useGarageStore.getState()

  if (!open) {
    return (
      <button onClick={() => setUi({ customizeOpen: true })}
        className={`${panel} absolute bottom-3 left-3 flex items-center gap-2 px-3 py-2 text-xs font-medium pointer-events-auto hover:bg-white/10`}>
        <Paintbrush size={14} className="text-amber-300" /> Customize garage
      </button>
    )
  }

  return (
    <div className={`${panel} absolute bottom-3 left-3 w-[min(19rem,calc(100%-1.5rem))] max-h-[70%] overflow-y-auto p-4 space-y-4 pointer-events-auto`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2"><Paintbrush size={14} className="text-amber-300" />Garage</h3>
        <button onClick={() => setUi({ customizeOpen: false })} className="p-1 rounded hover:bg-white/10 text-muted" aria-label="Close customiser"><X size={14} /></button>
      </div>

      <Group label="Flooring">
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(FLOORS).map(([id, f]) => (
            <Option key={id} active={garage.floor === id} onClick={() => updateGarage({ floor: id })}>
              <span className="w-4 h-4 rounded border border-white/20 shrink-0" style={{ background: FLOOR_PREVIEW[f.texture] }} />
              {f.label}
            </Option>
          ))}
        </div>
      </Group>

      <Group label="Walls">
        <div className="flex items-center gap-2 flex-wrap">
          {WALL_COLORS.map((w) => (
            <button key={w.id} title={w.label} aria-label={w.label} onClick={() => updateGarage({ wallColor: w.color })}
              className={`w-7 h-7 rounded-full border-2 transition-transform ${garage.wallColor === w.color ? 'border-amber-400 scale-110' : 'border-white/20 hover:scale-105'}`}
              style={{ background: w.color }} />
          ))}
          <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer" title="Custom colour">
            <input type="color" value={garage.wallColor} onChange={(e) => updateGarage({ wallColor: e.target.value })}
              className="w-7 h-7 rounded-full bg-transparent border border-white/20 cursor-pointer" />
            Custom
          </label>
        </div>
      </Group>

      <Group label="Lighting">
        <div className="space-y-1.5">
          {Object.entries(LIGHT_RIGS).map(([id, rig]) => (
            <label key={id} className="flex items-center justify-between gap-2 text-xs cursor-pointer">
              {rig.label}
              <Toggle on={garage.lights[id]} onChange={() => toggleLightRig(id)} />
            </label>
          ))}
        </div>
        {garage.lights.neon && (
          <div className="flex gap-2 mt-2">
            {NEON_COLORS.map((c) => (
              <button key={c.id} title={c.label} aria-label={`Neon ${c.label}`} onClick={() => updateGarage({ neonColor: c.color })}
                className={`w-6 h-6 rounded-full border-2 ${garage.neonColor === c.color ? 'border-white' : 'border-transparent'}`}
                style={{ background: c.color, boxShadow: `0 0 10px ${c.color}` }} />
            ))}
          </div>
        )}
        <label className="flex items-center gap-3 mt-3 text-[11px] text-muted">
          Brightness
          <input type="range" min={0.3} max={1.8} step={0.05} value={garage.brightness}
            onChange={(e) => updateGarage({ brightness: Number(e.target.value) })} className="flex-1 accent-amber-400" />
        </label>
      </Group>

      <Group label="Render quality">
        <div className="grid grid-cols-2 gap-1.5">
          <Option active={garage.quality === 'high'} onClick={() => updateGarage({ quality: 'high' })}>High</Option>
          <Option active={garage.quality === 'low'} onClick={() => updateGarage({ quality: 'low' })}>Battery saver</Option>
        </div>
        <p className="mt-1.5 text-[10px] text-muted leading-snug">High adds floor reflections, ambient occlusion and bloom.</p>
      </Group>
    </div>
  )
}

// CSS approximations of the procedural floor textures, for the buttons only.
const FLOOR_PREVIEW = {
  concrete: 'radial-gradient(circle at 30% 30%, #b3b0aa, #8f8c86)',
  flake: 'radial-gradient(#2b2d31 1px, transparent 1px) 0 0/4px 4px, #8a8f97',
  gloss: 'linear-gradient(135deg, #3a3b40, #151618)',
  checker: 'conic-gradient(#eee 25%, #151515 0 50%, #eee 0 75%, #151515 0) 0 0/8px 8px',
}

function Group({ label, children }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">{label}</div>
      {children}
    </div>
  )
}

function Option({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-[11px] text-left transition-colors ${active ? 'border-amber-400/70 bg-amber-400/10 text-amber-100' : 'border-white/10 hover:bg-white/5 text-slate-300'}`}>
      {children}
    </button>
  )
}

function Toggle({ on, onChange }) {
  return (
    <button role="switch" aria-checked={on} onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors ${on ? 'bg-amber-400' : 'bg-white/15'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  )
}
