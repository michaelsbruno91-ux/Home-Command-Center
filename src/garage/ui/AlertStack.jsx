// Maintenance alert toasts, under the vehicle switcher. Alerts are derived from the mock
// records (state/maintenance.js); dismissing one hides it for this session.
import { AlertTriangle, Clock, X } from 'lucide-react'
import { useGarageStore } from '../state/useGarageStore'
import { panel } from './styles'

const MAX_VISIBLE = 3

export default function AlertStack({ alerts }) {
  const dismissed = useGarageStore((s) => s.dismissedAlerts)
  const { dismissAlert, focusVehicle, setUi } = useGarageStore.getState()
  const visible = alerts.filter((a) => !dismissed[a.id])
  if (!visible.length) return null

  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {visible.slice(0, MAX_VISIBLE).map((a) => {
        const overdue = a.status === 'overdue'
        const Icon = overdue ? AlertTriangle : Clock
        return (
          <div key={a.id} role="alert"
            className={`${panel} flex items-center gap-3 pl-3 pr-2 py-2 border-l-4 ${overdue ? 'border-l-red-500' : 'border-l-orange-400'} animate-[fadeIn_250ms_ease]`}>
            <Icon size={16} className={overdue ? 'text-red-400 shrink-0' : 'text-orange-300 shrink-0'} />
            <button className="flex-1 min-w-0 text-left" onClick={() => { focusVehicle(a.vehicleId); setUi({ panelOpen: true }) }}>
              <div className="text-xs font-semibold truncate">{a.message}</div>
              <div className="text-[10px] font-mono text-muted">{a.detail}</div>
            </button>
            <button onClick={() => dismissAlert(a.id)} className="p-1 rounded hover:bg-white/10 text-muted" aria-label="Dismiss alert">
              <X size={14} />
            </button>
          </div>
        )
      })}
      {visible.length > MAX_VISIBLE && (
        <div className="text-center text-[10px] font-mono text-muted">+{visible.length - MAX_VISIBLE} more in the vehicle dashboards</div>
      )}
    </div>
  )
}
