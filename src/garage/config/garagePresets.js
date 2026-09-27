// ─────────────────────────────────────────────────────────────────────────────
// GARAGE PRESETS — floors, wall colours and lighting rigs for the customiser.
// Floors use procedurally generated textures (three/textures.js), so nothing
// here needs an image file. To use a scanned texture instead, add `mapUrl`.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * mirror: 0–1 strength of real-time floor reflections (MeshReflectorMaterial).
 * blur:   how much those reflections are smeared — higher reads as satin.
 * repeat: texture tiles across the 18 m × 16 m floor.
 */
export const FLOORS = {
  'polished-concrete': {
    label: 'Polished concrete',
    texture: 'concrete',
    color: '#b9b6b0',
    roughness: 0.42,
    metalness: 0.05,
    mirror: 0.55,
    blur: [400, 120],
    repeat: 3,
  },
  'epoxy-flake': {
    label: 'Grey flake epoxy',
    texture: 'flake',
    color: '#9aa0a8',
    roughness: 0.18,
    metalness: 0.1,
    mirror: 0.9,
    blur: [180, 60],
    repeat: 6,
  },
  'epoxy-black': {
    label: 'Black gloss epoxy',
    texture: 'gloss',
    color: '#26272b',
    roughness: 0.08,
    metalness: 0.2,
    mirror: 1.4,
    blur: [80, 30],
    repeat: 4,
  },
  'checker-tile': {
    label: 'Checker tile',
    texture: 'checker',
    color: '#ffffff',
    roughness: 0.3,
    metalness: 0.05,
    mirror: 0.6,
    blur: [260, 90],
    repeat: 9,
  },
}

export const WALL_COLORS = [
  { id: 'white', label: 'Garage white', color: '#d8d7d2' },
  { id: 'slate', label: 'Slate', color: '#4b5563' },
  { id: 'charcoal', label: 'Charcoal', color: '#24272c' },
  { id: 'navy', label: 'Navy', color: '#1d2942' },
  { id: 'oxblood', label: 'Oxblood', color: '#5c1a1b' },
]

export const NEON_COLORS = [
  { id: 'cyan', label: 'Cyan', color: '#22d3ee' },
  { id: 'magenta', label: 'Magenta', color: '#e11d8f' },
  { id: 'amber', label: 'Amber', color: '#fbbf24' },
  { id: 'white', label: 'Cool white', color: '#e0f2fe' },
]

/**
 * Lighting is three independent rigs so they can be combined.
 * Each rig contributes real lights, visible fixtures (which bloom), and matching
 * Lightformers in the environment map — the last part is what puts believable
 * reflections of the light fittings into the car paint.
 */
export const LIGHT_RIGS = {
  spots: { label: 'Overhead spotlights' },
  panels: { label: 'LED ceiling panels' },
  neon: { label: 'Neon strips' },
}

export const DEFAULT_GARAGE = {
  floor: 'polished-concrete',
  wallColor: '#d8d7d2',
  lights: { spots: true, panels: true, neon: false },
  neonColor: '#22d3ee',
  brightness: 1,
  // 'high' = reflections + ambient occlusion + bloom; 'low' for phones/iGPUs.
  quality: typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'low' : 'high',
}

/** Room interior dimensions in metres. Camera is clamped inside these. */
export const ROOM = { width: 18, depth: 16, height: 4.4 }
