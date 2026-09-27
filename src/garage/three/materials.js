// PBR material factories for the placeholder car and procedural parts.
// Every call returns a NEW material so per-part hover highlights never bleed
// onto other meshes. Names matter: 'paint' and 'interior' are what
// config/vehicles.js → materials.* targets for recolouring.
import * as THREE from 'three'

/** Multi-layer car paint: metallic base under a glossy clearcoat. */
export function paint(color) {
  return new THREE.MeshPhysicalMaterial({
    name: 'paint',
    color,
    metalness: 0.6,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.2,
  })
}

export function glass() {
  return new THREE.MeshPhysicalMaterial({
    name: 'glass',
    color: '#04070a',
    metalness: 0.2,
    roughness: 0.02,
    transparent: true,
    opacity: 0.8,
    envMapIntensity: 2,
  })
}

export function interior(color = '#0c0c0e') {
  return new THREE.MeshStandardMaterial({ name: 'interior', color, roughness: 0.75, metalness: 0 })
}

export function trim() {
  return new THREE.MeshStandardMaterial({ name: 'trim', color: '#0d0e10', roughness: 0.55, metalness: 0.1 })
}

export function tire() {
  return new THREE.MeshStandardMaterial({ name: 'tire', color: '#141414', roughness: 0.92, metalness: 0 })
}

export function chrome() {
  return new THREE.MeshStandardMaterial({ name: 'chrome', color: '#e8e8e8', roughness: 0.06, metalness: 1 })
}

/** Emissive intensity > 1 pushes these into HDR so the bloom pass picks them up. */
export function lamp(color, intensity = 3) {
  return new THREE.MeshStandardMaterial({
    name: 'lamp', color, emissive: color, emissiveIntensity: intensity, roughness: 0.2,
  })
}

export function brakeCaliper(color = '#b91c1c') {
  return new THREE.MeshStandardMaterial({ name: 'caliper', color, roughness: 0.35, metalness: 0.2 })
}

export function brakeDisc() {
  return new THREE.MeshStandardMaterial({ name: 'disc', color: '#6b6b6b', roughness: 0.45, metalness: 0.9 })
}

const FINISHES = {
  gunmetal: { color: '#3a3d42', roughness: 0.3, metalness: 0.9 },
  silver: { color: '#c9ccd1', roughness: 0.22, metalness: 1 },
  bronze: { color: '#8a6a3d', roughness: 0.35, metalness: 0.95 },
  black: { color: '#101113', roughness: 0.18, metalness: 0.4 },
  chrome: { color: '#e5e5e5', roughness: 0.06, metalness: 1 },
  // Heat-blued titanium: iridescence does the purple/gold shift.
  titanium: { color: '#b9a9d6', roughness: 0.2, metalness: 1, iridescence: 1, iridescenceIOR: 1.8 },
}

/** Metal finish by name, used by wheels and exhaust tips. */
export function finish(name) {
  const f = FINISHES[name] ?? FINISHES.silver
  return new THREE.MeshPhysicalMaterial({ name: `finish-${name}`, ...f })
}

/** Dispose every geometry and material under `root`. Call when unmounting procedural objects. */
export function disposeTree(root) {
  root.traverse((o) => {
    if (!o.isMesh) return
    o.geometry?.dispose()
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m) continue
      for (const v of Object.values(m)) if (v?.isTexture) v.dispose()
      m.dispose()
    }
  })
}
