// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER CAR — a procedural stand-in so the garage works before any .glb
// is purchased. It is deliberately built like an imported model would be: a
// plain Object3D tree with NAMED nodes ('door_fl', 'hood', 'wheel_rr', …).
// three/rig.js doesn't know or care that this isn't a real model.
//
// Silhouettes come from 2D side profiles extruded across the car's width, so
// the liftback and the SUV read differently with the same code.
// Real models replace this entirely — see config/vehicles.js.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as M from './materials'
import { buildExhaust, buildIntake, buildWheel } from './partBuilders'

const BEVEL = 0.03

function mesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material)
  if (name) m.name = name
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function node(name, ...children) {
  const g = new THREE.Group()
  g.name = name
  children.forEach((c) => g.add(c))
  return g
}

/**
 * Extrude a side-profile Shape (x = car length axis, y = height) across `width`.
 * Returns geometry centred on x = 0 with length along +Z (front) — vehicle axes.
 */
function extrudeProfile(shape, width, bevel = BEVEL) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, width - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 28,
  })
  geo.rotateY(-Math.PI / 2) // shape x → world z, extrusion → world -x
  geo.translate((width - bevel * 2) / 2, 0, 0)
  geo.computeVertexNormals()
  return geo
}

function polygon(points) {
  const s = new THREE.Shape()
  points.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)))
  s.closePath()
  return s
}

/**
 * A panel of thickness `t` hanging below/inside the line p1 → p2 (p1 nearer the
 * front of the car). Used for hood, hatch glass, deck lids and tailgates.
 */
function slab([z1, y1], [z2, y2], t) {
  const dz = z2 - z1, dy = y2 - y1
  const len = Math.hypot(dz, dy)
  const nz = -dy / len * t, ny = dz / len * t // left-hand normal → points inward
  return polygon([[z1, y1], [z2, y2], [z2 + nz, y2 + ny], [z1 + nz, y1 + ny]])
}

/**
 * @param config  a VEHICLES entry (uses placeholder dims, colours and stock parts)
 * @returns THREE.Group whose children are named part nodes
 */
export function buildPlaceholderCar(config) {
  const spec = config.placeholder
  const suv = spec.bodyStyle === 'suv'
  const { length: L, width: W, height: H, wheelbase: WB, clearance: C } = spec
  const R = spec.wheelRadius
  const half = L / 2

  const paintMat = M.paint(config.exterior.color)
  const glassMat = M.glass()
  const interiorMat = M.interior(config.interior.color)
  const trimMat = M.trim()

  // Key heights and stations (metres).
  const fAxle = WB / 2 + 0.04
  const rAxle = -WB / 2 + 0.04
  const archR = R + 0.065
  const yb = C + 0.02 // sill underside
  const hoodY = H * (suv ? 0.63 : 0.64) // hood surface at the windshield
  const hoodFrontY = hoodY - (suv ? 0.08 : 0.15)
  const beltY = hoodY + (suv ? 0.03 : 0.05)
  const bay = 0.17 // engine-bay depth under the hood
  const zHoodFront = half - (suv ? 0.2 : 0.26)
  const zWs = fAxle - (suv ? 0.55 : 0.72) // windshield base (cowl)
  const zWsTop = zWs - (suv ? 0.75 : 0.98) // windshield top (rake)
  const zRoofRear = suv ? -half + 0.3 : rAxle + 0.05
  const gw = W * (suv ? 0.86 : 0.8) // greenhouse width

  // Top of the engine-bay floor at station z (the floor follows the hood's slope).
  const bayFloorAt = (z) => {
    const t = (zHoodFront - z) / (zHoodFront - zWs)
    return hoodFrontY - bay + t * (hoodY - hoodFrontY) + BEVEL
  }

  const root = node('placeholder')

  // ── Lower body: side profile with wheel arches ────────────────────────────
  const s = new THREE.Shape()
  s.moveTo(-half + 0.04, C + 0.2)
  s.lineTo(-half + 0.26, yb)
  for (const axle of [rAxle, fAxle]) {
    s.lineTo(axle - archR, yb)
    s.lineTo(axle - archR, R)
    s.absarc(axle, R, archR, Math.PI, 0, true) // over the top of the wheel
    s.lineTo(axle + archR, yb)
  }
  s.lineTo(half - 0.22, yb + 0.02)
  s.quadraticCurveTo(half, yb + 0.04, half, yb + 0.26)
  s.quadraticCurveTo(half - 0.02, hoodFrontY - bay + 0.02, half - (suv ? 0.12 : 0.2), hoodFrontY - bay + 0.05)
  s.lineTo(zHoodFront, hoodFrontY - bay)
  s.lineTo(zWs, hoodY - bay)
  s.lineTo(zWs, beltY)
  if (suv) {
    s.lineTo(-half + 0.12, beltY)
    s.lineTo(-half + 0.1, beltY - 0.36)
    s.lineTo(-half, beltY - 0.42)
  } else {
    s.lineTo(-half + 0.1, beltY)
    s.lineTo(-half + 0.02, beltY - 0.07)
    s.lineTo(-half, beltY - 0.3)
  }
  s.closePath()
  const body = node('body')
  body.add(mesh(extrudeProfile(s, W), paintMat, 'shell'))

  // Greenhouse (all glass), with a painted roof skin on top.
  const gh = polygon([
    [zWs, beltY], [zWsTop, H - 0.03], [zWsTop - 0.15, H],
    [zRoofRear + 0.1, H], [zRoofRear, H - 0.03], [zRoofRear, beltY],
  ])
  body.add(mesh(extrudeProfile(gh, gw, 0.04), glassMat, 'greenhouse'))
  const roof = mesh(extrudeProfile(slab([zWsTop - 0.1, H + 0.012], [zRoofRear + 0.08, H + 0.012], 0.03), gw + 0.03, 0.012), paintMat, 'roof')
  body.add(roof)

  // Pillars: without them the glass volume reads as a convertible.
  const zB = zWs - (suv ? 1.0 : 1.02) // B-pillar station
  const pillars = [
    slab([zWs - 0.02, beltY], [zWsTop - 0.02, H - 0.02], 0.07), // A
    polygon([[zB + 0.05, beltY], [zB + 0.05, H - 0.01], [zB - 0.05, H - 0.01], [zB - 0.05, beltY]]), // B
    polygon([[zRoofRear + (suv ? 0.12 : 0.22), H - 0.01], [zRoofRear + (suv ? 0.12 : 0.3), beltY], [zRoofRear - 0.02, beltY], [zRoofRear - 0.02, H - 0.01]]), // C/D
  ]
  for (const shape of pillars) {
    for (const sgn of [1, -1]) {
      const p = mesh(extrudeProfile(shape, 0.03, 0.008), trimMat, 'pillar')
      p.position.x = sgn * (gw / 2 + 0.006)
      body.add(p)
    }
  }

  // Fenders wall in the engine bay so the gap under the hood is hidden.
  for (const sgn of [1, -1]) {
    const f = mesh(extrudeProfile(polygon([
      [zHoodFront + 0.05, hoodFrontY - bay], [zHoodFront + 0.05, hoodFrontY],
      [zWs, hoodY], [zWs, hoodY - bay],
    ]), 0.13, 0.015), paintMat, 'fender')
    f.position.x = sgn * (W / 2 - 0.075)
    body.add(f)
  }

  // Engine block in the bay (non-interactive, part of 'body').
  const engine = mesh(new RoundedBoxGeometry(W * 0.36, 0.085, 0.55, 3, 0.02),
    new THREE.MeshStandardMaterial({ name: 'engine', color: '#2a2c30', roughness: 0.5, metalness: 0.6 }), 'engine')
  engine.position.set(-W * 0.12, bayFloorAt(zWs + 0.55) + 0.043, zWs + 0.55)
  body.add(engine)

  // Lamps, grille, mirrors, sills.
  const lampY = hoodFrontY - bay + 0.06
  for (const sgn of [1, -1]) {
    const head = mesh(new RoundedBoxGeometry(0.34, 0.07, 0.12, 2, 0.02), M.lamp('#eaf2ff', 2.5), 'headlight')
    head.position.set(sgn * (W / 2 - 0.26), lampY, zHoodFront + (suv ? 0.12 : 0.15))
    head.rotation.y = sgn * 0.25
    body.add(head)

    const tail = mesh(new RoundedBoxGeometry(suv ? 0.3 : 0.42, 0.06, 0.06, 2, 0.015), M.lamp('#ff1a1a', 2), 'taillight')
    tail.position.set(sgn * (W / 2 - (suv ? 0.2 : 0.28)), beltY - (suv ? 0.12 : 0.06), -half + (suv ? 0.1 : 0.04))
    body.add(tail)

    const mirror = mesh(new RoundedBoxGeometry(0.16, 0.1, 0.1, 2, 0.03), paintMat, 'mirror')
    mirror.position.set(sgn * (W / 2 + 0.07), beltY + 0.1, zWs - 0.12)
    body.add(mirror)

    const sill = mesh(new THREE.BoxGeometry(0.04, 0.08, fAxle - rAxle - archR * 2 - 0.04), trimMat, 'sill')
    sill.position.set(sgn * (W / 2 + 0.005), yb + 0.05, (fAxle + rAxle) / 2)
    body.add(sill)
  }
  const grille = mesh(new RoundedBoxGeometry(W * 0.46, 0.2, 0.06, 2, 0.02), trimMat, 'grille')
  grille.position.set(0, yb + 0.26, half - 0.03)
  body.add(grille)

  // Interior visible through the glass: dash, wheel, seats.
  const dash = mesh(new THREE.BoxGeometry(gw - 0.1, 0.14, 0.3), interiorMat, 'dash')
  dash.position.set(0, beltY + 0.06, zWs - 0.18)
  body.add(dash)
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.02, 10, 32), interiorMat, 'steering-wheel')
  wheel.position.set(0.37, beltY + 0.13, zWs - 0.42)
  wheel.rotation.x = -0.35
  body.add(wheel)
  for (const [x, z] of [[0.37, zB + 0.3], [-0.37, zB + 0.3], [0.37, zB - 0.55], [-0.37, zB - 0.55]]) {
    const back = mesh(new RoundedBoxGeometry(0.48, 0.62, 0.14, 3, 0.05), interiorMat, 'seat')
    back.position.set(x, beltY + 0.12, z)
    back.rotation.x = -0.2
    body.add(back)
  }
  root.add(body)

  // ── Doors (outer skins) + dark openings revealed when they swing out ──────
  const doorBottom = yb + 0.08
  const doorTop = beltY + BEVEL - 0.01
  const doorH = doorTop - doorBottom
  const ranges = {
    f: [zB, zWs - 0.02],
    r: [rAxle + archR + 0.02, zB - 0.015],
  }
  for (const [row, [z0, z1]] of Object.entries(ranges)) {
    for (const [sideKey, sgn] of [['l', 1], ['r', -1]]) {
      const len = z1 - z0
      const zc = (z0 + z1) / 2

      const opening = mesh(new THREE.BoxGeometry(0.01, doorH - 0.03, len - 0.03), interiorMat, 'door-opening')
      opening.position.set(sgn * (W / 2 + 0.002), doorBottom + doorH / 2, zc)
      body.add(opening)

      const skin = mesh(new RoundedBoxGeometry(0.04, doorH, len, 3, 0.012), paintMat, 'skin')
      const handle = mesh(new RoundedBoxGeometry(0.025, 0.028, 0.15, 2, 0.01), M.chrome(), 'handle')
      handle.position.set(sgn * 0.028, doorH / 2 - 0.1, -len / 2 + 0.16)
      const door = node(`door_${row}${sideKey}`, skin, handle)
      door.position.set(sgn * (W / 2 + 0.03), doorBottom + doorH / 2, zc)
      root.add(door)
    }
  }

  // ── Hood ───────────────────────────────────────────────────────────────────
  const hood = node('hood', mesh(
    extrudeProfile(slab([zHoodFront + 0.02, hoodFrontY + 0.005], [zWs + 0.02, hoodY + 0.005], 0.035), W - 0.3, 0.012),
    paintMat, 'panel'))
  root.add(hood)

  // ── Hatch / tailgate (hinged at the roof's rear edge) ────────────────────
  const trunk = node('trunk')
  if (suv) {
    const glassBottom = [-half + 0.07, beltY + 0.04]
    trunk.add(mesh(extrudeProfile(slab([zRoofRear, H - 0.03], glassBottom, 0.03), gw, 0.02), glassMat, 'rear-glass'))
    trunk.add(mesh(extrudeProfile(slab(glassBottom, [-half + 0.03, beltY - 0.33], 0.05), W * 0.78, 0.015), paintMat, 'gate'))
  } else {
    const glassBottom = [-half + 0.3, beltY + 0.07]
    trunk.add(mesh(extrudeProfile(slab([zRoofRear, H - 0.03], glassBottom, 0.03), gw, 0.02), glassMat, 'rear-glass'))
    trunk.add(mesh(extrudeProfile(slab(glassBottom, [-half + 0.03, beltY + 0.035], 0.04), W * 0.82, 0.015), paintMat, 'deck'))
  }
  root.add(trunk)

  // ── Swappable parts, built by the same builders the upgrade menu uses ─────
  const wheelSize = new THREE.Vector3(spec.wheelWidth, R * 2, R * 2)
  const wx = W / 2 - spec.wheelWidth / 2 - 0.035
  for (const [key, x, z] of [['fl', wx, fAxle], ['fr', -wx, fAxle], ['rl', wx, rAxle], ['rr', -wx, rAxle]]) {
    const w = node(`wheel_${key}`, buildWheel(config.stock.wheels, wheelSize, { side: x > 0 ? 'left' : 'right' }))
    w.position.set(x, R, z)
    root.add(w)
  }

  const exSize = new THREE.Vector3(spec.exhaust.width, 0.12, 0.45)
  const exhaust = node('exhaust', buildExhaust(config.stock.exhaust, exSize))
  exhaust.position.set(0, C + 0.07, -half - 0.03 + exSize.z / 2)
  root.add(exhaust)

  const inSize = new THREE.Vector3(W * 0.2, 0.085, 0.34)
  const intake = node('intake', buildIntake(config.stock.intake, inSize))
  const intakeZ = zHoodFront - 0.35
  intake.position.set(W * 0.24, bayFloorAt(intakeZ) + inSize.y / 2, intakeZ)
  root.add(intake)

  return root
}
