// ─────────────────────────────────────────────────────────────────────────────
// CAMERA RIG — OrbitControls for free 360° orbit / zoom / pan, plus smooth
// "fly to" transitions when the store's `focus` changes.
//
// Transitions move the camera AND the orbit target together, so when the
// flight ends the user is orbiting around the thing they clicked. Any manual
// drag cancels an in-flight transition immediately — the user always wins.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGarageStore } from '../state/useGarageStore'
import { vehicleRegistry } from '../three/rig'
import { ROOM } from '../config/garagePresets'

// Front-corner three-quarter view: the room's diagonal is the longest
// throw available, which fits both cars without widening the lens.
export const OVERVIEW = {
  position: new THREE.Vector3(6.2, 3.5, 7.4),
  target: new THREE.Vector3(0.3, 0.5, -0.4),
}

// Width the docked dashboard covers (21rem + margin). See useFreeAreaCentering.
const PANEL_PX = 348
const PANEL_MIN_CANVAS_PX = 1024

const FLY_RATE = 3.2 // exponential approach rate; ~1s to settle
const MARGIN = 0.35 // keep the lens this far from walls, floor and ceiling

function clampToRoom(v) {
  v.x = THREE.MathUtils.clamp(v.x, -ROOM.width / 2 + MARGIN, ROOM.width / 2 - MARGIN)
  v.y = THREE.MathUtils.clamp(v.y, 0.25, ROOM.height - MARGIN)
  v.z = THREE.MathUtils.clamp(v.z, -ROOM.depth / 2 + MARGIN, ROOM.depth / 2 - MARGIN)
  return v
}

/** Turn a store focus intent into { position, target } in world space. */
function computeGoal(focus, camera) {
  if (focus.kind === 'overview') return { position: OVERVIEW.position.clone(), target: OVERVIEW.target.clone() }

  const rig = vehicleRegistry.get(focus.vehicleId)
  if (!rig) return null
  rig.root.updateWorldMatrix(true, true)
  const vBox = new THREE.Box3().setFromObject(rig.root)
  const vCenter = vBox.getCenter(new THREE.Vector3())
  const quat = rig.root.getWorldQuaternion(new THREE.Quaternion())
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)

  if (focus.kind === 'vehicle') {
    // Front three-quarter view from the side facing the middle of the garage.
    const toCentre = vCenter.x > 0 ? -1 : 1
    const dir = new THREE.Vector3(toCentre, 0.5, 1.25).normalize()
    const radius = vBox.getSize(new THREE.Vector3()).length() / 2
    const dist = (radius / Math.sin(halfFov)) * 0.78
    const target = vCenter.clone().setY(vCenter.y * 0.8)
    return { position: clampToRoom(target.clone().addScaledVector(dir, dist)), target }
  }

  // Part focus: frame the specific node that was clicked (e.g. one wheel of four).
  const part = rig.parts[focus.partId]
  if (!part) return null
  const subject = part.sockets?.[focus.nodeIndex]?.node ?? part.pivot ?? part.nodes[0]
  const pBox = new THREE.Box3().setFromObject(subject)
  const pCenter = pBox.getCenter(new THREE.Vector3())
  const pSize = pBox.getSize(new THREE.Vector3()).length()

  let dir
  if (part.def.camera?.dir) {
    dir = new THREE.Vector3(...part.def.camera.dir).applyQuaternion(quat)
  } else {
    // Look from outside the car, through the part, toward the car's centre.
    dir = pCenter.clone().sub(vCenter).setY(0)
    if (dir.lengthSq() < 1e-4) dir.set(0, 0, 1).applyQuaternion(quat)
    dir.normalize().setY(0.55)
  }
  dir.normalize()
  const dist = THREE.MathUtils.clamp(pSize * 1.5 + 1.1, 1.6, 4.5)
  return { position: clampToRoom(pCenter.clone().addScaledVector(dir, dist)), target: pCenter }
}

/**
 * When the dashboard is docked over the right of the canvas, shift the
 * projection centre left with setViewOffset so whatever the camera looks at
 * sits in the middle of the *visible* area, not behind the panel. Field of
 * view is unchanged; raycasting stays exact because R3F reads the same
 * projection matrix.
 */
function useFreeAreaCentering(camera, invalidate) {
  const size = useThree((s) => s.size)
  const panelOpen = useGarageStore((s) => s.ui.panelOpen)
  useEffect(() => {
    const p = panelOpen && size.width >= PANEL_MIN_CANVAS_PX ? PANEL_PX : 0
    if (p) {
      // A virtual canvas p px wider, of which we render the right-hand part.
      camera.aspect = (size.width + p) / size.height
      camera.setViewOffset(size.width + p, size.height, p, 0, size.width, size.height)
    } else {
      camera.aspect = size.width / size.height
      camera.clearViewOffset()
    }
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size, panelOpen, invalidate])
}

export default function CameraRig() {
  const controls = useRef()
  const goal = useRef(null)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const focus = useGarageStore((s) => s.focus)
  useFreeAreaCentering(camera, invalidate)

  useEffect(() => {
    controls.current?.target.copy(OVERVIEW.target)
    controls.current?.update()
  }, [])

  useEffect(() => {
    goal.current = computeGoal(focus, camera)
    // The pointer is about to be over something else; don't leave a stale tint.
    if (focus.nonce > 0) useGarageStore.getState().setHovered(null)
    invalidate()
  }, [focus, camera, invalidate])

  // ?garageDebug: expose the camera so framing can be tuned from the console,
  // e.g. copy garage.camera.position into a part's `camera.dir`.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('garageDebug')) return
    window.garage = { camera, controls: controls.current, goal, store: useGarageStore }
    return () => { delete window.garage }
  }, [camera])

  // Fly along an arc, not a straight line: the target glides linearly while
  // the camera's offset from it is interpolated in spherical coordinates
  // (distance, elevation, azimuth). Going from the nose to the tailpipes
  // therefore swings around the car instead of passing through it.
  const from = useRef(new THREE.Spherical())
  const to = useRef(new THREE.Spherical())
  const tmp = useRef(new THREE.Vector3())
  useFrame((_, delta) => {
    const c = controls.current
    const g = goal.current
    if (!g || !c) return
    const k = 1 - Math.exp(-FLY_RATE * Math.min(delta, 0.1))

    from.current.setFromVector3(tmp.current.subVectors(camera.position, c.target))
    to.current.setFromVector3(tmp.current.subVectors(g.position, g.target))
    const dTheta = THREE.MathUtils.euclideanModulo(to.current.theta - from.current.theta + Math.PI, Math.PI * 2) - Math.PI
    from.current.radius += (to.current.radius - from.current.radius) * k
    from.current.phi += (to.current.phi - from.current.phi) * k
    from.current.theta += dTheta * k

    c.target.lerp(g.target, k)
    camera.position.setFromSpherical(from.current).add(c.target)
    c.update()
    if (camera.position.distanceToSquared(g.position) < 1e-4 && c.target.distanceToSquared(g.target) < 1e-4) {
      camera.position.copy(g.position)
      c.target.copy(g.target)
      goal.current = null
    }
    invalidate()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={1.1}
      maxDistance={10}
      maxPolarAngle={Math.PI / 2 - 0.03} // never dip below the floor
      onStart={() => { goal.current = null }} // manual input cancels a fly-to
      onChange={() => clampToRoom(camera.position)}
    />
  )
}
