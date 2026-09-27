// ─────────────────────────────────────────────────────────────────────────────
// PARTS CATALOG — upgrade options per swappable slot.
//
// A variant is rendered one of two ways:
//   • `modelUrl` set  → that .glb is loaded and scaled to fit the stock part's
//                       bounding box (so one wheel model fits both cars).
//   • `modelUrl` null → `params` are handed to the procedural builder for the
//                       slot (three/partBuilders.js). Good enough to prototype.
//
// The reserved variant id 'stock' means "show the model's own part".
// 'removed' (see REMOVED) hides it. Neither needs an entry here.
//
// estHp / estKg are illustrative placeholders for the dashboard, not measured
// figures for any real product — replace them with your parts' spec sheets.
// ─────────────────────────────────────────────────────────────────────────────

export const STOCK = 'stock'
export const REMOVED = 'removed'

export const PARTS_CATALOG = {
  wheels: [
    {
      id: 'forged-mesh',
      label: 'Forged mesh, bronze',
      description: '10-spoke forged monoblock in satin bronze.',
      modelUrl: null,
      params: { finish: 'bronze', spokes: 10, style: 'mesh' },
      estHp: 0,
      estKg: -9,
    },
    {
      id: 'track-6',
      label: 'Track 6-spoke, gloss black',
      description: 'Flow-formed 6-spoke with a deep concave face.',
      modelUrl: null,
      params: { finish: 'black', spokes: 6, style: 'solid' },
      estHp: 0,
      estKg: -5,
    },
  ],

  exhaust: [
    {
      id: 'ti-catback',
      label: 'Titanium cat-back',
      description: 'Burnt-titanium tips, straight-through mufflers.',
      modelUrl: null,
      // Keeps the car's stock tip count and layout; changes finish and size.
      params: { finish: 'titanium', radiusScale: 1.15 },
      estHp: 8,
      estKg: -11,
    },
    {
      id: 'black-quad',
      label: 'Quad tips, ceramic black',
      description: 'Four black ceramic-coated tips (split into pairs on twin-exit cars).',
      modelUrl: null,
      params: { finish: 'black', count: 4, radiusScale: 1 },
      estHp: 5,
      estKg: -4,
    },
  ],

  intake: [
    {
      id: 'cold-air',
      label: 'Cold-air intake',
      description: 'Open cone filter on a polished aluminium pipe.',
      modelUrl: null,
      params: { style: 'cone', accent: '#d42b2b' },
      estHp: 6,
      estKg: -2,
    },
    {
      id: 'carbon-box',
      label: 'Carbon sealed airbox',
      description: 'Sealed carbon box fed from the grille.',
      modelUrl: null,
      params: { style: 'carbon', accent: '#3b82f6' },
      estHp: 4,
      estKg: -1,
    },
  ],
}

export const SLOT_LABELS = { wheels: 'Wheels', exhaust: 'Exhaust', intake: 'Intake' }

export function findVariant(slot, variantId) {
  return PARTS_CATALOG[slot]?.find((v) => v.id === variantId) ?? null
}
