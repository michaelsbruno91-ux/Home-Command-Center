// ─────────────────────────────────────────────────────────────────────────────
// RIG — turns any car Object3D (placeholder or loaded .glb) into an interactive
// one, driven purely by the `parts` map in config/vehicles.js:
//
//   1. clones every material, so highlighting one door never lights up the
//      whole car (imported models share materials between panels);
//   2. recolours paint / interior materials by name;
//   3. tags part nodes with userData.partId so a raycast hit on ANY child mesh
//      resolves back to its part;
//   4. re-parents articulated parts under a pivot Group placed on the hinge,
//      so "open" is just a rotation of the pivot;
//   5. drops an empty socket Group on each swappable part's bounding-box
//      centre, where upgrade meshes get mounted.
//
// Everything runs once per model instance. `root` must be an identity-transform
// Group in vehicle space (+Z forward, +Y up) — scene/Vehicle.jsx ensures that.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from 'three'

const materialsOf = (mesh) => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter(Boolean)

/** String → exact (then case-insensitive) name match; RegExp → test. */
function nameMatches(name, matcher) {
  if (!name) return false
  if (matcher instanceof RegExp) return matcher.test(name)
  return name === matcher || name.toLowerCase() === String(matcher).toLowerCase()
}

/**
 * Resolve config `nodes` entries to objects. A string picks the first match
 * (exact name wins over case-insensitive); a RegExp picks every match.
 */
export function findNodes(root, matchers) {
  const found = new Set()
  for (const m of matchers) {
    if (m instanceof RegExp) {
      root.traverse((o) => { if (o !== root && nameMatches(o.name, m)) found.add(o) })
      continue
    }
    const exact = root.getObjectByName(m)
    if (exact) { found.add(exact); continue }
    let loose = null
    root.traverse((o) => { if (!loose && nameMatches(o.name, m)) loose = o })
    if (loose) found.add(loose)
  }
  // Drop nodes whose ancestor is also selected — the ancestor already carries them.
  return [...found].filter((n) => {
    for (let p = n.parent; p; p = p.parent) if (found.has(p)) return false
    return true
  })
}

/** Bounding box of `objects`, expressed in `root`'s local space. */
function boxInRoot(objects, root) {
  root.updateWorldMatrix(true, true)
  const inv = root.matrixWorld.clone().invert()
  const box = new THREE.Box3()
  const tmp = new THREE.Box3()
  for (const o of objects) {
    tmp.setFromObject(o)
    if (!tmp.isEmpty()) box.union(tmp.applyMatrix4(inv))
  }
  return box
}

/**
 * Where the hinge sits, from the part's bounding box.
 *   axis 'y' (doors):      front/rear edge, outboard face if side === 'outer'
 *   axis 'x' (hood/trunk): rear edge for hoods, front/top edge for lids & tailgates
 *   axis 'z' (gull-wing):  along the top centre line
 */
export function hingeFromBox(box, hinge) {
  const c = box.getCenter(new THREE.Vector3())
  const z = hinge.edge === 'rear' ? box.min.z : box.max.z
  if (hinge.axis === 'y') {
    const x = hinge.side === 'outer' ? (c.x >= 0 ? box.max.x : box.min.x) : c.x
    return new THREE.Vector3(x, c.y, z)
  }
  if (hinge.axis === 'x') {
    const y = hinge.edge === 'bottom' ? box.min.y : box.max.y
    return new THREE.Vector3(c.x, y, z)
  }
  return new THREE.Vector3(c.x >= 0 ? box.min.x : box.max.x, box.max.y, c.z)
}

function recolor(root, config) {
  const paint = config.materials?.paint ?? []
  const interior = config.materials?.interior ?? []
  root.traverse((o) => {
    if (!o.isMesh) return
    for (const m of materialsOf(o)) {
      if (paint.some((p) => nameMatches(m.name, p))) m.color?.set(config.exterior.color)
      else if (interior.some((p) => nameMatches(m.name, p))) m.color?.set(config.interior.color)
    }
  })
}

/**
 * @returns {{
 *   root: THREE.Group,
 *   parts: Record<string, { id, def, nodes, pivot?, axis?, openAngle?, sockets? }>,
 *   missing: string[],   // part ids whose nodes matched nothing
 * }}
 */
export function buildRig(root, config) {
  root.userData.isVehicleRoot = true
  root.userData.vehicleId = config.id

  root.traverse((o) => {
    if (!o.isMesh) return
    o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()
    // Glass shouldn't cast a solid black shadow into the cabin.
    o.castShadow = !materialsOf(o).some((m) => m.transparent)
    o.receiveShadow = true
  })
  recolor(root, config)

  const parts = {}
  const missing = []
  for (const [partId, def] of Object.entries(config.parts)) {
    const nodes = findNodes(root, def.nodes)
    if (!nodes.length) { missing.push(partId); continue }
    nodes.forEach((n, i) => { n.userData.partId = partId; n.userData.partNodeIndex = i })
    const part = { id: partId, def, nodes }

    if (def.type === 'articulated') {
      const box = boxInRoot(nodes, root)
      const hingePoint = def.hinge.pivot ? new THREE.Vector3(...def.hinge.pivot) : hingeFromBox(box, def.hinge)
      const pivot = new THREE.Group()
      pivot.name = `${partId}__pivot`
      pivot.userData.partId = partId
      pivot.position.copy(hingePoint)
      root.add(pivot)
      // attach() keeps each node's world transform while re-parenting it.
      nodes.forEach((n) => pivot.attach(n))
      Object.assign(part, { pivot, axis: def.hinge.axis, openAngle: def.hinge.openAngle })
    }

    if (def.type === 'swappable') {
      part.sockets = nodes.map((n, i) => {
        const box = boxInRoot([n], root)
        const center = box.getCenter(new THREE.Vector3())
        const group = new THREE.Group()
        group.name = `${partId}__socket${i}`
        group.userData = { partId, partNodeIndex: i }
        group.position.copy(center)
        root.add(group)
        return { node: n, group, size: box.getSize(new THREE.Vector3()), side: center.x >= 0 ? 'left' : 'right' }
      })
    }
    parts[partId] = part
  }
  return { root, parts, missing }
}

/** Walk up from a raycast hit to the part it belongs to. Unmapped meshes are 'body'. */
export function resolvePart(object) {
  for (let o = object; o; o = o.parent) {
    if (o.userData?.partId) return { partId: o.userData.partId, nodeIndex: o.userData.partNodeIndex ?? 0 }
    if (o.userData?.isVehicleRoot) break
  }
  return { partId: 'body', nodeIndex: 0 }
}

/**
 * Tint a part via emissive (cheap, no extra render pass, works on any PBR
 * material). Pass color = null to restore. Includes mounted upgrade meshes.
 */
export function setHighlight(part, color, intensity = 0.25) {
  if (!part) return
  const targets = [...part.nodes, ...(part.sockets?.map((s) => s.group) ?? [])]
  for (const t of targets) {
    t.traverse((o) => {
      if (!o.isMesh) return
      for (const m of materialsOf(o)) {
        if (!m.emissive) continue
        const ud = m.userData
        if (!ud.baseEmissive) {
          ud.baseEmissive = m.emissive.clone()
          ud.baseEmissiveIntensity = m.emissiveIntensity
        }
        if (color) {
          m.emissive.set(color)
          m.emissiveIntensity = intensity
        } else {
          m.emissive.copy(ud.baseEmissive)
          m.emissiveIntensity = ud.baseEmissiveIntensity
        }
      }
    })
  }
}

/** Node + material inventory for mapping a new .glb (printed with ?garageDebug). */
export function describeModel(root) {
  const rows = []
  root.traverse((o) => {
    if (o === root) return
    rows.push({
      name: o.name || '(unnamed)',
      type: o.type,
      materials: o.isMesh ? materialsOf(o).map((m) => m.name || '(unnamed)').join(', ') : '',
      part: o.userData.partId ?? '',
    })
  })
  return rows
}

/** Uniformly scale + centre `object` so its bbox fits inside `size` (for .glb upgrades). */
export function fitToBox(object, size) {
  const box = new THREE.Box3().setFromObject(object)
  const s = box.getSize(new THREE.Vector3())
  const k = Math.min(size.x / (s.x || 1), size.y / (s.y || 1), size.z / (s.z || 1))
  object.scale.multiplyScalar(k)
  const c = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
  object.position.sub(c)
  return object
}

/**
 * Live rigs by vehicle id. Lets the camera rig turn a store intent like
 * { vehicleId: 'cayenne', partId: 'hood' } into actual world-space boxes
 * without putting Three.js objects in React state.
 */
export const vehicleRegistry = new Map()
