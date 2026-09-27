# Home-Command-Center
Central hub for all things home maintenance and documentation.

## App lock

The GitHub token that gives this app read/write access to your data repo can be
encrypted at rest. Turn it on under **Settings → App Lock**.

- **How it works.** A random key encrypts the token; that key is then wrapped
  separately by each credential you enrol (a passkey — Face ID / Touch ID — and
  optionally a PIN or passphrase). Nothing readable is left in browser storage.
- **When it asks.** Unlocking lasts for the browser session, so reloads and
  navigation don't re-prompt, but closing the app locks it again.
- **Locked out?** "Reset app lock" on the lock screen erases the encrypted token
  from this browser and returns you to token entry. Your data in GitHub is never
  touched — you just paste a token again.
- **PIN strength.** A short numeric PIN only stops someone holding your phone.
  Anyone who can copy this browser's storage can grind it offline, so prefer a
  passphrase.

Token health (last time GitHub accepted it, and its expiry date when GitHub
reports one) is shown in the same card.

## Development

```sh
npm install
npm run dev            # local dev server
npm test               # vault crypto tests (no dependencies, plain node)
VITE_APP_ENV=sandbox npm run build
```

`VITE_APP_ENV` selects the deploy target (`production`, `sandbox`, `develop`,
`preprod`); it sets the base path, the data file path in the repo, and the
namespace for browser storage keys.

## Garage (3D)

A point-and-click 3D garage for the cars, under the **Garage** tab. It is
lazy-loaded: three.js (~500 KB gzipped) downloads only when the tab is opened.

**Stack:** `three` · `@react-three/fiber` 8 · `@react-three/drei` 9 ·
`@react-three/postprocessing` 2 · `zustand` 5. These are the React 18 lines;
fiber 9 / drei 10 require React 19.

```
src/garage/
  config/vehicles.js       ← edit this to swap in your .glb models
  config/partsCatalog.js   upgrade options per slot (wheels, exhaust, intake)
  config/garagePresets.js  floors, wall colours, lighting rigs, room size
  state/useGarageStore.js  Zustand store: the only link between 3D and UI
  state/maintenance.js     mock service records + alert logic (unit-tested)
  three/rig.js             makes any car model clickable, hinged, swappable
  three/placeholderCar.js  procedural stand-in car used until a .glb exists
  three/partBuilders.js    procedural wheels / exhaust / intake
  scene/                   Canvas, camera, environment, <Vehicle>
  ui/                      HTML overlay: dashboard, part menu, customiser
```

### Swapping in a purchased model

1. Put the file in `public/models/`, e.g. `public/models/integra-type-s.glb`.
2. In `src/garage/config/vehicles.js` set
   `modelUrl: asset('models/integra-type-s.glb')`. Fix scale or facing with
   `modelScale` / `modelRotationY` (the car must face +Z, wheels on y = 0).
3. Open the garage with `?garageDebug` in the URL. The console lists every
   node and material name in the file and warns about any part whose `nodes`
   matched nothing. `window.garage.camera` is exposed for tuning framing.
4. Copy those names into each part's `nodes` (string or RegExp; several nodes
   per part is fine) and into `materials.paint` / `materials.interior` so the
   configured exterior and interior colours apply.
5. Hinges are placed from each part's bounding box (`hinge.edge`). If a door
   pivots from the wrong place, give it `hinge.pivot: [x, y, z]` in metres.

Upgrade parts can be `.glb` files too: set `modelUrl` on a catalog variant and
it is scaled into the stock part's bounding box. If a model fails to load, the
placeholder is shown along with an on-screen notice.

Draco- and Meshopt-compressed files work out of the box (the Draco decoder
loads from gstatic.com). KTX2 textures need a KTX2 loader added in
`scene/Vehicle.jsx`.
