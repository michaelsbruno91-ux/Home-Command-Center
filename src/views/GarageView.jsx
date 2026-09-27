// 3D garage: canvas + HTML overlay. Loaded lazily from App.jsx so three.js
// (~1 MB) is only downloaded when someone opens the Garage tab.
import GarageCanvas from '../garage/scene/GarageCanvas'
import GarageOverlay from '../garage/ui/GarageOverlay'

export default function GarageView() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: '#0b0d12', touchAction: 'none' }}>
      <GarageCanvas />
      <GarageOverlay />
    </div>
  )
}
