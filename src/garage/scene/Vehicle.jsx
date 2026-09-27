// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE — one reusable component for every car.
//
//   <Vehicle config={VEHICLES[i]} />
//     ├─ config.modelUrl set?  → <GltfVehicle>  (useGLTF, falls back on error)
//     └─ otherwise             → placeholder from three/placeholderCar.js
//   both → buildRig() → <RiggedVehicle>: pointer events, hinge animation,
//                                         hover highlight, part swaps.
// ─────────────────────────────────────────────────────────────────────────────
import { Component, Suspense, useEffect, useLayoutEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { useGarageStore } from '../state/useGarageStore'
import { findVariant, REMOVED, STOCK } from '../config/partsCatalog'
import { buildPlaceholderCar } from '../three/placeholderCar'
import { BUILDERS } from '../three/partBuilders'
import { buildRig, describeModel, fitToBox, resolvePart, setHighlight, vehicleRegistry } from '../three/rig'
import { disposeTree } from '../three/materials'

const HOVER_TINT = '#60a5fa'
const SELECT_TINT = '#fbbf24'
const HINGE_SPEED = 5 // exponential damping rate; higher = snappier doors
const CLICK_SLOP_PX = 5 // pointer travel above this is an orbit drag, not a click

const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('garageDebug')

export default function Vehicle({ config }) {
  const reportModelError = useGarageStore((s) => s.reportModelError)
  const placeholder = <PlaceholderVehicle config={config} />
  return (
    <group position={config.position} rotation-y={config.rotationY}>
      {config.modelUrl ? (
        <ModelErrorBoundary fallback={placeholder} onError={(err) => reportModelError(config.id, err.message)}>
          {/* Nothing renders while downloading; the overlay shows progress. */}
          <Suspense fallback={null}>
            <GltfVehicle config={config} />
          </Suspense>
        </ModelErrorBoundary>
      ) : placeholder}
    </group>
  )
}

function PlaceholderVehicle({ config }) {
  // Built inside the memo so StrictMode's double-invoke yields two independent
  // cars instead of rigging the same object twice.
  const rig = useMemo(() => {
    const root = new THREE.Group()
    root.add(buildPlaceholderCar(config))
    return buildRig(root, config)
  }, [config])
  useEffect(() => () => disposeTree(rig.root), [rig])
  return <RiggedVehicle config={config} rig={rig} />
}

function GltfVehicle({ config }) {
  // Draco and Meshopt decoding are on by default in drei, which covers most
  // store-bought models. (Draco decoders load from gstatic.com.)
  const { scene } = useGLTF(config.modelUrl)
  const rig = useMemo(() => {
    // SkeletonUtils.clone keeps skinned meshes bound; plain clone() would not.
    const model = cloneSkinned(scene)
    model.scale.setScalar(config.modelScale ?? 1)
    model.rotation.y = config.modelRotationY ?? 0
    model.position.fromArray(config.modelOffset ?? [0, 0, 0])
    // Wrap so the rig works in vehicle space regardless of how the file was authored.
    const root = new THREE.Group()
    root.add(model)
    return buildRig(root, config)
  }, [scene, config])
  // Geometry is shared with drei's loader cache; only the cloned materials are ours.
  useEffect(() => () => rig.root.traverse((o) => {
    if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose())
  }), [rig])
  return <RiggedVehicle config={config} rig={rig} />
}

function RiggedVehicle({ config, rig }) {
  const id = config.id
  const invalidate = useThree((s) => s.invalidate)

  // Narrow selectors: each returns a primitive or a stable sub-object, so this
  // component only re-renders when *its* vehicle's state changes.
  const openParts = useGarageStore((s) => s.openParts[id])
  const variants = useGarageStore((s) => s.partVariants[id])
  const hovered = useGarageStore((s) => (s.hovered?.vehicleId === id ? s.hovered.partId : null))
  const selected = useGarageStore((s) => (s.selectedPart?.vehicleId === id ? s.selectedPart.partId : null))

  const articulated = useMemo(() => Object.values(rig.parts).filter((p) => p.pivot), [rig])
  const swappable = useMemo(() => Object.values(rig.parts).filter((p) => p.sockets), [rig])

  // Make this rig findable by the camera, and help whoever maps a new model.
  useEffect(() => {
    vehicleRegistry.set(id, rig)
    if (rig.missing.length) {
      console.warn(`[garage] ${id}: no nodes matched for parts: ${rig.missing.join(', ')}. ` +
        'Load with ?garageDebug to list node names, then update config/vehicles.js.')
    }
    if (DEBUG) {
      console.groupCollapsed(`[garage] ${id} model nodes`)
      console.table(describeModel(rig.root))
      console.groupEnd()
    }
    invalidate()
    return () => { if (vehicleRegistry.get(id) === rig) vehicleRegistry.delete(id) }
  }, [id, rig, invalidate])

  // Stock meshes are hidden whenever a variant (or 'removed') replaces them.
  useLayoutEffect(() => {
    for (const part of swappable) {
      const showStock = (variants?.[part.id] ?? STOCK) === STOCK
      part.nodes.forEach((n) => { n.visible = showStock })
    }
    invalidate()
  }, [variants, swappable, invalidate])

  // Hover / selection tint. Re-applied when variants change so a freshly
  // mounted upgrade mesh picks up the tint too.
  useEffect(() => {
    const tinted = []
    if (selected) tinted.push([selected, SELECT_TINT, 0.08])
    if (hovered && hovered !== selected) tinted.push([hovered, HOVER_TINT, 0.1])
    for (const [partId, color, k] of tinted) setHighlight(rig.parts[partId], color, k)
    invalidate()
    return () => {
      for (const [partId] of tinted) setHighlight(rig.parts[partId], null)
      invalidate()
    }
  }, [hovered, selected, variants, rig, invalidate])

  // Kick the render loop when a door is toggled (frameloop is on-demand).
  useEffect(() => { invalidate() }, [openParts, invalidate])

  // Hinge animation: damp each pivot toward open/closed; keep requesting frames
  // until everything settles, then the canvas goes idle again.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) // first frame after an idle stretch reports a huge delta
    let moving = false
    for (const part of articulated) {
      const target = openParts?.[part.id] ? part.openAngle : 0
      const current = part.pivot.rotation[part.axis]
      if (Math.abs(target - current) < 1e-4) {
        part.pivot.rotation[part.axis] = target
        continue
      }
      part.pivot.rotation[part.axis] = THREE.MathUtils.damp(current, target, HINGE_SPEED, dt)
      moving = true
    }
    if (moving) invalidate()
  })

  // ── Pointer handlers. R3F raycasts the whole subtree; e.object is the mesh hit.
  const handlers = useMemo(() => {
    const store = useGarageStore.getState
    const labelFor = (partId) => config.parts[partId]?.label ?? `${config.make} ${config.model}`
    return {
      onPointerOver: (e) => {
        e.stopPropagation() // only the front-most object counts
        const { partId } = resolvePart(e.object)
        store().setHovered({ vehicleId: id, partId, label: labelFor(partId) })
      },
      onPointerOut: (e) => {
        const { partId } = resolvePart(e.object)
        const h = store().hovered
        if (h?.vehicleId === id && h.partId === partId) store().setHovered(null)
      },
      onClick: (e) => {
        if (e.delta > CLICK_SLOP_PX) return // user was orbiting
        e.stopPropagation()
        const s = store()
        const { partId, nodeIndex } = resolvePart(e.object)
        const def = config.parts[partId]
        if (!def) {
          s.focusVehicle(id)
        } else if (def.type === 'articulated') {
          s.togglePart(id, partId)
          s.focusPart(id, partId)
        } else if (def.type === 'swappable') {
          s.selectPart(id, partId)
          s.focusPart(id, partId, nodeIndex)
        }
      },
    }
  }, [config, id])

  return (
    <>
      <primitive object={rig.root} {...handlers} />
      {swappable.map((part) => {
        const variantId = variants?.[part.id]
        if (!variantId || variantId === REMOVED) return null
        const variant = findVariant(part.def.slot, variantId)
        if (!variant) return null
        return part.sockets.map((socket, i) => (
          <Suspense key={`${part.id}:${variantId}:${i}`} fallback={null}>
            {variant.modelUrl
              ? <GltfPart url={variant.modelUrl} socket={socket} />
              : <ProceduralPart slot={part.def.slot} params={{ ...config.stock[part.def.slot], ...variant.params }} socket={socket} />}
          </Suspense>
        ))
      })}
    </>
  )
}

/** Mounts a procedurally built upgrade into a socket; removes and disposes on swap. */
function ProceduralPart({ slot, params, socket }) {
  const invalidate = useThree((s) => s.invalidate)
  const key = JSON.stringify(params)
  useLayoutEffect(() => {
    const obj = BUILDERS[slot](JSON.parse(key), socket.size, { side: socket.side })
    socket.group.add(obj)
    invalidate()
    return () => {
      socket.group.remove(obj)
      disposeTree(obj)
      invalidate()
    }
  }, [slot, key, socket, invalidate])
  return null
}

/**
 * Mounts an upgrade .glb scaled to the stock part's box. Author wheel models
 * with the spoke face toward +X; right-side sockets get a mirrored copy.
 */
function GltfPart({ url, socket }) {
  const invalidate = useThree((s) => s.invalidate)
  const { scene } = useGLTF(url)
  useLayoutEffect(() => {
    const obj = cloneSkinned(scene)
    if (socket.side === 'right') obj.rotation.y = Math.PI
    obj.traverse((o) => {
      if (!o.isMesh) return
      o.castShadow = o.receiveShadow = true
      // Own copies so hover tint doesn't leak into the loader cache.
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone()
    })
    const holder = new THREE.Group()
    holder.add(fitToBox(obj, socket.size))
    socket.group.add(holder)
    invalidate()
    return () => { socket.group.remove(holder); invalidate() }
  }, [scene, socket, invalidate])
  return null
}

/** Falls back to the placeholder if a .glb 404s or fails to parse. */
class ModelErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err) {
    console.error('[garage] model failed to load, using placeholder:', err)
    this.props.onError?.(err)
  }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
