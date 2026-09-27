// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE CONFIG — the single place you edit to swap in your own .glb models.
//
// Every vehicle is described by data, not code. The rendering pipeline
// (scene/Vehicle.jsx → three/rig.js) reads this and never hard-codes a model.
//
// HOW TO SWAP IN A PURCHASED MODEL
//   1. Drop the file in /public/models/, e.g. public/models/integra-type-s.glb
//   2. Set `modelUrl: asset('models/integra-type-s.glb')` below.
//   3. Load the garage once with `?garageDebug` in the URL. The console prints
//      every node and material name in the file, and any part below whose
//      `nodes` matched nothing.
//   4. Copy those names into `nodes` (exact string, or a RegExp) for each part,
//      and into `materials.paint` / `materials.interior` for recolouring.
//   5. Hinges are found automatically from each part's bounding box (`edge`).
//      If a door swings from the wrong spot, give it an explicit `pivot`.
//
// While `modelUrl` is null (or the file fails to load) a procedural placeholder
// car is built from `placeholder` dimensions. It emits the same node names used
// in `parts`, so the placeholder and a real model travel the exact same code.
//
// COORDINATE CONVENTION (vehicle-local, metres, after modelScale/rotation):
//   +Z = front of car, +Y = up, +X = driver (left) side, ground at y = 0.
//   Most purchased models face +Z or -Z; use `modelRotationY` to fix that.
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve a file in /public against the deploy base path (GitHub Pages sub-paths). */
export const asset = (path) => `${import.meta.env.BASE_URL}${path}`

// Door/hood/trunk opening angles in radians. Sign follows the right-hand rule
// about the axis: left doors open with a negative Y rotation, right doors positive.
const DOOR_OPEN = 1.05
const HOOD_OPEN = -0.95
const HATCH_OPEN = 1.15

/**
 * Standard part map for a four-door car. Node names match what the placeholder
 * builder emits. For a real model, replace each `nodes` entry with the names
 * from your file — multiple nodes per part is normal (skin + glass + handle).
 *
 * type:
 *   'articulated' — click toggles open/closed around a hinge.
 *   'swappable'   — click opens the Remove / Upgrade menu; variants come from
 *                   config/partsCatalog.js under the same `slot`.
 *
 * hinge.edge: which face of the part's bounding box the hinge sits on.
 *   'front' | 'rear' → vertical-ish door hinges and hood/deck hinges
 *   'top'            → tailgates hinged at the roof
 *   `side: 'outer'`  → pin the hinge to the outboard face (doors), else centred.
 * hinge.pivot: explicit [x, y, z] in vehicle-local metres — overrides `edge`.
 *
 * camera.dir: optional vehicle-local direction the camera looks FROM when this
 * part is focused. Omit to derive it from where the part sits on the car.
 */
function fourDoorParts({ hatchLabel }) {
  return {
    door_fl: { label: 'Driver door', type: 'articulated', nodes: ['door_fl'],
      hinge: { axis: 'y', edge: 'front', side: 'outer', openAngle: -DOOR_OPEN } },
    door_fr: { label: 'Passenger door', type: 'articulated', nodes: ['door_fr'],
      hinge: { axis: 'y', edge: 'front', side: 'outer', openAngle: DOOR_OPEN } },
    door_rl: { label: 'Rear left door', type: 'articulated', nodes: ['door_rl'],
      hinge: { axis: 'y', edge: 'front', side: 'outer', openAngle: -DOOR_OPEN } },
    door_rr: { label: 'Rear right door', type: 'articulated', nodes: ['door_rr'],
      hinge: { axis: 'y', edge: 'front', side: 'outer', openAngle: DOOR_OPEN } },
    hood: { label: 'Hood', type: 'articulated', nodes: ['hood'],
      hinge: { axis: 'x', edge: 'rear', openAngle: HOOD_OPEN },
      camera: { dir: [0, 1.1, 1] } },
    trunk: { label: hatchLabel, type: 'articulated', nodes: ['trunk'],
      hinge: { axis: 'x', edge: 'top', openAngle: HATCH_OPEN },
      camera: { dir: [0.3, 0.7, -1] } },

    wheels: { label: 'Wheels', type: 'swappable', slot: 'wheels',
      // Order matters only for naming; each wheel becomes its own socket.
      nodes: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'] },
    exhaust: { label: 'Exhaust', type: 'swappable', slot: 'exhaust', nodes: ['exhaust'],
      camera: { dir: [0.35, 0.35, -1] } },
    // Sits under the hood: open the hood first to reach it.
    intake: { label: 'Intake', type: 'swappable', slot: 'intake', nodes: ['intake'],
      camera: { dir: [0.25, 1.4, 0.7] } },
  }
}

export const VEHICLES = [
  {
    id: 'integra',
    shortName: 'Acura', // used in alert copy: "Tire Rotation needed for Acura"
    year: 2025,
    make: 'Acura',
    model: 'Integra',
    trim: 'Type S',
    exterior: { name: 'Blue', color: '#1b4fb0' },
    interior: { name: 'Black', color: '#0c0c0e' },

    // Placement in the garage (world metres / radians).
    position: [-2.35, 0, 0.2],
    rotationY: 0.14,

    // ── Model source ─────────────────────────────────────────────────────────
    modelUrl: null, // e.g. asset('models/integra-type-s.glb')
    modelScale: 1,
    modelRotationY: 0,
    modelOffset: [0, 0, 0],

    // Material names in the .glb that should be recoloured from exterior /
    // interior above. Strings match exactly; RegExps match loosely.
    materials: {
      paint: ['paint', /body.?paint|car.?paint/i],
      interior: ['interior', /leather|seat/i],
    },

    parts: fourDoorParts({ hatchLabel: 'Liftback hatch' }),

    // Stock variant used by each swappable slot (see config/partsCatalog.js).
    stock: {
      wheels: { finish: 'gunmetal', spokes: 5, style: 'split' },
      exhaust: { layout: 'center', count: 3, finish: 'chrome' },
      intake: { style: 'airbox' },
    },

    // Procedural stand-in (metres). Real Integra: 4.72 L × 1.84 W × 1.41 H.
    placeholder: {
      bodyStyle: 'liftback',
      length: 4.72, width: 1.84, height: 1.41,
      wheelbase: 2.735, clearance: 0.12,
      wheelRadius: 0.32, wheelWidth: 0.265,
      exhaust: { width: 0.42 }, // triple centre-exit
    },

    // Manufacturer figures; mileage is mock data and lives in the store.
    stats: {
      engine: '2.0L turbo I4',
      horsepower: 320,
      torqueLbFt: 310,
      transmission: '6-speed manual',
      drivetrain: 'FWD, helical LSD',
    },
  },

  {
    id: 'cayenne',
    shortName: 'Porsche', // "Oil Change Due for Porsche"
    year: 2016,
    make: 'Porsche',
    model: 'Cayenne',
    trim: 'Diesel',
    exterior: { name: 'Black', color: '#0a0b0d' },
    interior: { name: 'Black', color: '#0c0c0e' },

    position: [2.45, 0, -0.1],
    rotationY: -0.14,

    modelUrl: null, // e.g. asset('models/cayenne-diesel-2016.glb')
    modelScale: 1,
    modelRotationY: 0,
    modelOffset: [0, 0, 0],

    materials: {
      paint: ['paint', /body.?paint|car.?paint/i],
      interior: ['interior', /leather|seat/i],
    },

    parts: fourDoorParts({ hatchLabel: 'Tailgate' }),

    stock: {
      wheels: { finish: 'silver', spokes: 7, style: 'solid' },
      exhaust: { layout: 'even', count: 2, finish: 'chrome' },
      intake: { style: 'airbox' },
    },

    // Real Cayenne (958): 4.86 L × 1.94 W × 1.70 H.
    placeholder: {
      bodyStyle: 'suv',
      length: 4.86, width: 1.94, height: 1.7,
      wheelbase: 2.895, clearance: 0.21,
      wheelRadius: 0.37, wheelWidth: 0.275,
      exhaust: { width: 1.2 }, // one tip each side
    },

    stats: {
      engine: '3.0L V6 turbodiesel',
      horsepower: 240,
      torqueLbFt: 406,
      transmission: '8-speed Tiptronic S',
      drivetrain: 'AWD',
    },
  },
]

export const vehicleById = (id) => VEHICLES.find((v) => v.id === id)

export const vehicleTitle = (v) => `${v.year} ${v.make} ${v.model} ${v.trim}`
