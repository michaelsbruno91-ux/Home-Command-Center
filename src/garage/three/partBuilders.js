// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL PART BUILDERS — wheels, exhaust and intake built from primitives.
//
// Contract, shared by every builder so a replacement always lands where the
// stock part was, on the placeholder car or on a purchased .glb:
//
//   build(params, size: THREE.Vector3, { side }) → THREE.Group
//     • centred on the origin, fitting inside `size` (the stock part's bbox)
//     • axes are vehicle-local: +Z forward, +Y up, +X driver side
//     • `side` is 'left' (x > 0) or 'right' — wheels face their spokes outward
//
// Replace any builder with a loaded .glb by setting `modelUrl` on the variant
// in config/partsCatalog.js; this file is only the no-assets fallback.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as M from './materials'

const mesh = (geometry, material, name) => {
  const m = new THREE.Mesh(geometry, material)
  if (name) m.name = name
  m.castShadow = true
  m.receiveShadow = true
  return m
}

// ── Wheels ───────────────────────────────────────────────────────────────────
/**
 * params: { finish, spokes, style: 'split'|'solid'|'mesh', caliper? }
 * size:   x = tyre width, y/z = overall diameter
 */
export function buildWheel(params, size, { side = 'left' } = {}) {
  const r = size.y / 2
  const w = size.x
  const rimR = r * 0.74
  const outer = new THREE.Group()

  // Build with the axle on +Y and the face at +Y, then roll it onto the X axis.
  const g = new THREE.Group()
  g.rotation.z = side === 'left' ? -Math.PI / 2 : Math.PI / 2
  outer.add(g)

  // Tyre: lathe a rounded sidewall profile around the axle.
  const profile = [
    [rimR * 0.99, -w / 2 + 0.012],
    [r - 0.04, -w / 2],
    [r - 0.01, -w / 2 + 0.025],
    [r, -w / 2 + 0.06],
    [r, w / 2 - 0.06],
    [r - 0.01, w / 2 - 0.025],
    [r - 0.04, w / 2],
    [rimR * 0.99, w / 2 - 0.012],
  ].map(([x, y]) => new THREE.Vector2(x, y))
  const tyreMat = M.tire()
  tyreMat.side = THREE.DoubleSide
  g.add(mesh(new THREE.LatheGeometry(profile, 64), tyreMat, 'tyre'))

  const rimMat = M.finish(params.finish)
  rimMat.side = THREE.DoubleSide
  // Barrel and lip.
  g.add(mesh(new THREE.CylinderGeometry(rimR, rimR, w * 0.9, 48, 1, true), rimMat, 'barrel'))
  const lip = mesh(new THREE.TorusGeometry(rimR, 0.009, 8, 64), rimMat, 'lip')
  lip.rotation.x = Math.PI / 2
  lip.position.y = w / 2 - 0.02
  g.add(lip)

  // Brake disc sits inboard of the spokes so it shows through them.
  const disc = mesh(new THREE.CylinderGeometry(rimR * 0.8, rimR * 0.8, 0.026, 48), M.brakeDisc(), 'disc')
  disc.position.y = -0.01
  g.add(disc)

  // Spokes, radiating from the hub on the outer face (concave: hub sits deeper).
  const faceY = w / 2 - 0.045
  const hub = mesh(new THREE.CylinderGeometry(rimR * 0.2, rimR * 0.24, 0.05, 32), rimMat, 'hub')
  hub.position.y = faceY - 0.015
  g.add(hub)
  const cap = mesh(new THREE.CylinderGeometry(rimR * 0.09, rimR * 0.09, 0.012, 24), M.chrome(), 'cap')
  cap.position.y = faceY + 0.012
  g.add(cap)

  const count = params.spokes ?? 5
  const style = params.style ?? 'solid'
  const spokeLen = rimR * 0.8
  const spokeW = style === 'mesh' ? 0.016 : style === 'split' ? 0.022 : 0.05
  const legs = style === 'split' ? [-0.09, 0.09] : [0]
  for (let i = 0; i < count; i++) {
    for (const off of legs) {
      const arm = new THREE.Group()
      arm.rotation.y = (i / count) * Math.PI * 2 + off
      const s = mesh(new THREE.BoxGeometry(spokeLen, 0.024, spokeW), rimMat, 'spoke')
      s.position.set(rimR * 0.18 + spokeLen / 2, faceY, 0)
      // Tilt so the rim edge sits proud of the hub: reads as concave.
      s.rotation.z = 0.08
      arm.add(s)
      g.add(arm)
    }
  }

  // Caliper stays upright (not part of the spinning assembly): top-rear of disc.
  const inboard = side === 'left' ? -1 : 1
  const caliper = mesh(new THREE.BoxGeometry(0.055, rimR * 0.34, rimR * 0.6), M.brakeCaliper(params.caliper), 'caliper')
  caliper.position.set(inboard * 0.03, rimR * 0.52, -rimR * 0.36)
  caliper.rotation.x = -0.6
  outer.add(caliper)

  return outer
}

// ── Exhaust ──────────────────────────────────────────────────────────────────
/**
 * params: { layout: 'center'|'even', count, finish, radiusScale }
 * size:   x = spread of the tips, z = depth incl. the rear muffler box
 * Tips point to -Z (out the back of the car).
 */
export function buildExhaust(params, size) {
  const g = new THREE.Group()
  const count = params.count ?? 2
  const tipR = Math.min(0.05, Math.max(0.03, size.y * 0.36)) * (params.radiusScale ?? 1)
  const tipLen = Math.min(0.16, size.z * 0.4)
  const tipZ = -size.z / 2 + tipLen / 2
  const spread = size.x

  // Tip x positions.
  let xs
  const edge = spread / 2 - tipR
  if (params.layout === 'center') {
    const pitch = tipR * 2.35
    xs = Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * pitch)
  } else if (count >= 4) {
    // Twin-exit cars get pairs at each corner.
    const perSide = Math.floor(count / 2)
    xs = []
    for (let i = 0; i < perSide; i++) xs.push(edge - i * tipR * 2.3, -(edge - i * tipR * 2.3))
  } else if (count === 1) {
    xs = [edge]
  } else {
    xs = Array.from({ length: count }, (_, i) => -edge + (2 * edge * i) / (count - 1))
  }

  const tipMat = M.finish(params.finish ?? 'chrome')
  tipMat.side = THREE.DoubleSide
  const sootMat = new THREE.MeshStandardMaterial({ name: 'soot', color: '#050505', roughness: 1 })
  for (const x of xs) {
    const tip = mesh(new THREE.CylinderGeometry(tipR * 0.92, tipR, tipLen, 32, 1, true), tipMat, 'tip')
    tip.rotation.x = Math.PI / 2
    tip.position.set(x, 0, tipZ)
    g.add(tip)
    const inner = mesh(new THREE.CircleGeometry(tipR * 0.96, 32), sootMat, 'tip-inner')
    inner.position.set(x, 0, tipZ + tipLen * 0.3)
    inner.rotation.y = Math.PI // face rearward
    g.add(inner)
  }

  // Muffler box ahead of the tips, tucked under the bumper.
  const boxDepth = size.z - tipLen + 0.02
  const muffler = mesh(
    new RoundedBoxGeometry(Math.max(0.25, spread * 0.8), size.y * 0.9, boxDepth, 3, 0.03),
    new THREE.MeshStandardMaterial({ name: 'muffler', color: '#3b3b3d', roughness: 0.6, metalness: 0.7 }),
    'muffler',
  )
  muffler.position.set(0, 0, size.z / 2 - boxDepth / 2)
  g.add(muffler)
  return g
}

// ── Intake ───────────────────────────────────────────────────────────────────
/**
 * params: { style: 'airbox'|'cone'|'carbon', accent }
 * size:   the engine-bay volume the stock intake occupied.
 */
export function buildIntake(params, size) {
  const g = new THREE.Group()
  const style = params.style ?? 'airbox'
  const pipeMat = new THREE.MeshStandardMaterial({ name: 'pipe', color: '#cfd3d8', roughness: 0.15, metalness: 1 })

  // Pipe runs from the filter (front) back toward the throttle body (inboard).
  const pipe = mesh(new THREE.CylinderGeometry(size.y * 0.24, size.y * 0.24, size.z * 0.7, 20), style === 'airbox' ? M.trim() : pipeMat, 'pipe')
  pipe.rotation.x = Math.PI / 2
  pipe.position.set(-size.x * 0.25, -size.y * 0.1, -size.z * 0.12)
  g.add(pipe)

  if (style === 'cone') {
    const filterMat = new THREE.MeshStandardMaterial({ name: 'filter', color: params.accent ?? '#d42b2b', roughness: 0.85 })
    const cone = mesh(new THREE.CylinderGeometry(size.y * 0.3, size.y * 0.48, size.z * 0.42, 24), filterMat, 'filter')
    cone.rotation.x = -Math.PI / 2
    cone.position.set(-size.x * 0.25, -size.y * 0.02, size.z * 0.28)
    g.add(cone)
    const clamp = mesh(new THREE.TorusGeometry(size.y * 0.3, 0.008, 8, 24), pipeMat, 'clamp')
    clamp.position.set(-size.x * 0.25, -size.y * 0.02, size.z * 0.07)
    g.add(clamp)
  } else {
    const carbon = style === 'carbon'
    const boxMat = carbon
      ? new THREE.MeshPhysicalMaterial({ name: 'carbon', color: '#15171a', roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })
      : M.trim()
    const box = mesh(new RoundedBoxGeometry(size.x * 0.9, size.y * 0.8, size.z * 0.55, 3, 0.02), boxMat, 'airbox')
    box.position.set(size.x * 0.03, -size.y * 0.05, size.z * 0.18)
    g.add(box)
    if (carbon) {
      const band = mesh(new THREE.BoxGeometry(size.x * 0.92, size.y * 0.1, size.z * 0.57), new THREE.MeshStandardMaterial({ name: 'accent', color: params.accent, roughness: 0.4 }), 'band')
      band.position.copy(box.position)
      band.position.y += size.y * 0.25
      g.add(band)
    }
  }
  return g
}

/** Builders keyed by the `slot` used in config/vehicles.js and the catalog. */
export const BUILDERS = { wheels: buildWheel, exhaust: buildExhaust, intake: buildIntake }
